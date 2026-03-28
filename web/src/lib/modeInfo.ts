

export const regularModes = [
  {
    value: 'standard',
    label: 'Standard Game',
    emoji: '🎲',
    desc: 'Classic darts gameplay. First to checkout wins.',
    details: [
      'Start at 501 (or 301) points',
      'Aim to reach exactly zero',
      'Finish with a double',
      'Perfect for friendly games',
    ],
  },
  {
    value: 'around-the-clock',
    label: 'Around The Clock',
    emoji: '🔄',
    desc: 'Hit all numbers in sequence from 1 to 20.',
    details: [
      'Hit each number from 1-20 in order',
      'Then hit the bullseye to finish',
      'First player to complete the sequence wins',
      'Great for targeting practice',
    ],
  },
  {
    value: 'bulling',
    label: 'Bulling',
    emoji: '🎯',
    desc: 'First to hit the bullseye wins.',
    details: [
      'All players aim for the bullseye',
      'First to hit the bull wins',
      'Quick and exciting',
      'Great for warm-ups',
    ],
  },
  {
    value: 'max-score',
    label: 'Max Score',
    emoji: '🏆',
    desc: 'Highest score in one round wins.',
    details: [
      'Throw 3 darts and tally your score',
      'Highest score wins',
      'Best out of 3 rounds',
      'Focus on high-value combinations',
    ],
  },
]

export const trainingModes = [
  {
    value: 'target',
    label: 'Target Practice',
    emoji: '🎯',
    desc: 'Work on hitting specific targets to improve accuracy.',
    details: [
      'Practice hitting dedicated target areas',
      'Build consistency and precision',
      'Track your accuracy improvements',
      'Various difficulty levels available',
    ],
  },
  {
    value: 'around',
    label: 'Around The Clock',
    emoji: '🔄',
    desc: 'Hit numbers in sequence from 1 to 20.',
    details: [
      'Progress through numbers 1-20 in order',
      'Then hit the bullseye to complete',
      'Improves targeting across the board',
      'Track completion times',
    ],
  },
  {
    value: 'checkouts',
    label: 'Checkouts',
    emoji: '✓',
    desc: 'Practice finishing combinations and checkout strategies.',
    details: [
      'Learn popular checkout combinations',
      'Practice finishing from various scores',
      'Understand outs and doubles',
      'Essential skill for competitive play',
    ],
  },
  {
    value: 'max',
    label: 'Max Score',
    emoji: '🚀',
    desc: 'Focus on high-scoring combinations and strategies.',
    details: [
      'Master the 180-point maximum',
      'Learn triple-20 combinations',
      'Improve scoring consistency',
      'Build speed and accuracy',
    ],
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
