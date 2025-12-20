#!/usr/bin/env python3
"""
Migrate remaining multi-line date inputs with value/onChange to CalendarDatePicker
Handles patterns like:
  <Input
    type="date"
    value={someValue}
    onChange={(e) => handler(e.target.value)}
  />
"""

import re
import os
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-final-dates-backup-{timestamp}'
    print(f"📦 Creating backup: {backup_dir}")

    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def add_calendar_date_picker_import(content):
    """Add CalendarDatePicker import if not present"""
    if 'CalendarDatePicker' in content:
        return content, False

    lines = content.split('\n')

    # Find the last import from @/components/ui/
    last_ui_import = -1
    for i, line in enumerate(lines):
        if "from '@/components/ui/" in line or 'from "@/components/ui/' in line:
            last_ui_import = i

    if last_ui_import >= 0:
        lines.insert(last_ui_import + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
    else:
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                lines.insert(i + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
                break

    return '\n'.join(lines), True

def migrate_multiline_date_inputs(content):
    """Migrate multi-line <Input type="date" .../> to CalendarDatePicker"""
    changes = 0

    # Pattern for multi-line Input with type="date"
    # Matches:
    #   <Input
    #     type="date"
    #     value={...}
    #     onChange={...}
    #     ... other props ...
    #   />
    # More flexible pattern that handles attributes on same or new lines
    pattern = r'<Input\s+type="date"\s*\n([^>]+?)(?:/>|></Input>)'

    def replace_input(match):
        nonlocal changes
        props_text = match.group(1)

        # Extract value
        value_match = re.search(r'value=\{([^}]+)\}', props_text)
        if not value_match:
            return match.group(0)
        value_expr = value_match.group(1)

        # Extract onChange handler
        onchange_match = re.search(r'onChange=\{([^}]+)\}', props_text)
        if not onchange_match:
            return match.group(0)
        onchange_expr = onchange_match.group(1)

        # Extract the handler expression from onChange
        # Pattern: (e) => handler(e.target.value) or (e) => handler(arg, e.target.value)
        handler_match = re.search(r'\((?:e|event)\)\s*=>\s*(.+)', onchange_expr)
        if not handler_match:
            return match.group(0)
        handler_body = handler_match.group(1)

        # Replace e.target.value with date conversion
        new_handler = handler_body.replace('e.target.value', 'date ? date.toISOString().slice(0, 10) : \'\'')
        new_handler = new_handler.replace('event.target.value', 'date ? date.toISOString().slice(0, 10) : \'\'')

        # Extract optional props
        disabled_match = re.search(r'disabled=\{([^}]+)\}', props_text)
        disabled = f' disabled={{{disabled_match.group(1)}}}' if disabled_match else ''

        className_match = re.search(r'className="([^"]+)"', props_text)
        className = f' className="{className_match.group(1)}"' if className_match else ''

        min_match = re.search(r'min=\{([^}]+)\}', props_text)
        min_date = ''
        if min_match:
            min_expr = min_match.group(1)
            # Convert min date expression
            min_date = f' minDate={{{min_expr} ? new Date({min_expr}) : undefined}}'

        max_match = re.search(r'max=\{([^}]+)\}', props_text)
        max_date = ''
        if max_match:
            max_expr = max_match.group(1)
            max_date = f' maxDate={{{max_expr} ? new Date({max_expr}) : undefined}}'

        # Build CalendarDatePicker replacement
        replacement = f'<CalendarDatePicker date={{{value_expr} ? new Date({value_expr}) : undefined}} onDateChange={{(date) => {new_handler}}}{disabled}{className}{min_date}{max_date} />'

        changes += 1
        return replacement

    new_content = re.sub(pattern, replace_input, content, flags=re.MULTILINE | re.DOTALL)

    return new_content, changes

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if no multi-line date inputs
        if 'type="date"' not in content:
            return 0

        # Migrate multi-line date inputs
        new_content, changes = migrate_multiline_date_inputs(content)

        if changes > 0:
            # Add import
            new_content, _ = add_calendar_date_picker_import(new_content)

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
    print("Final Multi-line Date Input Migration")
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
