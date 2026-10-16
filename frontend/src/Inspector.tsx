import { useEffect, useState } from 'react'
import { api, type Debug } from './api'

type Rumour = { id: string; holder: string; text: string; severity: number; hops: number; confidence: number; heard_from: string[] }

export default function Inspector({ debug, villager, tick }: { debug: Debug | null; villager: string | null; tick: number }) {
  const [queries, setQueries] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [rumours, setRumours] = useState<Rumour[]>([])

  useEffect(() => { api<Record<string, string>>('/api/queries').then(setQueries) }, [])
  useEffect(() => { api<{ rumours: Rumour[] }>('/api/graph?view=rumour').then(r => setRumours(r.rumours)) }, [tick, villager])

  const graphMs = debug?.queries.filter(q => q.name !== 'llm').reduce((s, q) => s + q.ms, 0) ?? 0
  const llmMs = debug?.queries.filter(q => q.name === 'llm').reduce((s, q) => s + q.ms, 0) ?? 0
  const mine = villager ? rumours.filter(r => r.holder === villager) : rumours

  return (
    <section className="panel inspector">
      <h2>⚙️ Under the hood</h2>
      {debug && (
        <>
          <p className="hint">Last request: {debug.ms} ms total · graph {graphMs.toFixed(1)} ms over {debug.queries.filter(q => q.name !== 'llm').length} queries{llmMs ? ` · AI ${llmMs.toFixed(0)} ms` : ''}</p>
          <ol className="queries">
            {debug.queries.map((q, i) => (
              <li key={i}>
                <button className="link" onClick={() => setOpen(open === q.name ? null : q.name)}>{q.name}</button> <code>{q.ms} ms</code>
              </li>
            ))}
          </ol>
        </>
      )}
      {open && queries[open] && <pre className="cypher">{queries[open]}</pre>}
      <h3>Memory subgraph {villager ? `of ${villager}` : '(everyone)'}</h3>
      {mine.length === 0 && <p className="hint">No stories about you yet.</p>}
      <ul className="memory">
        {mine.map(r => (
          <li key={r.id}>
            <code>{r.id}</code> <b>{r.holder}</b> · sev {r.severity} · hops {r.hops} · conf {r.confidence.toFixed(2)}
            <br />“{r.text}”{r.heard_from.length > 0 && <> ← {r.heard_from.join(', ')}</>}
          </li>
        ))}
      </ul>
    </section>
  )
}
