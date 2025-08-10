/* Global test declarations to avoid TS errors when no test runner types are configured */
declare const describe: (...args: any[]) => any;
declare const it: (...args: any[]) => any;
declare const expect: (...args: any[]) => any;
declare const beforeAll: (...args: any[]) => any;
declare const afterAll: (...args: any[]) => any;
declare const beforeEach: (...args: any[]) => any;
declare const afterEach: (...args: any[]) => any;
declare const vi: any;
