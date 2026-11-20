import type { Signal } from '../sourceFlow.ts'
import { FIELD, ribbonMesh } from './ribbons.ts'

const vertex = `
  attribute vec3 position;
  attribute vec3 material;
  uniform mediump float time, lane, strength;
  varying mediump vec3 v;
  void main() {
    v = material;
    float t = v.x, envelope = sin(t * 3.14159265);
    vec3 p = position;
    p.y += envelope * strength * (6.0 * sin(time * 0.52 + t * 6.5 + lane) + 2.4 * v.y * cos(time * 0.4 + lane));
    p.x += envelope * strength * 3.5 * sin(time * 0.36 + t * 5.0 + lane);
    gl_Position = vec4(p.x / ${FIELD.width}.0 * 2.0 - 1.0, 1.0 - p.y / ${FIELD.height}.0 * 2.0, -p.z / 140.0, 1.0);
  }
`
const fragment = `
  precision mediump float;
  uniform vec3 pigment, pearl, rest;
  uniform float time, lane, strength, travel;
  varying vec3 v;
  void main() {
    float l = v.z;
    float fibre = cos(v.y * 59.7 + sin(v.x * 5.0 + lane) * 0.8);
    vec3 silk = pigment * (0.48 + 0.55 * l);
    silk = mix(silk, pearl, 0.62 * pow(l, 4.0) + 0.09 * (fibre + 1.0));
    silk = mix(silk, pearl, smoothstep(0.94, 1.0, abs(v.y)) * 0.42);
    float packet = fract(v.x - time * travel + lane * 0.21);
    float glint = smoothstep(0.82, 0.98, packet) * (1.0 - smoothstep(0.98, 1.0, packet));
    silk = mix(silk, pearl, glint * min(1.0, travel * 3.5));
    gl_FragColor = vec4(mix(rest, silk, strength), 1.0);
  }
`

export interface FlowSettings { signals: Signal[]; paused: boolean }

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const item = gl.createShader(type)
  if (!item) return null
  gl.shaderSource(item, source)
  gl.compileShader(item)
  if (gl.getShaderParameter(item, gl.COMPILE_STATUS)) return item
  gl.deleteShader(item)
  return null
}

// The canvas is a progressive enhancement. Losing a context immediately uncovers the same, labelled SVG map.
export function mountFlow(host: HTMLElement) {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' })
  if (!gl) return
  const release = () => gl.getExtension('WEBGL_lose_context')?.loseContext()
  const vs = shader(gl, gl.VERTEX_SHADER, vertex), fs = shader(gl, gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram(), buffer = gl.createBuffer(), index = gl.createBuffer()
  if (!vs || !fs || !program || !buffer || !index) { release(); return }
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { release(); return }
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  gl.useProgram(program)
  const mesh = ribbonMesh()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
  for (const [offset, name] of ['position', 'material'].entries()) {
    const location = gl.getAttribLocation(program, name)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset * 12)
  }
  const uniform = (name: string) => gl.getUniformLocation(program, name)
  const u = { time: uniform('time'), lane: uniform('lane'), pigment: uniform('pigment'), pearl: uniform('pearl'),
    rest: uniform('rest'), strength: uniform('strength'), travel: uniform('travel') }
  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)
  // Resolve the very same CSS colors as the fallback into sRGB (including color-mix and the active theme).
  const sampler = document.createElement('canvas')
  sampler.width = sampler.height = 1
  const swatch = sampler.getContext('2d', { willReadFrequently: true })
  if (!swatch) { release(); return }
  const palette = () => Array.from(host.querySelectorAll<SVGElement>('[data-pigment]'), (element) => {
    swatch.fillStyle = getComputedStyle(element).color
    swatch.fillRect(0, 0, 1, 1)
    return new Float32Array(swatch.getImageData(0, 0, 1, 1).data.slice(0, 3)).map((value) => value / 255)
  })
  let colors = palette()
  host.append(canvas)
  host.dataset.renderer = 'webgl'
  let settings: FlowSettings = { signals: [], paused: true }
  let visible = true, frame = 0, elapsed = 0, last = 0
  const running = () => !settings.paused && visible && !document.hidden
    && settings.signals.some(({ state }) => ['preview', 'reading', 'cited'].includes(state))
  const draw = (now: number) => {
    frame = 0
    if (gl.isContextLost() || !visible || document.hidden) { last = 0; return }
    if (last && running()) elapsed += Math.min(now - last, 80) / 1000
    last = running() ? now : 0
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniform1f(u.time, elapsed)
    gl.uniform3fv(u.pearl, colors[4])
    gl.uniform3fv(u.rest, colors[5])
    // Draw the quiet, unused ribbons behind active ones, so they cannot cover the evidence.
    for (const active of [false, true]) {
      if (active) gl.clear(gl.DEPTH_BUFFER_BIT)
      settings.signals.forEach(({ state }, i) => {
        const lit = ['preview', 'reading', 'consulted', 'cited'].includes(state)
        if (lit !== active) return
        gl.uniform1f(u.lane, i)
        gl.uniform3fv(u.pigment, colors[i])
        gl.uniform1f(u.strength, lit ? (state === 'consulted' ? 0.65 : 1) : 0)
        gl.uniform1f(u.travel, state === 'reading' ? 0.62 : state === 'cited' ? 0.18 : 0)
        gl.drawElements(gl.TRIANGLES, mesh.perLane, gl.UNSIGNED_SHORT, i * mesh.perLane * 2)
      })
    }
    if (running()) frame = requestAnimationFrame(draw)
  }
  const refresh = () => {
    cancelAnimationFrame(frame)
    last = 0
    if (!document.hidden && visible && !gl.isContextLost()) frame = requestAnimationFrame(draw)
  }
  const resize = new ResizeObserver(() => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(host.clientWidth * ratio))
    canvas.height = Math.max(1, Math.round(host.clientHeight * ratio))
    gl.viewport(0, 0, canvas.width, canvas.height)
    refresh()
  })
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh() })
  const theme = new MutationObserver(() => { colors = palette(); refresh() })
  const lost = () => { cancelAnimationFrame(frame); host.dataset.renderer = 'static' }
  canvas.addEventListener('webglcontextlost', lost)
  document.addEventListener('visibilitychange', refresh)
  resize.observe(host)
  intersection.observe(host)
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return {
    update(next: FlowSettings) { settings = next; refresh() },
    dispose() {
      resize.disconnect(); intersection.disconnect(); theme.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      canvas.removeEventListener('webglcontextlost', lost)
      cancelAnimationFrame(frame)
      gl.deleteBuffer(buffer); gl.deleteBuffer(index); gl.deleteProgram(program)
      canvas.remove()
      host.dataset.renderer = 'static'
      release()
    },
  }
}
