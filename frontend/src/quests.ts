import type { State } from './api'

export type Flags = {
  stole: boolean; ghost: boolean; blocked: boolean; whyIlsa: boolean; passed: boolean
  bribed: boolean; whisperHops: number; startTick: number; winTick?: number
}
export type Progress = { quest: number; flags: Flags; trophies: string[] }

export const newProgress = (tick = 6): Progress => ({
  quest: 0, trophies: [],
  flags: { stole: false, ghost: false, blocked: false, whyIlsa: false, passed: false, bribed: false, whisperHops: 0, startTick: tick },
})

const op = (st: State, id: string) => st.villagers.find(v => v.id === id)?.opinion ?? 0

export type Quest = { id: string; title: string; body: (st: State, f: Flags) => string; hint?: string; done: (st: State, f: Flags) => boolean }

export const QUESTS: Quest[] = [
  {
    id: 'walk', title: 'Find something to eat',
    body: () => 'You arrive in Brindlewick, starving, with 5 coins. Walk to the Market 🍎.',
    hint: 'Move with WASD or the arrow keys, or click/tap where you want to go.',
    done: st => st.place === 'market',
  },
  {
    id: 'steal', title: 'A five-finger discount',
    body: () => 'Apples cost 10 coins and you have 5. Old Tomas is busy… Steal one.',
    hint: 'Press the 🍎 Steal button below the map. Whoever is standing here sees it, and remembers.',
    done: (_, f) => f.stole,
  },
  {
    id: 'spread', title: 'Word gets around',
    body: (st) => (st.day > 1 || st.hour >= 22) && op(st, 'ilsa') > -0.3
      ? 'Captain Ilsa hasn\'t heard enough to worry. Keep waiting, or make the story juicier (steal again).'
      : 'Villagers gossip when they meet, and every retelling gets worse. Skip ahead to the evening, when everyone crowds into the inn, and watch the speech bubbles.',
    hint: 'Press ⏩ Skip to evening, then ⏩ Skip to night. Captain Ilsa drops by the inn around 20:00. Watch her face on the right.',
    done: st => op(st, 'ilsa') <= -0.3,
  },
  {
    id: 'gate', title: 'Time to leave town',
    body: () => 'You\'ve had your apple. Walk to the Town Gate 🏰 and try to leave.',
    hint: 'At the gate, press the 🚪 Leave town button.',
    done: (_, f) => f.blocked,
  },
  {
    id: 'why', title: 'Who told her?',
    body: () => 'Captain Ilsa never saw you steal, yet she blocked the gate. Talk to her and ask “Why?”',
    hint: 'Walk up to Ilsa, press E to talk, then press 🔍 Why do you think that?',
    done: (_, f) => f.whyIlsa,
  },
  {
    id: 'fix', title: 'Clear your name',
    body: () => 'Rumours can\'t be undone, but they can be outweighed. Change what Ilsa believes about you: do good deeds where the people she trusts can see, or whisper a kind story into the right ear.',
    hint: 'Ilsa won\'t take gifts from a suspect (that\'s bribery!). Open 🔭 Spyglass → Spymaster for a plan.',
    done: st => op(st, 'ilsa') > -0.3,
  },
  {
    id: 'escape', title: 'Freedom',
    body: () => 'Captain Ilsa has softened. Go to the gate and leave Brindlewick!',
    hint: 'At the gate, press the 🚪 Leave town button.',
    done: (_, f) => f.passed,
  },
]

export const TROPHIES: { id: string; icon: string; title: string; text: string; check: (st: State, f: Flags) => boolean }[] = [
  { id: 'ghost', icon: '👻', title: 'Ghost', text: 'Steal while nobody is watching.', check: (_, f) => f.ghost },
  { id: 'wanted', icon: '📜', title: 'Wanted', text: 'Get a wanted notice posted at the gate.', check: st => st.notices.length > 0 },
  { id: 'saint', icon: '😇', title: 'Practically a saint', text: 'Make anyone adore you (mood 🤩).', check: st => st.villagers.some(v => v.opinion >= 0.6) },
  { id: 'sceptic', icon: '🔨', title: 'Convince the sceptic', text: 'Mira needs two sources. Change her mind.', check: st => Math.abs(op(st, 'mira')) >= 0.3 },
  { id: 'spin', icon: '🌀', title: 'Spin doctor', text: 'Whisper a story that gets retold 3 times.', check: (_, f) => f.whisperHops >= 3 },
  { id: 'bribe', icon: '💰', title: 'Nice try', text: 'Offer the guard a bribe.', check: (_, f) => f.bribed },
  { id: 'escape', icon: '🏆', title: 'Escape artist', text: 'Finish the story.', check: (_, f) => f.passed },
]

export function loadProgress(player: string, tick: number): Progress {
  try {
    const raw = localStorage.getItem(`hearsay_progress_${player}`)
    if (raw) return JSON.parse(raw)
  } catch { /* storage blocked: start fresh */ }
  return newProgress(tick)
}

export function saveProgress(player: string, p: Progress) {
  try { localStorage.setItem(`hearsay_progress_${player}`, JSON.stringify(p)) } catch { /* ignore */ }
}
