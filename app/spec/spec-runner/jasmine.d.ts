// Type declarations for the vendored Jasmine 1.x file (jasmine.js).
// Declaring this as a module (via `export`) prevents jasmine.js's top-level
// `var jasmine = {}` from polluting the global type scope when TypeScript
// processes it as a script. The global `jasmine` is declared as `any` in
// spec-env-ext.d.ts so that runtime-added methods like `jasmine.unspy()`
// don't require `(jasmine as any)` casts.
export const jasmine: any;
export const spyOn: (obj: any, methodName: string) => jasmine.Spy;
export const it: (...args: any[]) => any;
export const xit: (...args: any[]) => any;
export const expect: (...args: any[]) => any;
export const runs: (...args: any[]) => any;
export const waits: (...args: any[]) => any;
export const waitsFor: (...args: any[]) => any;
export const beforeEach: (...args: any[]) => any;
export const afterEach: (...args: any[]) => any;
export const describe: (...args: any[]) => any;
export const xdescribe: (...args: any[]) => any;
