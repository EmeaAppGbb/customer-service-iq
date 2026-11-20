// One folded sheet per source. The SVG fallback and the GPU mesh share the same endpoints and folds.
export const FIELD = { width: 540, height: 224, start: 16, end: 522, mid: 112 } as const
export const inlet = (lane: number) => 46 + lane * 44

function point(lane: number, t: number, s: number) {
  const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.12)
  const phase = t * 7.65 + lane * 1.48 - 1.17
  const twist = phase * 0.89 + 0.9 * Math.sin(t * 3.4 + lane * 0.55)
  const width = envelope * (28 + 9 * Math.sin(phase - 0.5))
  const arch = (1 - s * s) * width * 0.3
  return [
    FIELD.start + t * (FIELD.end - FIELD.start) + envelope * 29 * Math.sin(phase + 0.9) + s * width * 0.33 * Math.sin(twist),
    FIELD.mid + (inlet(lane) - FIELD.mid) * (1 - t) ** 2 + envelope * 68 * Math.sin(phase)
      + s * width * Math.cos(twist) - arch * Math.sin(twist),
    envelope * 64 * Math.cos(phase) + s * width * Math.sin(twist) + arch * Math.cos(twist),
  ]
}

export function strand(lane: number, across: number): string {
  return Array.from({ length: 85 }, (_, i) => {
    const [x, y] = point(lane, i / 84, across)
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join('')
}

export function ribbonMesh() {
  const along = 144, across = 8, lanes = 4
  const vertices: number[] = [], indices: number[] = []
  for (let lane = 0; lane < lanes; lane++) {
    const base = vertices.length / 6
    for (let i = 0; i <= along; i++) {
      for (let j = 0; j <= across; j++) {
        const t = i / along, s = j / across * 2 - 1
        const p = point(lane, t, s)
        const light = 0.5 + 0.5 * Math.cos(t * 7.65 + lane * 1.48 - 0.5 + s * 1.18)
        vertices.push(...p, t, s, light)
        if (i === along || j === across) continue
        const a = base + i * (across + 1) + j, b = a + across + 1
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices), perLane: along * across * 6 }
}
