# StatsCard Component - Usage Guide

## Overview

The `StatsCard` component provides a beautiful, consistent design pattern for displaying statistics/metrics throughout the application. It includes:

- **Decorative circles** with colored backgrounds
- **Colored icon backgrounds** matching the card theme
- **Colored value text** for visual emphasis
- **Optional navigation buttons** in CardFooter
- **Responsive typography** and spacing
- **Consistent styling** across all dashboards

## Location

`frontend/src/components/dashboard/StatsCard.tsx`

## Basic Usage

```typescript
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users } from 'lucide-react';

<StatsCard
  title="Total Students"
  value={1234}
  icon={Users}
  description="Active students"
  color="blue"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ Yes | - | Card title text |
| `value` | `string \| number` | ✅ Yes | - | Main value to display |
| `icon` | `LucideIcon` | ✅ Yes | - | Icon component from lucide-react |
| `description` | `string` | ❌ No | - | Description text below value |
| `trend` | `object` | ❌ No | - | Trend indicator with percentage |
| `color` | `string` | ❌ No | `"primary"` | Color theme (see colors below) |
| `onClick` | `() => void` | ❌ No | - | Click handler for card |
| `showButton` | `boolean` | ❌ No | `false` | Show navigation button in footer |
| `buttonText` | `string` | ❌ No | `"View Details"` | Button text |

## Available Colors

- `primary` - Primary theme color
- `secondary` - Secondary theme color
- `success` - Green (success states)
- `warning` - Amber (warnings)
- `destructive` - Red (errors/destructive)
- `blue` - Blue theme
- `green` - Green theme
- `purple` - Purple theme
- `amber` - Amber theme
- `red` - Red theme
- `yellow` - Yellow theme
- `cyan` - Cyan theme
- `emerald` - Emerald theme
- `orange` - Orange theme

## Examples

### Basic Stat Card

```typescript
<StatsCard
  title="Total Students"
  value={1234}
  icon={Users}
  color="blue"
/>
```

### With Description

```typescript
<StatsCard
  title="Total Students"
  value={1234}
  icon={Users}
  description="Active students"
  color="blue"
/>
```

### With Trend Indicator

```typescript
<StatsCard
  title="Total Students"
  value={1234}
  icon={Users}
  description="Active students"
  trend={{
    value: 12.5,
    label: "vs last month",
    isPositive: true
  }}
  color="blue"
/>
```

### With Navigation Button

```typescript
<StatsCard
  title="Total Students"
  value={1234}
  icon={Users}
  description="Active students"
  color="blue"
  showButton={true}
  buttonText="View Students"
  onClick={() => navigate('/students')}
/>
```

### Grid Layout

```typescript
<div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  <StatsCard title="Students" value={1234} icon={Users} color="blue" />
  <StatsCard title="Staff" value={56} icon={GraduationCap} color="green" />
  <StatsCard title="Classes" value={24} icon={BookOpen} color="purple" />
  <StatsCard title="Rooms" value={48} icon={Building} color="amber" />
</div>
```

## Migration Guide

### Before (Raw Card)

```typescript
<Card>
  <CardHeader>
    <CardTitle>Total Students</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">1234</div>
    <p className="text-xs text-muted-foreground">Active students</p>
  </CardContent>
</Card>
```

### After (StatsCard)

```typescript
<StatsCard
  title="Total Students"
  value={1234}
  icon={Users}
  description="Active students"
  color="blue"
/>
```

## Design Pattern Features

1. **Decorative Circle**: Semi-transparent colored circle in top-right corner
2. **Icon Background**: Colored background matching the card theme
3. **Colored Value**: Value text uses the card's color for emphasis
4. **Responsive Typography**: Scales from `text-2xl` to `text-3xl` on larger screens
5. **Consistent Spacing**: Uses `gap-3 md:gap-4` for grid spacing
6. **Overflow Handling**: `overflow-hidden` prevents horizontal scroll

## Best Practices

1. **Use appropriate colors**: Match color to the metric's meaning (green for positive, red for negative, etc.)
2. **Provide descriptions**: Always include a description for context
3. **Use icons**: Every card should have a relevant icon
4. **Grid layout**: Use responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
5. **Consistent spacing**: Use `gap-3 md:gap-4` for card grids
6. **Navigation buttons**: Add buttons when the card links to a detail page

## Files Already Using StatsCard

- ✅ `frontend/src/pages/Dashboard.tsx` - Main dashboard overview
- ✅ `frontend/src/pages/dashboard/AttendanceDashboard.tsx` - Attendance stats
- ✅ `frontend/src/pages/dashboard/LeaveRequestsDashboard.tsx` - Leave request stats
- ✅ `frontend/src/pages/dms/DmsDashboard.tsx` - Document management stats
- ✅ `frontend/src/platform/pages/PlatformAdminDashboard.tsx` - Platform admin stats
- ✅ `frontend/src/pages/graduation/GraduationDashboard.tsx` - Graduation stats
- ✅ `frontend/src/components/students/history/HistorySummaryCards.tsx` - Student history stats

## Files That Should Be Updated

When you encounter cards displaying statistics/metrics, replace them with `StatsCard`:

1. Look for patterns like:
   - `<Card>` with `<CardHeader>` and `<CardContent>`
   - Displaying numbers/values
   - Showing statistics or metrics

2. Replace with `StatsCard` using the examples above

3. Benefits:
   - Consistent design across the app
   - Less code to maintain
   - Automatic responsive design
   - Beautiful visual appearance

