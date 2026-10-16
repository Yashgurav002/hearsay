import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { initials, moodColor } from './world'
import type { Hop, Villager } from './api'

type Edge = { source: string; target: string; weight: number }
type GLink = { source: any; target: any; weight: number; last?: string; color?: string }
export type GraphHandle = { play: (hops: Hop[]) => void }

const id = (n: any) => (typeof n === 'object' ? n.id : n)

// Links point the way gossip flows: "listener trusts teller" becomes teller -> listener.
const GossipGraph = forwardRef<GraphHandle, { villagers: Villager[]; edges: Edge[]; highlight: string[] }>(
  ({ villagers, edges, highlight }, ref) => {
    const fg = useRef<any>(null)
    const box = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(400)
    const opinions = useRef<Record<string, number>>({})
    opinions.current = Object.fromEntries(villagers.map(v => [v.id, v.opinion]))

    const data = useMemo(() => ({
      nodes: villagers.map(v => ({ id: v.id, name: v.name })),
      links: edges.map(e => ({ source: e.target, target: e.source, weight: e.weight })) as GLink[],
    }), [villagers.length, edges]) // eslint-disable-line react-hooks/exhaustive-deps

    const pathLinks = useMemo(() => {
      const s = new Set<string>()
      for (let i = 0; i + 1 < highlight.length; i++) s.add(`${highlight[i + 1]}>${highlight[i]}`)
      return s
    }, [highlight])

    useEffect(() => {
      const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
      if (box.current) ro.observe(box.current)
      return () => ro.disconnect()
    }, [])

    useImperativeHandle(ref, () => ({
      play(hops) {
        hops.forEach((h, i) => setTimeout(() => {
          const link = data.links.find(l => id(l.source) === h.teller && id(l.target) === h.listener)
          if (!link) return
          link.color = h.sentiment < 0 ? '#c0392b' : '#2e8b57'
          if (h.text) link.last = h.text
          fg.current?.emitParticle(link)
        }, i * 450))
      },
    }), [data])

    return (
      <div ref={box} className="graph-box">
        <ForceGraph2D
          ref={fg}
          graphData={data}
          width={width}
          height={320}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={80}
          onEngineStop={() => fg.current?.zoomToFit(300, 30)}
          linkWidth={(l: GLink) => (pathLinks.has(`${id(l.source)}>${id(l.target)}`) ? 5 : 0.5 + l.weight * 2.5)}
          linkColor={(l: GLink) => (pathLinks.has(`${id(l.source)}>${id(l.target)}`) ? '#d4a017' : 'rgba(120,90,60,0.35)')}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={0.9}
          linkCurvature={0.15}
          linkLabel={(l: GLink) => `${l.target.name} trusts ${l.source.name} (${l.weight})${l.last ? `<br/>last heard: “${l.last}”` : ''}`}
          linkDirectionalParticleWidth={7}
          linkDirectionalParticleSpeed={0.012}
          linkDirectionalParticleColor={(l: GLink) => l.color || '#c0392b'}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
            const hl = highlight.includes(node.id)
            ctx.beginPath()
            ctx.arc(node.x, node.y, 11, 0, 2 * Math.PI)
            ctx.fillStyle = hl ? '#fff4cc' : '#fffaf2'
            ctx.fill()
            ctx.lineWidth = hl ? 4 : 3
            ctx.strokeStyle = moodColor(opinions.current[node.id] ?? 0)
            ctx.stroke()
            ctx.fillStyle = '#3b2a1a'
            ctx.font = '700 8px "Alegreya Sans", sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(initials(node.name), node.x, node.y)
            ctx.font = '500 6px "Alegreya Sans", sans-serif'
            ctx.fillText(node.name, node.x, node.y + 17)
          }}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI)
            ctx.fill()
          }}
        />
      </div>
    )
  })

export default GossipGraph
