import { Moment } from 'moment';

export {};

declare global {
  const TEST_TIME_ZONE: string;
  const TEST_PLUGIN_ID: string;
  const TEST_ACCOUNT_ID: string;
  const TEST_ACCOUNT_NAME: string;
  const TEST_ACCOUNT_EMAIL: string;
  const TEST_ACCOUNT_CLIENT_ID: string;
  const TEST_ACCOUNT_ALIAS_EMAIL: string;

  const waitsForPromise: (
    a: { shouldReject?: boolean; timeout?: number } | (() => Promise<any>),
    b?: () => Promise<any>
  ) => Promise<any>;

  export const advanceClock: (delta?: number) => void;
  export const resetTime: () => void;
  export const enableSpies: () => void;

  // The jasmine global is extended at runtime with custom methods (unspy, attachToDOM, etc.)
  // Declared as `any` so callers don't need `(jasmine as any).unspy(...)` etc.
  // eslint-disable-next-line no-var
  var jasmine: any;

  interface Console {
    inspect: (value: any) => void;
  }

  export interface Window {
    testNowMoment: () => Moment;
    // Set by TimeReporter for perf debugging (window.logLongestSpecs(10) etc.)
    timedSpecs: Array<{ description: string; time: number; fullName: string }>;
    timedSuites: { [suiteName: string]: number };
    logLongestSpec: () => void;
    logLongestSpecs: (n: number) => void;
    logLongestSuite: () => void;
    logLongestSuites: (n: number) => void;
    // Set by TimeOverride to allow specs to call window.advanceClock()
    advanceClock: ((delta?: number) => void) | null;
    originalSetTimeout: typeof setTimeout;
    originalSetInterval: typeof setInterval;
    // Set to true to prevent jasmine-content innerHTML from being cleared between tests
    debugContent: boolean | undefined;
  }
}
