/**
 * Analytics helpers for Google Analytics 4 (gtag.js).
 * All functions no-op when gtag is not available (e.g. measurement ID not set, SSR).
 */

export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
}

export function pageView(url: string): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (measurementId) {
      window.gtag('config', measurementId, { page_path: url });
    }
  }
}
