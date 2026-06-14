// Detect ?from=app in the initial URL and persist for the entire session.
// React Router navigations drop query params, so sessionStorage keeps the flag alive.
if (typeof window !== 'undefined') {
  if (new URLSearchParams(window.location.search).get('from') === 'app') {
    sessionStorage.setItem('neko_from_app', '1');
  }
  // Flutter app can also call window.setNekoFromApp() after WebView loads
  window.setNekoFromApp = () => {
    sessionStorage.setItem('neko_from_app', '1');
    window.dispatchEvent(new Event('neko_from_app'));
  };
}

export const isFromApp = () =>
  typeof window !== 'undefined' && sessionStorage.getItem('neko_from_app') === '1';

export const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
