# Guide: Replacing Used Keys with Unused (Edited) Keys

## Overview

You've edited and fixed many unused translation keys with better grammar and terminology. This script helps you replace the currently used keys with your improved unused ones.

## Example

**Before:**
- Used key: `landing.aboutUs.title` (in code)
- Unused key: `aboutUs.title` (you've edited this with better grammar)

**After:**
- Code now uses: `aboutUs.title` (your improved version)

## How It Works

The script:
1. **Finds unused keys** that have corresponding used keys
2. **Maps them together** (e.g., `aboutUs.*` → `landing.aboutUs.*`)
3. **Replaces all usages** in the codebase
4. **Preserves your edited translations** in the unused keys

## Usage

### Step 1: Make sure you've committed your changes

```bash
git status
git add .
git commit -m "Backup before key replacement"
```

### Step 2: Run the replacement script

```bash
cd frontend
npm run i18n:replace-unused
```

### Step 3: Review the changes

The script will:
- Show you how many mappings it found
- Display sample mappings
- Replace keys in all files
- Show you which files were modified

### Step 4: Test the application

```bash
npm run dev
```

Check that:
- All pages load correctly
- Translations display properly
- No console errors

### Step 5: Verify the replacement

```bash
npm run i18n:coverage:excel
```

Open the Excel report and check:
- The previously "unused" keys should now be marked as "used"
- The previously "used" keys should now be marked as "unused" (or removed)

## Mapping Strategies

The script uses multiple strategies to find mappings:

### Strategy 1: Remove Common Prefixes
- `landing.aboutUs.title` → `aboutUs.title`
- `nav.dashboard` → `dashboard`
- `toast.userCreated` → `userCreated`

### Strategy 2: Add Common Prefixes
- `aboutUs.title` → `landing.aboutUs.title`
- `dashboard` → `nav.dashboard`

### Strategy 3: Same Base, Different Namespace
- `aboutUs.cta.button` ↔ `landing.aboutUs.cta.button`
- `students.title` ↔ `nav.students.title`

## Confidence Levels

The script assigns confidence levels to mappings:

- **High**: Clear pattern match (e.g., `landing.aboutUs.*` → `aboutUs.*`)
- **Medium**: Similar structure but less certain
- **Low**: Possible match but needs review

By default, the script processes all mappings. You can modify the script to only process high-confidence mappings if needed.

## What Gets Replaced

The script replaces keys in:
- `t('key')` calls
- `showToast.success('key')` calls
- `titleKey: 'key'` properties
- `labelKey: 'key'` properties
- `placeholderKey: 'key'` properties
- `getValidationMessage('key')` calls

## Important Notes

1. **Backup First**: Always commit your changes before running
2. **Review Changes**: Use `git diff` to review what changed
3. **Test Thoroughly**: Test all pages that use translations
4. **Check Navigation**: Navigation keys are especially important
5. **Validation Messages**: Check that form validation still works

## Troubleshooting

### Issue: Too many replacements

If the script replaces too many keys:
1. Review the mappings it found
2. Modify the script to be more conservative
3. Process high-confidence mappings only

### Issue: Some keys not replaced

If some keys aren't replaced:
1. Check if they use template literals (e.g., `` t(`nav.${key}`) ``)
2. These need manual replacement
3. Or enhance the script to handle them

### Issue: Broken translations

If translations break:
1. Check `git diff` to see what changed
2. Verify the unused keys exist in all language files
3. Check that the key structure matches

## Example Output

```
🔄 Replacing used keys with unused (edited) keys...

📖 Extracting all keys from types.ts...
   Found 6355 total keys

🔎 Scanning codebase for used keys...
   Found 4981 used keys

🔗 Finding key mappings...
📊 Analysis:
   Total keys: 6355
   Used keys: 4981
   Unused keys: 1374
   Found 234 mappings

📊 Mappings by confidence:
   High: 198
   Medium: 36
   Low: 0

📋 Sample mappings (high confidence):
   landing.aboutUs.title → aboutUs.title
   landing.aboutUs.subtitle → aboutUs.subtitle
   landing.aboutUs.cta.button → aboutUs.cta.button
   ... and 195 more

⚠️  This will replace 234 keys across the codebase.
   Make sure you have committed your changes!

🔄 Replacing keys in codebase...
   ✓ src/pages/AboutUs.tsx (8 replacements)
   ✓ src/components/navigation/SmartSidebar.tsx (12 replacements)
   ... more files ...

✅ Replacement complete!
   Files modified: 45
   Total replacements: 234
```

## Next Steps After Replacement

1. **Run coverage report**: `npm run i18n:coverage:excel`
2. **Check unused keys**: See if the previously unused keys are now marked as used
3. **Remove old keys**: Optionally remove the old used keys from translation files
4. **Update types**: Make sure `types.ts` reflects the new structure
5. **Commit changes**: Commit the replacement

## Manual Review Required

Some patterns can't be automatically replaced:

1. **Template literals with variables**:
   ```typescript
   t(`nav.${item.titleKey}`)  // Needs manual review
   ```

2. **Keys in arrays/objects**:
   ```typescript
   const keys = ['landing.aboutUs.title'];  // Needs manual review
   ```

3. **Dynamic key construction**:
   ```typescript
   const key = `landing.${section}.title`;  // Needs manual review
   ```

For these, you'll need to manually update the code after running the script.

