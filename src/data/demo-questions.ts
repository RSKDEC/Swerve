import type { DemoQuestion } from '../domain/types.ts';

// Original authored percentages and aliases; never represent a live population.
export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    q: 'What’s the first thing people do after waking up?',
    sub: 'Think of the answer most people would naturally give.',
    groups: [
      {
        name: 'Check their phone',
        pct: 48,
        aliases: [
          'phone',
          'check phone',
          'look at phone',
          'look at their phone',
          'check their phone',
          'scroll phone',
          'social media',
          'instagram',
          'notifications',
          'check messages',
          'text messages',
        ],
      },
      {
        name: 'Go to the bathroom',
        pct: 23,
        aliases: [
          'bathroom',
          'toilet',
          'pee',
          'urinate',
          'use the bathroom',
          'go to bathroom',
          'brush teeth',
          'brush their teeth',
        ],
      },
      {
        name: 'Hit snooze',
        pct: 13,
        aliases: [
          'snooze',
          'go back to sleep',
          'sleep',
          'alarm',
          'turn off alarm',
        ],
      },
      {
        name: 'Drink water',
        pct: 10,
        aliases: ['water', 'drink a glass of water', 'hydrate'],
      },
      {
        name: 'Make coffee',
        pct: 6,
        aliases: [
          'coffee',
          'make coffee',
          'tea',
          'drink tea',
          'breakfast',
          'eat breakfast',
        ],
      },
    ],
  },
  {
    q: 'Name something people pretend to understand.',
    sub: 'Any everyday answer that fits the situation.',
    groups: [
      {
        name: 'Politics',
        pct: 34,
        aliases: ['politics', 'government', 'politicians', 'political debates'],
      },
      {
        name: 'Finance and investing',
        pct: 27,
        aliases: [
          'stocks',
          'stock market',
          'finance',
          'investing',
          'cryptocurrency',
          'crypto',
          'bitcoin',
          'money',
          'economics',
        ],
      },
      {
        name: 'Technology',
        pct: 19,
        aliases: [
          'technology',
          'tech',
          'ai',
          'artificial intelligence',
          'computers',
          'coding',
          'software',
        ],
      },
      {
        name: 'Modern art',
        pct: 12,
        aliases: [
          'art',
          'modern art',
          'abstract art',
          'paintings',
          'contemporary art',
        ],
      },
      {
        name: 'Wine',
        pct: 8,
        aliases: ['wine', 'fine wine', 'wine tasting', 'alcohol'],
      },
    ],
  },
  {
    q: 'What’s something people always lose?',
    sub: 'There’s no single right response — predict the crowd.',
    groups: [
      {
        name: 'Keys',
        pct: 36,
        aliases: ['keys', 'key', 'car keys', 'house keys'],
      },
      {
        name: 'Phone',
        pct: 28,
        aliases: ['phone', 'mobile', 'cellphone', 'cell phone', 'their phone'],
      },
      {
        name: 'Wallet',
        pct: 17,
        aliases: ['wallet', 'purse', 'money', 'cash'],
      },
      {
        name: 'Remote control',
        pct: 12,
        aliases: ['remote', 'tv remote', 'remote control', 'television remote'],
      },
      {
        name: 'Patience',
        pct: 7,
        aliases: ['patience', 'temper', 'their temper', 'focus', 'mind'],
      },
    ],
  },
  {
    q: 'Name something you’d take to a deserted island.',
    sub: 'Answer with what comes to mind first.',
    groups: [
      {
        name: 'Water',
        pct: 40,
        aliases: ['water', 'bottled water', 'drinking water'],
      },
      {
        name: 'Knife',
        pct: 27,
        aliases: [
          'knife',
          'pocket knife',
          'multitool',
          'multi tool',
          'machete',
        ],
      },
      {
        name: 'Phone',
        pct: 16,
        aliases: ['phone', 'mobile', 'cell phone', 'satellite phone'],
      },
      {
        name: 'Lighter',
        pct: 10,
        aliases: ['lighter', 'fire', 'matches', 'flint', 'fire starter'],
      },
      {
        name: 'Book',
        pct: 7,
        aliases: ['book', 'books', 'novel', 'bible', 'reading material'],
      },
    ],
  },
  {
    q: 'What do people check before leaving home?',
    sub: 'What would another player type?',
    groups: [
      {
        name: 'Phone',
        pct: 38,
        aliases: ['phone', 'mobile', 'cell phone', 'cellphone'],
      },
      {
        name: 'Keys',
        pct: 32,
        aliases: ['keys', 'key', 'car keys', 'house keys'],
      },
      {
        name: 'Wallet',
        pct: 17,
        aliases: ['wallet', 'money', 'cash', 'purse'],
      },
      {
        name: 'Weather',
        pct: 9,
        aliases: ['weather', 'weather forecast', 'temperature', 'forecast'],
      },
      {
        name: 'Appearance',
        pct: 4,
        aliases: ['mirror', 'hair', 'appearance', 'clothes', 'outfit', 'shoes'],
      },
    ],
  },
];
