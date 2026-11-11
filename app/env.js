// Where the app is running, and what that allows.
//
//   artifact  — inside Claude. Storage and AI come from Claude; the page can't
//               reach other websites, so Open Food Facts, Fitbit and the
//               Anthropic API are off.
//   web       — the installable app (or any normal browser tab). Everything
//               network-based is available; data lives on this device.

/* global __WEB__ */
const w = typeof window !== 'undefined' ? window : {};
const nav = typeof navigator !== 'undefined' ? navigator : {};

// __WEB__ is set at build time: false for the artifact bundle, so web-only
// code (scanner, SDK, Fitbit) is left out of it entirely.
export const WEB_BUILD = typeof __WEB__ === 'undefined' ? true : __WEB__;
export const isArtifact = !!(w.claude && typeof w.claude.use === 'function');
export const isWeb = WEB_BUILD && !isArtifact;

const ua = nav.userAgent || '';
export const isIOS = /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
export const isStandalone = () => !!(w.matchMedia?.('(display-mode: standalone)').matches || nav.standalone);

// The address this app is served from, without query or hash. It is the
// OAuth redirect address you register with Google.
export const appUrl = () => (w.location ? w.location.origin + w.location.pathname.replace(/index\.html$/, '') : '');
