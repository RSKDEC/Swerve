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
  source?: ReferenceSource;
}
export interface PreparedQuestion extends DemoQuestion {
  id: string;
  category: string;
  source: ReferenceSource;
  conceptKey: string;
  wordingFingerprint: string;
}
export interface ReferenceSource {
  id: string;
  title: string;
  year: number;
  n: number;
  url: string;
  basis?: string;
}
export interface PreparedDay {
  number: string;
  day: string;
  questionIds: string[];
}
export interface Prompt {
  id: string;
  q: string;
  sub: string;
  choices?: string[];
  source?: ReferenceSource;
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
  practiceAllowed?: boolean;
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
