---
name: nazim-responsive
description: Enforces mobile-first responsive patterns for Nazim UI. Use when building pages, tables, forms, charts, or buttons. Covers page container, FilterPanel, tabs, grids, tables, charts, cards, buttons.
---

# Nazim Responsive Design

All components MUST be mobile-first. Follow these patterns for consistent UX.

## Page Container

```typescript
<div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
```

- ✅ **ALWAYS** `overflow-x-hidden` to prevent horizontal scroll
- ✅ `p-4 md:p-6` for responsive padding
- ✅ `max-w-7xl` for content width

## PageHeader

- Icons: `hidden md:inline-flex`
- Descriptions: `hidden md:block` (or `showDescriptionOnMobile={true}` if critical)
- Title always visible

## FilterPanel

- `defaultOpenDesktop={true}`, `defaultOpenMobile={false}`
- Collapsed on mobile, expanded on desktop

## Tabs

```typescript
<TabsTrigger className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span className="hidden sm:inline">{t('tab.label')}</span>
</TabsTrigger>
```

- Icons always visible; labels `hidden sm:inline`

## Grids

- Mobile: `grid-cols-1`
- Desktop: `lg:grid-cols-3` (prefer `lg:` over `md:` for multi-column)
- Forms: `grid-cols-1 md:grid-cols-2`

## Tables

```typescript
<div className="overflow-x-auto">
  <Table>{/* ... */}</Table>
</div>
```

- ✅ **ALWAYS** wrap tables in `overflow-x-auto`
- Hide non-essential columns on mobile: `className="hidden md:table-cell"`

## Charts

```typescript
<ChartContainer className="h-[200px] sm:h-[220px] md:h-[250px] w-full">
```

- Progressive height; `w-full`; `overflow-hidden` on parent cards

## Cards

- `overflow-hidden` when using decorative elements
- Decorative margins: `-mr-8 -mt-8` (not `-mr-16`)

## Buttons with Icons

```typescript
<Button className="flex-shrink-0" aria-label={t('common.exportExcel')}>
  <FileSpreadsheet className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">{t('common.exportExcel')}</span>
</Button>
```

- Icons always visible; labels `hidden sm:inline`
- `aria-label` for accessibility
- `flex-shrink-0` to prevent compression

## Export Buttons with Tooltips

```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="sm" aria-label={t('common.exportExcel')}>
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">{t('common.exportExcel')}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="sm:hidden">
      <p>{t('common.exportExcel')}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

- Tooltip `className="sm:hidden"` so it shows on mobile (icon-only)
- Container: `flex items-center gap-1.5 sm:gap-2` (no `flex-wrap`)

## Checklist

- [ ] Page container has `overflow-x-hidden`
- [ ] Tables wrapped in `overflow-x-auto`
- [ ] Button labels hidden on mobile
- [ ] Grids use `lg:` for multi-column
- [ ] Charts use progressive height
