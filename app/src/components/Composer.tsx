import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CHOICES, CHOICE_HINTS, type Choice } from '../labels.ts'
import { QUESTION_LIMIT } from '../live/protocol.ts'
import { SAMPLES } from '../samples.ts'
import { Icon } from './Icon.tsx'
import { SourceFlow } from './SourceFlow.tsx'

interface ComposerProps {
  blocked?: string
  choice: Choice
  onChoice: (choice: Choice) => void
  onAsk: (question: string, choice: Choice) => void
}

const shortcuts = [
  { index: 2, label: 'Check delayed orders', icon: 'order' },
  { index: 3, label: 'Review policy options', icon: 'policy' },
  { index: 0, label: 'Draft a customer reply', icon: 'draft' },
] as const

export function Composer({ blocked, choice, onChoice, onAsk }: ComposerProps) {
  const [text, setText] = useState<string>(SAMPLES[1].question)
  const [allSamples, setAllSamples] = useState(false)
  const id = useId()
  const question = text.trim()
  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!blocked && question) onAsk(question, choice)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }
  return (
    <>
      <section className="inquiry-intro" aria-labelledby={`${id}-title`}>
        <div className="intro-type">
          <h1 id={`${id}-title`} tabIndex={-1}>Ask about <br /><span>an order.</span></h1>
          <p className="case-line"><Icon name="order" size={16} /><code>SO-48213</code><span className="slash">/</span>Fabrikam Retail</p>
        </div>
        <SourceFlow withTools={choice !== 'without_iq'} />
      </section>
      <form className="composer" onSubmit={submit}>
        <label htmlFor={`${id}-question`} className="composer-label">Your question</label>
        <textarea id={`${id}-question`} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown}
          maxLength={QUESTION_LIMIT} rows={2} placeholder="Ask about an order…" aria-describedby={`${id}-hint`} />
        <div className="composer-bar">
          <fieldset className="segmented">
            <legend className="visually-hidden">Which agent to ask</legend>
            {CHOICES.map((option) => (
              <label key={option.value} title={CHOICE_HINTS[option.value]}>
                <input type="radio" name={`${id}-variant`} value={option.value} checked={choice === option.value} onChange={() => onChoice(option.value)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          {text.length >= QUESTION_LIMIT - 200 && <span className="count">{text.length} / {QUESTION_LIMIT}</span>}
          <button type="submit" className="primary ask" aria-label="Ask question" disabled={Boolean(blocked) || !question}>
            <span>Ask<span className="ask-suffix"> question</span></span><Icon name="up" size={16} />
          </button>
        </div>
        <p id={`${id}-hint`} className={blocked ? 'hint' : 'visually-hidden'}>{blocked ?? `${CHOICE_HINTS[choice]} Enter to ask; Shift+Enter for a new line.`}</p>
      </form>
      <section className="samples" aria-labelledby={`${id}-samples`}>
        <div className="section-line">
          <h2 id={`${id}-samples`}>Sample questions</h2>
          <button className="text-button" type="button" aria-expanded={allSamples} aria-controls={`${id}-all`} onClick={() => setAllSamples(!allSamples)}>
            {allSamples ? 'Show less' : `View all ${SAMPLES.length}`}<Icon name="chevron" size={16} />
          </button>
        </div>
        {!allSamples && <ul className="shortcuts">
          {shortcuts.map(({ index, label, icon }) => <li key={index}>
            <button type="button" disabled={Boolean(blocked)} onClick={() => onAsk(SAMPLES[index].question, choice)} title={SAMPLES[index].question}>
              <span className="shortcut-icon"><Icon name={icon} size={19} /></span>{label}<Icon name="diagonal" size={14} />
            </button>
          </li>)}
        </ul>}
        <ul className="sample-list" id={`${id}-all`} hidden={!allSamples}>
          {SAMPLES.map((sample) => <li key={sample.question}><button type="button" disabled={Boolean(blocked)} onClick={() => onAsk(sample.question, choice)}>
            <span>{sample.question}{sample.note && <small>{sample.note}</small>}</span><Icon name="diagonal" size={15} />
          </button></li>)}
        </ul>
      </section>
    </>
  )
}
