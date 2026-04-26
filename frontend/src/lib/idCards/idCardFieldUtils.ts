import { formatDate } from '@/lib/calendarAdapter';
import type { IdCardLayoutConfig } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

export const DEFAULT_ID_CARD_LABEL_TEXTS: Record<string, string> = {
  studentNameLabel: 'نوم:',
  fatherNameLabel: 'د پلار نوم:',
  classLabel: 'درجه:',
  roomLabel: 'اتاق :',
  admissionNumberLabel: 'داخله نمبر:',
  studentCodeLabel: 'ID:',
  cardNumberLabel: 'کارت نمبر:',
};

export const ID_CARD_LABEL_FIELD_IDS = Object.keys(DEFAULT_ID_CARD_LABEL_TEXTS);

interface IdCardFieldValueContext {
  student?: Student | null;
  notes?: string | null;
  createdDate?: Date | string | null;
  expiryDate?: Date | string | null;
  locale?: string;
}

export const resolveIdCardLocale = (locale?: string): string => {
  if (locale && locale.trim().length > 0) {
    return locale;
  }

  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang || document.body?.lang;
    if (lang && lang.trim().length > 0) {
      return lang;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return 'en-US';
};

export const resolveFirstNonEmptyString = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
};

export const toValidDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const deriveExpiryDateFromCreatedDate = (
  createdDate: Date | string | null | undefined
): Date | null => {
  const validCreatedDate = toValidDate(createdDate);
  if (!validCreatedDate) {
    return null;
  }

  const derived = new Date(validCreatedDate.getTime());
  derived.setFullYear(derived.getFullYear() + 1);
  return derived;
};

export const formatIdCardDateValue = (
  value: Date | string | null | undefined,
  locale?: string
): string | null => {
  if (!value) {
    return null;
  }

  const validDate = toValidDate(value);
  if (validDate) {
    return formatDate(validDate, resolveIdCardLocale(locale));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
};

export const normalizeIdCardText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.normalize('NFC').trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveIdCardFieldValue = (
  fieldId: string,
  layout: Pick<IdCardLayoutConfig, 'fieldValues'> | null | undefined,
  context: IdCardFieldValueContext,
  fallbackText?: string
): string | null => {
  const student = context.student;
  const fieldValue = layout?.fieldValues?.[fieldId];
  const locale = resolveIdCardLocale(context.locale);

  if (ID_CARD_LABEL_FIELD_IDS.includes(fieldId)) {
    return normalizeIdCardText(
      resolveFirstNonEmptyString(fieldValue, DEFAULT_ID_CARD_LABEL_TEXTS[fieldId], fallbackText)
    );
  }

  switch (fieldId) {
    case 'studentName':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(
          fieldValue,
          student?.fullName,
          `${(student as Partial<Student> | undefined)?.firstName || ''} ${(student as Partial<Student> | undefined)?.lastName || ''}`.trim(),
          fallbackText
        )
      );
    case 'fatherName':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(
          fieldValue,
          student?.fatherName,
          (student as Record<string, unknown> | undefined)?.father_name,
          fallbackText
        )
      );
    case 'studentCode':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(fieldValue, student?.studentCode, fallbackText)
      );
    case 'admissionNumber':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(fieldValue, student?.admissionNumber, fallbackText)
      );
    case 'class':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(
          fieldValue,
          student?.currentClass?.name,
          (student as Record<string, unknown> | undefined)?.className,
          (student as Record<string, unknown> | undefined)?.sectionName,
          ((student as Record<string, unknown> | undefined)?.course as { name?: string } | undefined)?.name,
          fallbackText
        )
      );
    case 'room':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(
          fieldValue,
          student?.roomNumber,
          ((student as Record<string, unknown> | undefined)?.room as { roomNumber?: string } | undefined)?.roomNumber,
          fallbackText
        )
      );
    case 'schoolName':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(
          fieldValue,
          student?.school?.schoolName,
          ((student as Record<string, unknown> | undefined)?.organization as { name?: string } | undefined)?.name,
          fallbackText
        )
      );
    case 'cardNumber':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(
          fieldValue,
          student?.cardNumber,
          student?.admissionNumber,
          student?.id,
          fallbackText
        )
      );
    case 'notes':
      return normalizeIdCardText(
        resolveFirstNonEmptyString(fieldValue, context.notes, student?.notes, fallbackText)
      );
    case 'createdDate':
      return normalizeIdCardText(
        formatIdCardDateValue(
          fieldValue ?? context.createdDate ?? student?.createdAt ?? null,
          locale
        ) ?? fallbackText ?? null
      );
    case 'expiryDate': {
      const resolvedExpiryDate =
        fieldValue ??
        context.expiryDate ??
        deriveExpiryDateFromCreatedDate(context.createdDate ?? student?.createdAt ?? null);

      return normalizeIdCardText(
        formatIdCardDateValue(resolvedExpiryDate, locale) ?? fallbackText ?? null
      );
    }
    default:
      return normalizeIdCardText(resolveFirstNonEmptyString(fieldValue, fallbackText));
  }
};

export const scaleUniformImageDimensions = (
  width: number,
  height: number,
  nextWidth: number
): { width: number; height: number } => {
  const safeWidth = width > 0 ? width : 1;
  const scale = nextWidth / safeWidth;

  return {
    width: nextWidth,
    height: Number((height * scale).toFixed(4)),
  };
};

/** RTL text stack when no template primary font is chosen (matches historical behavior). */
export const ID_CARD_RTL_FONT_FALLBACK_STACK =
  '"Bahij Nassim", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif';

/**
 * Quote a single font-family name for CSS when it contains spaces (e.g. Bahij Titr).
 */
export const formatIdCardFontFamilyToken = (name: string): string => {
  const t = name.trim();
  if (!t) {
    return '';
  }
  if (t.includes(',')) {
    return t;
  }
  if (/^["']/.test(t)) {
    return t;
  }
  return /\s/.test(t) ? `"${t.replace(/["']/g, '')}"` : t;
};

/**
 * Default font-family string for ID card layout (editor + canvas): respects global template font, with RTL fallbacks.
 */
export const resolveIdCardDefaultFontFamily = (
  isRtl: boolean,
  layoutFontFamily: string | undefined | null
): string => {
  if (!isRtl) {
    const primary = layoutFontFamily?.trim();
    return primary ? formatIdCardFontFamilyToken(primary) : 'Arial';
  }
  const primary = layoutFontFamily?.trim();
  if (primary) {
    return `${formatIdCardFontFamilyToken(primary)}, ${ID_CARD_RTL_FONT_FALLBACK_STACK}`;
  }
  return ID_CARD_RTL_FONT_FALLBACK_STACK;
};

/**
 * Canvas 2D `font` property: multi-word families must be quoted; stacks are passed through.
 */
export const formatIdCardFontFamilyForCanvas = (family: string): string => {
  const t = family.trim();
  if (!t) {
    return 'sans-serif';
  }
  if (t.includes(',')) {
    return t;
  }
  return formatIdCardFontFamilyToken(t);
};
