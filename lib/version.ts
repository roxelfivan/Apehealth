// Injected at build time from package.json (see next.config.ts), matching
// Apeditor's VITE_APP_VERSION so the home header tracks the published version.
export const APP_VERSION = process.env.APP_VERSION ?? "0.0.0";
