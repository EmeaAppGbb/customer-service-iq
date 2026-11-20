import { useState } from 'react'
import { CHOICES, CHOICE_HINTS } from '../labels.ts'
import type { Session } from '../live/types.ts'
import { CASE_BRIEF } from '../samples.ts'
import { Dialog } from './Dialog.tsx'
import { Icon, Mark } from './Icon.tsx'

interface HeaderProps {
  session?: Session
  onHistory?: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export function Header({ session, onHistory, onSignIn, onSignOut }: HeaderProps) {
  const [brief, setBrief] = useState(false)
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand"><Mark /><span>Customer Service <strong>IQ</strong></span></div>
        <div className="header-actions">
          {session?.mode === 'mock' && <span className="environment" title={session.notice}><i aria-hidden="true" />Local demo</span>}
          {onHistory && <button className="icon-button" title="Question history" aria-label="Question history" type="button" onClick={onHistory}><Icon name="history" /></button>}
          <button type="button" className="brief-button" aria-label="Case brief" title="Case brief" onClick={() => setBrief(true)}><Icon name="brief" size={16} /><span>Case brief</span></button>
          {session?.mode === 'live' && (
            <div className="account">
              {session.identity ? <><span className="user">{session.identity.name}</span><button type="button" className="secondary" onClick={onSignOut}>Sign out</button></>
                : <button type="button" className="primary" onClick={onSignIn}>Sign in</button>}
            </div>
          )}
        </div>
      </div>
      {brief && <Dialog title="Case brief" onDismiss={() => setBrief(false)}>
        <p>{CASE_BRIEF}</p>
        <details className="disclosure"><summary>About the agents</summary>
          <dl className="mode-guide">{CHOICES.map(({ label, value }) => <div key={value}><dt>{label}</dt><dd>{CHOICE_HINTS[value]}</dd></div>)}</dl>
        </details>
        <p className="sheet-note">Everything in this scenario is fictional.{session?.notice && <> {session.notice}.</>}</p>
      </Dialog>}
    </header>
  )
}
