#!/usr/bin/env python3
"""
Automated Date Picker Migration Script
Converts native <input type="date"> to CalendarDatePicker components
"""

import re
import os
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    """Create a backup of the source directory"""
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-picker-migration-backup-{timestamp}'
    print(f"📦 Creating backup at: {backup_dir}")

    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def has_import(content, component_name):
    """Check if file imports a specific component"""
    pattern = rf"import\s+{{[^}}]*\b{re.escape(component_name)}\b[^}}]*}}"
    return bool(re.search(pattern, content))

def add_date_picker_import(content):
    """Add CalendarDatePicker import"""
    if has_import(content, 'CalendarDatePicker'):
        return content, False

    # Find the last import from @/components/ui and add after it
    lines = content.split('\n')
    last_ui_import = -1

    for i, line in enumerate(lines):
        if "from '@/components/ui/" in line or 'from "@/components/ui/' in line:
            last_ui_import = i

    if last_ui_import >= 0:
        # Add after last UI import
        lines.insert(last_ui_import + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
    else:
        # Add after first import
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                lines.insert(i + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
                break

    return '\n'.join(lines), True

def migrate_date_inputs(content):
    """Migrate <input type="date"> to CalendarDatePicker"""
    changes = 0

    # Pattern 1: Simple input with value and onChange
    # <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
    # to: <CalendarDatePicker date={date} onDateChange={setDate} />

    # Match: type="date" with various attributes
    pattern1 = r'<Input\s+([^>]*?)type="date"([^>]*?)/?>'
    matches = list(re.finditer(pattern1, content, re.DOTALL))

    for match in reversed(matches):  # Reverse to maintain positions
        full_match = match.group(0)
        before_type = match.group(1)
        after_type = match.group(2)

        # Extract attributes
        all_attrs = before_type + after_type

        # Extract value attribute
        value_match = re.search(r'value=\{([^}]+)\}', all_attrs)
        date_var = value_match.group(1) if value_match else None

        # Extract onChange
        onchange_match = re.search(r'onChange=\{(?:\([^)]*\)\s*=>\s*)?([^}(]+)(?:\([^)]*\))?\}', all_attrs)
        setter = None
        if onchange_match:
            # Try to extract the setter function
            onchange_content = onchange_match.group(1)
            # Look for setXxx pattern
            setter_match = re.search(r'(set\w+)', onchange_content)
            if setter_match:
                setter = setter_match.group(1)

        # Extract placeholder
        placeholder_match = re.search(r'placeholder="([^"]+)"', all_attrs)
        placeholder = placeholder_match.group(1) if placeholder_match else 'Select date'

        # Extract disabled
        disabled_match = re.search(r'disabled(?:=\{([^}]+)\})?', all_attrs)
        disabled = disabled_match.group(1) if disabled_match and disabled_match.group(1) else 'false'

        # Extract className
        classname_match = re.search(r'className="([^"]+)"', all_attrs)
        classname = classname_match.group(1) if classname_match else None

        # Build replacement
        if date_var and setter:
            replacement = f'<CalendarDatePicker date={{{date_var}}} onDateChange={{{setter}}} placeholder="{placeholder}"'
            if disabled != 'false':
                replacement += f' disabled={{{disabled}}}'
            if classname:
                replacement += f' className="{classname}"'
            replacement += ' />'

            content = content[:match.start()] + replacement + content[match.end():]
            changes += 1

    # Pattern 2: lowercase input
    pattern2 = r'<input\s+([^>]*?)type="date"([^>]*?)/?>'
    matches = list(re.finditer(pattern2, content, re.DOTALL))

    for match in reversed(matches):
        full_match = match.group(0)
        before_type = match.group(1)
        after_type = match.group(2)

        all_attrs = before_type + after_type

        # Extract value
        value_match = re.search(r'value=\{([^}]+)\}', all_attrs)
        date_var = value_match.group(1) if value_match else None

        # Extract onChange
        onchange_match = re.search(r'onChange=\{(?:\([^)]*\)\s*=>\s*)?([^}(]+)(?:\([^)]*\))?\}', all_attrs)
        setter = None
        if onchange_match:
            onchange_content = onchange_match.group(1)
            setter_match = re.search(r'(set\w+)', onchange_content)
            if setter_match:
                setter = setter_match.group(1)

        # Extract placeholder
        placeholder_match = re.search(r'placeholder="([^"]+)"', all_attrs)
        placeholder = placeholder_match.group(1) if placeholder_match else 'Select date'

        # Build replacement
        if date_var and setter:
            replacement = f'<CalendarDatePicker date={{{date_var}}} onDateChange={{{setter}}} placeholder="{placeholder}" />'
            content = content[:match.start()] + replacement + content[match.end():]
            changes += 1

    return content, changes

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        content = original_content
        total_changes = 0

        # Check if file has date inputs
        if not re.search(r'type="date"', content):
            return 0

        # Migrate date inputs
        content, changes = migrate_date_inputs(content)
        total_changes += changes

        # Add import if changes were made
        if total_changes > 0:
            content, import_added = add_date_picker_import(content)

            # Write back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return total_changes

        return 0

    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return 0

def main():
    """Main migration function"""
    print("=" * 50)
    print("Date Picker Migration Script")
    print("=" * 50)
    print()

    src_dir = '/home/user/nazim-web/frontend/src'
    os.chdir(src_dir)

    # Create backup
    backup_dir = create_backup(src_dir)

    print("🔄 Processing files...")
    print()

    total_files = 0
    total_changes = 0

    # Process pages and components
    for directory in ['pages', 'components']:
        if not os.path.exists(directory):
            continue

        for file_path in Path(directory).rglob('*.tsx'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                if 'type="date"' in content:
                    changes = process_file(file_path)
                    if changes > 0:
                        print(f"✅ Updated: {file_path} ({changes} pickers)")
                        total_files += 1
                        total_changes += changes

            except Exception as e:
                print(f"⚠️  Skipped {file_path}: {e}")

    # Summary
    print()
    print("=" * 50)
    print("✅ Migration Complete!")
    print("=" * 50)
    print()
    print(f"📊 Summary:")
    print(f"  Files updated: {total_files}")
    print(f"  Date pickers migrated: {total_changes}")
    print(f"  Backup: {backup_dir}")
    print()
    print("🧪 Next steps:")
    print("  1. Review: git diff")
    print("  2. Test: npm run build")
    print("  3. Run: npm run dev")
    print(f"  4. Restore if needed: cp -r {backup_dir}/* {src_dir}/")
    print()

if __name__ == '__main__':
    main()
