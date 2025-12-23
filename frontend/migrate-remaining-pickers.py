#!/usr/bin/env python3
"""
Final comprehensive date picker migration
Handles all remaining type="date" inputs with {...register()} patterns
"""

import re
import os
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-remaining-pickers-backup-{timestamp}'
    print(f"📦 Creating backup: {backup_dir}")

    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def extract_control_var(content):
    """Extract the control variable from useForm hook"""
    # Look for: const { register, handleSubmit, control, ... } = useForm
    control_match = re.search(r'const\s*\{[^}]*\bcontrol\b[^}]*\}\s*=\s*useForm', content)
    if control_match:
        return 'control'

    # Look for: const form = useForm
    form_match = re.search(r'const\s+(\w+)\s*=\s*useForm', content)
    if form_match:
        return f'{form_match.group(1)}.control'

    return 'form.control'

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
        # Insert after the last UI component import
        lines.insert(last_ui_import + 1, "import { CalendarFormField } from '@/components/ui/calendar-form-field';")
    else:
        # Find any import line and insert after it
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                lines.insert(i + 1, "import { CalendarFormField } from '@/components/ui/calendar-form-field';")
                break

    return '\n'.join(lines), True

def extract_label_for_field(content, field_name, input_match):
    """Try to extract label text for a field"""
    # Look for <Label htmlFor="field_name">Text</Label> before the input
    label_pattern = rf'<Label[^>]*(?:htmlFor=["\']?{field_name}["\']?)?[^>]*>([^<]+)</Label>'

    # Search in the 500 characters before the input
    match_pos = input_match.start()
    search_start = max(0, match_pos - 500)
    search_text = content[search_start:match_pos]

    label_match = re.search(label_pattern, search_text)
    if label_match:
        return label_match.group(1).strip()

    # Fallback: convert field_name to readable label
    return field_name.replace('_', ' ').replace('-', ' ').title()

def migrate_register_date_inputs(content, file_path):
    """Migrate <Input type="date" {...register('field')} /> to CalendarFormField"""
    changes = 0

    # Extract control variable
    control_var = extract_control_var(content)

    # Pattern to match: <Input ... type="date" ... {...register('field_name')} ... />
    # This pattern handles various attribute orderings and optional attributes
    pattern = r'<Input\s+([^>]*type="date"[^>]*\{\.\.\.register\([\'"]([^\'"]+)[\'"]\)[^}]*\}[^>]*)(?:/>|></Input>)'

    def replace_input(match):
        nonlocal changes
        full_attrs = match.group(1)
        field_name = match.group(2)

        # Extract label
        label = extract_label_for_field(content, field_name, match)

        # Extract optional attributes if present
        required = 'required' in full_attrs.lower()
        disabled_match = re.search(r'disabled(?:=\{([^}]+)\})?', full_attrs)
        disabled = ''
        if disabled_match:
            if disabled_match.group(1):
                disabled = f' disabled={{{disabled_match.group(1)}}}'
            else:
                disabled = ' disabled'

        # Build CalendarFormField replacement
        replacement = f'<CalendarFormField control={{{control_var}}} name="{field_name}" label="{label}"{" required" if required else ""}{disabled} />'

        changes += 1
        return replacement

    new_content = re.sub(pattern, replace_input, content, flags=re.MULTILINE | re.DOTALL)

    return new_content, changes

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if no date inputs with register
        if 'type="date"' not in content or '{...register(' not in content:
            return 0

        # Migrate date inputs
        new_content, changes = migrate_register_date_inputs(content, file_path)

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
        return 0

def main():
    print("=" * 70)
    print("Final Date Picker Migration - Remaining type=\"date\" with {...register()}")
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
            print(f"   ✓ {file_path}: {count} input(s)")

    print(f"\n📊 Summary:")
    print(f"   Files migrated: {total_files}")
    print(f"   Total changes: {total_changes}")
    print(f"   Backup location: {backup_dir}\n")

if __name__ == '__main__':
    main()
