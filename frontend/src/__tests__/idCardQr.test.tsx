// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateLocalQrCodeDataUrl } from '@/lib/idCards/idCardQr';

describe('idCardQr', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,local-qr');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('generates a local QR data URL without network access', async () => {
    const dataUrl = await generateLocalQrCodeDataUrl('STD-100', 96);

    expect(dataUrl).toBe('data:image/png;base64,local-qr');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
