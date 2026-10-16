import type { State } from './api'

export const PLACE_POS: Record<string, [number, number]> = {
  well: [150, 125], market: [450, 125], forge: [750, 125],
  chapel: [150, 375], inn: [450, 375], gate: [750, 375],
}
const ICON: Record<string, string> = { well: '⛲', market: '🍎', forge: '⚒️', chapel: '⛪', inn: '🍺', gate: '🏰' }

export function moodColor(op: number) {
  // red (-1) -> warm grey (0) -> green (+1)
  const t = Math.max(-1, Math.min(1, op))
  const [r, g, b] = t < 0
    ? [158 + (200 - 158) * -t, 150 - 110 * -t, 140 - 100 * -t]
    : [158 - 108 * t, 150 + 10 * t, 140 - 60 * t]
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

export const initials = (name: string) =>
  name.replace(/^(Old|Captain|Father) /, '').slice(0, 2)

type Props = {
  state: State
  selected: string | null
  highlight: Set<string>
  onPlace: (id: string) => void
  onVillager: (id: string) => void
}

export default function VillageMap({ state, selected, highlight, onPlace, onVillager }: Props) {
  const night = state.hour >= 23 || state.hour < 6
  return (
    <svg className={`map ${night ? 'night' : ''}`} viewBox="0 0 900 500" role="img" aria-label="Village map">
      <path d="M150 125 H750 M150 375 H750 M150 125 V375 M450 125 V375 M750 125 V375" className="road" />
      {state.places.map(p => {
        const [x, y] = PLACE_POS[p.id]
        const here = state.villagers.filter(v => v.place === p.id)
        const you = state.place === p.id
        return (
          <g key={p.id} className={`place ${you ? 'you' : ''}`} onClick={() => onPlace(p.id)}
             role="button" tabIndex={0} aria-label={`Go to ${p.name}`}
             onKeyDown={e => e.key === 'Enter' && onPlace(p.id)}>
            <rect x={x - 125} y={y - 95} width={250} height={190} rx={18} />
            <text x={x} y={y - 60} className="place-name">{ICON[p.id]} {p.name}</text>
            {here.map((v, i) => {
              const cx = x - ((here.length - 1) * 56) / 2 + i * 56
              return (
                <g key={v.id} className={`avatar ${selected === v.id ? 'sel' : ''} ${highlight.has(v.id) ? 'hl' : ''}`}
                   onClick={e => { e.stopPropagation(); onVillager(v.id) }}>
                  <title>{`${v.name} (${v.role}) · opinion of you ${v.opinion.toFixed(2)}`}</title>
                  <circle cx={cx} cy={y + 5} r={25} className="ring" style={{ stroke: moodColor(v.opinion) }} />
                  <text x={cx} y={y + 11} className="initials">{initials(v.name)}</text>
                  <text x={cx} y={y + 48} className="vname">{v.name.split(' ').pop()}</text>
                </g>
              )
            })}
            {you && <g className="player"><circle cx={x + 95} cy={y - 62} r={15} /><text x={x + 95} y={y - 57}>You</text></g>}
          </g>
        )
      })}
      {night && <text x={450} y={255} className="night-label">Night. Everyone is home asleep.</text>}
    </svg>
  )
}
