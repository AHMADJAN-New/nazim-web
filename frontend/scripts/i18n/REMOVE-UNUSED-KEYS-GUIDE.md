# Guide: Removing Unused Translation Keys

## ⚠️ Important Warning

**Before removing unused keys, make sure:**
1. ✅ You've run the replacement script (`npm run i18n:replace-unused`)
2. ✅ You've tested the application after replacement
3. ✅ You've committed your changes
4. ✅ You understand that this is **irreversible** (unless you restore from backup)

## What This Script Does

1. **Identifies truly unused keys** - Keys not found anywhere in the codebase
2. **Creates automatic backup** - Saves all translation files to `translation-backups/`
3. **Removes unused keys** - Deletes them from all language files (en, ps, fa, ar)
4. **Preserves structure** - Keeps the nested object structure intact

## Usage

### Step 1: Review Unused Keys

First, check which keys will be removed:

```bash
cd frontend
npm run i18n:coverage:excel
```

Open the Excel report and review the "Unused Keys" sheet.

### Step 2: Run the Removal Script

```bash
npm run i18n:remove-unused
```

The script will:
- Show you how many unused keys it found
- Display sample unused keys
- Create a backup automatically
- Remove unused keys from all translation files
- Show you the backup location

### Step 3: Regenerate types.ts

After removal, regenerate the types file:

```bash
npm run i18n:keys:generate
```

This ensures `types.ts` matches the actual translation files.

### Step 4: Test the Application

```bash
npm run dev
```

Check that:
- All pages load correctly
- No translation errors in console
- All text displays properly

### Step 5: Format Files

The script uses JSON formatting. Run Prettier to fix formatting:

```bash
npm run format
```

### Step 6: Verify Coverage

```bash
npm run i18n:coverage:excel
```

Check that:
- Unused keys count decreased
- All used keys are still present
- No missing translations

## Restoring from Backup

If something goes wrong, restore from backup:

```bash
# Find the backup directory
ls translation-backups/

# Restore files (replace YYYY-MM-DD with actual date)
cp translation-backups/backup-YYYY-MM-DD/* frontend/src/lib/translations/
```

## What Gets Removed

The script removes keys that:
- ✅ Are defined in `types.ts`
- ✅ Are NOT used anywhere in the codebase
- ✅ Are NOT in navigation items
- ✅ Are NOT in validation helpers

## What Stays

The script keeps keys that:
- ✅ Are used in the codebase (even if marked unused in Excel)
- ✅ Are used in navigation (via `titleKey`)
- ✅ Are used in validation helpers
- ✅ Are used in toast messages

## Example Output

```
🗑️  Removing unused translation keys...

📖 Extracting all keys from types.ts...
   Found 6355 total keys

🔎 Scanning codebase for used keys...
   Found 4747 used keys

📊 Analysis:
   Total keys: 6355
   Used keys: 4747
   Unused keys: 1608

📋 Sample unused keys (first 20):
   - aboutUs.cta.button
   - aboutUs.cta.text
   - aboutUs.mission.title
   ... and 1588 more

💾 Creating backup...
   Backup created: translation-backups/backup-2026-01-05

⚠️  This will remove 1608 unused keys from all translation files.
   Backup has been created.

🗑️  Removing unused keys from translation files...
   Processing EN...
   ✓ EN cleaned
   Processing PS...
   ✓ PS cleaned
   Processing FA...
   ✓ FA cleaned
   Processing AR...
   ✓ AR cleaned

✅ Removal complete!
   Removed 1608 unused keys from all translation files
   Backup location: translation-backups/backup-2026-01-05
```

## After Removal

1. **Regenerate types.ts**: `npm run i18n:keys:generate`
2. **Format files**: `npm run format`
3. **Test application**: `npm run dev`
4. **Verify coverage**: `npm run i18n:coverage:excel`
5. **Commit changes**: `git add . && git commit -m "Remove unused translation keys"`

## Safety Features

1. **Automatic backup** - Always creates backup before removal
2. **Shows samples** - Displays unused keys before removal
3. **Countdown** - 3-second delay before processing
4. **Preserves structure** - Keeps nested object structure
5. **Reversible** - Can restore from backup if needed

## Troubleshooting

### Issue: Some keys still appear as unused after removal

This might mean:
1. The keys are in `types.ts` but not in translation files (drift)
2. Run `npm run i18n:keys:generate` to sync types.ts

### Issue: Application breaks after removal

1. Check console for missing key errors
2. Restore from backup
3. Review which keys were removed
4. Check if any keys were incorrectly marked as unused

### Issue: Formatting is broken

Run Prettier to fix:
```bash
npm run format
```

## Next Steps

After successful removal:
1. ✅ Regenerate types.ts
2. ✅ Format files
3. ✅ Test application
4. ✅ Commit changes
5. ✅ Update documentation if needed

