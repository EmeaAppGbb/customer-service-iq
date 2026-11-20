import type { Turn } from './exchanges.ts'
import { LEGEND } from './labels.ts'
import { iqOf } from './live/protocol.ts'
import type { IqKey } from './live/types.ts'

export type SourceState = 'preview' | 'idle' | 'reading' | 'consulted' | 'cited' | 'consent' | 'failed'
export interface Signal {
  iq: IqKey
  state: SourceState
}

export const SOURCE_STATES: Record<SourceState, string> = {
  preview: 'Source type',
  idle: 'Not used',
  reading: 'Reading',
  consulted: 'Consulted',
  cited: 'Cited',
  consent: 'Needs consent',
  failed: 'Call failed',
}

// A completed tool call isn't necessarily evidence in the answer. Only the reply can mark a ribbon as cited.
export function sourceFlow(turn?: Turn, withTools = true): Signal[] {
  return LEGEND.map(({ iq }) => {
    let state: SourceState = !turn && withTools ? 'preview' : 'idle'
    if (turn && withTools) {
      const calls = turn.toolCalls.filter((call) => iqOf(call.server) === iq)
      const result = turn.result
      if (result?.status === 'answered' && result.reply.usedIqs.includes(iq)) state = 'cited'
      else if (result?.status === 'needs-consent' && result.server && iqOf(result.server) === iq) state = 'consent'
      else if (turn.running && calls.some((call) => call.state === 'running')) state = 'reading'
      else if (calls.at(-1)?.state === 'failed') state = 'failed'
      else if (calls.some((call) => call.state === 'completed')) state = 'consulted'
    }
    return { iq, state }
  })
}
