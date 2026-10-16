import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getPlayer, setPlayer, type Debug, type Hop, type State, type Why } from './api'
import Dialogue, { type Msg } from './Dialogue'
import GameCanvas, { type Bubble } from './GameCanvas'
import { type GraphHandle } from './GossipGraph'
import { QUESTS, TROPHIES, loadProgress, newProgress, saveProgress, type Flags, type Progress } from './quests'
import Spyglass from './Spyglass'
import WhyModal from './WhyModal'
import { FACE, hourLabel, moodColor, moodFace, moodWord, shortName } from './world'

type Feed = { tick: number; text: string; tone?: 'bad' | 'good' }
type Toast = { id: number; text: string }
type Act = { result: any; state: State; debug?: Debug }
type Rumour = { id: string; holder: string; text: string; severity: number; heard_from: string[] }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
let uid = 0

export default function App() {
  const [screen, setScreen] = useState<'intro' | 'game'>('intro')
  const [st, setSt] = useState<State | null>(null)
  const [prog, setProg] = useState<Progress>(newProgress())
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [feed, setFeed] = useState<Feed[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [zone, setZone] = useState<string | null>(null)
  const [near, setNear] = useState<string | null>(null)
  const [talkTo, setTalkTo] = useState<string | null>(null)
  const [chats, setChats] = useState<Record<string, Msg[]>>({})
  const [why, setWhy] = useState<Why | null>(null)
  const [busy, setBusy] = useState(false)
  const [ff, setFf] = useState(false)
  const [spy, setSpy] = useState(false)
  const [help, setHelp] = useState(false)
  const [trophies, setTrophies] = useState(false)
  const [away, setAway] = useState<{ hours: number; hops: Hop[] } | null>(null)
  const [win, setWin] = useState<{ rumours: Rumour[] } | null>(null)
  const [plan, setPlan] = useState('')
  const [debug, setDebug] = useState<Debug | null>(null)
  const [spawn, setSpawn] = useState(0)
  const [error, setError] = useState('')
  const graph = useRef<GraphHandle>(null)
  const stopFf = useRef(false)
  const stRef = useRef<State | null>(null)
  stRef.current = st

  const name = (id: string) => stRef.current?.villagers.find(v => v.id === id)?.name || id
  const toast = useCallback((text: string) => {
    const id = ++uid
    setToasts(t => [...t, { id, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200)
  }, [])
  const say = (who: string, text: string, tone: Bubble['tone'] = 'say', delay = 0) =>
    setBubbles(b => [...b.filter(x => performance.now() - x.born < 8000), { id: ++uid, who, text, tone, born: performance.now() + delay }])
  const setFlag = (f: Partial<Flags>) => setProg(p => ({ ...p, flags: { ...p.flags, ...f } }))

  // ---------- session ----------
  const start = async (fresh: boolean) => {
    setError('')
    if (fresh) setPlayer('')
    try {
      const s = await api<{ player_id: string; state: State; away: { hours: number; hops: Hop[] } | null }>(
        '/api/session', { player_id: getPlayer() || null })
      setPlayer(s.player_id)
      setSt(s.state)
      setProg(fresh ? newProgress(s.state.tick) : loadProgress(s.player_id, s.state.tick))
      setSpawn(n => n + 1)
      setFeed([]); setChats({}); setBubbles([]); setWin(null)
      if (s.away?.hops.length) {
        setAway(s.away)
        setFeed(hopFeed(s.away.hops).reverse())
      }
      setScreen('game')
      if (fresh) setHelp(false)
    } catch (e) { setError((e as Error).message) }
  }

  useEffect(() => { if (st) saveProgress(getPlayer(), prog) }, [prog, st])

  // ---------- quests + trophies ----------
  useEffect(() => {
    if (!st || screen !== 'game') return
    let p = prog
    while (p.quest < QUESTS.length && QUESTS[p.quest].done(st, p.flags)) {
      toast(`✅ Quest complete: ${QUESTS[p.quest].title}`)
      p = { ...p, quest: p.quest + 1 }
    }
    for (const t of TROPHIES) {
      if (!p.trophies.includes(t.id) && t.check(st, p.flags)) {
        toast(`${t.icon} Achievement: ${t.title}`)
        p = { ...p, trophies: [...p.trophies, t.id] }
      }
    }
    if (p.quest === QUESTS.length && !p.flags.winTick) {
      p = { ...p, flags: { ...p.flags, winTick: st.tick } }
      api<{ rumours: Rumour[] }>('/api/graph?view=rumour').then(r => setWin({ rumours: r.rumours }))
    }
    if (p !== prog) setProg(p)
  }, [st, prog, screen, toast])

  const quest = QUESTS[prog.quest]
  useEffect(() => {
    if (quest?.id !== 'fix') return
    setPlan('')
    api<{ plan: string }>('/api/spymaster/ask', { question: 'How do I fix my reputation with Captain Ilsa?' })
      .then(r => setPlan(r.plan)).catch(() => {})
  }, [quest?.id])

  // ---------- gossip playback ----------
  const hopFeed = (hops: Hop[]): Feed[] => hops.map(h => ({
    tick: h.tick, tone: h.sentiment < 0 ? 'bad' : 'good',
    text: h.kind === 'hop'
      ? `${shortName(name(h.teller))} → ${shortName(name(h.listener))}: “${h.text}”`
      : `${shortName(name(h.teller))} confirmed it to ${shortName(name(h.listener))}`,
  }))

  const playHops = (hops: Hop[]) => {
    if (!hops.length) return 0
    hops.forEach((h, i) => {
      const tone = h.sentiment < 0 ? 'bad' : 'good'
      say(h.teller, h.kind === 'hop' ? `${h.text}` : 'It\'s true, I heard it too!', tone, i * 900)
      say(h.listener, h.kind === 'hop' ? (h.sentiment < 0 ? '😮' : '😊') : '🤔', 'say', i * 900 + 450)
    })
    setFeed(f => [...hopFeed(hops).reverse(), ...f].slice(0, 60))
    const w = hops.filter(h => h.event.startsWith('whisper-') && h.kind === 'hop').length
    if (w) setProg(p => ({ ...p, flags: { ...p.flags, whisperHops: p.flags.whisperHops + w } }))
    graph.current?.play(hops)
    return hops.length * 900
  }

  // ---------- actions ----------
  const run = async <T,>(fn: () => Promise<T & { debug?: Debug }>): Promise<(T & { debug?: Debug }) | undefined> => {
    setBusy(true); setError('')
    try {
      const r = await fn()
      if (r.debug) setDebug(r.debug)
      return r
    } catch (e) {
      const msg = (e as Error).message
      toast(`⚠️ ${msg.charAt(0).toUpperCase()}${msg.slice(1)}`)
    } finally { setBusy(false) }
  }

  const act = async (action: string, extra: Record<string, string> = {}) => {
    const r = await run(() => api<Act>('/api/act', { action, ...extra }))
    if (!r) return
    const res = r.result
    setSt(r.state)
    if (action === 'steal') {
      setFlag({ stole: true, ...(res.witnesses.length ? {} : { ghost: true }) })
      say('you', '*crunch* 🍎')
      if (res.witnesses.length) res.witnesses.forEach((w: string, i: number) => {
        const id = r.state.villagers.find(v => v.name === w)?.id
        if (id) say(id, i === 0 ? 'Oi! I saw that, thief!' : 'Did they just…?!', 'bad', 300 + i * 300)
      })
      toast(res.witnesses.length ? `👀 Seen by ${res.witnesses.join(', ')}` : '👻 Nobody saw a thing.')
    } else if (action === 'help') {
      say('you', 'Let me help with that!')
      res.witnesses.forEach((w: string) => {
        const id = r.state.villagers.find(v => v.name === w)?.id
        if (id) say(id, 'Thank you, kind traveller!', 'good', 400)
      })
      toast(res.witnesses.length ? `🤝 ${res.witnesses.join(', ')} saw you help${res.coins != null ? ' (+2 🪙 tip)' : ''}` : '🤝 You helped… but nobody noticed.')
    } else if (action === 'gift') {
      if (res.refused) { say(extra.target, 'A bribe?! How dare you!', 'bad'); setFlag({ bribed: true }) }
      else say(extra.target, 'Oh! For me? How kind!', 'good')
    } else if (action === 'whisper') {
      say('you', 'Psst… have you heard?')
      say(extra.target, 'Ooh, really?', 'say', 500)
    } else if (action === 'buy') {
      toast(`🍎 Old Tomas charged you ${res.price} coins`)
    } else if (action === 'pass_gate') {
      if (res.blocked) {
        setFlag({ blocked: true })
        say('ilsa', 'Halt! You are not leaving this town.', 'bad')
        toast('⛔ The gate is blocked!')
      } else if (QUESTS[prog.quest]?.id === 'escape') {
        setFlag({ passed: true })
      } else {
        say('ilsa', 'Move along, traveller.', 'good')
        toast('🚪 The guard would let you through… but your story here isn\'t over. Follow the quest.')
      }
    }
    playHops(res.hops)
  }

  const waitHours = async (n: number) => {
    setFf(n > 1); stopFf.current = false
    for (let i = 0; i < n && !stopFf.current; i++) {
      const r = await run(() => api<{ hops: Hop[]; state: State }>('/api/wait', { ticks: 1 }))
      if (!r) break
      setSt(r.state)
      const ms = playHops(r.hops)
      if (n > 1) await sleep(Math.max(500, ms))
    }
    setFf(false)
  }

  const talk = async (text: string) => {
    if (!talkTo) return
    const id = talkTo
    setChats(c => ({ ...c, [id]: [...(c[id] || []), { from: 'you', text }] }))
    const r = await run(() => api<{ reply: string; action: string }>('/api/talk', { villager: id, text }))
    if (!r) return
    setChats(c => ({ ...c, [id]: [...(c[id] || []), { from: 'them', text: r.reply, action: r.action }] }))
    say(id, r.reply, 'say')
    const s = await api<{ state: State }>('/api/state')
    setSt(s.state)
  }

  const askWhy = async (id: string) => {
    const r = await run(() => api<Why>(`/api/why?villager=${id}`))
    if (!r) return
    setWhy(r)
    if (id === 'ilsa' && r.chain.length) setFlag({ whyIlsa: true })
  }

  // walking into a place = going there (1 hour)
  useEffect(() => {
    if (!st || busy || !zone || zone === st.place) return
    act('go', { place: zone })
  }, [zone, st?.place, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- keyboard: number keys for the action bar, space to wait ----------
  const inPlace = !!st && zone === st.place
  const present = st ? st.villagers.filter(v => v.place === st.place).map(v => v.id) : []
  const [skipTarget, skipName] = !st ? [7, 'morning'] : st.hour >= 7 && st.hour < 17 ? [17, 'evening'] : st.hour >= 17 && st.hour < 22 ? [22, 'night'] : [7, 'morning']
  const skipHours = st ? (skipTarget - st.hour + 24) % 24 || 24 : 0
  const actions: { label: string; run: () => void; hint?: string }[] = st ? [
    ...(inPlace && st.place === 'market' ? [{ label: '🍎 Steal an apple', run: () => act('steal') }, { label: '🪙 Buy an apple', run: () => act('buy') }] : []),
    ...(inPlace ? [{ label: '🤝 Help out', run: () => act('help'), hint: 'A good deed. Whoever is here sees it.' }] : []),
    ...(inPlace && st.place === 'gate' ? [{ label: '🚪 Leave town', run: () => act('pass_gate') }] : []),
    ...(near ? [{ label: `💬 Talk to ${shortName(name(near))}`, run: () => setTalkTo(near) }] : []),
    { label: '⏳ Wait an hour', run: () => waitHours(1) },
    { label: `⏩ Skip to ${skipName} (${hourLabel(skipTarget)})`, run: () => waitHours(skipHours) },
  ] : []

  const modal = !!(talkTo || why || spy || help || trophies || away || win)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (modal || busy || screen !== 'game') return
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (e.key === ' ') { e.preventDefault(); waitHours(1) }
      const n = Number(e.key)
      if (n >= 1 && n <= actions.length) actions[n - 1].run()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  // ---------- screens ----------
  if (screen === 'intro') return <Intro canContinue={!!getPlayer()} onStart={start} error={error} />
  if (!st) return null

  const talkV = st.villagers.find(v => v.id === talkTo)
  const night = st.hour >= 23 || st.hour < 6

  return (
    <div className="game">
      <header className="topbar">
        <h1>Hearsay</h1>
        <div className="pill clock" aria-live="polite">{night ? '🌙' : st.hour >= 17 ? '🌇' : '☀️'} Day {st.day} · {hourLabel(st.hour)}</div>
        <div className="pill" title="Your coins">🪙 {st.coins ?? 0}</div>
        <span className="spacer" />
        <button className="ghost" onClick={() => setHelp(true)}>❓ How to play</button>
        <button className="ghost" onClick={() => setTrophies(true)}>🏆 {prog.trophies.length}/{TROPHIES.length}</button>
        <button className="ghost" onClick={() => setSpy(true)}>🔭 Spyglass</button>
        <button className="ghost" onClick={() => { if (window.confirm('Start a new game? This village will forget you.')) start(true) }}>↺ New game</button>
      </header>

      <div className="layout">
        <aside className="side left">
          {quest ? (
            <section className="card quest">
              <p className="kicker">Quest {prog.quest + 1} of {QUESTS.length}</p>
              <h2>{quest.title}</h2>
              <p>{quest.body(st, prog.flags)}</p>
              {quest.hint && <p className="hint">💡 {quest.hint}</p>}
              {quest.id === 'fix' && plan && <p className="plan">🕵️ Spymaster: {plan}</p>}
            </section>
          ) : (
            <section className="card quest">
              <p className="kicker">Free play</p>
              <h2>You escaped! 🎉</h2>
              <p>Keep playing: hunt the achievements (🏆), or start a new game.</p>
            </section>
          )}
          <section className="card feed">
            <h3>📣 Rumour mill</h3>
            {feed.length === 0 ? <p className="hint">Nobody is talking about you… yet.</p> : (
              <ul>{feed.slice(0, 8).map((f, i) => <li key={i} className={f.tone}><code>{hourLabel(f.tick % 24)}</code> {f.text}</li>)}</ul>
            )}
          </section>
        </aside>

        <main className="center">
          <GameCanvas st={st} bubbles={bubbles} frozen={modal || busy && ff} spawn={spawn}
                      onZone={setZone} onNear={setNear} onTalk={id => setTalkTo(id)} />
          <div className="actionbar">
            {!inPlace && <span className="hint">{zone === null ? 'Walk into a place to do things there.' : 'Arriving…'}</span>}
            {actions.map((a, i) => (
              <button key={a.label} onClick={a.run} disabled={busy} title={a.hint}>
                <kbd>{i + 1}</kbd> {a.label}
              </button>
            ))}
            {ff && <button className="ghost" onClick={() => { stopFf.current = true }}>⏹ Stop</button>}
          </div>
          {ff && <div className="ff">⏩ Time flies… {hourLabel(st.hour)}</div>}
        </main>

        <aside className="side right">
          <section className="card opinions">
            <h3>What they think of you</h3>
            {st.villagers.map(v => (
              <button key={v.id} className="person" onClick={() => setTalkTo(v.id)} title={`Talk to ${v.name}, or ask why`}>
                <span className="face" style={{ borderColor: moodColor(v.opinion) }}>{FACE[v.id]}</span>
                <span className="who"><b>{shortName(v.name)}</b><small>{v.role} · {v.place ? (v.place === st.place ? 'here' : st.places.find(p => p.id === v.place)?.name) : 'asleep'}</small></span>
                <span className="mood" title={moodWord(v.opinion)}>{moodFace(v.opinion)}</span>
                <span className="meter"><span style={{ left: `${(v.opinion + 1) * 50}%`, background: moodColor(v.opinion) }} /></span>
              </button>
            ))}
            <p className="hint">Click anyone to ask them <b>“Why?”</b></p>
          </section>
          {st.notices.length > 0 && <section className="card notice">📜 {st.notices[0].text}</section>}
        </aside>
      </div>

      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}</div>

      {talkV && <Dialogue v={talkV} msgs={chats[talkV.id] || []} busy={busy} coins={st.coins ?? 0}
                          here={present.includes(talkV.id) && inPlace}
                          onSay={talk} onWhy={() => askWhy(talkV.id)} onClose={() => setTalkTo(null)}
                          onGift={() => act('gift', { target: talkV.id })}
                          onWhisper={ladder => act('whisper', { target: talkV.id, ladder })} />}
      {why && <WhyModal why={why} name={name(why.villager)} onClose={() => setWhy(null)} />}
      {spy && <Spyglass st={st} debug={debug} graphRef={graph} onDebug={d => d && setDebug(d)} onClose={() => setSpy(false)} />}
      {help && <HowTo onClose={() => setHelp(false)} />}
      {trophies && <Trophies got={prog.trophies} onClose={() => setTrophies(false)} />}
      {away && (
        <div className="modal-bg" onClick={() => setAway(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🌙 {away.hours} hours have passed…</h2>
            <p>While you were away, people talked. <b>{away.hops.length}</b> conversation{away.hops.length === 1 ? '' : 's'} about you:</p>
            <ul className="away">{hopFeed(away.hops).map((f, i) => <li key={i} className={f.tone}>{f.text}</li>)}</ul>
            <button onClick={() => setAway(null)}>Back to the village</button>
          </div>
        </div>
      )}
      {win && <Win st={st} prog={prog} rumours={win.rumours} onClose={() => setWin(null)} onNew={() => start(true)} />}
    </div>
  )
}

function Intro({ canContinue, onStart, error }: { canContinue: boolean; onStart: (fresh: boolean) => void; error: string }) {
  return (
    <div className="intro">
      <div className="intro-card">
        <p className="kicker">A tiny village that never forgets</p>
        <h1>Hearsay</h1>
        <p className="tag">Everyone's talking about you.</p>
        <div className="how3">
          <div><span>👀</span><b>They remember</b><p>Villagers remember what they see you do.</p></div>
          <div><span>🗣️</span><b>They gossip</b><p>Stories spread from friend to friend, and get worse with every retelling.</p></div>
          <div><span>🔍</span><b>Ask “Why?”</b><p>Anyone can show you exactly who told them what.</p></div>
        </div>
        <p className="controls">Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows / click · Talk: <kbd>E</kbd> · Wait: <kbd>Space</kbd> · Actions: <kbd>1</kbd>–<kbd>6</kbd></p>
        <div className="row center">
          <button className="big" onClick={() => onStart(true)}>▶ New game</button>
          {canContinue && <button className="big ghost" onClick={() => onStart(false)}>Continue</button>}
        </div>
        {error && <p className="error">Can't reach the village: {error}</p>}
        <p className="fine">Every memory, rumour and friendship lives in a FalkorDB graph. Peek with the 🔭 Spyglass.</p>
      </div>
    </div>
  )
}

function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>❓ How to play</h2>
        <ul className="howto">
          <li><b>Follow the quest</b> (top left). It walks you through everything.</li>
          <li><b>Walk</b> with WASD / arrow keys, or click where you want to go. Entering a place takes an hour.</li>
          <li><b>Do things</b> with the buttons under the map (or number keys). Whoever is in the same place <i>witnesses</i> it.</li>
          <li><b>Time</b> moves one hour per action. Wait with <kbd>Space</kbd>, or skip to the evening, when everyone meets at the inn and gossips.</li>
          <li><b>Gossip</b> travels only between people who trust each other, and gets exaggerated. Watch the speech bubbles and the 📣 Rumour mill.</li>
          <li><b>Faces</b> on the right show what each villager thinks of you, from 😡 to 🤩. Their opinions decide prices, rooms and the town gate.</li>
          <li><b>Talk</b> to anyone nearby with <kbd>E</kbd>, and ask <b>“Why?”</b> to see exactly who told them.</li>
          <li><b>🔭 Spyglass</b> shows the trust network and graph algorithms, like who the most influential gossip is, and the fastest route for a rumour.</li>
        </ul>
        <button onClick={onClose}>Let's go</button>
      </div>
    </div>
  )
}

function Trophies({ got, onClose }: { got: string[]; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>🏆 Achievements</h2>
        <ul className="trophies">
          {TROPHIES.map(t => (
            <li key={t.id} className={got.includes(t.id) ? 'got' : ''}>
              <span>{got.includes(t.id) ? t.icon : '🔒'}</span><b>{t.title}</b><small>{t.text}</small>
            </li>
          ))}
        </ul>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function Win({ st, prog, rumours, onClose, onNew }: { st: State; prog: Progress; rumours: Rumour[]; onClose: () => void; onNew: () => void }) {
  const hours = (prog.flags.winTick ?? st.tick) - prog.flags.startTick
  const worst = [...rumours].filter(r => !r.id.startsWith('good_deed') && !r.id.startsWith('whisper')).sort((a, b) => b.severity - a.severity)[0]
  const holderOf = Object.fromEntries(rumours.map(r => [r.id, r.holder]))
  const tellers: Record<string, number> = {}
  for (const r of rumours) for (const s of r.heard_from) { const t = holderOf[s]; if (t && t in FACE) tellers[t] = (tellers[t] || 0) + 1 }
  const top = Object.entries(tellers).sort((a, b) => b[1] - a[1])[0]
  const vname = (id: string) => st.villagers.find(v => v.id === id)?.name || id
  return (
    <div className="modal-bg">
      <div className="modal win">
        <h2>🏆 You escaped Brindlewick!</h2>
        <p>One stolen apple, {hours} hours, and a whole village talking.</p>
        <div className="stats">
          <div><b>{hours}h</b><small>to escape</small></div>
          <div><b>{rumours.length}</b><small>versions of stories about you</small></div>
          <div><b>{prog.trophies.length}/{TROPHIES.length}</b><small>achievements</small></div>
        </div>
        {worst && <p>Worst thing they said: <b>“{worst.text}”</b> ({vname(worst.holder)})</p>}
        {top && <p>Biggest gossip: <b>{FACE[top[0]]} {vname(top[0])}</b>, who passed on {top[1]} stor{top[1] === 1 ? 'y' : 'ies'}.</p>}
        <p className="hint">Everything you saw was stored and traced in a FalkorDB graph. Open the 🔭 Spyglass to see how.</p>
        <div className="row center">
          <button onClick={onClose}>Keep playing</button>
          <button className="ghost" onClick={onNew}>New game</button>
        </div>
      </div>
    </div>
  )
}
