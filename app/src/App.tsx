import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Composer } from './components/Composer.tsx'
import { Dialog } from './components/Dialog.tsx'
import { ExchangeView, type TurnActions } from './components/Exchange.tsx'
import { Header } from './components/Header.tsx'
import { Icon } from './components/Icon.tsx'
import { FlowMotion } from './components/SourceFlow.tsx'
import { followUpFrom, newTurn, reduce, type Exchange, type Thread, type Turn } from './exchanges.ts'
import type { Choice } from './labels.ts'
import { createAgentClient, loadSession } from './live/client.ts'
import type { Question, Session, Variant } from './live/types.ts'

type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; session: Session }
  | { status: 'failed'; message: string }

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function App() {
  const [sessionState, setSessionState] = useState<SessionState>({ status: 'loading' })
  const [problem, setProblem] = useState<string>()
  const [exchanges, dispatch] = useReducer(reduce, [])
  const [selected, setSelected] = useState<string>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [choice, setChoice] = useState<Choice>('with_iq')
  const main = useRef<HTMLElement>(null)
  const previousSelection = useRef(selected)
  const current = exchanges.find((exchange) => exchange.id === selected)
  const client = useMemo(() => createAgentClient(), [])
  // The running turns' controllers, by turn: Stop aborts one, and the server then stops its Foundry run.
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    let active = true
    loadSession().then(
      (session) => {
        if (active) setSessionState({ status: 'ready', session })
      },
      (error: unknown) => {
        if (active) setSessionState({ status: 'failed', message: messageOf(error, 'Sign-in could not start.') })
      },
    )
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const running = controllers.current
    return () => {
      for (const controller of running.values()) controller.abort()
    }
  }, [])

  useEffect(() => {
    if (selected === previousSelection.current) return
    previousSelection.current = selected
    main.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [selected])

  const session = sessionState.status === 'ready' ? sessionState.session : undefined
  const blocked = sessionState.status === 'loading' ? 'Connecting to the app server…'
    : sessionState.status === 'failed' ? 'The app can’t ask the agents until sign-in starts.'
      : session?.identity ? undefined : 'Sign in with your Microsoft Entra account to ask the agents.'

  const run = useCallback((turnId: string, question: Question) => {
    const controller = new AbortController()
    controllers.current.set(turnId, controller)
    void client.ask(question, controller.signal, (call) => dispatch({ type: 'tool', turnId, call })).then((result) => {
      if (controllers.current.get(turnId) === controller) controllers.current.delete(turnId)
      dispatch({ type: 'finish', turnId, result })
    })
  }, [client])

  const ask = useCallback((text: string, choice: Choice) => {
    const variants: Variant[] = choice === 'both' ? ['with_iq', 'without_iq'] : [choice]
    const startedAt = performance.now()
    const exchange: Exchange = {
      id: crypto.randomUUID(),
      question: text,
      threads: variants.map((variant) => ({ id: crypto.randomUUID(), variant, turns: [newTurn(crypto.randomUUID(), text, startedAt)] })),
    }
    dispatch({ type: 'ask', exchange })
    setSelected(exchange.id)
    for (const thread of exchange.threads) run(thread.turns[0].id, { variant: thread.variant, text })
  }, [run])

  const authenticate = useCallback((action: 'signIn' | 'signOut') => {
    setProblem(undefined)
    session?.[action]().catch((error: unknown) => setProblem(messageOf(error, 'Microsoft Entra sign-in did not start. Try again.')))
  }, [session])

  const actions = useMemo<TurnActions>(() => ({
    onFollowUp: (thread: Thread, text: string) => {
      const previousResponseId = followUpFrom(thread)
      const turn = newTurn(crypto.randomUUID(), text, performance.now(), previousResponseId)
      dispatch({ type: 'follow-up', threadId: thread.id, turn })
      run(turn.id, { variant: thread.variant, text, ...(previousResponseId ? { previousResponseId } : {}) })
    },
    onRetry: (thread: Thread, turn: Turn) => {
      dispatch({ type: 'restart', turnId: turn.id, startedAt: performance.now() })
      run(turn.id, { variant: thread.variant, text: turn.question, ...(turn.previousResponseId ? { previousResponseId: turn.previousResponseId } : {}) })
    },
    onStop: (turn: Turn) => controllers.current.get(turn.id)?.abort(),
    onSignIn: () => authenticate('signIn'),
  }), [run, authenticate])

  return (
    <FlowMotion>
      <a className="skip-link" href="#main">Skip to the question</a>
      <Header session={session} onHistory={exchanges.length ? () => setHistoryOpen(true) : undefined}
        onSignIn={() => authenticate('signIn')} onSignOut={() => authenticate('signOut')} />
      <main id="main" className="page" ref={main}>
        {sessionState.status === 'failed' && (
          <div className="notice error page-notice" role="alert">
            <p>{sessionState.message}</p>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        )}
        {problem && <div className="notice error page-notice" role="alert"><p>{problem}</p></div>}
        {current ? <>
          <button type="button" className="text-button new-question" onClick={() => setSelected(undefined)}><Icon name="back" size={16} />New question</button>
          <ExchangeView key={current.id} exchange={current} actions={actions} />
        </> : <Composer blocked={blocked} choice={choice} onChoice={setChoice} onAsk={ask} />}
      </main>
      <footer className="footer">
        <span>Fictional order scenario</span>
        <span>{session?.mode === 'mock' ? 'Sample answers · No sign-in' : 'Microsoft Foundry'}</span>
      </footer>
      {historyOpen && <Dialog title="Question history" onDismiss={() => setHistoryOpen(false)}>
        <p className="sheet-note">Questions from this tab, newest first.</p>
        <ol className="sample-list">{exchanges.map((exchange) => <li key={exchange.id}>
          <button type="button" onClick={() => { setSelected(exchange.id); setHistoryOpen(false) }}>
            <span>{exchange.question}</span><Icon name="next" size={16} />
          </button>
        </li>)}</ol>
      </Dialog>}
    </FlowMotion>
  )
}
