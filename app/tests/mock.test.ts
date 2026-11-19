import assert from 'node:assert/strict'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { iqOf, type ToolCall } from '../src/live/protocol.ts'
import { parseReply } from '../src/live/reply.ts'
import { CANCELLED, type TurnLog } from '../src/live/turn.ts'
import { MOCK_ANSWERS, MOCK_CONSENT_URL, MOCK_FOLLOW_UPS, MOCK_REFUSAL, MOCK_SESSION, createMockClient } from '../src/mock/client.ts'
import { SAMPLES } from '../src/samples.ts'

const app = fileURLToPath(new URL('../', import.meta.url))

test('mock mode answers every sample question for both agents with its canned reply, through the same turn', async () => {
  const records: TurnLog[] = []
  const client = createMockClient({ delayMs: 0, log: (record) => { records.push(record) } })
  assert.equal(client.mode, 'mock')
  assert.deepEqual(Object.keys(MOCK_ANSWERS), SAMPLES.map((sample) => sample.question))
  for (const sample of SAMPLES) {
    for (const variant of ['with_iq', 'without_iq'] as const) {
      const canned = MOCK_ANSWERS[sample.question][variant]
      const tools: ToolCall[] = []
      let result = await client.ask({ variant, text: sample.question }, undefined, (call) => tools.push(call))
      if (canned.consent) {
        assert.deepEqual([result.status, result.status === 'needs-consent' && result.server], ['needs-consent', canned.consent], sample.question)
        assert.equal(result.status === 'needs-consent' && result.consentUrl, MOCK_CONSENT_URL)
        result = await client.ask({ variant, text: sample.question }, undefined, (call) => tools.push(call))
      }
      assert.equal(result.status, 'answered', `${sample.question} ${variant}`)
      if (result.status !== 'answered') continue
      assert.equal(result.raw, canned.answer)
      assert.deepEqual(result.reply, parseReply(canned.answer))
      assert.match(result.responseId ?? '', /^resp_mock_[0-9a-f]{32}$/)
      assert.deepEqual(result.toolCalls.map((call) => [call.server, call.tool, call.state]), canned.tools.map((tool) => [tool.server, tool.tool, 'completed']))
      assert.deepEqual(tools.map((call) => call.state), canned.tools.flatMap(() => ['running', 'completed']), 'the timeline sees each call start and finish')
      if (variant === 'with_iq') assert.ok(result.reply.markers.length > 0 && result.reply.sources.length > 0, sample.question)
      else assert.deepEqual([result.reply.markers, result.reply.sources, result.toolCalls], [[], [], []], sample.question)
    }
  }
  assert.ok(records.every((record) => record.event === 'app.turn'))
})

test('other questions get a canned pointer to the samples, and a mock turn can be stopped', async () => {
  const client = createMockClient({ delayMs: 0 })
  const other = await client.ask({ variant: 'with_iq', text: 'How many customers are there?' })
  assert.match(other.status === 'answered' ? other.raw : '', /canned answers for the sample questions only/)
  const controller = new AbortController()
  const pending = createMockClient({ delayMs: 5_000 }).ask({ variant: 'with_iq', text: SAMPLES[0].question }, controller.signal)
  setTimeout(() => controller.abort(), 10)
  const stopped = await pending
  assert.equal(stopped.status === 'failed' && stopped.code, CANCELLED)
  assert.ok(stopped.elapsedMs < 5_000)
})

test('a follow-up that asks the agent to act gets the refusal from both agents, without a tool', async () => {
  const client = createMockClient({ delayMs: 0 })
  const [question] = Object.keys(MOCK_FOLLOW_UPS)
  for (const variant of ['with_iq', 'without_iq'] as const) {
    const result = await client.ask({ variant, text: `  ${question.toUpperCase()}  `, previousResponseId: 'resp_mock_1' })
    assert.equal(result.status === 'answered' && result.raw, MOCK_REFUSAL, variant)
    assert.deepEqual(result.toolCalls, [])
  }
})

interface Expectation {
  tools?: string[]
  tools_when_work_iq?: string[]
  tools_never?: string[]
  markers_when_work_iq?: string[]
  facts?: string[]
  phrases?: string[]
  markers?: string[]
  sources?: string[]
  draft_must_not?: string[]
  answer_must_not?: string[]
  tool_arguments_must_not?: Record<string, string>
  exact_reply?: string
}

interface EvalCase {
  id: string
  question: string
  sample: boolean
  follow_up_to?: string
  with_iq?: Expectation
  without_iq?: Expectation
}

test('the canned answers meet the scenario\'s evaluation cases, so mock mode shows what a passing answer looks like', () => {
  const evals = JSON.parse(readFileSync(new URL('../../scenario/evals/cases.json', import.meta.url), 'utf8')) as {
    private_terms: string[]
    refusal: string
    cases: EvalCase[]
  }
  assert.equal(MOCK_REFUSAL, evals.refusal)
  const prefix: Readonly<Record<string, string>> = { fabric: 'D', foundry: 'F', web: 'Web', work: 'W' }
  for (const evalCase of evals.cases) {
    if (evalCase.follow_up_to && Object.hasOwn(MOCK_FOLLOW_UPS, evalCase.question)) {
      for (const variant of ['with_iq', 'without_iq'] as const) {
        assert.equal(MOCK_FOLLOW_UPS[evalCase.question][variant].answer, evals.refusal, evalCase.id)
      }
    }
    if (!evalCase.sample) continue
    for (const variant of ['with_iq', 'without_iq'] as const) {
      const expect = evalCase[variant]
      if (!expect) continue
      const canned = MOCK_ANSWERS[evalCase.question][variant]
      const label = `${evalCase.id} ${variant}`
      const answer = canned.answer.toLowerCase()
      const reply = parseReply(canned.answer)
      const servers = canned.tools.map((tool) => tool.server)
      for (const server of [...(expect.tools ?? []), ...(expect.tools_when_work_iq ?? [])]) assert.ok(servers.includes(server), `${label} calls ${server}`)
      for (const server of expect.tools_never ?? []) assert.ok(!servers.includes(server), `${label} never calls ${server}`)
      for (const text of [...(expect.facts ?? []), ...(expect.phrases ?? [])]) assert.ok(answer.includes(text.toLowerCase()), `${label} says ${text}`)
      for (const text of expect.answer_must_not ?? []) assert.ok(!answer.includes(text.toLowerCase()), `${label} never says ${text}`)
      // Every required marker appears, and no marker cites a tool the turn didn't call.
      const kinds = new Set(reply.markers.map((marker) => prefix[marker.kind]))
      const called = new Set(servers.map((server) => prefix[iqOf(server) ?? '']))
      for (const kind of [...(expect.markers ?? []), ...(expect.markers_when_work_iq ?? [])]) assert.ok(kinds.has(kind), `${label} cites ${kind}`)
      for (const kind of kinds) assert.ok(called.has(kind), `${label} cites ${kind} only after calling its tool`)
      for (const source of expect.sources ?? []) assert.ok(reply.sources.some((line) => line.text.includes(source)), `${label} cites ${source}`)
      if (expect.draft_must_not) {
        const draft = canned.answer.split('\n').filter((line) => line.startsWith('> ')).join('\n').toLowerCase()
        assert.ok(draft, `${label} drafts a reply`)
        for (const text of expect.draft_must_not) assert.ok(!draft.includes(text.toLowerCase()), `${label} keeps ${text} out of the draft`)
      }
      for (const server of Object.keys(expect.tool_arguments_must_not ?? {})) {
        const calls = canned.tools.filter((tool) => tool.server === server)
        for (const term of evals.private_terms) assert.ok(calls.every((tool) => !tool.arguments.includes(term)), `${label}: ${server} never sends ${term}`)
      }
    }
  }
})

test('mock mode needs no sign-in and labels itself', () => {
  assert.equal(MOCK_SESSION.mode, 'mock')
  assert.equal(MOCK_SESSION.identity?.name, 'Mock user')
  assert.match(MOCK_SESSION.notice ?? '', /^Mock mode/)
})

test('only literal mode checks load the mock module, and nothing loads the sign-in statically', () => {
  const source = readFileSync(new URL('../src/live/client.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /^import\b[^\n]*\.\/auth/m, 'no static import of the browser sign-in')
  assert.doesNotMatch(source, /^import\b[^\n]*mock\//m, 'no static import of the mock module')
  const loads = source.match(/import\('\.\.\/mock\/client\.ts'\)/g) ?? []
  const guards = source.match(/if \(import\.meta\.env\.MODE === 'mock'\) \{/g) ?? []
  assert.equal(loads.length, 2)
  assert.equal(guards.length, loads.length)
  for (const block of source.split(/^(?:export )?(?:async )?function /m).filter((part) => part.includes("import('../mock/client.ts')"))) {
    assert.ok(block.indexOf("if (import.meta.env.MODE === 'mock') {") < block.indexOf("import('../mock/client.ts')"), block.slice(0, 60))
  }
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, encoding: 'utf8' })) {
    if (!/\.tsx?$/.test(file) || file.startsWith(`mock${path.sep}`) || file === path.join('live', 'client.ts')) continue
    const text = readFileSync(new URL(`../src/${file.split(path.sep).join('/')}`, import.meta.url), 'utf8')
    assert.doesNotMatch(text, /mock\/client/, `${file} must not import the mock module`)
  }
})

test('a production build contains no mock text', async () => {
  const outDir = path.join(app, 'node_modules', '.tmp', `production-check-${process.pid}`)
  try {
    await build({ configFile: path.join(app, 'vite.config.ts'), mode: 'production', logLevel: 'silent', build: { outDir, emptyOutDir: true } })
    const files = readdirSync(outDir, { recursive: true, encoding: 'utf8' }).filter((file) => /\.(?:html|js|css)$/.test(file))
    const bundle = files.map((file) => readFileSync(path.join(outDir, file), 'utf8')).join('\n')
    assert.ok(files.includes('index.html') && files.includes('redirect.html'), 'the app and its redirect bridge')
    assert.ok(bundle.includes('Sample questions'), 'the probe reads the app itself')
    const mockSource = readFileSync(new URL('../src/mock/client.ts', import.meta.url), 'utf8')
    const probes = [
      MOCK_SESSION.notice ?? '', MOCK_CONSENT_URL, 'resp_mock_', 'canned answers for the sample questions only',
      // Each canned answer's bold lead.
      ...Object.values(MOCK_ANSWERS).map((answers) => /\*\*(.+?)\*\*/.exec(answers.with_iq.answer)?.[1] ?? ''),
    ]
    for (const probe of probes) {
      assert.ok(probe && mockSource.includes(probe), `${probe} is mock text`)
      assert.ok(!bundle.includes(probe), `the production bundle must not contain ${probe}`)
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})
