---
name: nazim-status-badges
description: Enforces status badge patterns for Nazim UI. Use when displaying status in tables, cards, or dialogs. Covers Badge variants, semantic colors, statusBadgeVariant, statusOptions with color.
---

# Nazim Status Badges

Use consistent badge variants and semantic colors for status display.

## Badge Variants (shadcn)

| Variant | Use For |
|---------|---------|
| `default` | Success/active (e.g. active, paid, pass) |
| `secondary` | Neutral (e.g. admitted, partial, under_review) |
| `outline` | Info/pending (e.g. applied, pending, draft) |
| `destructive` | Error/negative (e.g. withdrawn, overdue, fail) |

## Pattern 1: Variant Only

For simple status (student, staff, subscription):

```typescript
const statusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'admitted': return 'secondary';
    case 'applied': return 'outline';
    case 'withdrawn': return 'destructive';
    default: return 'outline';
  }
};

<Badge variant={statusBadgeVariant(status)} className="capitalize">
  {formatStatus(status)}
</Badge>
```

## Pattern 2: Variant + Custom Color

For attendance, fees, or statuses needing semantic colors:

```typescript
const statusOptions = [
  { value: 'present', label: t('present'), icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
  { value: 'absent', label: t('absent'), icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
  { value: 'late', label: t('late'), icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
  { value: 'excused', label: t('excused'), icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
];

const option = statusOptions.find(opt => opt.value === status);
if (!option) return <Badge variant="outline">{status}</Badge>;

<Badge variant="outline" className={`${option.color} flex items-center gap-1.5 font-medium w-fit`}>
  <Icon className="h-3.5 w-3.5" />
  {option.label}
</Badge>
```

## Semantic Color Mapping

| Meaning | Light | Dark |
|---------|-------|------|
| Success | `bg-green-100 text-green-700` | `dark:bg-green-950 dark:text-green-400` |
| Error | `bg-red-100 text-red-700` | `dark:bg-red-950 dark:text-red-400` |
| Warning | `bg-yellow-100 text-yellow-700` | `dark:bg-yellow-950 dark:text-yellow-400` |
| Pending | `bg-orange-100 text-orange-700` | `dark:bg-orange-950 dark:text-orange-400` |
| Info | `bg-blue-100 text-blue-700` | `dark:bg-blue-950 dark:text-blue-400` |
| Special | `bg-purple-100 text-purple-700` | `dark:bg-purple-950 dark:text-purple-400` |

## Fee Status Example

```typescript
const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  partial: 'secondary',
  pending: 'outline',
  overdue: 'destructive',
};
const colors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
<Badge className={colors[status] || ''} variant={variants[status] || 'outline'}>
```

## Checklist

- [ ] Use translation keys for labels
- [ ] Include dark mode classes
- [ ] Fallback to `variant="outline"` for unknown status
- [ ] Add `w-fit` when badge is in table cell

## Additional Resources

- Common status mappings (student, staff, fee, attendance): [reference.md](reference.md)
