
import type { FormKitSchemaNode } from '@formkit/core'

export type ModeSettings = Record<string, unknown>

export interface GameMode {
  value: string
  label: string
  icon: string
  desc: string
  details: string[]
  settingsDefaults: ModeSettings
  settingsSchema: FormKitSchemaNode[]
}

const defineSettingsSchema = <T extends FormKitSchemaNode[]>(schema: T) => schema

export const regularModes: GameMode[] = [
  {
    value: 'standard',
    label: 'Standard Game',
    icon: '🎲',
    desc: 'Classic darts gameplay. First to checkout wins.',
    details: [
      'Start at 501 (or 301) points',
      'Aim to reach exactly zero',
      'Finish with a double',
      'Perfect for friendly games',
    ],
    settingsDefaults: {
      gameConfig: {
        startingScore: 501,
        checkoutMode: 'double-out',
        legs: 3,
        sets: 2
      },
      opponent: 'local',
    },
    settingsSchema: defineSettingsSchema<FormKitSchemaNode[]>([
      {
        $formkit: 'enemyConfig',
        name: 'opponent',
        label: false,
        presets: [
          { name: 'local', label: 'Local opponent', icon: '👤', description: 'Play against a local opponent' },
          //{ name: 'friend', label: 'Friend', icon: '👥', description: 'Play against a friend online' },
          { name: 'bot', label: 'Bot', icon: '🤖', description: 'Play against a bot' },
        ],
        classes: {
          'wrapper': 'max-w-[unset]!',
        }
      },
      {
        $formkit: 'scoreConfig',
        id: 'gameConfig',
        name: 'gameConfig',
        label: false,
        classes: {
          'wrapper': 'max-w-[unset]!',
        },
        presets: [
          501, 301
        ],
        showCustomOption: true,
      },
    ]),
  }
]

export const trainingModes: GameMode[] = [
  {
    value: 'target',
    label: 'Target Practice',
    icon: '🎯',
    desc: 'Work on hitting specific targets to improve accuracy.',
    details: [
      'Practice hitting dedicated target areas',
      'Build consistency and precision',
      'Track your accuracy improvements',
      'Various difficulty levels available',
    ],
    settingsDefaults: {},
    settingsSchema: [],
  },
  {
    value: 'around',
    label: 'Around The Clock',
    icon: '🔄',
    desc: 'Hit numbers in sequence from 1 to 20.',
    details: [
      'Progress through numbers 1-20 in order',
      'Then hit the bullseye to complete',
      'Improves targeting across the board',
      'Track completion times',
    ],
    settingsDefaults: {},
    settingsSchema: [],
  },
  {
    value: 'checkouts',
    label: 'Checkouts',
    icon: '✓',
    desc: 'Practice finishing combinations and checkout strategies.',
    details: [
      'Learn popular checkout combinations',
      'Practice finishing from various scores',
      'Understand outs and doubles',
      'Essential skill for competitive play',
    ],
    settingsDefaults: {},
    settingsSchema: [],
  },
  {
    value: 'max',
    label: 'Max Score',
    icon: '🚀',
    desc: 'Focus on high-scoring combinations and strategies.',
    details: [
      'Master the 180-point maximum',
      'Learn triple-20 combinations',
      'Improve scoring consistency',
      'Build speed and accuracy',
    ],
    settingsDefaults: {},
    settingsSchema: [],
  },
]

export const getTrainingModeClass = (value: string) => {
  const baseClass = 'border-emerald-600 hover:border-emerald-400 hover:shadow-emerald-500/50'
  if (value === 'target') return `${baseClass} border-blue-600 hover:border-blue-400 hover:shadow-blue-500/50`
  if (value === 'checkouts') return `${baseClass} border-yellow-600 hover:border-yellow-400 hover:shadow-yellow-500/50`
  if (value === 'max') return `${baseClass} border-red-600 hover:border-red-400 hover:shadow-red-500/50`
  return baseClass
}

export const getTrainingModeBgClass = (value: string) => {
  if (value === 'target') return 'bg-blue-500/0 group-hover:bg-blue-500/5'
  if (value === 'checkouts') return 'bg-yellow-500/0 group-hover:bg-yellow-500/5'
  if (value === 'max') return 'bg-red-500/0 group-hover:bg-red-500/5'
  return 'bg-emerald-500/0 group-hover:bg-emerald-500/5'
}

export const getTrainingModeTextClass = (value: string) => {
  if (value === 'target') return 'text-blue-400 group-hover:text-blue-300'
  if (value === 'checkouts') return 'text-yellow-400 group-hover:text-yellow-300'
  if (value === 'max') return 'text-red-400 group-hover:text-red-300'
  return 'text-emerald-400 group-hover:text-emerald-300'
}

export const checkoutDifficulties = [
  { value: 'auto', label: 'Auto', desc: 'Finish with any combination.' },
  { value: 'easy', label: 'Easy', desc: 'Finish with simple combinations.' },
  { value: 'medium', label: 'Medium', desc: 'Finish with moderate combinations.' },
  { value: 'hard', label: 'Hard', desc: 'Finish with complex combinations.' },
]

type BotDifficulty = 'auto' | 'easy' | 'medium' | 'hard'

type DifficultyColorSet = {
  normal: string
  hovered: string
  selected: string
}

export const getBotDifficultyColors = (difficulty: BotDifficulty): DifficultyColorSet => {

  if (difficulty === 'auto') {
    return {
      normal: 'border-gray-600 bg-gray-950/20 text-gray-200',
      hovered: 'hover:border-gray-400 hover:bg-gray-900/35 hover:text-gray-100',
      selected: 'border-gray-300 bg-gray-500/20 text-gray-100 shadow-gray-500/30',
    }
  }

  if (difficulty === 'easy') {
    return {
      normal: 'border-emerald-600 bg-emerald-950/20 text-emerald-200',
      hovered: 'hover:border-emerald-400 hover:bg-emerald-900/35 hover:text-emerald-100',
      selected: 'border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-emerald-500/30',
    }
  }

  if (difficulty === 'hard') {
    return {
      normal: 'border-rose-600 bg-rose-950/20 text-rose-200',
      hovered: 'hover:border-rose-400 hover:bg-rose-900/35 hover:text-rose-100',
      selected: 'border-rose-300 bg-rose-500/20 text-rose-100 shadow-rose-500/30',
    }
  }

  return {
    normal: 'border-amber-600 bg-amber-950/20 text-amber-200',
    hovered: 'hover:border-amber-400 hover:bg-amber-900/35 hover:text-amber-100',
    selected: 'border-amber-300 bg-amber-500/20 text-amber-100 shadow-amber-500/30',
  }
}
