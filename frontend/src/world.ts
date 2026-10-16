// Layout and look of the village. World units: 1200 x 860; the canvas scales to fit.
export const W = 1200
export const H = 860

export type Zone = { x: number; y: number; w: number; h: number; icon: string; roof: string; wall: string }
export const ZONES: Record<string, Zone> = {
  well: { x: 230, y: 215, w: 270, h: 230, icon: '⛲', roof: '#7d93a8', wall: '#dfe6ea' },
  market: { x: 600, y: 215, w: 290, h: 230, icon: '🍎', roof: '#c0504d', wall: '#f3e2c4' },
  forge: { x: 970, y: 215, w: 270, h: 230, icon: '⚒️', roof: '#5b4a42', wall: '#d9c7b4' },
  chapel: { x: 230, y: 565, w: 270, h: 230, icon: '⛪', roof: '#6f6aa8', wall: '#efeaf6' },
  inn: { x: 600, y: 565, w: 290, h: 230, icon: '🍺', roof: '#a8642a', wall: '#f5ddb6' },
  gate: { x: 970, y: 565, w: 270, h: 230, icon: '🏰', roof: '#6b6b6b', wall: '#cfcac0' },
}
export const HOMES: Record<string, [number, number]> = {
  tomas: [140, 790], bertha: [330, 790], ilsa: [520, 790], mira: [710, 790], pip: [900, 790], anselm: [1080, 790],
}
export const FACE: Record<string, string> = {
  tomas: '👴', bertha: '👩', ilsa: '💂', mira: '👩‍🦰', pip: '👦', anselm: '🧓',
}
export const BADGE: Record<string, string> = {
  tomas: '🍎', bertha: '🍺', ilsa: '🛡️', mira: '🔨', pip: '🪁', anselm: '✝️',
}

// where villagers stand inside a place
export const SLOTS: [number, number][] = [[-80, 45], [0, 60], [80, 45], [-40, 95], [40, 95], [0, 15]]

export function zoneAt(x: number, y: number): string | null {
  for (const [id, z] of Object.entries(ZONES)) {
    if (Math.abs(x - z.x) <= z.w / 2 && Math.abs(y - z.y) <= z.h / 2) return id
  }
  return null
}

export function moodColor(op: number) {
  const t = Math.max(-1, Math.min(1, op))
  const [r, g, b] = t < 0
    ? [158 + (210 - 158) * -t, 150 - 110 * -t, 140 - 100 * -t]
    : [158 - 108 * t, 150 + 30 * t, 140 - 60 * t]
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

export function moodFace(op: number) {
  if (op <= -0.6) return '😡'
  if (op <= -0.3) return '😠'
  if (op < -0.05) return '😒'
  if (op >= 0.6) return '🤩'
  if (op >= 0.3) return '😊'
  if (op > 0.05) return '🙂'
  return '😐'
}

export function moodWord(op: number) {
  if (op <= -0.6) return 'furious'
  if (op <= -0.3) return 'hostile'
  if (op < -0.05) return 'suspicious'
  if (op >= 0.6) return 'adores you'
  if (op >= 0.3) return 'friendly'
  if (op > 0.05) return 'warm'
  return 'neutral'
}

export const initials = (name: string) => name.replace(/^(Old|Captain|Father) /, '').slice(0, 2)
export const shortName = (name: string) => name.replace(/^(Old|Captain|Father) /, '')
export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`
