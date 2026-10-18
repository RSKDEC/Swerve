export type Mode = 'blend' | 'swerve' | 'sweet';
export interface ModeDefinition {
  name: string;
  symbol: string;
  color: string;
  bg: string;
  desc: string;
  limit: number;
}
export interface AnswerGroup {
  name: string;
  pct: number;
  aliases: string[];
}
export interface DemoQuestion {
  q: string;
  sub: string;
  groups: AnswerGroup[];
}
export interface Prompt {
  id: string;
  q: string;
  sub: string;
}
// Public metadata deliberately excludes answer groups and scoring keys.
export interface Challenge {
  id: string;
  number: string;
  day: string;
  opensAt: string;
  closesAt: string;
  roundSeconds: number;
  prompts: Prompt[];
  kind: 'demo' | 'daily';
  scoringVersion: string;
}
export interface Player {
  id: string;
  kind: 'guest' | 'account';
  displayName: string;
}
export interface Distribution {
  name: string;
  pct: number;
}
export interface RoundResult {
  i: number;
  mode: Mode;
  answer: string;
  group: string | null;
  pct: number;
  score: number;
  timeout: boolean;
  unknown: boolean;
  distribution: Distribution[];
}
export interface ActiveRound {
  i: number;
  deadline: number;
  mode: Mode | null;
  answer: string;
}
export interface Attempt {
  version: 2;
  id: string;
  challengeId: string;
  playerId: string;
  started: number;
  phase: 'ready' | 'round' | 'reveal' | 'complete';
  results: RoundResult[];
  active: ActiveRound | null;
}
export interface GameContext {
  challenge: Challenge;
  player: Player;
  attempt: Attempt | null;
}
export interface Submission {
  roundIndex: number;
  mode: Mode | null;
  answer: string;
  requestId: string;
}
