import { useEffect } from 'react'
import type { Why } from './api'
import { FACE, hourLabel } from './world'

const SEV = ['', 'a small thing', 'getting worse', 'serious', 'scandalous', 'legendary']

export default function WhyModal({ why, name, onClose }: { why: Why; name: string; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  const chain = [...why.chain].reverse() // origin first: how the story travelled
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal why" role="dialog" aria-label="Why they believe it" onClick={e => e.stopPropagation()}>
        <button className="ghost close" onClick={onClose} aria-label="Close">✕</button>
        <h2>🔍 Why does {name} think that?</h2>
        <p className="voice">“{why.explanation}”</p>
        {chain.length > 0 ? (
          <>
            <h3>How the story reached {name}</h3>
            <ol className="strip">
              {chain.map((c, i) => (
                <li key={c.id} style={{ animationDelay: `${i * 0.45}s` }}>
                  <div className="who">{FACE[c.id] || '🧑'} <b>{c.id in FACE ? c.who : 'You'}</b></div>
                  <div className="how">{i === 0 ? (c.notice_by ? `read ${c.notice_by}'s notice` : c.id in FACE ? 'saw it happen' : 'made it up') : 'heard'}</div>
                  <blockquote>“{c.said}”</blockquote>
                  <span className={`sev s${c.severity}`}>{'🔥'.repeat(c.severity)} {SEV[c.severity]}</span>
                  {i < chain.length - 1 && <span className="arrow" aria-hidden>➜</span>}
                </li>
              ))}
            </ol>
            <p className="truth">✔ What actually happened at {hourLabel((why.at_tick ?? 0) % 24)}: <b>{why.what_happened}</b></p>
            {chain.length > 1 && chain[chain.length - 1].severity > chain[0].severity &&
              <p className="hint">Every retelling made it worse. That's hearsay.</p>}
          </>
        ) : <p className="hint">They haven't heard anything about you.</p>}
        {why.cypher && (
          <details>
            <summary>For the curious: the graph query that traced this</summary>
            <pre className="cypher">{why.cypher.join('\n\n')}</pre>
          </details>
        )}
        <button onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}
