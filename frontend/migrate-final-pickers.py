#!/usr/bin/env python3
import re, os, shutil
from pathlib import Path
from datetime import datetime

def backup(src):
    bak = f'/tmp/final-pickers-{datetime.now().strftime("%Y%m%d-%H%M%S")}'
    for d in ['pages', 'components']:
        s, dst = os.path.join(src, d), os.path.join(bak, d)
        if os.path.exists(s): shutil.copytree(s, dst)
    print(f"📦 Backup: {bak}\n")
    return bak

def add_imports(content, needs_form=False):
    has_picker = 'CalendarDatePicker' in content
    has_form = 'CalendarFormField' in content
    
    if (has_picker or not needs_form) and (has_form or needs_form):
        return content, False
    
    lines = content.split('\n')
    idx = next((i for i, l in enumerate(lines) if "from '@/components/ui/" in l), 
               next((i for i, l in enumerate(lines) if 'import ' in l), 0))
    
    if not has_picker and not needs_form:
        lines.insert(idx + 1, "import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';")
    if not has_form and needs_form:
        lines.insert(idx + 1, "import { CalendarFormField } from '@/components/ui/calendar-form-field';")
    
    return '\n'.join(lines), True

def migrate(content):
    changes = 0
    
    # Pattern 1: react-hook-form {...register('field')}
    def repl_form(m):
        nonlocal changes
        field = m.group(1)
        label_match = re.search(rf'<Label[^>]*>{m.group(2)}([^<]+)</Label>', content) if m.group(2) else None
        label = label_match.group(1).strip() if label_match else field.replace('_', ' ').title()
        changes += 1
        return f'{{/* Migrated to CalendarFormField - needs control prop */}}\n                    <CalendarFormField control={{form.control}} name="{field}" label="{label}" />'
    
    content = re.sub(r'<Input[^>]*type="date"[^>]*\{{\.\.\.register\([\'"]([^\'"]+)[\'"]\)\}}[^>]*/>', repl_form, content)
    
    # Pattern 2: Complex onChange patterns (multiline)
    pattern = r'<Input[^>]*\n?\s*type="date"[^>]*\n?\s*value=\{([^}]+)\}[^>]*\n?\s*onChange=\{[^}]*\}[^>]*/>'
    
    def repl_complex(m):
        nonlocal changes
        val = m.group(1)
        full = m.group(0)
        
        # Extract onChange handler
        onchange = re.search(r'onChange=\{([^}]+)\}', full)
        if not onchange:
            return full
        
        handler = onchange.group(1)
        
        # Try different patterns
        if 'setFilter' in handler or 'handleFilter' in handler:
            func_match = re.search(r'(\w+)\([\'"]?(\w+)[\'"]?,', handler)
            if func_match:
                func, field = func_match.groups()
                changes += 1
                return f'<CalendarDatePicker date={{{val} ? new Date({val}) : undefined}} onDateChange={{(date) => {func}("{field}", date ? date.toISOString().split("T")[0] : "")}} />'
        
        setter_match = re.search(r'(set\w+)\(', handler)
        if setter_match:
            setter = setter_match.group(1)
            changes += 1
            return f'<CalendarDatePicker date={{{val} ? new Date({val}) : undefined}} onDateChange={{(date) => {setter}(date ? date.toISOString().split("T")[0] : "")}} />'
        
        return full
    
    content = re.sub(pattern, repl_complex, content, flags=re.DOTALL | re.MULTILINE)
    
    return content, changes

def process(path):
    try:
        with open(path) as f:
            content = f.read()
        
        if 'type="date"' not in content:
            return 0
        
        new_content, changes = migrate(content)
        
        if changes > 0:
            has_register = '{...register(' in content
            new_content, _ = add_imports(new_content, has_register)
            
            with open(path, 'w') as f:
                f.write(new_content)
            
            return changes
        return 0
    except Exception as e:
        print(f"❌ {path}: {e}")
        return 0

src = '/home/user/nazim-web/frontend/src'
os.chdir(src)
bak = backup(src)

print("🔄 Migrating...\n")
total_files, total_changes = 0, 0

for d in ['pages', 'components']:
    if not os.path.exists(d):
        continue
    for p in Path(d).rglob('*.tsx'):
        c = process(p)
        if c > 0:
            print(f"✅ {str(p).split('/')[-1]}: {c}")
            total_files += 1
            total_changes += c

print(f"\n📊 Files: {total_files} | Changes: {total_changes}")
print(f"📁 Backup: {bak}\n")
