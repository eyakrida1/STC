// Échantillonne un chemin SVG fait de courbes de Bézier cubiques (commandes M, C, S absolues)
// et donne le point à une fraction t de sa longueur. Pur : pas besoin du DOM.
type P = { x: number; y: number }

function cubic(p0: P, p1: P, p2: P, p3: P, u: number): P {
  const v = 1 - u
  return {
    x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
    y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
  }
}

export interface PathSampler {
  length: number
  at: (t: number) => P
}

export function samplePath(d: string, steps = 60): PathSampler {
  const tok = d.match(/[MCS]|-?\d*\.?\d+/g) ?? []
  let i = 0
  const num = () => Number(tok[i++])
  let cur: P = { x: 0, y: 0 }
  let lastCtrl: P | null = null
  const pts: P[] = []
  let cmd = ""
  while (i < tok.length) {
    if (/[MCS]/.test(tok[i])) cmd = tok[i++]
    if (cmd === "M") {
      cur = { x: num(), y: num() }
      pts.push(cur)
      lastCtrl = null
    } else if (cmd === "C" || cmd === "S") {
      const c1: P = cmd === "C" ? { x: num(), y: num() } : lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur
      const c2: P = { x: num(), y: num() }
      const end: P = { x: num(), y: num() }
      for (let s = 1; s <= steps; s++) pts.push(cubic(cur, c1, c2, end, s / steps))
      lastCtrl = c2
      cur = end
    } else i++
  }
  const acc = [0]
  for (let k = 1; k < pts.length; k++) acc.push(acc[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y))
  const length = acc.at(-1) ?? 0
  const at = (t: number): P => {
    if (pts.length === 0) return { x: 0, y: 0 }
    const target = Math.min(1, Math.max(0, t)) * length
    let lo = 0
    let hi = acc.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (acc[mid] < target) lo = mid + 1
      else hi = mid
    }
    if (lo === 0) return pts[0]
    const seg = acc[lo] - acc[lo - 1] || 1
    const r = (target - acc[lo - 1]) / seg
    return { x: pts[lo - 1].x + (pts[lo].x - pts[lo - 1].x) * r, y: pts[lo - 1].y + (pts[lo].y - pts[lo - 1].y) * r }
  }
  return { length, at }
}
