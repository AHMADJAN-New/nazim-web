import { UAParser } from 'ua-parser-js';

export interface ParsedUserAgent {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: 'mobile' | 'tablet' | 'smarttv' | 'wearable' | 'embedded' | null;
  deviceVendor: string;
  deviceModel: string;
  cpu: string;
  engine: string;
  summary: string;
  isMobile: boolean;
  isDesktop: boolean;
}

/**
 * Parse user agent string into structured device, browser, and OS info.
 * Uses ua-parser-js for production-grade parsing.
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent || !userAgent.trim()) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      device: 'Unknown',
      deviceType: null,
      deviceVendor: '',
      deviceModel: '',
      cpu: '',
      engine: '',
      summary: 'Unknown device',
      isMobile: false,
      isDesktop: true,
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceName = [
    result.device.vendor,
    result.device.model,
    result.device.type,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const device = deviceName || (result.device.type === 'mobile' ? 'Mobile' : result.device.type === 'tablet' ? 'Tablet' : 'Desktop');

  // Build human-readable summary (e.g. "Chrome 143 on Windows 10" or "Safari on iPhone")
  const parts: string[] = [];
  if (result.browser.name) {
    parts.push(result.browser.version ? `${result.browser.name} ${result.browser.version}` : result.browser.name);
  }
  if (result.os.name) {
    parts.push(result.os.version ? `on ${result.os.name} ${result.os.version}` : `on ${result.os.name}`);
  }
  if (result.device.model && result.device.vendor) {
    parts.push(`(${result.device.vendor} ${result.device.model})`);
  }
  const summary = parts.length > 0 ? parts.join(' ') : device || 'Unknown device';

  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || '',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || '',
    device: device || 'Unknown',
    deviceType: result.device.type as ParsedUserAgent['deviceType'],
    deviceVendor: result.device.vendor || '',
    deviceModel: result.device.model || '',
    cpu: result.cpu.architecture || '',
    engine: result.engine.name || '',
    summary,
    isMobile: result.device.type === 'mobile' || result.device.type === 'wearable',
    isDesktop: !result.device.type || result.device.type === 'console' || (result.device.type !== 'mobile' && result.device.type !== 'tablet' && result.device.type !== 'wearable'),
  };
}
