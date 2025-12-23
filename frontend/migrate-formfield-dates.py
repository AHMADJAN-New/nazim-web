#!/usr/bin/env python3
"""
Migrate FormField components with type="date" Input to CalendarFormField
Handles the pattern:
  <FormField control={...} name="..." render={({ field }) => (
    <FormItem>
      <FormLabel>...</FormLabel>
      <FormControl>
        <Input type="date" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
"""

import re
import os
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-formfield-dates-backup-{timestamp}'
    print(f"📦 Creating backup: {backup_dir}")

    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def add_calendar_form_field_import(content):
    """Add CalendarFormField import if not present"""
    if 'CalendarFormField' in content:
        return content, False

    lines = content.split('\n')

    # Find the last import from @/components/ui/
    last_ui_import = -1
    for i, line in enumerate(lines):
        if "from '@/components/ui/" in line or 'from "@/components/ui/' in line:
            last_ui_import = i

    if last_ui_import >= 0:
        lines.insert(last_ui_import + 1, "import { CalendarFormField } from '@/components/ui/calendar-form-field';")
    else:
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                lines.insert(i + 1, "import { CalendarFormField } from '@/components/ui/calendar-form-field';")
                break

    return '\n'.join(lines), True

def migrate_formfield_dates(content):
    """Migrate FormField components with type="date" Input to CalendarFormField"""
    changes = 0

    # Pattern to match FormField with date input
    # This matches the full FormField block including nested components
    pattern = r'<FormField\s+control=\{([^}]+)\}\s+name="([^"]+)"\s+render=\{\(\{\s*field\s*\}\)\s*=>\s*\(\s*<FormItem>\s*<FormLabel>([^<]+)</FormLabel>\s*<FormControl>\s*<Input\s+type="date"\s+\{\.\.\.field\}\s*/>\s*</FormControl>\s*<FormMessage\s*/>\s*</FormItem>\s*\)\}\s*/>'

    def replace_formfield(match):
        nonlocal changes
        control = match.group(1)
        name = match.group(2)
        label = match.group(3)

        # Build CalendarFormField replacement
        replacement = f'<CalendarFormField control={{{control}}} name="{name}" label={{{label}}} />'

        changes += 1
        return replacement

    new_content = re.sub(pattern, replace_formfield, content, flags=re.MULTILINE | re.DOTALL)

    # Also handle variant with value and onChange instead of {...field}
    pattern2 = r'<FormField\s+control=\{([^}]+)\}\s+name="([^"]+)"\s+render=\{\(\{\s*field\s*\}\)\s*=>\s*\(\s*<FormItem>\s*<FormLabel>([^<]+)</FormLabel>\s*<FormControl>\s*<Input\s+type="date"\s+value=\{field\.value\s*\?\?\s*[\'"]{2}\}\s+onChange=\{field\.onChange\}\s*/>\s*</FormControl>\s*<FormMessage\s*/>\s*</FormItem>\s*\)\}\s*/>'

    def replace_formfield2(match):
        nonlocal changes
        control = match.group(1)
        name = match.group(2)
        label = match.group(3)

        replacement = f'<CalendarFormField control={{{control}}} name="{name}" label={{{label}}} />'

        changes += 1
        return replacement

    new_content = re.sub(pattern2, replace_formfield2, new_content, flags=re.MULTILINE | re.DOTALL)

    # Handle multi-line variants (more flexible pattern)
    # Match FormField opening tag
    formfield_pattern = r'<FormField\s+control=\{([^}]+)\}\s+name="([^"]+)"\s+render=\{[^}]+\}\s*=>\s*\([^)]*<FormItem>[^<]*<FormLabel>([^<]+)</FormLabel>[^<]*<FormControl>[^<]*<Input[^>]*type="date"[^>]*/>[\s\S]*?</FormField>'

    def replace_multiline_formfield(match):
        nonlocal changes
        full_block = match.group(0)

        # Extract control, name, and label
        control_match = re.search(r'control=\{([^}]+)\}', full_block)
        name_match = re.search(r'name="([^"]+)"', full_block)
        label_match = re.search(r'<FormLabel>([^<]+)</FormLabel>', full_block)

        if not (control_match and name_match and label_match):
            return full_block

        control = control_match.group(1)
        name = name_match.group(1)
        label = label_match.group(1)

        # Check if it's actually a date input
        if 'type="date"' not in full_block:
            return full_block

        replacement = f'<CalendarFormField control={{{control}}} name="{name}" label={{{label}}} />'

        changes += 1
        return replacement

    new_content = re.sub(formfield_pattern, replace_multiline_formfield, new_content, flags=re.MULTILINE | re.DOTALL)

    return new_content, changes

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if no FormField with date input
        if 'type="date"' not in content or 'FormField' not in content:
            return 0

        # Migrate FormField date inputs
        new_content, changes = migrate_formfield_dates(content)

        if changes > 0:
            # Add import
            new_content, _ = add_calendar_form_field_import(new_content)

            # Write back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            return changes

        return 0

    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return 0

def main():
    print("=" * 70)
    print("FormField Date Migration - Convert to CalendarFormField")
    print("=" * 70)
    print()

    src_dir = '/home/user/nazim-web/frontend/src'
    os.chdir(src_dir)

    backup_dir = create_backup(src_dir)

    print("🔄 Scanning and migrating...\n")

    total_files = 0
    total_changes = 0
    migrated_files = []

    for directory in ['pages', 'components']:
        if not os.path.exists(directory):
            continue

        for file_path in Path(directory).rglob('*.tsx'):
            changes = process_file(file_path)
            if changes > 0:
                rel_path = str(file_path)
                migrated_files.append((rel_path, changes))
                total_files += 1
                total_changes += changes

    # Print results
    print("\n" + "=" * 70)
    print("✅ Migration Complete!")
    print("=" * 70)

    if migrated_files:
        print(f"\n📝 Migrated files:")
        for file_path, count in sorted(migrated_files):
            print(f"   ✓ {file_path}: {count} FormField(s)")

    print(f"\n📊 Summary:")
    print(f"   Files migrated: {total_files}")
    print(f"   Total changes: {total_changes}")
    print(f"   Backup location: {backup_dir}\n")

if __name__ == '__main__':
    main()
