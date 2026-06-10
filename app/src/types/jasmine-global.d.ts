// Global type declarations for the vendored Jasmine 1.x instance.
//
// jasmine.js is treated by TypeScript as a script (its CommonJS exports are all
// conditional), so TypeScript infers a specific `var jasmine = {}` type at global
// scope. This file overrides that with `any` so that runtime-added methods
// (jasmine.unspy, jasmine.attachToDOM, etc.) don't require casts.
//
// A companion `namespace jasmine` declaration provides the Jasmine 1.x types
// used in spec files (e.g. `jasmine.Spy`) without needing @types/jasmine.

// eslint-disable-next-line no-var
declare var jasmine: any;

// Minimal Jasmine 1.x type declarations for spec files.
// `var jasmine: any` handles runtime method calls; this namespace handles type annotations.
declare namespace jasmine {
  interface Spy {
    (...args: any[]): any;
    callCount: number;
    wasCalled: boolean;
    calls: Array<{ args: any[]; object: any }>;
    mostRecentCall: { args: any[]; object: any };
    argsForCall: any[][];
    andReturn(value: any): this;
    andCallFake(fn: (...args: any[]) => any): this;
    andCallThrough(): this;
    reset(): void;
  }
}
