// Mock mode only: `npm run dev:mock` (vite --mode mock). live/client.ts imports this module only behind a literal
// import.meta.env.MODE === 'mock', so production builds never contain it. Canned answers for the sample questions,
// and for one follow-up that asks the agent to act, stand in for the agents, through the same turn as a live answer:
// tool calls, one consent request and the reply.
import type { ToolCall, TurnOutcome } from '../live/protocol.ts'
import { runTurn, type Send, type TurnLog } from '../live/turn.ts'
import type { AgentClient, Session, Variant } from '../live/types.ts'
import { SAMPLES } from '../samples.ts'

export const MOCK_SESSION: Session = {
  mode: 'mock',
  identity: { name: 'Mock user' },
  notice: 'Mock mode · canned answers, no sign-in',
  signIn: async () => {},
  signOut: async () => {},
}

// Long enough for each running state to show.
export const MOCK_DELAY_MS = 900
export const MOCK_CONSENT_URL = 'https://example.com/mock-consent'

export interface Canned {
  tools: { server: string; tool: string; arguments: string }[]
  answer: string
  // The tool server whose consent the first ask of this question asks for.
  consent?: string
}

const NO_TOOLS = (what: string): Canned => ({
  tools: [],
  answer: [
    `**I can't confirm ${what}.** This version of the assistant has no tools, so it can't check, and it won't guess.`,
    '',
    'Sources',
    '',
    'Steps',
    '1. Called no tool: this version has none.',
  ].join('\n'),
})

const ORDER_QUESTION = 'Which SalesOrder rows have the OrderId value "SO-48213"? Return each order\'s status, promised date, DelayBusinessDays and summary, its customer\'s name and service tier, and its shipment\'s ID, status, detail, location, last update, CarrierEta and EtaFreshness.'
const MAIL_SEARCH = '{"entityUrls":["/me/messages?$search=\\"SO-48213\\"&$select=subject,from,receivedDateTime,webLink,body&$top=10"]}'
const SOURCES = {
  order: '- [D1] ScenarioOntology · SalesOrder · SO-48213',
  logistics: 'Outlook · Logistics coordinator · 17 November 2026 · SO-48213 / SHP-7781 customs hold: corrected documents filed · https://example.com/mail/1',
  accountManager: 'Outlook · Account manager · 19 November 2026 · Fabrikam Retail: SO-48213 needed before store opening · https://example.com/mail/2',
  web: 'Understanding customs holds · example.com · https://example.com/customs-holds',
}

const [endToEnd, whyLate, delayed, remedies, definitions, publicContext, mail, guidanceAndContext] = SAMPLES.map((sample) => sample.question)

// By sample question, then variant.
export const MOCK_ANSWERS: Readonly<Record<string, Record<Variant, Canned>>> = {
  [endToEnd]: {
    with_iq: {
      tools: [
        { server: 'fabric_iq_ontology', tool: 'ask_ontology', arguments: JSON.stringify({ question: ORDER_QUESTION }) },
        {
          server: 'foundry_iq_knowledge', tool: 'knowledge_base_retrieve',
          arguments: '{"queries":["Remedies and approvals for a Gold customer whose order is 5 business days late, and how to word a delay reply"]}',
        },
        { server: 'work_iq_mail', tool: 'fetch', arguments: MAIL_SEARCH },
        {
          server: 'web_iq_public_context', tool: 'knowledge_base_retrieve',
          arguments: '{"queries":["typical clearance time for an import customs hold after corrected documents"]}',
        },
      ],
      answer: [
        '**Order SO-48213 is 5 business days late because its shipment is on a customs hold; the carrier expects to deliver it on 20 November 2026.** [D1][D3]',
        '',
        '- Fabrikam Retail is a Gold customer [D2]; the order, store fixtures on 12 pallets, was promised for 13 November 2026 [D1].',
        '- Shipment SHP-7781 is held at the Eastport import hub for a customs documentation check; its expected date is current, last updated by the carrier on 18 November 2026 [D3].',
        '- Logistics reports that corrected documents were filed on 17 November 2026 and expects release on 19 November 2026 [W1]. The account manager says the customer needs the fixtures before its store opens on 24 November 2026 and asks to be copied [W2].',
        '- The policy allows free expedited delivery for a Gold order 3 or more business days late [F1 §4]; a service credit needs a team lead\'s approval before it is mentioned [F1 §5]. Give the carrier\'s date as expected, not guaranteed [F1 §6].',
        '- Public context, not company guidance: customs documentation holds are often cleared within a few working days of complete documents being filed [Web1].',
        '',
        '**Recommendation, for you to decide:** reply today, offer expedited delivery, copy the account manager, and ask your team lead before offering any credit [F1 §5]. The draft follows the delay reply structure and plain wording, and leaves out the broker and tariff details [F2 §3][F2 §4][F2 §5].',
        '',
        '> "Dear Fabrikam Retail team, we\'re sorry that your order SO-48213 is late. Your store fixtures are held for a routine customs check, and the carrier now expects to deliver them on 20 November 2026. As soon as they are released, we will send them by expedited delivery at no charge, and we will update you again tomorrow."',
        '',
        'Sources',
        SOURCES.order,
        '- [D2] ScenarioOntology · Customer · CUST-1001',
        '- [D3] ScenarioOntology · Shipment · SHP-7781',
        '- [F1] Delayed order handling policy (CS-POL-014) · §4 Remedies by service tier, §5 Approvals, §6 Delivery dates',
        '- [F2] Customer communication guideline: delayed orders (CS-GDL-007) · §3 Structure, §4 What never goes into a reply, §5 Plain wording',
        `- [W1] ${SOURCES.logistics}`,
        `- [W2] ${SOURCES.accountManager}`,
        `- [Web1] ${SOURCES.web}`,
        '',
        'Steps',
        '1. Fabric IQ ontology: asked for the SalesOrder row SO-48213 with its customer and shipment; it returned the order, its Gold customer and shipment SHP-7781 on a customs hold, with a current expected date.',
        '2. Foundry IQ knowledge: asked for the remedies and approvals for a Gold order 5 business days late and how to word the reply; it returned the delayed order policy and the communication guideline.',
        '3. Work IQ mail: searched your mail for "SO-48213"; it returned two messages.',
        '4. Web IQ public context: searched public guidance on customs hold clearance times, with no customer, order or carrier detail; it returned one general page.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('why order SO-48213 is late, when it will arrive or what we may offer, so I can\'t draft a reply with facts'),
  },
  [whyLate]: {
    with_iq: {
      tools: [
        { server: 'fabric_iq_ontology', tool: 'ask_ontology', arguments: JSON.stringify({ question: ORDER_QUESTION }) },
        { server: 'work_iq_mail', tool: 'fetch', arguments: MAIL_SEARCH },
      ],
      answer: [
        '**SO-48213 is 5 business days late: its shipment SHP-7781 is on a customs hold, and the carrier expects to deliver it on 20 November 2026.** [D1][D2]',
        '',
        '- The order was promised for 13 November 2026 [D1].',
        '- SHP-7781 is held at the Eastport import hub for a customs documentation check; its expected date is current, last updated by the carrier on 18 November 2026 [D2].',
        '- Logistics reports that corrected documents were filed on 17 November 2026 and expects release on 19 November 2026 [W1]. That is what a colleague reported; the live shipment data is current, and it still shows the hold [D2].',
        '',
        'Sources',
        SOURCES.order,
        '- [D2] ScenarioOntology · Shipment · SHP-7781',
        `- [W1] ${SOURCES.logistics}`,
        '',
        'Steps',
        '1. Fabric IQ ontology: asked for the SalesOrder row SO-48213 with its shipment; it returned the order and shipment SHP-7781.',
        '2. Work IQ mail: searched your mail for "SO-48213"; it returned two messages, one about the hold.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('why order SO-48213 is late or when it will arrive'),
  },
  [delayed]: {
    with_iq: {
      tools: [{
        server: 'fabric_iq_ontology', tool: 'ask_ontology',
        arguments: JSON.stringify({ question: 'Which SalesOrder rows have the OrderStatus value "Delayed"? Return each order\'s ID, DelayBusinessDays and promised date, its customer\'s name and service tier, and its shipment\'s status, last update, CarrierEta and EtaFreshness.' }),
      }],
      answer: [
        '**Two orders are delayed: SO-48213 by 5 business days, with a current expected date, and SO-48217 by 2, whose expected date is flagged stale.** [D1][D3][D4][D6]',
        '',
        '- SO-48213 · Fabrikam Retail, Gold · promised 13 November 2026 · shipment on a customs hold, expected 20 November 2026, current, last carrier update 18 November 2026 [D1][D2][D3]',
        '- SO-48217 · Wide World Importers, Gold · promised 17 November 2026 · shipment delayed, expected 19 November 2026, stale, last carrier update 16 November 2026 [D4][D5][D6]',
        '',
        'The stale flag comes from the curated shipment data, not from my own reading of the dates [D6].',
        '',
        'Sources',
        SOURCES.order,
        '- [D2] ScenarioOntology · Customer · CUST-1001',
        '- [D3] ScenarioOntology · Shipment · SHP-7781',
        '- [D4] ScenarioOntology · SalesOrder · SO-48217',
        '- [D5] ScenarioOntology · Customer · CUST-1004',
        '- [D6] ScenarioOntology · Shipment · SHP-7784',
        '',
        'Steps',
        '1. Fabric IQ ontology: asked for the SalesOrder rows with the OrderStatus value "Delayed", with each customer and shipment and its expected date\'s freshness; it returned SO-48213 and SO-48217.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('which orders are delayed or by how much'),
  },
  [remedies]: {
    with_iq: {
      tools: [{
        server: 'foundry_iq_knowledge', tool: 'knowledge_base_retrieve',
        arguments: '{"queries":["Remedies for a Gold customer whose order is three or more business days late, and who approves them"]}',
      }],
      answer: [
        '**Free expedited delivery, which you may offer yourself, and a service credit of up to 10% of the order value, which needs approval from a team lead first.** [F1 §4][F1 §5]',
        '',
        '- Contact a Gold customer within one business day of the delay showing in the live order data [F1 §3].',
        '- Don\'t offer or mention the credit until a team lead has approved it in the service case; until then, say that further options are being reviewed [F1 §5].',
        '- Anything outside the policy needs the Customer Service manager [F1 §5].',
        '',
        'Sources',
        '- [F1] Delayed order handling policy (CS-POL-014) · §3 Customer contact, §4 Remedies by service tier, §5 Approvals',
        '',
        'Steps',
        '1. Foundry IQ knowledge: asked for the remedies and approvals for a Gold customer three or more business days late; it returned the delayed order handling policy.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('what our policy lets us offer or who approves it'),
  },
  [definitions]: {
    with_iq: {
      tools: [{
        server: 'foundry_iq_knowledge', tool: 'knowledge_base_retrieve',
        arguments: '{"queries":["How DelayBusinessDays is calculated, who owns CarrierEta and when shipment data is stale"]}',
      }],
      answer: [
        '**The delay counts business days after the promised date up to the expected delivery date from the carrier; Logistics Operations owns that date, and it is stale after more than one business day without a carrier event.** [F1 §3][F1 §4][F1 §5]',
        '',
        '- The curated order data calculates the delay, Monday to Friday without deducting public holidays, and nobody recalculates it by hand [F1 §3].',
        '- The expected delivery date comes from carrier events through the transport management system; the shipment data steward handles issues with it [F1 §4][F1 §6].',
        '- Confirm a stale date with Logistics before giving it to a customer [F1 §5].',
        '- The delay changed from calendar to business days on 1 October 2026, after a change notice to every consumer on 15 September 2026 [F1 §7].',
        '',
        'Sources',
        '- [F1] Order and shipment data definitions (DATA-DEF-002) · §3 Order data, §4 Shipment data, §5 Quality expectations, §6 Reporting a data issue, §7 Change history',
        '',
        'Steps',
        '1. Foundry IQ knowledge: asked how the delay is calculated, who owns the expected delivery date and when it is stale; it returned the order and shipment data definitions.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('how our data defines a delay, who owns the expected delivery date or when it is stale'),
  },
  [publicContext]: {
    with_iq: {
      tools: [{
        server: 'web_iq_public_context', tool: 'knowledge_base_retrieve',
        arguments: '{"queries":["common causes of import customs holds and typical clearance time"]}',
      }],
      answer: [
        '**Public context, not company guidance:** customs holds commonly follow documents that don\'t match, missing certificates or random inspections, and are often cleared within a few working days once complete documents are filed [Web1].',
        '',
        'Sources',
        `- [Web1] ${SOURCES.web}`,
        '',
        'Steps',
        '1. Web IQ public context: searched public guidance on the causes of customs holds and typical clearance times, with no customer, order or carrier detail; it returned one general page.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('public guidance on customs holds'),
  },
  [mail]: {
    with_iq: {
      consent: 'work_iq_mail',
      tools: [{ server: 'work_iq_mail', tool: 'fetch', arguments: MAIL_SEARCH }],
      answer: [
        '**Two recent messages mention SO-48213.**',
        '',
        '- The logistics coordinator reports that shipment SHP-7781 is held at customs because the invoice did not match the packing list, that corrected documents were filed on 17 November 2026 and that release is expected on 19 November 2026; broker and tariff details stay out of customer replies [W1].',
        '- The account manager says the customer needs the fixtures before its store opens on 24 November 2026, asks to be copied on the reply and supports offering expedited delivery [W2].',
        '',
        'Mail is what colleagues reported or asked, not current status; the live order data holds that.',
        '',
        'Sources',
        `- [W1] ${SOURCES.logistics}`,
        `- [W2] ${SOURCES.accountManager}`,
        '',
        'Steps',
        '1. Work IQ mail: searched your mail for "SO-48213"; it returned two messages.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('what your mail says about SO-48213'),
  },
  [guidanceAndContext]: {
    with_iq: {
      tools: [
        {
          server: 'foundry_iq_knowledge', tool: 'knowledge_base_retrieve',
          arguments: '{"queries":["How a customs hold is handled, who acts, its typical timeline and how to describe it to a customer"]}',
        },
        {
          server: 'web_iq_public_context', tool: 'knowledge_base_retrieve',
          arguments: '{"queries":["common causes of customs holds and typical customs clearance times"]}',
        },
      ],
      answer: [
        '**Describe a customs hold to the customer as a routine customs check: the logistics coordinator owns the hold, and the customer hears only the expected delivery date from the live shipment data.** [F1 §2][F1 §3][F1 §5]',
        '',
        '- Ask the logistics coordinator for updates; customer service never contacts the carrier or the customs broker directly [F1 §2].',
        '- After corrected documents are filed, release usually follows within one to two business days and delivery within one further business day. That is internal guidance, not a commitment to the customer [F1 §3].',
        '- Escalate to the Logistics Operations lead when a hold lasts more than three business days [F1 §4].',
        '- To the customer: apologise once, say the order is held for a routine customs check, give the expected delivery date as expected rather than guaranteed, and say when they will hear from us next [F2 §2][F2 §3][F2 §5].',
        '- Never mention tariff or customs codes, document details or the broker [F1 §5][F2 §4].',
        '',
        '**Public context, not company guidance:** holds commonly follow incomplete or inconsistent documents, classification or valuation questions and inspections; clearance ranges from a day or two for a routine release to weeks for an intensive exam [Web1].',
        '',
        'Sources',
        '- [F1] Customs holds: internal handling note (LOG-KB-031) · §2 Who acts, §3 Typical timeline, §4 Escalation, §5 Customer wording',
        '- [F2] Customer communication guideline: delayed orders (CS-GDL-007) · §2 Tone, §3 Structure of a delay reply, §4 What never goes into a customer reply, §5 Plain wording for common causes',
        `- [Web1] ${SOURCES.web}`,
        '',
        'Steps',
        '1. Foundry IQ knowledge: asked how a customs hold is handled, who acts, its typical timeline and how to describe it to a customer; it returned the customs-hold note and the communication guideline.',
        '2. Web IQ public context: searched public guidance on the common causes of customs holds and typical clearance times, with no customer, order or carrier detail; it returned one general page.',
      ].join('\n'),
    },
    without_iq: NO_TOOLS('our customs-hold guidance or public context on customs holds'),
  },
}

// A follow-up that asks the agent to act, as the demo's review step: both variants refuse in the instructions' words.
export const MOCK_REFUSAL = 'I can\'t send, change or approve anything. A person on the team makes that decision; I can draft or check it for you.'
export const MOCK_FOLLOW_UPS: Readonly<Record<string, Record<Variant, Canned>>> = {
  'Send that reply to the customer now and approve the credit.': {
    with_iq: { tools: [], answer: MOCK_REFUSAL },
    without_iq: { tools: [], answer: MOCK_REFUSAL },
  },
}

const FALLBACK: Canned = {
  tools: [],
  answer: '**Mock mode has canned answers for the sample questions only.** Pick a sample question, or run `npm run dev` against a deployment to ask the live agents.',
}

function canned(question: string, variant: Variant): Canned {
  const key = question.trim().toLowerCase()
  for (const answers of [MOCK_ANSWERS, MOCK_FOLLOW_UPS]) {
    const match = Object.keys(answers).find((asked) => asked.toLowerCase() === key)
    if (match) return answers[match][variant]
  }
  return FALLBACK
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}

export interface MockOptions {
  delayMs?: number
  log?: (record: TurnLog) => void
}

export function createMockClient(options: MockOptions = {}): AgentClient {
  const delayMs = options.delayMs ?? MOCK_DELAY_MS
  // The servers this mock user has "consented" to: a question that needs one asks for consent once.
  const consented = new Set<string>()
  const send: Send = async (question, _cid, signal, onTool): Promise<TurnOutcome> => {
    const reply = canned(question.text, question.variant)
    const responseId = `resp_mock_${crypto.randomUUID().replaceAll('-', '')}`
    if (reply.consent && !consented.has(reply.consent)) {
      await pause(delayMs, signal)
      consented.add(reply.consent)
      return { status: 'needs-consent', consentUrl: MOCK_CONSENT_URL, server: reply.consent, responseId, toolCalls: [] }
    }
    const calls: ToolCall[] = []
    for (const [index, tool] of reply.tools.entries()) {
      const id = `mock_call_${index + 1}`
      const started = performance.now()
      onTool({ id, server: tool.server, tool: tool.tool, state: 'running' })
      await pause(delayMs, signal)
      const done: ToolCall = {
        id, server: tool.server, tool: tool.tool, state: 'completed', ms: Math.round(performance.now() - started), arguments: tool.arguments,
      }
      calls.push(done)
      onTool(done)
    }
    await pause(delayMs / 2, signal)
    return { status: 'answered', text: reply.answer, responseId, toolCalls: calls }
  }
  return {
    mode: 'mock',
    ask: (question, signal, onTool) => runTurn({ question, send, signal, onTool, log: options.log }),
  }
}
