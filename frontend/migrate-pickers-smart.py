#!/usr/bin/env python3
"""
Smart Date Picker Migration Script
Handles string-based date state properly
"""

import re
import os
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    """Create backup"""
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-picker-smart-backup-{timestamp}'
    print(f"📦 Creating backup at: {backup_dir}")

    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def add_imports(content):
    """Add necessary imports"""
    needs_picker = 'CalendarDatePicker' not in content

    if not needs_picker:
        return content, False

    lines = content.split('\n')
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

def convert_string_to_date_helper(content, state_var):
    """Add helper function to convert string to Date"""
    helper_name = f'{state_var}Date'

    # Check if already exists
    if helper_name in content:
        return content, helper_name, False

    # Find the state declaration
    state_pattern = rf'const\s+\[{state_var},\s*set\w+\]\s*=\s*useState'
    match = re.search(state_pattern, content)

    if not match:
        return content, helper_name, False

    # Add conversion after the useState
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if state_var in line and 'useState' in line:
            # Add helper after this line
            indent = '  '
            helper = f'{indent}const {helper_name} = {state_var} ? new Date({state_var}) : undefined;'
            lines.insert(i + 1, helper)
            break

    return '\n'.join(lines), helper_name, True

def migrate_date_input(content):
    """Migrate date inputs to CalendarDatePicker"""
    changes = 0

    # Pattern: <Input type="date" value={xxx} onChange={e => setXxx(e.target.value)} />
    pattern = r'<Input\s+type="date"\s+value=\{([^}]+)\}\s+onChange=\{(?:e|event)\s*=>\s*(set\w+)\((?:e|event)\.target\.value\)\}\s*/>'

    def replace_input(match):
        nonlocal changes
        value_var = match.group(1)
        setter = match.group(2)

        # Create the replacement
        replacement = f'<CalendarDatePicker date={{{value_var} ? new Date({value_var}) : undefined}} onDateChange={{(date) => {setter}(date ? date.toISOString().split("T")[0] : "")}} placeholder="Select date" />'
        changes += 1
        return replacement

    content = re.sub(pattern, replace_input, content)

    # Pattern with newlines
    pattern2 = r'<Input\s+type="date"\s+value=\{([^}]+)\}\s+onChange=\{(?:e|event)\s*=>\s*(set\w+)\((?:e|event)\.target\.value\)\}\s*/>'
    content = re.sub(pattern2, replace_input, content, flags=re.MULTILINE)

    # Pattern: Multi-line Input
    pattern3 = r'<Input\s*\n?\s*type="date"\s*\n?\s*value=\{([^}]+)\}\s*\n?\s*onChange=\{(?:e|event)\s*=>\s*(set\w+)\((?:e|event)\.target\.value\)\}\s*\n?\s*/>'
    content = re.sub(pattern3, replace_input, content, flags=re.DOTALL)

    return content, changes

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        if 'type="date"' not in original_content:
            return 0

        content = original_content

        # Migrate inputs
        content, changes = migrate_date_input(content)

        if changes > 0:
            # Add imports
            content, _ = add_imports(content)

            # Write back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return changes

        return 0

    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return 0

def main():
    """Main migration"""
    print("=" * 60)
    print("Smart Date Picker Migration")
    print("=" * 60)
    print()

    src_dir = '/home/user/nazim-web/frontend/src'
    os.chdir(src_dir)

    backup_dir = create_backup(src_dir)

    print("🔄 Processing files...")
    print()

    total_files = 0
    total_changes = 0

    for directory in ['pages', 'components']:
        if not os.path.exists(directory):
            continue

        for file_path in Path(directory).rglob('*.tsx'):
            try:
                changes = process_file(file_path)
                if changes > 0:
                    print(f"✅ Updated: {file_path} ({changes} pickers)")
                    total_files += 1
                    total_changes += changes
            except Exception as e:
                print(f"⚠️  Error: {file_path}: {e}")

    print()
    print("=" * 60)
    print("✅ Migration Complete!")
    print("=" * 60)
    print()
    print(f"Files updated: {total_files}")
    print(f"Pickers migrated: {total_changes}")
    print(f"Backup: {backup_dir}")
    print()

if __name__ == '__main__':
    main()
