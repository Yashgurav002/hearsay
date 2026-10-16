import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { State } from './api'
import type { Bubble } from './GameCanvas'
import { BADGE, FACE, HOMES, SLOTS, ZONES, moodColor, shortName, zoneAt } from './world'

type Props = {
  st: State
  bubbles: Bubble[]
  frozen: boolean
  spawn: number
  onZone: (zone: string | null) => void
  onNear: (id: string | null) => void
  onTalk: (id: string) => void
  onFail: () => void // no WebGL: the app falls back to the 2D map
}

// map units (the 2D layout, 1200 x 860) -> metres
const S = 0.05
const toWorld = (x: number, y: number) => new THREE.Vector3(x * S, 0, y * S)
const SPEED = 7
const NPC_SPEED = 5.5
const BUBBLE_MS = 4200
const MAX_BUBBLES = 3

type Look = { body: number; legs: number; skin: number; hat?: 'brim' | 'helmet' | 'hood' | 'cap'; extra?: 'spear' | 'apron' | 'hammer' | 'robe' | 'pack'; scale?: number }
const LOOKS: Record<string, Look> = {
  tomas: { body: 0x7a8f3c, legs: 0x4a3b2a, skin: 0xe8c39e, hat: 'brim' },
  bertha: { body: 0xb5562b, legs: 0x5a3b2a, skin: 0xf1c8a5, extra: 'apron' },
  ilsa: { body: 0x3b5b8c, legs: 0x2c2c38, skin: 0xd9a77f, hat: 'helmet', extra: 'spear' },
  mira: { body: 0x6b4a3a, legs: 0x2f2a26, skin: 0xc98d68, extra: 'hammer' },
  pip: { body: 0xe0a32a, legs: 0x4f6d8f, skin: 0xf3cfae, hat: 'cap', scale: 0.72 },
  anselm: { body: 0x3a3550, legs: 0x3a3550, skin: 0xe9cdb3, hat: 'hood', extra: 'robe' },
  you: { body: 0xd4a017, legs: 0x5a4632, skin: 0xf0c8a0, extra: 'pack' },
}

type Person = { group: THREE.Group; legs: THREE.Mesh[]; ring: THREE.Mesh; walk: number }

function std(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
}

function makePerson(id: string): Person {
  const L = LOOKS[id]
  const g = new THREE.Group()
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m
  }
  const legs = [-0.15, 0.15].map(x => {
    const leg = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 8), std(L.legs), x, 0.35, 0)
    leg.geometry.translate(0, -0.35, 0); leg.position.y = 0.7
    return leg
  })
  if (L.extra === 'robe') mesh(new THREE.ConeGeometry(0.55, 1.5, 12), std(L.body), 0, 0.75, 0)
  mesh(new THREE.CapsuleGeometry(0.34, 0.55, 4, 12), std(L.body), 0, 1.15, 0)
  if (L.extra === 'apron') mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), std(0xf4ece0), 0, 1.0, 0.33)
  mesh(new THREE.SphereGeometry(0.28, 16, 12), std(L.skin), 0, 1.85, 0)
  for (const x of [-0.1, 0.1]) mesh(new THREE.SphereGeometry(0.04, 8, 6), std(0x1b1b1b), x, 1.9, 0.25)
  if (L.hat === 'brim') { mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16), std(0x6b4a2b), 0, 2.08, 0); mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.25, 16), std(0x6b4a2b), 0, 2.2, 0) }
  if (L.hat === 'helmet') { mesh(new THREE.SphereGeometry(0.31, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xb8bcc4, { metalness: 0.6, roughness: 0.35 }), 0, 1.92, 0) }
  if (L.hat === 'hood') mesh(new THREE.ConeGeometry(0.32, 0.45, 12), std(L.body), 0, 2.2, -0.03)
  if (L.hat === 'cap') mesh(new THREE.SphereGeometry(0.29, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), std(0xc0392b), 0, 1.93, 0)
  if (L.extra === 'spear') { mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), std(0x6b4a2b), 0.48, 1.3, 0.1); mesh(new THREE.ConeGeometry(0.08, 0.3, 6), std(0xc8ccd4, { metalness: 0.7 }), 0.48, 2.7, 0.1) }
  if (L.extra === 'hammer') { mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), std(0x6b4a2b), 0.45, 1.0, 0.1); mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), std(0x555a60, { metalness: 0.6 }), 0.45, 1.3, 0.1) }
  if (L.extra === 'pack') mesh(new THREE.BoxGeometry(0.5, 0.55, 0.25), std(0x7a4b2a), 0, 1.25, -0.38)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xc9c0b4 }))
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring)
  g.scale.setScalar(L.scale ?? 1)
  g.traverse(o => { o.userData.person = id })
  return { group: g, legs, ring, walk: 0 }
}

function signTexture(text: string, icon: string) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 8
  ctx.beginPath(); ctx.roundRect(6, 6, 500, 116, 30); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#3b2a1a'; ctx.font = '700 52px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(`${icon} ${text}`, 256, 68)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

type Solid = { x: number; z: number; r: number }

function building(scene: THREE.Scene, id: string, name: string, windows: THREE.Mesh[], solids: Solid[]) {
  const z = ZONES[id]
  const c = toWorld(z.x, z.y)
  const plot = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.06, 40), std(0xa7cf7c))
  plot.position.set(c.x, 0.03, c.z); plot.receiveShadow = true; plot.userData.ground = true; scene.add(plot)
  const bx = c.x, bz = c.z - 3.6
  if (id === 'gate') for (const x of [-3, 3]) solids.push({ x: bx + x, z: bz, r: 1.6 })
  else solids.push({ x: bx, z: bz, r: id === 'well' ? 2 : 3.4 })
  const add = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; m.userData.solid = true; scene.add(m); return m }
  if (id === 'well') {
    const ring = add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1, 20, 1, true), std(0x9aa3ab, { side: THREE.DoubleSide })))
    ring.position.set(bx, 0.5, bz)
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), std(0x4a90c2, { roughness: 0.2 }))
    water.rotation.x = -Math.PI / 2; water.position.set(bx, 0.7, bz); scene.add(water)
    for (const x of [-1.3, 1.3]) add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), std(0x6b4a2b))).position.set(bx + x, 1.2, bz)
    const roof = add(new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 4), std(z.roof)))
    roof.rotation.y = Math.PI / 4; roof.position.set(bx, 2.9, bz)
  } else if (id === 'gate') {
    for (const x of [-3, 3]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 5, 10), std(0xa9a49a))).position.set(bx + x, 2.5, bz)
      const top = add(new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 10), std(0x6b6b6b)))
      top.position.set(bx + x, 5.8, bz)
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 1.2), std(0xb8b2a6))).position.set(bx, 3.6, bz)
    const door = add(new THREE.Mesh(new THREE.BoxGeometry(3, 2.9, 0.3), std(0x5a3b22)))
    door.position.set(bx, 1.45, bz)
    for (const x of [-12, 12]) add(new THREE.Mesh(new THREE.BoxGeometry(18, 2.6, 0.8), std(0xb8b2a6))).position.set(bx + x * 0.55, 1.3, bz)
  } else {
    const w = id === 'market' || id === 'inn' ? 7.2 : 6.2
    const body = add(new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, 4.2), std(z.wall)))
    body.position.set(bx, 1.6, bz)
    const roof = add(new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 2.6, 4), std(z.roof)))
    roof.rotation.y = Math.PI / 4; roof.scale.z = 0.7; roof.position.set(bx, 4.5, bz)
    add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.15), std(0x6b4a2b))).position.set(bx, 1, bz + 2.12)
    for (const x of [-w / 3, w / 3]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), std(0x6e8fa8, { emissive: 0xffc46b, emissiveIntensity: 0 }))
      win.position.set(bx + x, 1.9, bz + 2.13); scene.add(win); windows.push(win)
    }
    if (id === 'market') {
      for (const x of [-4.2, 4.2]) {
        const stall = add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.2), std(0x8a6a44))); stall.position.set(bx + x, 0.5, bz + 3.6)
        const awn = add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.6), std(x < 0 ? 0xc0504d : 0xf3e2c4))); awn.position.set(bx + x, 2.1, bz + 3.6)
        for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), std(0xd2302c))).position.set(bx + x - 0.6 + i * 0.4, 1.15, bz + 3.5)
      }
    }
    if (id === 'chapel') add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.15), std(0xd4a017))).position.set(bx, 6.4, bz)
    if (id === 'forge') {
      const anvil = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.5), std(0x44484d, { metalness: 0.6 }))); anvil.position.set(bx + 3.8, 0.3, bz + 3)
    }
    if (id === 'inn') for (const x of [-3.5, 3.5]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), std(0x7a4b2a))).position.set(bx + x, 0.45, bz + 3.4)
  }
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(name, z.icon), depthTest: true }))
  sign.scale.set(6, 1.5, 1); sign.position.set(bx, id === 'gate' ? 7.4 : 6.6, bz + 0.5)
  scene.add(sign)
}

export default function Game3D(props: Props) {
  const box = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const p = useRef(props)
  p.current = props
  const spawnTo = useRef<string | null>(null)

  useEffect(() => { spawnTo.current = props.st.place }, [props.spawn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const host = box.current!, ov = overlay.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      p.current.onFail(); return
    }
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    host.prepend(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300)
    const hemi = new THREE.HemisphereLight(0xdff1ff, 0x5b7a3a, 1.2)
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 })
    sun.position.set(20, 40, 25); sun.target.position.set(30, 0, 21)
    scene.add(hemi, sun, sun.target)

    // ground, roads, trees
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 140), std(0x8dbb63))
    ground.rotation.x = -Math.PI / 2; ground.position.set(30, 0, 21.5); ground.receiveShadow = true; ground.userData.ground = true
    scene.add(ground)
    const road = (x1: number, y1: number, x2: number, y2: number) => {
      const a = toWorld(x1, y1), b = toWorld(x2, y2)
      const len = a.distanceTo(b) + 2.2
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 2.2), std(0xe4cf9c))
      m.position.copy(a.clone().add(b).multiplyScalar(0.5)).setY(0.02)
      m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); m.receiveShadow = true; m.userData.ground = true
      scene.add(m)
    }
    road(ZONES.well.x, ZONES.well.y + 60, ZONES.forge.x, ZONES.forge.y + 60)
    road(ZONES.chapel.x, ZONES.chapel.y + 60, ZONES.gate.x, ZONES.gate.y + 60)
    for (const x of [ZONES.well.x, ZONES.market.x, ZONES.forge.x]) road(x, 270, x, 640)
    road(140, 735, 1080, 735); road(ZONES.inn.x, 640, ZONES.inn.x, 735)
    const treeTrunk = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 8), treeTop = new THREE.ConeGeometry(1.6, 3.6, 9)
    const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })()
    for (let i = 0; i < 70; i++) {
      const x = -25 + rnd() * 110, zz = -18 + rnd() * 80
      if (blocked(x / S, zz / S)) continue
      const t = new THREE.Group()
      const trunk = new THREE.Mesh(treeTrunk, std(0x6b4a2b)); trunk.position.y = 0.8
      const top = new THREE.Mesh(treeTop, std(i % 3 ? 0x3f7a3a : 0x4f8c3f)); top.position.y = 3.2
      trunk.castShadow = top.castShadow = true
      t.add(trunk, top); t.position.set(x, 0, zz); t.scale.setScalar(0.8 + rnd() * 0.6)
      scene.add(t)
    }
    const windows: THREE.Mesh[] = []
    const solids: Solid[] = []
    for (const pl of p.current.st.places) building(scene, pl.id, pl.name, windows, solids)
    for (const [, [x, y]] of Object.entries(HOMES)) {
      const c = toWorld(x, y)
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), std(0xe9d6b8)); hb.position.set(c.x, 0.9, c.z - 1); hb.castShadow = true
      const hr = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.4, 4), std(0x9c5b3b)); hr.rotation.y = Math.PI / 4; hr.position.set(c.x, 2.5, c.z - 1); hr.castShadow = true
      const hw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.1), std(0x6e8fa8, { emissive: 0xffc46b, emissiveIntensity: 0 })); hw.position.set(c.x + 0.6, 1.1, c.z + 0.12)
      hb.userData.solid = hr.userData.solid = true
      windows.push(hw); scene.add(hb, hr, hw)
      solids.push({ x: c.x, z: c.z - 1, r: 1.8 })
    }
    // the player's highlight ring on the current place
    const here = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.6, 48), new THREE.MeshBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.9 }))
    here.rotation.x = -Math.PI / 2; here.position.y = 0.08; scene.add(here)

    // people
    const people: Record<string, Person> = {}
    const tags: Record<string, HTMLDivElement> = {}
    for (const id of [...Object.keys(LOOKS)]) {
      people[id] = makePerson(id); scene.add(people[id].group)
      const tag = document.createElement('div'); tag.className = 'tag3d'
      tag.innerHTML = id === 'you' ? '<b>YOU</b>' : `<span>${FACE[id]}</span> ${shortName(p.current.st.villagers.find(v => v.id === id)?.name || id)} <small>${BADGE[id]}</small>`
      if (id === 'you') tag.classList.add('you')
      ov.appendChild(tag); tags[id] = tag
    }
    const prompt = document.createElement('div'); prompt.className = 'prompt3d'; ov.appendChild(prompt)
    const bubbleEls = new Map<number, HTMLDivElement>()

    const me = people.you.group
    const start = toWorld(ZONES[p.current.st.place].x, ZONES[p.current.st.place].y + 40)
    me.position.copy(start)
    const npcGoal = (st: State) => {
      const out: Record<string, THREE.Vector3> = {}
      for (const pl of Object.keys(ZONES)) {
        st.villagers.filter(v => v.place === pl).sort((a, b) => a.id.localeCompare(b.id)).forEach((v, i) => {
          out[v.id] = toWorld(ZONES[pl].x + SLOTS[i][0], ZONES[pl].y + SLOTS[i][1])
        })
      }
      for (const v of st.villagers) if (!out[v.id]) out[v.id] = toWorld(HOMES[v.id][0] + 40, HOMES[v.id][1] + 10)
      return out
    }
    for (const [id, g] of Object.entries(npcGoal(p.current.st))) people[id].group.position.copy(g)

    // input
    let yaw = 0, dist = 10, target: THREE.Vector3 | null = null
    let near: string | null = null, zone: string | null = null
    const keys = new Set<string>()
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    const down = (e: KeyboardEvent) => {
      if (p.current.frozen || typing(e)) return
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        if (k.startsWith('arrow')) e.preventDefault()
        keys.add(k); target = null
      }
      if (k === 'e' && near) p.current.onTalk(near)
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const blur = () => keys.clear()
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)

    const ray = new THREE.Raycaster()
    let drag: { x: number; moved: boolean } | null = null
    const el = renderer.domElement
    el.style.touchAction = 'none'
    const pdown = (e: PointerEvent) => { drag = { x: e.clientX, moved: false }; el.setPointerCapture(e.pointerId) }
    const pmove = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (Math.abs(dx) > 4) drag.moved = true
      if (drag.moved) { yaw -= dx * 0.006; drag.x = e.clientX }
    }
    const pup = (e: PointerEvent) => {
      const wasDrag = drag?.moved
      drag = null
      if (wasDrag || p.current.frozen) return
      const r = el.getBoundingClientRect()
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      const hits = ray.intersectObjects(scene.children, true)
      for (const h of hits) {
        const who = h.object.userData.person as string | undefined
        if (who && who !== 'you') {
          if (near === who) { p.current.onTalk(who); return }
          const g = people[who].group.position
          target = g.clone().add(me.position.clone().sub(g).setY(0).normalize().multiplyScalar(1.8))
          return
        }
        if (h.object.userData.ground) { target = h.point.clone().setY(0); return }
      }
    }
    const wheel = (e: WheelEvent) => { e.preventDefault(); dist = Math.max(6, Math.min(26, dist + e.deltaY * 0.01)) }
    el.addEventListener('pointerdown', pdown); el.addEventListener('pointermove', pmove); el.addEventListener('pointerup', pup)
    el.addEventListener('wheel', wheel, { passive: false })

    const resize = () => {
      const w = host.clientWidth
      const h = Math.max(320, Math.min(w * 0.62, window.innerHeight * 0.74))
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix()
      ov.style.height = `${h}px`
    }
    const ro = new ResizeObserver(resize); ro.observe(host); resize()

    const walls: THREE.Mesh[] = []
    scene.traverse(o => { if (o.userData.solid) walls.push(o as THREE.Mesh) })
    const faded = new Set<THREE.Mesh>()
    const sight = new THREE.Raycaster()
    const sky = new THREE.Color(), fogC = new THREE.Color()
    const DAY = new THREE.Color(0x9fd3f0), DUSK = new THREE.Color(0xf0a060), NIGHT = new THREE.Color(0x101833)
    scene.fog = new THREE.Fog(0x9fd3f0, 45, 110)
    const proj = new THREE.Vector3()
    const place = (elm: HTMLElement, pos: THREE.Vector3, lift: number) => {
      proj.copy(pos).setY(pos.y + lift).project(camera)
      const visible = proj.z < 1 && Math.abs(proj.x) < 1.2 && Math.abs(proj.y) < 1.2
      elm.style.display = visible ? '' : 'none'
      if (visible) elm.style.transform = `translate(-50%, -100%) translate(${(proj.x * 0.5 + 0.5) * renderer.domElement.clientWidth}px, ${(-proj.y * 0.5 + 0.5) * renderer.domElement.clientHeight}px)`
      return visible
    }

    let raf = 0, last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now  // movement stays speed-correct down to 10 fps
      const { st, frozen, bubbles } = p.current
      if (spawnTo.current) {
        me.position.copy(toWorld(ZONES[spawnTo.current].x, ZONES[spawnTo.current].y + 40)); target = null
        spawnTo.current = null
      }
      // player movement, relative to the camera
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      const mv = new THREE.Vector3()
      if (!frozen) {
        if (keys.has('w') || keys.has('arrowup')) mv.add(fwd)
        if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd)
        if (keys.has('d') || keys.has('arrowright')) mv.add(right)
        if (keys.has('a') || keys.has('arrowleft')) mv.sub(right)
        if (!mv.lengthSq() && target) {
          const d = target.clone().sub(me.position).setY(0)
          if (d.length() < 0.3) target = null; else mv.copy(d)
        }
      }
      animate(people.you, mv, SPEED, dt)
      for (const o of solids) { // walls are solid: push the player back out
        const dx = me.position.x - o.x, dz = me.position.z - o.z, d = Math.hypot(dx, dz)
        if (d < o.r && d > 1e-4) { me.position.x = o.x + (dx / d) * o.r; me.position.z = o.z + (dz / d) * o.r }
      }
      me.position.x = Math.max(-6, Math.min(66, me.position.x))
      me.position.z = Math.max(-6, Math.min(46, me.position.z))
      const z = zoneAt(me.position.x / S, me.position.z / S)
      if (z !== zone) { zone = z; p.current.onZone(z) }

      const goals = npcGoal(st)
      for (const v of st.villagers) {
        const pp = people[v.id], g = goals[v.id]
        const d = g.clone().sub(pp.group.position).setY(0)
        animate(pp, d.length() > 0.15 ? d : new THREE.Vector3(), Math.min(NPC_SPEED, d.length() / dt), dt)
        if (d.length() <= 0.15) { // idle: face the player if they're close
          const tm = me.position.clone().sub(pp.group.position)
          if (tm.length() < 6) pp.group.rotation.y = lerpAngle(pp.group.rotation.y, Math.atan2(tm.x, tm.z), 0.08)
        }
        ;(pp.ring.material as THREE.MeshBasicMaterial).color.set(moodColor(v.opinion))
      }
      // who can I talk to?
      let best: string | null = null, bd = 4.2
      for (const v of st.villagers) {
        if (!v.place || v.place !== st.place || z !== st.place) continue
        const d = people[v.id].group.position.distanceTo(me.position)
        if (d < bd) { bd = d; best = v.id }
      }
      if (best !== near) { near = best; p.current.onNear(best) }

      // camera: third person, behind and above
      const look = me.position.clone().setY(1.6)
      const camPos = look.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(dist * 0.86)).setY(1.6 + dist * 0.5)
      camera.position.lerp(camPos, 1 - Math.pow(0.001, dt))
      camera.lookAt(look)

      // time of day
      const hr = st.hour
      const night = hr >= 22 || hr < 5, dusk = hr >= 18 && hr < 22, dawn = hr >= 5 && hr < 7
      sky.copy(night ? NIGHT : dusk ? DUSK.clone().lerp(NIGHT, (hr - 18) / 4) : dawn ? NIGHT.clone().lerp(DAY, (hr - 4) / 3) : DAY)
      scene.background = sky; fogC.copy(sky); (scene.fog as THREE.Fog).color.copy(fogC)
      sun.intensity = night ? 0.15 : dusk ? 1.6 - (hr - 18) * 0.3 : dawn ? 1 : 2.6
      sun.color.set(dusk ? 0xffb070 : night ? 0x8fa0ff : 0xfff1d6)
      hemi.intensity = night ? 0.35 : 1.2
      for (const w of windows) (w.material as THREE.MeshStandardMaterial).emissiveIntensity = night || dusk ? 1.6 : 0
      const hz = ZONES[st.place]; here.position.set(hz.x * S, 0.08, hz.y * S)
      here.visible = z === st.place

      // fade whatever stands between the camera and the player
      const toMe = look.clone().sub(camera.position)
      sight.set(camera.position, toMe.clone().normalize()); sight.far = toMe.length()
      const blocking = new Set(sight.intersectObjects(walls, false).map(h => h.object as THREE.Mesh))
      for (const m of walls) {
        const fade = blocking.has(m), mat = m.material as THREE.MeshStandardMaterial
        if (fade === faded.has(m)) continue
        if (fade) faded.add(m); else faded.delete(m)
        mat.transparent = fade; mat.opacity = fade ? 0.22 : 1; mat.depthWrite = !fade; mat.needsUpdate = true
      }
      renderer.render(scene, camera)

      // labels, prompt, bubbles (DOM overlay)
      for (const [id, tag] of Object.entries(tags)) {
        const asleep = id !== 'you' && !st.villagers.find(v => v.id === id)?.place
        tag.classList.toggle('asleep', asleep)
        place(tag, people[id].group.position, (LOOKS[id].scale ?? 1) * 2.7)
      }
      if (near && !frozen) {
        prompt.textContent = `E · Talk to ${shortName(st.villagers.find(v => v.id === near)?.name || '')}`
        place(prompt, people[near].group.position, 3.6)
      } else prompt.style.display = 'none'
      const live = bubbles.filter(b => now - b.born >= 0 && now - b.born <= BUBBLE_MS).slice(-MAX_BUBBLES)
      const liveIds = new Set(live.map(b => b.id))
      for (const [id, elm] of bubbleEls) if (!liveIds.has(id)) { elm.remove(); bubbleEls.delete(id) }
      const stack: Record<string, number> = {}
      for (const b of live) {
        let elm = bubbleEls.get(b.id)
        if (!elm) { elm = document.createElement('div'); elm.className = `bubble3d ${b.tone}`; elm.textContent = b.text; ov.appendChild(elm); bubbleEls.set(b.id, elm) }
        const k = (stack[b.who] = (stack[b.who] ?? -1) + 1)
        const who = people[b.who]
        if (!who) continue
        place(elm, who.group.position, (LOOKS[b.who].scale ?? 1) * 3.4 + k * 1.1)
        elm.style.opacity = String(Math.min(1, (BUBBLE_MS - (now - b.born)) / 600))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur)
      renderer.dispose(); el.remove(); ov.innerHTML = ''
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className="world3d" aria-label="3D village. Move with WASD or arrow keys, drag to look around, click to walk.">
      <div ref={overlay} className="overlay3d" />
      <p className="controls3d">WASD / arrows: move · drag: look around · scroll: zoom · click: walk there · E: talk</p>
    </div>
  )
}

// keep trees off places, roads and homes (map units)
function blocked(mx: number, my: number) {
  if (Object.values(ZONES).some(z => Math.hypot(mx - z.x, my - z.y) < 175)) return true
  if (Object.values(HOMES).some(([x, y]) => Math.hypot(mx - x, my - y) < 90)) return true
  const hRoad = [275, 625, 735].some(y => Math.abs(my - y) < 45) && mx > 100 && mx < 1120
  const vRoad = [230, 600, 970].some(x => Math.abs(mx - x) < 45) && my > 240 && my < 760
  return hRoad || vRoad
}

function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * t
}

function animate(pp: Person, dir: THREE.Vector3, speed: number, dt: number) {
  const g = pp.group
  if (dir.lengthSq() > 1e-6) {
    const step = dir.clone().setY(0).normalize().multiplyScalar(speed * dt)
    g.position.add(step)
    g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(step.x, step.z), 0.25)
    pp.walk += dt * 10
  } else pp.walk *= 0.85
  const swing = Math.sin(pp.walk) * 0.6 * Math.min(1, Math.abs(pp.walk) > 0.01 ? 1 : 0)
  pp.legs[0].rotation.x = swing; pp.legs[1].rotation.x = -swing
  g.position.y = Math.abs(Math.sin(pp.walk)) * 0.06
}
