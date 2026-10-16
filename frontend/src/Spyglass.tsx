import { useEffect, useState, type RefObject } from 'react'
import { api, type Debug, type State } from './api'
import GossipGraph, { type GraphHandle } from './GossipGraph'
import Inspector from './Inspector'
import Spymaster from './Spymaster'

type Edge = { source: string; target: string; weight: number }
type Props = { st: State; debug: Debug | null; graphRef: RefObject<GraphHandle | null>; onDebug: (d?: Debug) => void; onClose: () => void }

export default function Spyglass({ st, debug, graphRef, onDebug, onClose }: Props) {
  const [tab, setTab] = useState<'web' | 'spy' | 'hood'>('web')
  const [edges, setEdges] = useState<Edge[]>([])
  const [highlight, setHighlight] = useState<string[]>([])
  useEffect(() => { api<{ edges: Edge[] }>('/api/graph').then(g => setEdges(g.edges)) }, [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal spyglass" role="dialog" aria-label="Spyglass" onClick={e => e.stopPropagation()}>
        <button className="ghost close" onClick={onClose} aria-label="Close">✕</button>
        <h2>🔭 Spyglass</h2>
        <p className="hint">The village's memory is a graph in FalkorDB. Here's what's inside.</p>
        <nav className="tabs" role="tablist">
          {([['web', '🕸️ Who trusts whom'], ['spy', '🕵️ Spymaster'], ['hood', '⚙️ Under the hood']] as const).map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{label}</button>
          ))}
        </nav>
        {tab === 'web' && (
          <>
            <p className="hint">Arrows show which way gossip flows: towards whoever trusts the teller. Thicker = more trust. Ring colour = what they think of you.</p>
            <GossipGraph ref={graphRef} villagers={st.villagers} edges={edges} highlight={highlight} />
          </>
        )}
        {tab === 'spy' && <Spymaster villagers={st.villagers} onDebug={onDebug} onRoute={ids => { setHighlight([...ids].reverse()); setTab('web') }} />}
        {tab === 'hood' && <Inspector debug={debug} villager={null} tick={st.tick} />}
      </div>
    </div>
  )
}
