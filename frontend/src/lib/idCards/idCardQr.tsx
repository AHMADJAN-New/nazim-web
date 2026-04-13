import { createRoot } from 'react-dom/client';

import { QRCodeCanvas } from 'qrcode.react';

const qrDataUrlCache = new Map<string, Promise<string>>();

const nextPaint = (callback: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => callback());
    return;
  }

  window.setTimeout(callback, 0);
};

export async function generateLocalQrCodeDataUrl(value: string, sizePx: number): Promise<string> {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error('QR value is empty');
  }

  const size = Math.max(1, Math.round(sizePx));
  const cacheKey = `${trimmedValue}::${size}`;
  const cached = qrDataUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = new Promise<string>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('QR generation requires a browser environment'));
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const root = createRoot(container);
    let settled = false;

    const cleanup = () => {
      window.setTimeout(() => {
        try {
          root.unmount();
        } finally {
          container.remove();
        }
      }, 0);
    };

    const finish = (action: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      try {
        action();
      } finally {
        cleanup();
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error('Timed out while generating QR code')));
    }, 2000);

    root.render(
      <QRCodeCanvas
        value={trimmedValue}
        size={size}
        level="M"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#000000"
        ref={(canvas) => {
          if (!canvas) {
            return;
          }

          nextPaint(() => {
            window.clearTimeout(timeoutId);
            finish(() => resolve(canvas.toDataURL('image/png')));
          });
        }}
      />
    );
  });

  qrDataUrlCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    qrDataUrlCache.delete(cacheKey);
    throw error;
  }
}
