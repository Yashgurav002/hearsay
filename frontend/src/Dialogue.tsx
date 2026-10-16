import { useEffect, useRef, useState } from 'react'
import type { Villager } from './api'
import { FACE, moodColor, moodFace, moodWord } from './world'

export type Msg = { from: 'you' | 'them' | 'sys'; text: string; action?: string }

const QUICK = ['Hello!', 'What have you heard about me?', 'Any gossip today?']
const ACTION_NOTE: Record<string, string> = {
  refuse: 'refuses to deal with you', raise_price: 'raises prices for you', discount: 'offers you a discount',
  share_gossip: 'shares some gossip',
}

type Props = {
  v: Villager; msgs: Msg[]; busy: boolean; coins: number; here: boolean
  onSay: (text: string) => void; onWhy: () => void; onGift: () => void
  onWhisper: (ladder: 'good_deed' | 'theft') => void; onClose: () => void
}

export default function Dialogue({ v, msgs, busy, coins, here, onSay, onWhy, onGift, onWhisper, onClose }: Props) {
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const send = (t: string) => { if (t.trim() && !busy) { onSay(t.trim()); setText('') } }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal dialogue" role="dialog" aria-label={`Talking to ${v.name}`} onClick={e => e.stopPropagation()}>
        <header>
          <div className="portrait" style={{ borderColor: moodColor(v.opinion) }}>{FACE[v.id]}</div>
          <div>
            <h2>{v.name}</h2>
            <p className="sub">{v.role} · {moodFace(v.opinion)} {moodWord(v.opinion)} <code>{v.opinion >= 0 ? '+' : ''}{v.opinion.toFixed(2)}</code></p>
          </div>
          <button className="ghost close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="chat">
          {msgs.length === 0 && <p className="sys">{v.name} looks at you. Say something.</p>}
          {msgs.map((m, i) => (
            <p key={i} className={m.from}>
              {m.text}
              {m.action && ACTION_NOTE[m.action] && <em> ({v.name.split(' ').pop()} {ACTION_NOTE[m.action]})</em>}
            </p>
          ))}
          {busy && <p className="them typing">…</p>}
          <div ref={end} />
        </div>
        <button className="why-big" onClick={onWhy} disabled={busy}>🔍 Why do you think that about me?</button>
        {here ? (
          <>
            <div className="quick">
              {QUICK.map(q => <button key={q} className="chip" disabled={busy} onClick={() => send(q)}>{q}</button>)}
            </div>
            <form className="row" onSubmit={e => { e.preventDefault(); send(text) }}>
              <input autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={300}
                     placeholder={`Say something to ${v.name}…`} aria-label="Your message" />
              <button disabled={busy || !text.trim()}>Say</button>
            </form>
            <div className="deeds">
              <button className="soft" disabled={busy || coins < 2} onClick={onGift} title="Raises their feelings about you. A suspicious guard calls it a bribe.">🎁 Give a gift <small>(2 🪙)</small></button>
              <button className="soft" disabled={busy} onClick={() => onWhisper('good_deed')} title="Plant a story. It spreads like any other rumour.">🤫 Whisper: “the traveller helps people”</button>
              <button className="soft" disabled={busy} onClick={() => onWhisper('theft')}>🤫 Whisper: “the traveller is a thief”</button>
            </div>
          </>
        ) : <p className="sys">{v.name} isn't here right now. You can still ask why they think what they think.</p>}
      </div>
    </div>
  )
}
