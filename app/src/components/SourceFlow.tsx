import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Turn } from '../exchanges.ts'
import { LEGEND } from '../labels.ts'
import { IQ_NAMES } from '../live/protocol.ts'
import { SOURCE_STATES, sourceFlow, type Signal } from '../sourceFlow.ts'
import { mountFlow } from '../visual/renderFlow.ts'
import { FIELD, inlet, strand } from '../visual/ribbons.ts'
import { Dialog } from './Dialog.tsx'
import { Icon } from './Icon.tsx'

const motionQuery = '(prefers-reduced-motion: reduce)'
function subscribeMotion(update: () => void) {
  const query = window.matchMedia(motionQuery)
  query.addEventListener('change', update)
  return () => query.removeEventListener('change', update)
}
const Motion = createContext({ paused: false, reduced: false, toggle: () => {} })
export function FlowMotion({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false)
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches)
  return <Motion.Provider value={{ paused: paused || reduced, reduced, toggle: () => setPaused((old) => !old) }}>{children}</Motion.Provider>
}

const viewBox = `0 0 ${FIELD.width} ${FIELD.height}`
const strands = LEGEND.map((_, lane) => Array.from({ length: 15 }, (__, i) => strand(lane, (i - 7) / 7)))

function Ribbons({ signals, paused }: { signals: Signal[]; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const renderer = useRef<ReturnType<typeof mountFlow>>(undefined)
  useEffect(() => {
    renderer.current = mountFlow(host.current!)
    return () => renderer.current?.dispose()
  }, [])
  useEffect(() => { renderer.current?.update({ signals, paused }) }, [signals, paused])
  return (
    <div className="ribbon-map" role="img" aria-label={signals.map(({ iq, state }) => `${IQ_NAMES[iq]}: ${SOURCE_STATES[state]}`).join('; ')}>
      <div className="inlets" aria-hidden="true">
        {signals.map(({ iq, state }) => <span key={iq} data-state={state}>{IQ_NAMES[iq]}</span>)}
      </div>
      <div className="field" ref={host} aria-hidden="true">
        <svg viewBox={viewBox} preserveAspectRatio="none" className="silk" fill="none">
          {signals.map(({ iq, state }, lane) => <g key={iq} className={`pigment-${iq}`} data-pigment="">
            <g data-state={state}>{strands[lane].map((d, i) => <path key={i} d={d} stroke="currentColor" strokeWidth={i % 3 ? 1 : 1.7} />)}</g>
          </g>)}
          <g data-pigment="" className="pearl" /><g data-pigment="" className="rest" />
        </svg>
        <svg viewBox={viewBox} preserveAspectRatio="none" className="terminals" fill="none">
          {signals.map(({ iq, state }, lane) => <g key={iq} className={`pigment-${iq}`} data-state={state}>
            <path d={`M0 ${inlet(lane)}H${FIELD.start}`} stroke="currentColor" />
            <circle cx={FIELD.start} cy={inlet(lane)} r="2.8" fill="currentColor" />
          </g>)}
          <circle cx={FIELD.end} cy={FIELD.mid} r="7" className="outlet" />
          <circle cx={FIELD.end} cy={FIELD.mid} r="2" fill="currentColor" />
        </svg>
        <span className="outlet-label">Answer</span>
      </div>
    </div>
  )
}

function flowCaption(signals: Signal[], turn?: Turn, withTools = true) {
  if (!withTools) return 'No tools selected'
  if (!turn) return 'Overview'
  const reading = signals.filter(({ state }) => state === 'reading').map(({ iq }) => IQ_NAMES[iq])
  if (reading.length) return `Reading ${reading.join(' + ')}`
  if (turn.running) return turn.toolCalls.length ? 'Preparing answer' : 'Waiting for sources'
  if (turn.result?.status === 'needs-consent') return 'Awaiting consent'
  if (turn.result?.status === 'failed') return 'Run ended'
  const cited = signals.filter(({ state }) => state === 'cited')
  return cited.length ? `${cited.length} source ${cited.length === 1 ? 'type' : 'types'} cited` : 'No sources cited'
}

export function SourceFlow({ turn, withTools = true }: { turn?: Turn; withTools?: boolean }) {
  const signals = useMemo(() => sourceFlow(turn, withTools), [turn, withTools])
  const [expanded, setExpanded] = useState(false)
  const { paused, reduced, toggle } = useContext(Motion)
  const caption = flowCaption(signals, turn, withTools)
  const pause = !reduced && signals.some(({ state }) => state === 'preview' || state === 'reading' || state === 'cited') && (
    <button className="icon-button motion-control" type="button" aria-label={paused ? 'Play source animation' : 'Pause source animation'}
      title={paused ? 'Play animation' : 'Pause animation'} onClick={toggle}><Icon name={paused ? 'play' : 'pause'} size={15} /></button>
  )
  return (
    <figure className={`source-flow ${turn ? 'compact-flow' : 'overview-flow'}`}>
      <Ribbons signals={signals} paused={paused || expanded} />
      <figcaption className="flow-caption">
        <span className="flow-title"><Icon name="flow" size={16} />Source flow</span>
        <span className="flow-status">{caption}</span>
        <span className="flow-controls">{pause}
          <button className="icon-button" aria-label="Expand source flow" title="Expand source flow" type="button" onClick={() => setExpanded(true)}><Icon name="expand" size={15} /></button>
        </span>
      </figcaption>
      {expanded && <Dialog title="Source flow" onDismiss={() => setExpanded(false)}>
        <p className="sheet-note">{!turn ? 'These are the four source types. No data has been requested.'
          : 'Consulted means a tool returned. Cited means the answer references that source type.'}</p>
        <div className="expanded-flow"><Ribbons signals={signals} paused={paused} />
          <div className="flow-caption"><span>{caption}</span>{pause}</div>
          <p className="static-note">WebGL is unavailable. This static map still shows each source’s state.</p>
        </div>
        <dl className="signal-list">
          {signals.map(({ iq, state }, i) => <div key={iq}>
            <dt><span className={`source-key cite-${iq}`}>{LEGEND[i].marker}</span>{IQ_NAMES[iq]}</dt>
            <dd>{LEGEND[i].what}{iq === 'work' && ' (when enabled)'}</dd>
            <dd className="signal-state">{SOURCE_STATES[state]}</dd>
          </div>)}
        </dl>
      </Dialog>}
    </figure>
  )
}
