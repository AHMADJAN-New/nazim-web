# Translation Key Usage Guide

## Problem: Why "Unused" Keys Are Actually Used

Many translation keys are marked as "unused" by the analyzer, but they're actually being used in the app. This happens because the detection script doesn't catch all usage patterns.

## How Translation Keys Are Used in the App

### 1. Direct Function Calls (✅ Detected)

```typescript
// Pattern: t('key')
const label = t('common.save');
const message = t('toast.userCreated');
```

### 2. Dynamic Key Construction (❌ NOT Detected - This is the problem!)

```typescript
// Pattern: t(`nav.${item.titleKey}`)
// In SmartSidebar.tsx line 1510:
const label = t(`nav.${item.titleKey}`);

// This means:
// - titleKey: "dashboard" → becomes "nav.dashboard"
// - titleKey: "attendance" → becomes "nav.attendance"
// - titleKey: "staffManagement" → becomes "nav.staffManagement"
```

**Why it's missed**: The script looks for literal strings like `t('nav.dashboard')`, but can't detect template literals with variables like `t(\`nav.${item.titleKey}\`)`.

### 3. Navigation Items (❌ NOT Detected)

All navigation items in `SmartSidebar.tsx` have `titleKey` properties that are used dynamically:

```typescript
{
  titleKey: "dashboard",  // Used as: t(`nav.dashboard`)
  url: "/dashboard",
  icon: Home,
},
{
  titleKey: "attendance",  // Used as: t(`nav.attendance`)
  children: [
    {
      titleKey: "markAttendance",  // Used as: t(`nav.markAttendance`)
      url: "/attendance/marking",
    }
  ]
}
```

**All navigation keys follow the pattern**: `nav.${titleKey}`

### 4. Validation Messages (❌ NOT Detected)

```typescript
// In validationHelpers.ts:
export const validationMessages = {
  invalidUuid: () => getValidationMessage('validation.invalidUuid'),
  invalidEmail: () => getValidationMessage('validation.invalidEmail'),
  // ... more
};

// Used in forms:
validationMessages.invalidUuid()  // Internally calls: t('validation.invalidUuid')
```

**Why it's missed**: The script sees `validationMessages.invalidUuid()` but doesn't trace it to `getValidationMessage('validation.invalidUuid')`.

### 5. Toast Messages (✅ Partially Detected)

```typescript
// Pattern: showToast.success('key')
showToast.success('toast.userCreated');  // ✅ Detected

// But also:
showToast.success(t('toast.userCreated'));  // ✅ Detected (via t() call)
```

### 6. Keys in Objects/Arrays (❌ NOT Detected)

```typescript
// Keys stored in objects
const menuItems = [
  { key: 'nav.dashboard', label: 'Dashboard' },
  { key: 'nav.attendance', label: 'Attendance' },
];

// Later used:
menuItems.forEach(item => t(item.key));  // ❌ Not detected
```

### 7. Keys Passed as Variables (❌ NOT Detected)

```typescript
const translationKey = 'common.save';
const message = t(translationKey);  // ❌ Not detected (variable, not literal)
```

## Solution: Enhanced Detection

The improved script now detects:

1. ✅ **Direct `t('key')` calls** - Already working
2. ✅ **`showToast.*('key')` calls** - Already working
3. ✅ **`titleKey: 'key'` properties** - Already working
4. ✅ **Navigation `titleKey` values** - NEW: Extracts all `titleKey` values and constructs `nav.${titleKey}` keys
5. ✅ **Validation message keys** - NEW: Extracts keys from `validationHelpers.ts`
6. ✅ **Template literals with known prefixes** - NEW: Detects `t(\`nav.${...}\`)` patterns

## How to Fix the Detection

The enhanced script (`translation-coverage-excel.ts`) now includes:

### 1. Navigation Key Extraction

```typescript
// Extract all titleKey values from navigation items
const titleKeyPattern = /titleKey:\s*['"]([^'"]+)['"]/g;
// Then construct: nav.${titleKey}
```

### 2. Validation Message Extraction

```typescript
// Extract from validationHelpers.ts
const validationPattern = /getValidationMessage\(['"](validation\.[^'"]+)['"]/g;
```

### 3. Template Literal Detection

```typescript
// Detect: t(`nav.${...}`)
const templatePattern = /t\(`nav\.\$\{[^}]+\}`\)/g;
// Extract the variable name and look for titleKey assignments
```

## Common Patterns You'll See

### Navigation Keys
All navigation keys follow: `nav.${titleKey}`

Examples:
- `nav.dashboard`
- `nav.attendance`
- `nav.staffManagement`
- `nav.finance.fees.dashboard` (for nested keys with dots)

### Validation Keys
All validation keys follow: `validation.${helperName}`

Examples:
- `validation.invalidUuid`
- `validation.fieldRequired`
- `validation.endDateAfterStart`

### Toast Keys
All toast keys follow: `toast.${action}${Resource}`

Examples:
- `toast.userCreated`
- `toast.userCreateFailed`
- `toast.profileUpdated`

## Why Keys Are Marked Unused

1. **Dynamic construction**: Keys built with template literals (`t(\`nav.${key}\`)`)
2. **Variable usage**: Keys stored in variables before use
3. **Indirect calls**: Keys passed through helper functions
4. **Object/array storage**: Keys stored in data structures

## How to Verify a Key Is Actually Used

1. **Search the codebase** for the key:
   ```bash
   grep -r "nav.dashboard" frontend/src
   ```

2. **Check navigation items**: Look in `SmartSidebar.tsx` for `titleKey: "dashboard"`

3. **Check validation helpers**: Look in `validationHelpers.ts` for validation keys

4. **Check dynamic usage**: Search for template literals like `` t(`nav.${...}`) ``

## Next Steps

1. Run the enhanced script: `npm run i18n:coverage:excel`
2. Check the "Unused Keys" sheet in Excel
3. For each "unused" key:
   - Search the codebase for the key
   - Check if it's used dynamically (navigation, validation, etc.)
   - If it's truly unused, consider removing it
   - If it's used, the script needs improvement

