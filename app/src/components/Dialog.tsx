import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon.tsx'

export function Dialog({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog ref={ref} className="sheet" aria-labelledby={id}
      onCancel={(event) => { event.preventDefault(); onDismiss() }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss() }}>
      <div className="sheet-inner">
        <header className="sheet-head"><h2 id={id}>{title}</h2>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onDismiss}><Icon name="close" /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
