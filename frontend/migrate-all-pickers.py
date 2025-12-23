#!/usr/bin/env python3
"""
Comprehensive Date Picker Migration
Handles all patterns including multi-line and complex onChange handlers
"""

import re
import os
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-all-pickers-backup-{timestamp}'
    print(f"📦 Backup: {backup_dir}")

    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def add_imports(content):
    if 'CalendarDatePicker' in content:
        return content, False

    lines = content.split('\n')
    last_ui_import = -1

    for i, line in enumerate(lines):
        if "from '@/components/ui/" in line:
            last_ui_import = i

    if last_ui_import >= 0:
        lines.insert(last_ui_import + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
    else:
        for i, line in enumerate(lines):
            if 'import ' in line:
                lines.insert(i + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
                break

    return '\n'.join(lines), True

def migrate_all_patterns(content):
    """Migrate all date input patterns"""
    changes = 0

    # Pattern 1: Simple onChange with setter
    # <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
    pattern1 = r'<Input\s+type="date"\s+value=\{([^}]+)\}\s+onChange=\{(?:e|event)\s*=>\s*(set\w+)\((?:e|event)\.target\.value\)\}\s*/>'

    def replace1(m):
        nonlocal changes
        val, setter = m.groups()
        changes += 1
        return f'<CalendarDatePicker date={{{val} ? new Date({val}) : undefined}} onDateChange={{(date) => {setter}(date ? date.toISOString().split("T")[0] : "")}} />'

    content = re.sub(pattern1, replace1, content)

    # Pattern 2: Multi-line with function call onChange
    # type="date"
    # value={filters.dateFrom}
    # onChange={(e) => handleFilterChange('dateFrom', e.target.value)}

    pattern2 = r'<Input\s*\n\s*type="date"\s*\n\s*value=\{([^}]+)\}\s*\n\s*onChange=\{\((?:e|event)\)\s*=>\s*(\w+)\(([^,]+),\s*(?:e|event)\.target\.value\)\}\s*\n\s*/>'

    def replace2(m):
        nonlocal changes
        val, func, arg = m.groups()
        changes += 1
        return f'<CalendarDatePicker date={{{val} ? new Date({val}) : undefined}} onDateChange={{(date) => {func}({arg}, date ? date.toISOString().split("T")[0] : "")}} />'

    content = re.sub(pattern2, replace2, content, flags=re.MULTILINE)

    # Pattern 3: More flexible multi-line
    pattern3 = r'<Input[^>]*type="date"[^>]*value=\{([^}]+)\}[^>]*onChange=\{(?:\((?:e|event)\)\s*=>)?\s*([^}]+)\}[^>]*/>'

    def replace3(m):
        nonlocal changes
        val = m.group(1)
        onchange = m.group(2)

        # Try to extract the setter or handler
        setter_match = re.search(r'(set\w+)\((?:e|event)\.target\.value\)', onchange)
        handler_match = re.search(r'(\w+)\(([^,]+),\s*(?:e|event)\.target\.value\)', onchange)

        if setter_match:
            setter = setter_match.group(1)
            changes += 1
            return f'<CalendarDatePicker date={{{val} ? new Date({val}) : undefined}} onDateChange={{(date) => {setter}(date ? date.toISOString().split("T")[0] : "")}} />'
        elif handler_match:
            func = handler_match.group(1)
            arg = handler_match.group(2)
            changes += 1
            return f'<CalendarDatePicker date={{{val} ? new Date({val}) : undefined}} onDateChange={{(date) => {func}({arg}, date ? date.toISOString().split("T")[0] : "")}} />'

        return m.group(0)  # Return unchanged if pattern doesn't match

    content = re.sub(pattern3, replace3, content, flags=re.DOTALL)

    return content, changes

def process_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'type="date"' not in content:
            return 0

        original = content
        content, changes = migrate_all_patterns(content)

        if changes > 0:
            content, _ = add_imports(content)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return changes

        return 0

    except Exception as e:
        print(f"❌ {file_path}: {e}")
        return 0

def main():
    print("=" * 60)
    print("Comprehensive Date Picker Migration")
    print("=" * 60)
    print()

    src_dir = '/home/user/nazim-web/frontend/src'
    os.chdir(src_dir)

    backup_dir = create_backup(src_dir)

    print("🔄 Migrating...")
    print()

    total_files = 0
    total_changes = 0

    for directory in ['pages', 'components']:
        if not os.path.exists(directory):
            continue

        for file_path in Path(directory).rglob('*.tsx'):
            changes = process_file(file_path)
            if changes > 0:
                rel_path = str(file_path).replace('pages/', '').replace('components/', '')
                print(f"✅ {rel_path}: {changes} pickers")
                total_files += 1
                total_changes += changes

    print()
    print("=" * 60)
    print("✅ Complete!")
    print("=" * 60)
    print(f"\nFiles: {total_files} | Pickers: {total_changes}")
    print(f"Backup: {backup_dir}\n")

if __name__ == '__main__':
    main()
