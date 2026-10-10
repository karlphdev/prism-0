import { Color, Vector3, SRGBColorSpace } from 'three'

// Background modes (see src/webgl/bg/*.glsl.js)
export const BG = { MESH: 0, FLUTED: 1, MOIRE: 2, TUNNEL: 3, DRIFT: 4 }

// Each chapter is a target visual state. The scene interpolates between
// consecutive chapters as you scroll, then loops forever with drift (see stateFor).
// Colors come from an IQ cosine palette: col(t) = a + b * cos(2π(c·t + d)).
export const chapters = [
  {
    id: 'intro',
    layout: 'left',
    kicker: '00 — Intro',
    title: ['Shape of', 'nothing.'],
    lede: 'A test surface for motion, light and touch. Drag the object. Click it. Keep scrolling.',
    bg: BG.MESH,
    palette: [[0.62, 0.38, 0.70], [0.38, 0.38, 0.30], [1, 1, 1], [0.00, 0.15, 0.30]],
    fg: '#ffffff',
    obj: { color: '#b7a3ff', metalness: 0.25, roughness: 0.12, iridescence: 1.0, transmission: 0.0, dispersion: 0, rim: 0.6, x: 1.1, y: 0, scale: 1, amp: 0.12, freq: 1.2, spin: 0.15 },
    particles: { opacity: 0.55, morph: 0, stream: 0, size: 26 },
    fx: { bloom: 0.35, vignette: 0.25, fluid: 1.0, sat: 1.1, ca: 0.0 },
  },
  {
    id: 'features',
    layout: 'right',
    kicker: '01 — Features',
    title: ['Built to', 'react.'],
    lede: 'Every vertex listens to the cursor. Velocity bends light, hover bends matter.',
    specs: [['Vertices', '253,440'], ['Noise', 'Simplex 3D'], ['Glass', 'Dispersive'], ['Fluid', 'Navier–Stokes']],
    bg: BG.FLUTED,
    palette: [[0.65, 0.65, 0.60], [0.35, 0.35, 0.40], [1, 1, 1], [0.25, 0.00, 0.60]],
    fg: '#0b0820',
    obj: { color: '#ffffff', metalness: 0.0, roughness: 0.04, iridescence: 0.6, transmission: 1.0, dispersion: 6, rim: 0.8, x: -1.2, y: 0, scale: 1.05, amp: 0.3, freq: 1.6, spin: 0.35 },
    particles: { opacity: 0.6, morph: 0, stream: 0, size: 30 },
    fx: { bloom: 0.4, vignette: 0.3, fluid: 1.2, sat: 1.15, ca: 0.0015 },
  },
  {
    id: 'deconstruct',
    layout: 'left',
    kicker: '02 — Deconstruct',
    title: ['Break it', 'apart.'],
    lede: 'Resolution is a choice. Push the noise until the form forgets itself.',
    bg: BG.MOIRE,
    palette: [[0.55, 0.30, 0.35], [0.45, 0.30, 0.45], [1, 1, 1], [0.00, 0.10, 0.55]],
    fg: '#ffffff',
    obj: { color: '#ff5a1f', metalness: 0.3, roughness: 0.3, iridescence: 0.4, transmission: 0.0, dispersion: 0, rim: 1.4, x: 1.25, y: 0, scale: 0.85, amp: 0.45, freq: 2.2, spin: 0.6 },
    particles: { opacity: 0.9, morph: 0, stream: 0, size: 34 },
    fx: { bloom: 0.9, vignette: 0.5, fluid: 1.6, sat: 1.25, ca: 0.004 },
  },
  {
    id: 'particles',
    layout: 'center',
    kicker: '03 — Particles',
    title: ['Become', 'dust.'],
    lede: 'Matter is just a decision particles make together.',
    bg: BG.TUNNEL,
    palette: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0.0, 0.33, 0.67]],
    fg: '#ffffff',
    obj: { color: '#ffffff', metalness: 0.0, roughness: 0.5, iridescence: 0.0, transmission: 0.0, dispersion: 0, rim: 1.0, x: 0, y: 0.35, scale: 0.0, amp: 0.4, freq: 1.5, spin: 0.2 },
    particles: { opacity: 1.0, morph: 0.6, stream: 1, size: 44 },
    fx: { bloom: 1.4, vignette: 0.55, fluid: 1.2, sat: 1.2, ca: 0.002 },
  },
  {
    id: 'outro',
    layout: 'right',
    kicker: '04 — Outro',
    title: ['And', 'again.'],
    lede: 'There is no end. Every loop drifts a little further from where it started.',
    bg: BG.DRIFT,
    palette: [[0.60, 0.50, 0.30], [0.40, 0.45, 0.40], [1, 1, 1], [0.05, 0.25, 0.55]],
    fg: '#ffffff',
    obj: { color: '#ffffff', metalness: 0.0, roughness: 0.02, iridescence: 1.0, transmission: 1.0, dispersion: 10, rim: 1.2, x: -1.0, y: 0, scale: 1.2, amp: 0.18, freq: 1.0, spin: 0.25 },
    particles: { opacity: 0.6, morph: 0, stream: 0, size: 28 },
    fx: { bloom: 0.5, vignette: 0.35, fluid: 1.0, sat: 1.1, ca: 0.001 },
  },
]

const v3 = (arr) => new Vector3(...arr)

// Builds a flat state for chapter `i` on loop `loop`.
// Loops drift: the palette phase rotates (new color scheme), distortion creeps up.
export function stateFor(i, loop) {
  const c = chapters[i]
  const drift = Math.min(loop, 8)
  const phase = loop * 0.13
  const [a, b, cc, d] = c.palette

  return {
    palA: v3(a),
    palB: v3(b),
    palC: v3(cc),
    palD: v3(d).addScalar(phase),
    fg: new Color(c.fg),
    objColor: new Color(c.obj.color),
    metalness: c.obj.metalness,
    roughness: c.obj.roughness,
    iridescence: c.obj.iridescence,
    transmission: c.obj.transmission,
    dispersion: c.obj.dispersion,
    rim: c.obj.rim,
    x: c.obj.x,
    y: c.obj.y,
    scale: c.obj.scale,
    amp: c.obj.amp * (1 + drift * 0.06),
    freq: c.obj.freq * (1 + drift * 0.08),
    spin: c.obj.spin,
    pOpacity: c.particles.opacity,
    morph: c.particles.morph,
    stream: c.particles.stream,
    pSize: c.particles.size * (1 + drift * 0.06),
    bloom: c.fx.bloom,
    vignette: c.fx.vignette,
    fluid: c.fx.fluid,
    sat: c.fx.sat,
    ca: c.fx.ca * (1 + drift * 0.25),
  }
}

// Interpolation of two states into `out` (Colors in linear space, Vector3 component-wise).
export function lerpState(a, b, t, out = {}) {
  for (const k in a) {
    const va = a[k]
    if (va instanceof Color) {
      out[k] = (out[k] instanceof Color ? out[k] : new Color()).copy(va).lerp(b[k], t)
    } else if (va instanceof Vector3) {
      out[k] = (out[k] instanceof Vector3 ? out[k] : new Vector3()).copy(va).lerp(b[k], t)
    } else if (typeof va === 'number') {
      out[k] = va + (b[k] - va) * t
    }
  }
  return out
}

// JS twin of the GLSL palette() — used for fluid splat colors.
export function palette(state, t, out = new Color()) {
  const f = (k) => state.palA.getComponent(k) + state.palB.getComponent(k) *
    Math.cos(6.28318 * (state.palC.getComponent(k) * t + state.palD.getComponent(k)))
  const c = (v) => Math.min(1, Math.max(0, v))
  return out.setRGB(c(f(0)), c(f(1)), c(f(2)), SRGBColorSpace)
}
