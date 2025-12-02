export enum TimerMode {
  FOCUS = 'FOCUS',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK',
}

export interface AppState {
  timeLeft: number;
  isActive: boolean;
  mode: TimerMode;
  cycles: number;
}
