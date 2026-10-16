import { useEffect, useMemo, useRef, useState } from 'react'
import { api, getPlayer, setPlayer, type Debug, type Hop, type State, type Why } from './api'
import GossipGraph, { type GraphHandle } from './GossipGraph'
import Inspector from './Inspector'
import Spymaster from './Spymaster'
import VillageMap from './VillageMap'

type Msg = { from: 'you' | 'them'; text: string; action?: string }
type Log = { tick: number; text: string; tone?: 'bad' | 'good' }
type Edge = { source: string; target: string; weight: number }
type Act = { result: any; state: State }

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

export default function App() {
  const [st, setSt] = useState<State | null>(null)
  const [edges, setEdges] = useState<Edge[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [chats, setChats] = useState<Record<string, Msg[]>>({})
  const [input, setInput] = useState('')
  const [why, setWhy] = useState<Why | null>(null)
  const [highlight, setHighlight] = useState<string[]>([])
  const [log, setLog] = useState<Log[]>([])
  const [debug, setDebug] = useState<Debug | null>(null)
  const [away, setAway] = useState<{ hours: number; hops: Hop[] } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'graph' | 'spy' | 'hood'>('graph')
  const [whisper, setWhisper] = useState('good_deed')
  const graph = useRef<GraphHandle>(null)

  const names = useMemo(() => Object.fromEntries((st?.villagers || []).map(v => [v.id, v.name])), [st])
  const placeName = (id: string) => st?.places.find(p => p.id === id)?.name || id
  const present = st ? st.villagers.filter(v => v.place === st.place).map(v => v.id) : []
  const sel = st?.villagers.find(v => v.id === selected)

  const hopsToLog = (hops: Hop[], nm = names, pn = placeName): Log[] => hops.map(h => ({
    tick: h.tick,
    tone: h.sentiment < 0 ? 'bad' : 'good',
    text: h.kind === 'hop'
      ? `At ${pn(h.place)}, ${nm[h.teller]} told ${nm[h.listener]}: “${h.text}” (severity ${h.severity})`
      : `${nm[h.teller]} confirmed it to ${nm[h.listener]}, now ${Math.round(h.confidence * 100)}% sure`,
  }))

  const run = async <T,>(fn: () => Promise<T & { debug?: Debug }>) => {
    setBusy(true); setError('')
    try {
      const r = await fn()
      if (r.debug) setDebug(r.debug)
      return r
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  useEffect(() => {
    run(async () => {
      const s = await api<{ player_id: string; state: State; away: { hours: number; hops: Hop[] } | null }>(
        '/api/session', { player_id: getPlayer() || null })
      setPlayer(s.player_id)
      const g = await api<{ edges: Edge[] }>('/api/graph')
      setEdges(g.edges); setSt(s.state)
      if (s.away) {
        setAway(s.away)
        const nm = Object.fromEntries(s.state.villagers.map(v => [v.id, v.name]))
        const pn = (id: string) => s.state.places.find(p => p.id === id)?.name || id
        setLog(hopsToLog(s.away.hops, nm, pn).reverse())
        setTimeout(() => graph.current?.play(s.away!.hops), 1500)
      }
      return s
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const afterHops = (hops: Hop[]) => {
    if (!hops.length) return
    setLog(l => [...hopsToLog(hops).reverse(), ...l].slice(0, 80))
    graph.current?.play(hops)
  }

  const say = (text: string, tone?: Log['tone']) => setLog(l => [{ tick: st?.tick || 0, text, tone }, ...l].slice(0, 80))

  const act = async (action: string, extra: Record<string, string> = {}) => {
    const r = await run(() => api<Act>('/api/act', { action, ...extra }))
    if (!r) return
    const res = r.result
    const seen = res.witnesses?.length ? `Seen by: ${res.witnesses.join(', ')}.` : 'Nobody saw.'
    const msg: Record<string, string> = {
      go: `You walk to ${placeName(res.place)}.`,
      steal: `You pocket an apple from Tomas's stall. ${seen}`,
      help: `You lend a hand at ${placeName(res.place)}. ${seen}`,
      gift: `You give ${names[extra.target]} a small gift.`,
      whisper: `You whisper to ${names[extra.target]} that you ${extra.ladder === 'theft' ? 'took an apple' : 'fetched water for Father Anselm'}.`,
      buy: `Old Tomas charges you ${res.price} coins for an apple (usually 10).`,
      pass_gate: res.blocked ? 'Captain Ilsa blocks the gate! Ask her “Why?”' : 'The guard waves you through the gate.',
      wait: 'You wait an hour.',
    }
    say(msg[action], action === 'steal' || res.blocked ? 'bad' : action === 'help' ? 'good' : undefined)
    setSt(r.state)
    afterHops(res.hops)
  }

  const wait = async (ticks: number) => {
    const r = await run(() => api<{ hops: Hop[]; state: State }>('/api/wait', { ticks }))
    if (!r) return
    say(`You wait ${ticks} hour${ticks > 1 ? 's' : ''}.`)
    setSt(r.state); afterHops(r.hops)
  }

  const talk = async () => {
    if (!selected || !input.trim()) return
    const text = input.trim()
    setInput('')
    setChats(c => ({ ...c, [selected]: [...(c[selected] || []), { from: 'you', text }] }))
    const r = await run(() => api<{ reply: string; action: string }>('/api/talk', { villager: selected, text }))
    if (!r) return
    setChats(c => ({ ...c, [selected]: [...(c[selected] || []), { from: 'them', text: r.reply, action: r.action }] }))
    const s = await api<{ state: State }>('/api/state')
    setSt(s.state)
  }

  const askWhy = async () => {
    if (!selected) return
    const r = await run(() => api<Why>(`/api/why?villager=${selected}`))
    if (!r) return
    setWhy(r)
    setHighlight(r.chain.map(c => c.id).filter(id => id in names))
    setTab('graph')
  }

  const reset = async () => {
    if (!window.confirm('Start a fresh village? Everyone will forget you.')) return
    const r = await run(() => api<{ state: State }>('/api/reset', {}))
    if (!r) return
    setSt(r.state); setLog([]); setChats({}); setWhy(null); setHighlight([]); setAway(null)
  }

  if (!st) return <div className="loading">{error ? `Can't reach the village: ${error}` : 'Walking into the village…'}</div>

  const here = st.place
  return (
    <div className="app">
      <header>
        <h1>Hearsay <span>Everyone's talking about you.</span></h1>
        <div className="clock" aria-live="polite">Day {st.day} · {hourLabel(st.hour)}</div>
        <button className="ghost" onClick={reset}>New village</button>
      </header>

      {away && (
        <div className="banner" role="status">
          <b>{away.hours} hours have passed. People have been talking…</b>
          {away.hops.length ? ` ${away.hops.length} conversation${away.hops.length > 1 ? 's' : ''} about you while you were away.` : ' Nothing new, it seems.'}
          <button className="ghost" onClick={() => setAway(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {st.notices.length > 0 && <div className="notice">📜 {st.notices[0].text}</div>}
      {error && <div className="error" role="alert">{error}</div>}

      <main>
        <div className="left">
          <VillageMap state={st} selected={selected} highlight={new Set(highlight)}
                      onPlace={id => id !== here && !busy && act('go', { place: id })}
                      onVillager={id => { setSelected(id); setWhy(null) }} />
          <p className="hint">Click a place to walk there (1 hour). Click a villager to talk. Ring colour = what they think of you.</p>
          <div className="actions">
            <button disabled={busy || here !== 'market'} onClick={() => act('steal')} title="Only at the market">🍎 Steal</button>
            <button disabled={busy || here !== 'market' || !present.includes('tomas')} onClick={() => act('buy')}>🪙 Buy</button>
            <button disabled={busy} onClick={() => act('help')}>🤝 Help</button>
            <button disabled={busy || !selected || !present.includes(selected)} onClick={() => act('gift', { target: selected! })}>🎁 Gift{sel ? ` ${sel.name.split(' ').pop()}` : ''}</button>
            <span className="whisper">
              <select value={whisper} onChange={e => setWhisper(e.target.value)} aria-label="Whisper story">
                <option value="good_deed">good deed</option>
                <option value="theft">theft</option>
              </select>
              <button disabled={busy || !selected || !present.includes(selected)} onClick={() => act('whisper', { target: selected!, ladder: whisper })}>🤫 Whisper</button>
            </span>
            <button disabled={busy || here !== 'gate'} onClick={() => act('pass_gate')}>🚪 Pass gate</button>
            <button disabled={busy} onClick={() => wait(1)}>⏳ Wait an hour</button>
            <button disabled={busy} onClick={() => wait(3)}>⏳ 3 hours</button>
          </div>
          <section className="panel log">
            <h2>What's being said</h2>
            {log.length === 0 && <p className="hint">Nothing yet. Do something people will talk about.</p>}
            <ul>{log.map((l, i) => <li key={i} className={l.tone}><code>{hourLabel(l.tick % 24)}</code> {l.text}</li>)}</ul>
          </section>
        </div>

        <div className="right">
          <section className="panel dialogue">
            {!sel ? <p className="hint">Pick a villager on the map to talk to them.</p> : (
              <>
                <h2>{sel.name} <small>{sel.role} · opinion {sel.opinion >= 0 ? '+' : ''}{sel.opinion.toFixed(2)}</small></h2>
                <div className="chat">
                  {(chats[sel.id] || []).map((m, i) => (
                    <p key={i} className={m.from}>{m.text}{m.action && m.action !== 'talk' && <em> [{m.action.replace('_', ' ')}]</em>}</p>
                  ))}
                </div>
                {present.includes(sel.id) ? (
                  <form className="row" onSubmit={e => { e.preventDefault(); talk() }}>
                    <input value={input} onChange={e => setInput(e.target.value)} maxLength={300} placeholder={`Say something to ${sel.name}…`} aria-label="Message" />
                    <button disabled={busy}>Say</button>
                  </form>
                ) : <p className="hint">{sel.name} is {sel.place ? `at ${placeName(sel.place)}` : 'at home'}. Go there to talk.</p>}
                <button className="why" onClick={askWhy} disabled={busy}>Why? 🔍</button>
                {why && (
                  <div className="why-box">
                    <p className="voice">“{why.explanation}”</p>
                    {why.chain.length > 0 && (
                      <ol className="chain">
                        {why.chain.map(c => (
                          <li key={c.id}><b>{c.id in names ? names[c.id] : 'You'}</b> <span className={`sev s${c.severity}`}>sev {c.severity}</span> “{c.said}”
                            {c.notice_by && <em> (from {c.notice_by}'s notice)</em>}</li>
                        ))}
                        <li className="origin">What actually happened at {hourLabel((why.at_tick ?? 0) % 24)}: {why.what_happened}</li>
                      </ol>
                    )}
                    {why.cypher && <details><summary>The Cypher that found this</summary><pre className="cypher">{why.cypher.join('\n\n')}</pre></details>}
                  </div>
                )}
              </>
            )}
          </section>

          <nav className="tabs" role="tablist">
            {(['graph', 'spy', 'hood'] as const).map(t => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                {{ graph: 'Gossip graph', spy: 'Spymaster', hood: 'Under the hood' }[t]}
              </button>
            ))}
          </nav>
          <div hidden={tab !== 'graph'} className="panel">
            <p className="hint">Arrows show which way gossip flows (towards whoever trusts the teller). Red = bad news, green = good.</p>
            <GossipGraph ref={graph} villagers={st.villagers} edges={edges} highlight={highlight} />
            {highlight.length > 0 && <button className="ghost" onClick={() => setHighlight([])}>Clear highlight</button>}
          </div>
          {tab === 'spy' && <Spymaster villagers={st.villagers} onDebug={d => d && setDebug(d)} onRoute={ids => setHighlight([...ids].reverse())} />}
          {tab === 'hood' && <Inspector debug={debug} villager={selected} tick={st.tick} />}
        </div>
      </main>
      <footer>Hearsay · every memory, rumour and trust edge lives in a FalkorDB graph</footer>
    </div>
  )
}
