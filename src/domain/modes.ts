import type { Mode, ModeDefinition } from './types.ts';
export const MODES: Record<Mode, ModeDefinition> = {
  blend: {
    name: 'BLEND',
    symbol: '●',
    color: '#7bdec3',
    bg: '#27483f',
    desc: 'Pick what most people would say',
    limit: 2,
  },
  swerve: {
    name: 'SWERVE',
    symbol: '↗',
    color: '#ffad77',
    bg: '#503b32',
    desc: 'Think outside the crowd',
    limit: 2,
  },
  sweet: {
    name: 'SWEET SPOT',
    symbol: '◎',
    color: '#c3a8ff',
    bg: '#423954',
    desc: 'Not too common. Not too rare.',
    limit: 1,
  },
};
