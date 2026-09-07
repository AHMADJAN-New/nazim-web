import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const frontendRoot = resolve(__dirname, '../..');
const indexHtmlPath = resolve(frontendRoot, 'index.html');

function readIndexHtml(): string {
  return readFileSync(indexHtmlPath, 'utf8');
}

function scriptSrcAttributes(html: string): string[] {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
}

describe('index.html CSP-safe boot assets', () => {
  it('does not use ./ script src (nested SPA routes would request /platform/file.js)', () => {
    const srcs = scriptSrcAttributes(readIndexHtml());
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src.startsWith('./'), `${src} is document-relative and breaks /platform/*`).toBe(false);
    }
  });

  it('loads the crypto.randomUUID polyfill from a base-absolute public file', () => {
    expect(readIndexHtml()).toMatch(
      /src=["'](?:%BASE_URL%|\/)crypto-randomuuid-polyfill\.js["']/
    );
    expect(existsSync(resolve(frontendRoot, 'public/crypto-randomuuid-polyfill.js'))).toBe(true);
  });

  it('has no inline scripts (production CSP is script-src self unsafe-eval)', () => {
    const inlineOpenTags = readIndexHtml().match(/<script(?![^>]*\bsrc=)[^>]*>/gi);
    expect(inlineOpenTags).toBeNull();
  });

  it('bootstraps theme from an external public file', () => {
    expect(readIndexHtml()).toMatch(/src=["'](?:%BASE_URL%|\/)theme-init\.js["']/);
    expect(existsSync(resolve(frontendRoot, 'public/theme-init.js'))).toBe(true);
  });
});
