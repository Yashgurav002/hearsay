import { useEffect, useRef } from 'react'
import type { State } from './api'
import { BADGE, FACE, H, HOMES, SLOTS, W, ZONES, moodColor, shortName, zoneAt } from './world'

export type Bubble = { id: number; who: string; text: string; tone: 'bad' | 'good' | 'say'; born: number }
type Pt = { x: number; y: number }
type Props = {
  st: State
  bubbles: Bubble[]
  frozen: boolean
  spawn: number // bump to teleport the player to st.place (new game, reload)
  onZone: (zone: string | null) => void
  onNear: (id: string | null) => void
  onTalk: (id: string) => void
}

const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
const FONT = '"Alegreya Sans", system-ui, sans-serif'
const SPEED = 260
const NPC_SPEED = 200
const BUBBLE_MS = 4200
const MAX_BUBBLES = 3
const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const r = rand(42)
const SPECKS = Array.from({ length: 260 }, () => [r() * W, r() * H, 1 + r() * 2.5])
const TREES = [[60, 60], [420, 70], [780, 60], [1150, 80], [60, 400], [1150, 400], [420, 395], [780, 405], [40, 690], [1170, 690]]

export default function GameCanvas(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const p = useRef(props)
  p.current = props
  const player = useRef<Pt>({ x: ZONES[props.st.place].x, y: ZONES[props.st.place].y + 40 })
  const target = useRef<Pt | null>(null)
  const npcs = useRef<Record<string, Pt>>({})
  const keys = useRef(new Set<string>())
  const near = useRef<string | null>(null)
  const zone = useRef<string | null>(null)
  const view = useRef({ scale: 1, w: 0, h: 0 })

  useEffect(() => {
    const z = ZONES[props.st.place]
    player.current = { x: z.x, y: z.y + 40 }
    target.current = null
  }, [props.spawn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    const down = (e: KeyboardEvent) => {
      if (p.current.frozen || typing(e)) return
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        if (k.startsWith('arrow')) e.preventDefault()
        keys.current.add(k)
        target.current = null
      }
      if (k === 'e' && near.current) p.current.onTalk(near.current)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      const h = Math.min(w * (H / W), window.innerHeight * 0.78)
      const scale = Math.min(w / W, h / H)
      view.current = { scale, w, h }
      const c = canvas.current!
      const dpr = window.devicePixelRatio || 1
      c.width = w * dpr; c.height = h * dpr
      c.style.width = `${w}px`; c.style.height = `${h}px`
    })
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      step(dt)
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const npcTarget = (st: State) => {
    const out: Record<string, Pt> = {}
    for (const pl of Object.keys(ZONES)) {
      st.villagers.filter(v => v.place === pl).sort((a, b) => a.id.localeCompare(b.id)).forEach((v, i) => {
        out[v.id] = { x: ZONES[pl].x + SLOTS[i][0], y: ZONES[pl].y + SLOTS[i][1] }
      })
    }
    for (const v of st.villagers) if (!out[v.id]) out[v.id] = { x: HOMES[v.id][0] + 38, y: HOMES[v.id][1] + 12 }
    return out
  }

  function step(dt: number) {
    const { st, frozen } = p.current
    const k = keys.current
    let vx = 0, vy = 0
    if (!frozen) {
      if (k.has('arrowleft') || k.has('a')) vx -= 1
      if (k.has('arrowright') || k.has('d')) vx += 1
      if (k.has('arrowup') || k.has('w')) vy -= 1
      if (k.has('arrowdown') || k.has('s')) vy += 1
    }
    const me = player.current
    if (!vx && !vy && target.current && !frozen) {
      const dx = target.current.x - me.x, dy = target.current.y - me.y
      const d = Math.hypot(dx, dy)
      if (d < 5) target.current = null
      else { vx = dx / d; vy = dy / d }
    }
    const len = Math.hypot(vx, vy) || 1
    me.x = Math.max(25, Math.min(W - 25, me.x + (vx / len) * SPEED * dt))
    me.y = Math.max(25, Math.min(H - 25, me.y + (vy / len) * SPEED * dt))

    const z = zoneAt(me.x, me.y)
    if (z !== zone.current) { zone.current = z; p.current.onZone(z) }

    const goals = npcTarget(st)
    for (const [id, g] of Object.entries(goals)) {
      const n = (npcs.current[id] ??= { ...g })
      const dx = g.x - n.x, dy = g.y - n.y, d = Math.hypot(dx, dy)
      if (d > 1) { const s = Math.min(d, NPC_SPEED * dt); n.x += (dx / d) * s; n.y += (dy / d) * s }
    }
    let best: string | null = null, bd = 95
    for (const v of st.villagers) {
      const n = npcs.current[v.id]
      if (!n || !v.place || v.place !== st.place || z !== st.place) continue
      const d = Math.hypot(n.x - me.x, n.y - me.y)
      if (d < bd) { bd = d; best = v.id }
    }
    if (best !== near.current) { near.current = best; p.current.onNear(best) }
  }

  function draw(now: number) {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const { st, bubbles } = p.current
    const { scale, w, h } = view.current
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#2f3b23'
    ctx.fillRect(0, 0, w, h)
    const ox = (w - W * scale) / 2, oy = (h - H * scale) / 2
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy)

    // ground
    ctx.fillStyle = '#8dbb63'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#7fae57'
    for (const [x, y, s] of SPECKS) { ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill() }
    // roads
    ctx.strokeStyle = '#e4cf9c'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 44
    ctx.beginPath()
    ctx.moveTo(ZONES.well.x, ZONES.well.y + 60); ctx.lineTo(ZONES.forge.x, ZONES.forge.y + 60)
    ctx.moveTo(ZONES.chapel.x, ZONES.chapel.y + 60); ctx.lineTo(ZONES.gate.x, ZONES.gate.y + 60)
    for (const x of [ZONES.well.x, ZONES.market.x, ZONES.forge.x]) { ctx.moveTo(x, 270); ctx.lineTo(x, 640) }
    ctx.moveTo(140, 735); ctx.lineTo(1080, 735)
    ctx.moveTo(ZONES.inn.x, 640); ctx.lineTo(ZONES.inn.x, 735)
    ctx.stroke()
    // trees
    ctx.font = `46px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const [x, y] of TREES) ctx.fillText('🌳', x, y)

    // places
    for (const [id, z] of Object.entries(ZONES)) {
      const here = st.place === id
      const left = z.x - z.w / 2, top = z.y - z.h / 2
      ctx.fillStyle = here ? 'rgba(255,236,170,0.55)' : 'rgba(255,255,255,0.18)'
      roundRect(ctx, left, top, z.w, z.h, 22); ctx.fill()
      ctx.setLineDash(here ? [] : [10, 8]); ctx.lineWidth = here ? 4 : 2
      ctx.strokeStyle = here ? '#d4a017' : 'rgba(255,255,255,0.6)'; ctx.stroke(); ctx.setLineDash([])
      // building
      const bw = z.w * 0.56, bx = z.x - bw / 2, by = top + 38
      ctx.fillStyle = z.wall; ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 3
      ctx.fillRect(bx, by, bw, 62); ctx.strokeRect(bx, by, bw, 62)
      ctx.fillStyle = z.roof
      ctx.beginPath(); ctx.moveTo(bx - 14, by + 2); ctx.lineTo(z.x, by - 36); ctx.lineTo(bx + bw + 14, by + 2); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(z.x - 11, by + 30, 22, 32)
      ctx.font = `32px ${EMOJI}`; ctx.fillText(z.icon, z.x - bw / 2 + 26, by + 28)
      // name plate
      const name = st.places.find(pl => pl.id === id)?.name || id
      ctx.font = `700 17px ${FONT}`
      const tw = ctx.measureText(name).width + 22
      ctx.fillStyle = '#fffaf0'; roundRect(ctx, z.x - tw / 2, by + 70, tw, 26, 13); ctx.fill()
      ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = '#3b2a1a'; ctx.fillText(name, z.x, by + 84)
    }
    // homes
    for (const [id, [x, y]] of Object.entries(HOMES)) {
      ctx.fillStyle = '#e9d6b8'; ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 2
      ctx.fillRect(x - 26, y - 12, 52, 34); ctx.strokeRect(x - 26, y - 12, 52, 34)
      ctx.fillStyle = '#9c5b3b'
      ctx.beginPath(); ctx.moveTo(x - 32, y - 10); ctx.lineTo(x, y - 34); ctx.lineTo(x + 32, y - 10); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.font = `600 12px ${FONT}`; ctx.fillStyle = '#3b2a1a'
      ctx.fillText(`${shortName(st.villagers.find(v => v.id === id)?.name || id)}'s`, x, y + 32)
    }

    // characters, back to front
    const me = player.current
    const chars: { id: string; x: number; y: number }[] = st.villagers.map(v => ({ id: v.id, ...(npcs.current[v.id] || { x: 0, y: 0 }) }))
    chars.push({ id: 'you', x: me.x, y: me.y })
    chars.sort((a, b) => a.y - b.y)
    for (const ch of chars) {
      if (ch.id === 'you') { drawYou(ctx, ch.x, ch.y, now); continue }
      const v = st.villagers.find(x => x.id === ch.id)!
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(ch.x, ch.y + 24, 20, 7, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.arc(ch.x, ch.y, 24, 0, 7); ctx.fill()
      ctx.lineWidth = 5; ctx.strokeStyle = moodColor(v.opinion); ctx.stroke()
      ctx.font = `30px ${EMOJI}`; ctx.fillText(FACE[v.id], ch.x, ch.y + 2)
      ctx.font = `15px ${EMOJI}`; ctx.fillText(BADGE[v.id], ch.x + 19, ch.y + 17)
      ctx.font = `700 13px ${FONT}`
      const nm = shortName(v.name), nw = ctx.measureText(nm).width + 12
      ctx.fillStyle = 'rgba(59,42,26,0.85)'; roundRect(ctx, ch.x - nw / 2, ch.y + 30, nw, 18, 9); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(nm, ch.x, ch.y + 39.5)
      if (!v.place) { ctx.font = `18px ${EMOJI}`; ctx.fillText('💤', ch.x + 22, ch.y - 24 - Math.sin(now / 400) * 4) }
    }

    // sky
    const hr = st.hour
    const a = hr >= 22 || hr < 5 ? 0.42 : hr >= 20 ? 0.28 : hr >= 17 ? 0.14 : hr <= 6 ? 0.22 : 0
    if (a) {
      ctx.fillStyle = hr >= 17 && hr < 20 ? `rgba(255,120,40,${a})` : `rgba(18,22,70,${a})`
      ctx.fillRect(0, 0, W, H)
    }

    // interaction prompt
    if (near.current && !p.current.frozen) {
      const n = npcs.current[near.current]
      const v = st.villagers.find(x => x.id === near.current)
      if (n && v) pill(ctx, n.x, n.y - 44, `E  Talk to ${shortName(v.name)}`, '#d4a017', '#2b1d10')
    }
    // speech bubbles
    const stack: Record<string, number> = {}
    const live = bubbles.filter(b => now - b.born >= 0 && now - b.born <= BUBBLE_MS).slice(-MAX_BUBBLES)
    for (const b of live) {
      const age = now - b.born
      const pos = b.who === 'you' ? me : npcs.current[b.who]
      if (!pos) continue
      const k = (stack[b.who] = (stack[b.who] ?? -1) + 1)
      const alpha = Math.min(1, (BUBBLE_MS - age) / 600)
      const pop = Math.min(1, age / 160)
      drawBubble(ctx, pos.x, pos.y - 46 - k * 58, b.text, b.tone, alpha, pop)
    }
  }

  function onClick(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.current!.getBoundingClientRect()
    const { scale, w, h } = view.current
    const x = (e.clientX - rect.left - (w - W * scale) / 2) / scale
    const y = (e.clientY - rect.top - (h - H * scale) / 2) / scale
    const { st } = p.current
    for (const v of st.villagers) {
      const n = npcs.current[v.id]
      if (n && Math.hypot(n.x - x, n.y - y) < 32) {
        if (near.current === v.id) { p.current.onTalk(v.id); return }
        target.current = { x: n.x, y: n.y + 50 }
        return
      }
    }
    target.current = { x, y }
  }

  return (
    <div ref={box} className="world">
      <canvas ref={canvas} onPointerDown={onClick} aria-label="Village. Move with WASD or arrow keys, or click to walk." role="img" />
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, fg: string) {
  ctx.font = `800 14px ${FONT}`
  const tw = ctx.measureText(text).width + 20
  ctx.fillStyle = bg; roundRect(ctx, x - tw / 2, y - 13, tw, 26, 13); ctx.fill()
  ctx.fillStyle = fg; ctx.fillText(text, x, y + 1)
}

function drawYou(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + 24, 20, 7, 0, 0, 7); ctx.fill()
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill()
  ctx.lineWidth = 5; ctx.strokeStyle = '#d4a017'; ctx.stroke()
  ctx.font = `30px ${EMOJI}`; ctx.fillText('🧑', x, y + 2)
  ctx.font = `15px ${EMOJI}`; ctx.fillText('🎒', x + 19, y + 17)
  const bob = Math.sin(now / 250) * 4
  pill(ctx, x, y - 40 + bob, 'YOU', '#d4a017', '#2b1d10')
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const wd of words) {
    const t = line ? `${line} ${wd}` : wd
    if (ctx.measureText(t).width > max && line) { lines.push(line); line = wd } else line = t
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, tone: Bubble['tone'], alpha: number, pop: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop)
  ctx.font = `600 14px ${FONT}`
  const lines = wrap(ctx, text, 210)
  const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22
  const bh = lines.length * 18 + 14
  const border = tone === 'bad' ? '#c0392b' : tone === 'good' ? '#2e8b57' : '#5a4632'
  ctx.fillStyle = '#fffdf7'; ctx.strokeStyle = border; ctx.lineWidth = 3
  roundRect(ctx, -bw / 2, -bh, bw, bh, 12); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(0, 12); ctx.lineTo(8, -1); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, 12); ctx.lineTo(8, 0); ctx.stroke()
  ctx.fillStyle = '#2b1d10'
  lines.forEach((l, i) => ctx.fillText(l, 0, -bh + 16 + i * 18))
  ctx.restore()
}
