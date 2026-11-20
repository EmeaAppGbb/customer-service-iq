import type { ReactNode } from 'react'

const paths = {
  up: <path d="M12 19V5m-6 6 6-6 6 6" />,
  next: <path d="M4 12h15m-6-6 6 6-6 6" />,
  back: <path d="M20 12H5m6-6-6 6 6 6" />,
  diagonal: <path d="M6 18 18 6M7 6h11v11" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  expand: <path d="M14 4h6v6m0-6-6 6M10 20H4v-6m0 6 6-6" />,
  pause: <path d="M9 5v14m6-14v14" />,
  play: <path d="m8 5 10 7-10 7z" />,
  order: <><path d="m12 2.8 8.5 4.8v9L12 21.3l-8.5-4.7v-9zM3.5 7.6 12 12l8.5-4.4M12 12v9.3M7.8 5.2l8.4 4.6" /></>,
  policy: <><path d="M5 4h7c2 0 3 1 3 2v14c0-1.6-1-2.5-3-2.5H5zM15 6c1-1.4 2.7-2 5-2v13.5c-2.6 0-4 .8-5 2.5" /></>,
  draft: <><path d="M12 5H5v15h14v-7m-9 2 1-4L18.6 3.4a1.7 1.7 0 0 1 2.4 2.4L13.5 14z" /></>,
  brief: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12c5 2 13 2 18 0m-9 0v3" /></>,
  history: <><path d="M3 10a9 9 0 1 1 1.5 7M3 4v6h6m3-4v6l4 2" /></>,
  flow: <path d="M3 5c8 0 9 14 18 14M3 12c7 0 11-7 18-7M3 19c7 0 11-7 18-7" />,
  enter: <path d="M19 5v8H5m5-5-5 5 5 5" />,
  chevron: <path d="m8 10 4 4 4-4" />,
} satisfies Record<string, ReactNode>

export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return <svg className="icon" aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export function Mark() {
  return <svg className="brand-mark" aria-hidden="true" width="34" height="34" viewBox="0 0 36 36" fill="none">
    {[0, 5, 10, 15].map((x) => <path key={x} transform={`translate(${x} 0)`} d="M3 26C3 19 14 17 14 10"
      stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" />)}
  </svg>
}
