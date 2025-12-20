#!/usr/bin/env python3
import re, os
from pathlib import Path
from datetime import datetime

def process_file(path):
    with open(path) as f:
        content = f.read()
    
    if 'type="date"' not in content or '{...register(' not in content:
        return 0, content
    
    changes = 0
    
    # Add import if needed
    if 'CalendarFormField' not in content:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "from '@/components/ui/" in line:
                lines.insert(i + 1, "import { CalendarFormField } from '@/components/ui/calendar-form-field';")
                break
        content = '\n'.join(lines)
    
    # Find all form contexts to get control variable
    control_var = 'form.control'
    control_match = re.search(r'const\s+(\w+)\s*=\s*useForm', content)
    if control_match:
        control_var = f'{control_match.group(1)}.control'
    
    # Pattern: <Input ... type="date" ... {...register('field_name')} />
    pattern = r'<Input\s+[^>]*type="date"[^>]*\{{\.\.\.register\([\'"]([^\'"]+)[\'"]\)[^}]*\}}[^>]*/>'
    
    def replace(m):
        nonlocal changes
        field = m.group(1)
        # Extract label from context
        label_pattern = rf'<Label[^>]*(?:htmlFor="{field}")?[^>]*>([^<]+)</Label>\s*{re.escape(m.group(0))}'
        label_match = re.search(label_pattern, content, re.DOTALL)
        
        label = label_match.group(1).strip() if label_match else field.replace('_', ' ').title()
        changes += 1
        
        return f'<CalendarFormField control={{{control_var}}} name="{field}" label="{label}" />'
    
    new_content = re.sub(pattern, replace, content, flags=re.MULTILINE | re.DOTALL)
    
    # Also handle without self-closing
    pattern2 = r'<Input\s+[^>]*type="date"[^>]*\{{\.\.\.register\([\'"]([^\'"]+)[\'"]\)[^}]*\}}[^>]*></Input>'
    new_content = re.sub(pattern2, replace, new_content, flags=re.MULTILINE | re.DOTALL)
    
    return changes, new_content

src = '/home/user/nazim-web/frontend/src'
print(f"🔄 Migrating form date pickers...\n")

total_files, total_changes = 0, 0

for d in ['pages', 'components']:
    path = os.path.join(src, d)
    if not os.path.exists(path):
        continue
    
    for file_path in Path(path).rglob('*.tsx'):
        changes, new_content = process_file(file_path)
        if changes > 0:
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"✅ {file_path.name}: {changes}")
            total_files += 1
            total_changes += changes

print(f"\n📊 Files: {total_files} | Changes: {total_changes}\n")
