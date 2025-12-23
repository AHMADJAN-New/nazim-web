#!/usr/bin/env python3
"""
Automated Date Formatting Migration Script
Converts date-fns format() and toLocaleDateString() calls to use calendar-aware formatters
"""

import re
import os
import sys
from pathlib import Path
from datetime import datetime
import shutil

def create_backup(src_dir):
    """Create a backup of the source directory"""
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = f'/tmp/nazim-date-migration-backup-{timestamp}'
    print(f"📦 Creating backup at: {backup_dir}")

    # Copy pages and components
    for subdir in ['pages', 'components']:
        src = os.path.join(src_dir, subdir)
        dst = os.path.join(backup_dir, subdir)
        if os.path.exists(src):
            shutil.copytree(src, dst)

    print(f"✅ Backup created\n")
    return backup_dir

def has_import(content, module_path):
    """Check if file imports from a specific module"""
    pattern = rf"from ['\"]{re.escape(module_path)}['\"]"
    return bool(re.search(pattern, content))

def has_named_import(content, name, module_path):
    """Check if a specific named import exists"""
    # Match: import { xxx, formatDate, yyy } from '@/lib/utils'
    pattern = rf"import\s+{{[^}}]*\b{re.escape(name)}\b[^}}]*}}\s+from\s+['\"]{re.escape(module_path)}['\"]"
    return bool(re.search(pattern, content))

def add_utils_import(content):
    """Add import statement for formatDate and formatDateTime"""
    if has_import(content, '@/lib/utils'):
        # Add to existing import
        if not has_named_import(content, 'formatDate', '@/lib/utils'):
            # Find the import and add formatDate, formatDateTime
            pattern = r"(import\s+{)([^}]+)(}\s+from\s+['\"]@/lib/utils['\"])"
            replacement = r"\1 formatDate, formatDateTime,\2\3"
            content = re.sub(pattern, replacement, content, count=1)
    else:
        # Add new import after first import statement
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                lines.insert(i + 1, "import { formatDate, formatDateTime } from '@/lib/utils';")
                break
        content = '\n'.join(lines)

    return content

def remove_datefns_format_import(content):
    """Remove format import from date-fns if not used elsewhere"""
    # Check if format is still used (not as formatDate or formatDateTime)
    if re.search(r'\bformat\s*\((?!Date)', content):
        return content  # Still used, keep import

    # Remove from import { format } from 'date-fns'
    content = re.sub(r"import\s+{\s*format\s*}\s+from\s+['\"]date-fns['\"]\s*;?\s*\n?", '', content)

    # Remove from import { format, other } from 'date-fns'
    content = re.sub(r"(import\s+{[^}]*),\s*format\s*([^}]*}\s+from\s+['\"]date-fns['\"])", r"\1\2", content)
    content = re.sub(r"(import\s+{)\s*format\s*,\s*([^}]+}\s+from\s+['\"]date-fns['\"])", r"\1 \2", content)

    return content

def migrate_format_calls(content):
    """Replace format(new Date(...), 'pattern') with formatDate(...)"""
    changes = 0

    # Pattern: format(new Date(something), 'any pattern')
    # Replace with: formatDate(something)
    patterns = [
        (r"format\(new Date\(([^)]+)\),\s*['\"`][^'\"`]*['\"`]\)", r"formatDate(\1)"),
        (r"format\(new Date\(([^)]+)\),\s*['\"`][^'\"`]*['\"`],\s*\{[^}]*\}\)", r"formatDate(\1)"),
    ]

    for pattern, replacement in patterns:
        content, count = re.subn(pattern, replacement, content)
        changes += count

    return content, changes

def migrate_tolocalestring(content):
    """Replace .toLocaleDateString() and .toLocaleString() calls"""
    changes = 0

    # Pattern: new Date(something).toLocaleDateString(...)
    patterns = [
        (r"new Date\(([^)]+)\)\.toLocaleDateString\([^)]*\)", r"formatDate(\1)"),
        (r"new Date\(([^)]+)\)\.toLocaleString\([^)]*\)", r"formatDateTime(\1)"),
        # Pattern: variable.toLocaleDateString(...)
        (r"(\w+)\.toLocaleDateString\([^)]*\)", r"formatDate(\1)"),
        (r"(\w+)\.toLocaleString\([^)]*\)", r"formatDateTime(\1)"),
    ]

    for pattern, replacement in patterns:
        content, count = re.subn(pattern, replacement, content)
        changes += count

    return content, changes

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        content = original_content
        total_changes = 0

        # Apply migrations
        content, changes1 = migrate_format_calls(content)
        total_changes += changes1

        content, changes2 = migrate_tolocalestring(content)
        total_changes += changes2

        # If changes were made, update imports
        if total_changes > 0:
            content = add_utils_import(content)
            content = remove_datefns_format_import(content)

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
    print("Date Formatting Migration Script (Python)")
    print("=" * 50)
    print()

    # Change to src directory
    src_dir = '/home/user/nazim-web/frontend/src'
    os.chdir(src_dir)

    # Create backup
    backup_dir = create_backup(src_dir)

    # Process files
    print("🔄 Processing files...")
    print()

    total_files = 0
    total_changes = 0

    # Process pages and components
    for directory in ['pages', 'components']:
        if not os.path.exists(directory):
            continue

        for file_path in Path(directory).rglob('*.tsx'):
            # Read file to check if it needs processing
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Check if file needs migration
                if re.search(r'format\(new Date|toLocaleDateString\(\)|toLocaleString\(\)', content):
                    changes = process_file(file_path)
                    if changes > 0:
                        print(f"✅ Updated: {file_path} ({changes} changes)")
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
    print(f"  Total changes: {total_changes}")
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
