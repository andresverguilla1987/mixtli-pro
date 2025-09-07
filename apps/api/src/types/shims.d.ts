// Minimal shims to silence TS if strict is enabled. Safe to keep.
declare module 'cors' { const x: any; export default x; }
declare module 'morgan' { const x: any; export default x; }
