---
name: nazim-filters
description: Enforces filter panel and filter state patterns for Nazim list and report pages. Use when adding search, dropdowns, date ranges, or filter state. Covers FilterPanel, filter state, query integration.
---

# Nazim Filters

Filter panels and filter state follow consistent patterns for list and report pages.

## FilterPanel

Use `FilterPanel` from `@/components/layout/FilterPanel`:

```typescript
<FilterPanel
  title={t('filters.title')}
  defaultOpenDesktop={true}   // Open on desktop
  defaultOpenMobile={false}   // Collapsed on mobile
  footer={/* optional */}
>
  {/* Filter content */}
</FilterPanel>
```

- Mobile: Collapsed by default, button to expand
- Desktop: Expanded by default, toggle button
- Uses `Collapsible` internally

## Filter State

```typescript
const [filters, setFilters] = useState({
  search: '',
  status: '',
  schoolId: '',
  classId: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  perPage: 25,
});

const handleFilterChange = (key: string, value: string | number) => {
  setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
};
```

## Filter UI Elements

- **Search**: `<Input placeholder={t('common.search')} value={filters.search} onChange={...} />`
- **Status dropdown**: `<Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}>` with `SelectItem` for each option
- **School/Class**: Select with options from `useSchools`, `useClasses`
- **Date range**: `CalendarDatePicker` for `dateFrom` and `dateTo`

## Query Integration

- Include filter values in `queryKey`: `['resource', profile?.organization_id, filters]`
- Pass filters to API: `apiClient.resource.list({ ...filters, organization_id, school_id })`
- Reset `page` to 1 when filters change

## Checklist

- [ ] FilterPanel with defaultOpenDesktop/defaultOpenMobile
- [ ] Filter state in useState
- [ ] handleFilterChange resets page
- [ ] Filters in queryKey and API params
- [ ] "All" option for status/school/class dropdowns
