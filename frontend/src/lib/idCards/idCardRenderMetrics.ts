export const CARD_ASPECT_RATIO = 85.6 / 53.98;
export const DEFAULT_ID_CARD_PADDING_PX = 20;

export const DEFAULT_SCREEN_HEIGHT_PX = 400;
export const DEFAULT_SCREEN_WIDTH_PX = Math.round(DEFAULT_SCREEN_HEIGHT_PX * CARD_ASPECT_RATIO);

export const CR80_WIDTH_MM = 85.6;
export const CR80_HEIGHT_MM = 53.98;
export const PRINT_DPI = 300;
export const DEFAULT_PRINT_WIDTH_PX = Math.round((CR80_WIDTH_MM / 25.4) * PRINT_DPI);
export const DEFAULT_PRINT_HEIGHT_PX = Math.round((CR80_HEIGHT_MM / 25.4) * PRINT_DPI);

export interface IdCardRenderMetrics {
  cardAspectRatio: number;
  totalWidth: number;
  totalHeight: number;
  paddingPx: number;
  contentWidth: number;
  contentHeight: number;
  fontScale: number;
  pctToX: (pct: number) => number;
  pctToY: (pct: number) => number;
  pctToWidth: (pct: number) => number;
  pctToHeight: (pct: number) => number;
  xToPct: (px: number) => number;
  yToPct: (px: number) => number;
}

interface IdCardRenderMetricsOptions {
  totalWidth: number;
  totalHeight: number;
  paddingPx?: number;
  designWidthPx?: number;
  designHeightPx?: number;
}

export const getDefaultScreenRenderSize = () => ({
  width: DEFAULT_SCREEN_WIDTH_PX,
  height: DEFAULT_SCREEN_HEIGHT_PX,
});

export const getDefaultPrintRenderSize = () => ({
  width: DEFAULT_PRINT_WIDTH_PX,
  height: DEFAULT_PRINT_HEIGHT_PX,
});

export const createIdCardRenderMetrics = ({
  totalWidth,
  totalHeight,
  paddingPx = DEFAULT_ID_CARD_PADDING_PX,
  designWidthPx,
  designHeightPx,
}: IdCardRenderMetricsOptions): IdCardRenderMetrics => {
  const safeTotalWidth = Math.max(0, totalWidth);
  const safeTotalHeight = Math.max(0, totalHeight);
  const contentWidth = Math.max(0, safeTotalWidth - 2 * paddingPx);
  const contentHeight = Math.max(0, safeTotalHeight - 2 * paddingPx);

  const scaleX = designWidthPx ? safeTotalWidth / designWidthPx : null;
  const scaleY = designHeightPx ? safeTotalHeight / designHeightPx : null;
  const fontScale = (scaleX ?? scaleY ?? 1) || 1;

  return {
    cardAspectRatio: CARD_ASPECT_RATIO,
    totalWidth: safeTotalWidth,
    totalHeight: safeTotalHeight,
    paddingPx,
    contentWidth,
    contentHeight,
    fontScale,
    pctToX: (pct: number) => paddingPx + (pct / 100) * contentWidth,
    pctToY: (pct: number) => paddingPx + (pct / 100) * contentHeight,
    pctToWidth: (pct: number) => (pct / 100) * contentWidth,
    pctToHeight: (pct: number) => (pct / 100) * contentHeight,
    xToPct: (px: number) => (contentWidth > 0 ? ((px - paddingPx) / contentWidth) * 100 : 0),
    yToPct: (px: number) => (contentHeight > 0 ? ((px - paddingPx) / contentHeight) * 100 : 0),
  };
};
