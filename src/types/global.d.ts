export {};

declare global {
  interface Window {
    Sentry?: any;
    gtag?: (...args: any[]) => void;
  }
}
