// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  idCardTemplatesApi: {
    getBackgroundImage: vi.fn(),
  },
  apiClient: {
    getToken: vi.fn().mockReturnValue(null),
  },
}));

import { idCardTemplatesApi } from '@/lib/api/client';
import { renderIdCardToCanvas } from '@/lib/idCards/idCardCanvasRenderer';
import { deriveExpiryDateFromCreatedDate, formatIdCardDateValue } from '@/lib/idCards/idCardFieldUtils';

type FillTextCall = {
  canvasWidth: number;
  canvasHeight: number;
  text: string;
  x: number;
  y: number;
  fillStyle: string;
};

const fillTextCalls: FillTextCall[] = [];

describe('idCardCanvasRenderer runtime alignment', () => {
  beforeEach(() => {
    fillTextCalls.length = 0;
    vi.restoreAllMocks();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContextMock() {
      const canvas = this as HTMLCanvasElement;
      const context = {
        canvas,
        fillStyle: '#000000',
        font: '12px Arial',
        textAlign: 'center',
        textBaseline: 'middle',
        direction: 'ltr',
        lineWidth: 0,
        strokeStyle: 'transparent',
        scale: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        strokeRect: vi.fn(),
        setLineDash: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        fillText: (text: string, x: number, y: number) => {
          fillTextCalls.push({
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            text,
            x,
            y,
            fillStyle: String(context.fillStyle ?? '#000000'),
          });
        },
      } as unknown as CanvasRenderingContext2D;

      return context;
    });
  });

  it('keeps editor, screen, and print coordinates aligned', async () => {
    const template = {
      id: 'template-runtime-1',
      layoutConfigFront: {
        enabledFields: ['studentName', 'class'],
        studentNamePosition: { x: 10, y: 40 },
        classPosition: { x: 60, y: 55 },
        fontSize: 12,
        fontFamily: 'Arial',
        textColor: '#000000',
        rtl: false,
      },
      layoutConfigBack: {},
      backgroundImagePathFront: null,
      backgroundImagePathBack: null,
    } as any;

    const student = {
      id: 'student-runtime-1',
      fullName: 'Runtime Student',
      fatherName: 'Runtime Father',
      studentCode: 'STD-100',
      admissionNumber: 'ADM-100',
      cardNumber: null,
      currentClass: null,
      school: { id: 'school-runtime-1', schoolName: 'Runtime School' },
    } as any;

    await renderIdCardToCanvas(template, student, 'front', {
      quality: 'screen',
      renderWidthPx: 634,
      renderHeightPx: 400,
      paddingPx: 20,
    });

    await renderIdCardToCanvas(template, student, 'front', {
      quality: 'print',
      renderWidthPx: 1011,
      renderHeightPx: 637,
      designWidthPx: 634,
      designHeightPx: 400,
      paddingPx: 20,
    });

    const screenNameCall = fillTextCalls.find(
      (call) => call.canvasWidth === 634 && call.text === 'Runtime Student'
    );
    const printNameCall = fillTextCalls.find(
      (call) => call.canvasWidth === 1011 && call.text === 'Runtime Student'
    );

    expect(screenNameCall).toBeDefined();
    expect(printNameCall).toBeDefined();

    const normalizedScreenX = (screenNameCall?.x ?? 0) / 634;
    const normalizedPrintX = (printNameCall?.x ?? 0) / 1011;
    expect(Math.abs(normalizedScreenX - normalizedPrintX)).toBeLessThan(0.002);

    const editorContainerWidth = 634;
    const editorMetricsPadding = 20;
    const editorContentWidth = editorContainerWidth - editorMetricsPadding * 2;
    const editorLeftCss =
      editorMetricsPadding +
      (template.layoutConfigFront.studentNamePosition.x / 100) * editorContentWidth;
    const editorNormalizedX = editorLeftCss / editorContainerWidth;
    expect(Math.abs(editorNormalizedX - normalizedScreenX)).toBeLessThan(0.002);
  });

  it('renders class and card number with resilient fallbacks', async () => {
    const template = {
      id: 'template-runtime-2',
      layoutConfigFront: {
        enabledFields: ['class', 'cardNumber'],
        classPosition: { x: 60, y: 45 },
        cardNumberPosition: { x: 60, y: 60 },
        fontSize: 12,
        fontFamily: 'Arial',
        textColor: '#000000',
        rtl: false,
      },
      layoutConfigBack: {},
      backgroundImagePathFront: null,
      backgroundImagePathBack: null,
    } as any;

    const student = {
      id: 'student-runtime-2',
      fullName: 'Fallback Student',
      fatherName: 'Fallback Father',
      studentCode: 'STD-200',
      admissionNumber: 'ADM-200',
      cardNumber: null,
      className: 'Room A',
      currentClass: null,
      school: { id: 'school-runtime-2', schoolName: 'Runtime School' },
    } as any;

    await renderIdCardToCanvas(template, student, 'front', {
      quality: 'screen',
      renderWidthPx: 634,
      renderHeightPx: 400,
      paddingPx: 20,
    });

    const renderedTexts = fillTextCalls.map((call) => call.text);
    expect(renderedTexts).toContain('Room A');
    expect(renderedTexts).toContain('ADM-200');
  });

  it('renders movable label fields alongside database values', async () => {
    const template = {
      id: 'template-runtime-3',
      layoutConfigFront: {
        enabledFields: ['studentNameLabel', 'studentName', 'cardNumberLabel', 'cardNumber'],
        studentNameLabelPosition: { x: 25, y: 40 },
        studentNamePosition: { x: 65, y: 40 },
        cardNumberLabelPosition: { x: 25, y: 58 },
        cardNumberPosition: { x: 65, y: 58 },
        fontSize: 12,
        fontFamily: 'Arial',
        textColor: '#000000',
        rtl: true,
      },
      layoutConfigBack: {},
      backgroundImagePathFront: null,
      backgroundImagePathBack: null,
    } as any;

    const student = {
      id: 'student-runtime-3',
      fullName: 'Label Student',
      fatherName: 'Label Father',
      studentCode: 'STD-300',
      admissionNumber: 'ADM-300',
      cardNumber: null,
      currentClass: null,
      school: { id: 'school-runtime-3', schoolName: 'Runtime School' },
    } as any;

    await renderIdCardToCanvas(template, student, 'front', {
      quality: 'screen',
      renderWidthPx: 634,
      renderHeightPx: 400,
      paddingPx: 20,
    });

    const renderedTexts = fillTextCalls.map((call) => call.text);
    expect(renderedTexts.some((text) => text.startsWith('نوم'))).toBe(true);
    expect(renderedTexts.some((text) => text.startsWith('کارت نمبر'))).toBe(true);
    expect(renderedTexts).toContain('ADM-300');
  });

  it('renders room label/value and honors per-field color overrides', async () => {
    const template = {
      id: 'template-runtime-4',
      layoutConfigFront: {
        enabledFields: ['roomLabel', 'room'],
        roomLabelPosition: { x: 25, y: 45 },
        roomPosition: { x: 65, y: 45 },
        fontSize: 12,
        fontFamily: 'Arial',
        textColor: '#000000',
        fieldFonts: {
          room: {
            textColor: '#ff0000',
          },
        },
        rtl: true,
      },
      layoutConfigBack: {},
      backgroundImagePathFront: null,
      backgroundImagePathBack: null,
    } as any;

    const student = {
      id: 'student-runtime-4',
      fullName: 'Room Student',
      fatherName: 'Room Father',
      studentCode: 'STD-400',
      admissionNumber: 'ADM-400',
      cardNumber: null,
      roomNumber: 'B-12',
      currentClass: null,
      school: { id: 'school-runtime-4', schoolName: 'Runtime School' },
    } as any;

    await renderIdCardToCanvas(template, student, 'front', {
      quality: 'screen',
      renderWidthPx: 634,
      renderHeightPx: 400,
      paddingPx: 20,
    });

    const roomLabelCall = fillTextCalls.find((call) => call.text.startsWith('اتاق '));
    const roomValueCall = fillTextCalls.find((call) => call.text === 'B-12');
    expect(roomLabelCall).toBeDefined();
    expect(roomValueCall).toBeDefined();
    expect(roomValueCall?.fillStyle.toLowerCase()).toBe('#ff0000');
  });

  it('renders created date and derives expiry from the record date', async () => {
    const createdAt = new Date('2026-04-13T00:00:00.000Z');
    const template = {
      id: 'template-runtime-5',
      layoutConfigFront: {},
      layoutConfigBack: {
        enabledFields: ['createdDate', 'expiryDate'],
        createdDatePosition: { x: 50, y: 45 },
        expiryDatePosition: { x: 50, y: 60 },
        fontSize: 12,
        fontFamily: 'Arial',
        textColor: '#000000',
        rtl: false,
      },
      backgroundImagePathFront: null,
      backgroundImagePathBack: null,
    } as any;

    const student = {
      id: 'student-runtime-5',
      fullName: 'Date Student',
      fatherName: 'Date Father',
      studentCode: 'STD-500',
      admissionNumber: 'ADM-500',
      cardNumber: null,
      createdAt,
      currentClass: null,
      school: { id: 'school-runtime-5', schoolName: 'Runtime School' },
    } as any;

    await renderIdCardToCanvas(template, student, 'back', {
      quality: 'screen',
      renderWidthPx: 634,
      renderHeightPx: 400,
      paddingPx: 20,
      createdDate: createdAt,
    });

    const renderedTexts = fillTextCalls.map((call) => call.text);
    const expectedCreatedDate = formatIdCardDateValue(createdAt, 'en-US');
    const expectedExpiryDate = formatIdCardDateValue(
      deriveExpiryDateFromCreatedDate(createdAt),
      'en-US'
    );

    expect(renderedTexts).toContain(expectedCreatedDate);
    expect(renderedTexts).toContain(expectedExpiryDate);
  });

  it('reuses cached background images across repeated renders', async () => {
    const getBackgroundImageMock = vi.mocked(idCardTemplatesApi.getBackgroundImage);
    getBackgroundImageMock.mockResolvedValue({
      blob: new Blob(['fake-image'], { type: 'image/png' }),
    } as any);

    class MockImage {
      onload: (() => void) | null = null;
      onerror: ((error?: unknown) => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    const originalImage = globalThis.Image;
    (globalThis as typeof globalThis & { Image: typeof Image }).Image = MockImage as unknown as typeof Image;

    try {
      const template = {
        id: 'template-runtime-cache',
        layoutConfigFront: {
          enabledFields: [],
          fontSize: 12,
          fontFamily: 'Arial',
          textColor: '#000000',
          rtl: false,
        },
        layoutConfigBack: {},
        backgroundImagePathFront: 'background/front.png',
        backgroundImagePathBack: null,
      } as any;

      const student = {
        id: 'student-runtime-cache',
        fullName: 'Cache Student',
        fatherName: 'Cache Father',
        studentCode: 'STD-CACHE',
        admissionNumber: 'ADM-CACHE',
        currentClass: null,
        school: { id: 'school-runtime-cache', schoolName: 'Runtime School' },
      } as any;

      await renderIdCardToCanvas(template, student, 'front', {
        quality: 'screen',
        renderWidthPx: 634,
        renderHeightPx: 400,
        paddingPx: 20,
      });

      await renderIdCardToCanvas(template, student, 'front', {
        quality: 'screen',
        renderWidthPx: 634,
        renderHeightPx: 400,
        paddingPx: 20,
      });

      expect(getBackgroundImageMock).toHaveBeenCalledTimes(1);
      expect(getBackgroundImageMock).toHaveBeenCalledWith('template-runtime-cache', 'front');
    } finally {
      (globalThis as typeof globalThis & { Image: typeof Image }).Image = originalImage;
    }
  });
});
