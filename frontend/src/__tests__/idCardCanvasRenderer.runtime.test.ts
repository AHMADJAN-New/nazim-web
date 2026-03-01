// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderIdCardToCanvas } from '@/lib/idCards/idCardCanvasRenderer';

type FillTextCall = {
  canvasWidth: number;
  canvasHeight: number;
  text: string;
  x: number;
  y: number;
};

const fillTextCalls: FillTextCall[] = [];

describe('idCardCanvasRenderer runtime alignment', () => {
  beforeEach(() => {
    fillTextCalls.length = 0;
    vi.restoreAllMocks();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContextMock() {
      return {
        canvas: this,
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
            canvasWidth: this.width,
            canvasHeight: this.height,
            text,
            x,
            y,
          });
        },
      } as unknown as CanvasRenderingContext2D;
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
    const normalizedDelta = Math.abs(normalizedScreenX - normalizedPrintX);
    expect(normalizedDelta).toBeLessThan(0.002);

    const editorContainerWidth = 634;
    const editorMetricsPadding = 20;
    const editorContentWidth = editorContainerWidth - editorMetricsPadding * 2;
    const editorLeftCss = editorMetricsPadding + (template.layoutConfigFront.studentNamePosition.x / 100) * editorContentWidth;
    const editorNormalizedX = editorLeftCss / editorContainerWidth;
    const editorVsRuntimeDelta = Math.abs(editorNormalizedX - normalizedScreenX);
    expect(editorVsRuntimeDelta).toBeLessThan(0.002);
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
    expect(renderedTexts).toContain('نوم');
    expect(renderedTexts).toContain('کارت نمبر');
    expect(renderedTexts).toContain('ADM-300');
  });
});
