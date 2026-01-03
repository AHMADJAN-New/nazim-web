#!/usr/bin/env python3
"""
Comprehensive Translation Analysis Tool

This script analyzes the codebase to find all untranslated content including:
- Hardcoded strings in JSX text content
- Props with hardcoded strings (label, placeholder, title, description, etc.)
- Table headers and cells
- Button text
- Dialog titles/descriptions
- Column definitions
- Toast messages
- Error messages
- aria-labels, alt text
- And more patterns

Usage:
    python analyze_translations_comprehensive.py
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import ast
from datetime import datetime


@dataclass
class UntranslatedString:
    """Represents an untranslated string found in the codebase"""
    file_path: str
    line_number: int
    content: str
    context: str  # Surrounding code for context
    category: str  # Type of untranslated content
    severity: str  # 'high', 'medium', 'low'
    suggestion: Optional[str] = None  # Suggested translation key


@dataclass
class FileAnalysis:
    """Analysis results for a single file"""
    file_path: str
    uses_translations: bool
    untranslated_strings: List[UntranslatedString] = field(default_factory=list)
    translation_keys_used: Set[str] = field(default_factory=set)
    missing_keys: Set[str] = field(default_factory=set)


class TranslationAnalyzer:
    """Main analyzer class"""
    
    def __init__(self, frontend_dir: str):
        self.frontend_dir = Path(frontend_dir)
        self.types_file = self.frontend_dir / 'src' / 'lib' / 'translations' / 'types.ts'
        self.translation_keys: Set[str] = set()
        self.all_files: List[Path] = []
        self.file_analyses: Dict[str, FileAnalysis] = {}
        
        # Patterns to detect untranslated content
        self.patterns = {
            'jsx_text_content': [
                # Text content between JSX tags (excluding comments and code)
                r'>\s*([A-Z][a-zA-Z\s]{10,})\s*<',
                r'>\s*([A-Z][a-zA-Z\s]{5,})\s*</',
            ],
            'props': [
                # Common props with hardcoded strings
                r'(label|title|placeholder|description|aria-label|alt|name|text|content|header|footer)\s*=\s*["\']([^"\']{5,})["\']',
                r'(Label|Title|Placeholder|Description|AriaLabel|Alt|Name|Text|Content|Header|Footer)\s*[:=]\s*["\']([^"\']{5,})["\']',
            ],
            'table_headers': [
                # TableHead with hardcoded text
                r'<TableHead[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</TableHead>',
                r'<TableCell[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</TableCell>',
                r'<th[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</th>',
            ],
            'button_text': [
                # Button text content
                r'<Button[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</Button>',
                r'<button[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</button>',
            ],
            'dialog_content': [
                # Dialog titles and descriptions
                r'<DialogTitle[^>]*>\s*([A-Z][a-zA-Z\s]{5,})\s*</DialogTitle>',
                r'<DialogDescription[^>]*>\s*([A-Z][a-zA-Z\s]{5,})\s*</DialogDescription>',
                r'<CardTitle[^>]*>\s*([A-Z][a-zA-Z\s]{5,})\s*</CardTitle>',
                r'<CardDescription[^>]*>\s*([A-Z][a-zA-Z\s]{5,})\s*</CardDescription>',
            ],
            'toast_messages': [
                # Toast messages (hardcoded, not using translation keys)
                r'showToast\.(success|error|info|warning)\(["\']([^"\']{10,})["\']',
                r'toast\.(success|error|info|warning)\(["\']([^"\']{10,})["\']',
            ],
            'error_messages': [
                # Error messages
                r'throw new Error\(["\']([^"\']{10,})["\']',
                r'Error\(["\']([^"\']{10,})["\']',
                r'console\.error\(["\']([^"\']{10,})["\']',
            ],
            'column_definitions': [
                # Column definitions with hardcoded headers
                r'header:\s*["\']([^"\']{5,})["\']',
                r'accessorKey:\s*["\']([^"\']{5,})["\']',
                r'id:\s*["\']([^"\']{5,})["\']',
            ],
            'select_options': [
                # Select options
                r'<SelectItem[^>]*value=["\'][^"\']*["\'][^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</SelectItem>',
                r'<option[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</option>',
            ],
            'badge_text': [
                # Badge text
                r'<Badge[^>]*>\s*([A-Z][a-zA-Z\s]{3,})\s*</Badge>',
            ],
            'alert_content': [
                # Alert messages
                r'<AlertTitle[^>]*>\s*([A-Z][a-zA-Z\s]{5,})\s*</AlertTitle>',
                r'<AlertDescription[^>]*>\s*([A-Z][a-zA-Z\s]{5,})\s*</AlertDescription>',
            ],
        }
        
        # Patterns to detect translation usage
        self.translation_patterns = [
            r"useLanguage\s*\(\s*\)",
            r"from\s+['\"]@/hooks/useLanguage['\"]",
            r"from\s+['\"]\.\.?/.*useLanguage['\"]",
            r"t\(['\"]([^'\"]+)['\"]\)",
            r"showToast\.(success|error|info|warning)\(t\(['\"]([^'\"]+)['\"]\)",
        ]
        
        # Patterns to exclude (false positives)
        self.exclude_patterns = [
            r'https?://',  # URLs
            r'mailto:',  # Email links
            r'data:',  # Data URIs
            r'#[0-9a-fA-F]{3,6}',  # Hex colors
            r'\$\{[^}]+\}',  # Template literals
            r'className=',  # CSS classes
            r'import\s+.*from',  # Import statements
            r'export\s+',  # Export statements
            r'console\.',  # Console statements (usually not translated)
            r'\/\/.*',  # Comments
            r'\/\*.*\*\/',  # Block comments
            r'^\s*\*',  # JSDoc comments
            r'^\s*$',  # Empty strings
            r'^[0-9]+$',  # Pure numbers
            r'^[A-Z_]+$',  # Constants (ALL_CAPS)
            r'^[a-z]+\(',  # Function calls
        ]
    
    def extract_translation_keys(self) -> Set[str]:
        """Extract all translation keys from types.ts"""
        if not self.types_file.exists():
            print(f"⚠️  Warning: {self.types_file} not found")
            return set()
        
        keys = set()
        content = self.types_file.read_text(encoding='utf-8')
        
        # Parse TypeScript interface using regex
        # Look for patterns like: key: string;
        # Track nested structure with path stack
        path_stack = []
        in_interface = False
        brace_depth = 0
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            line_clean = line.strip()
            
            # Remove inline comments
            line_clean = re.sub(r'//.*$', '', line_clean).strip()
            
            # Skip block comments
            if line_clean.startswith('/*') or line_clean.startswith('*'):
                continue
            
            # Detect interface start
            if 'interface TranslationKeys' in line_clean or 'export interface TranslationKeys' in line_clean:
                in_interface = True
                brace_depth = 0
                path_stack = []
                continue
            
            if not in_interface:
                continue
            
            # Count braces
            open_braces = len(re.findall(r'\{', line_clean))
            close_braces = len(re.findall(r'\}', line_clean))
            prev_brace_depth = brace_depth
            brace_depth += open_braces - close_braces
            
            # Detect category/object start (e.g., common: {)
            object_match = re.match(r'^(\w+):\s*\{', line_clean)
            if object_match:
                path_stack.append(object_match.group(1))
                continue
            
            # Handle quoted object keys (e.g., "library.categories": {)
            quoted_object_match = re.match(r'^["\']([^"\']+)["\']:\s*\{', line_clean)
            if quoted_object_match:
                path_stack.append(quoted_object_match.group(1))
                continue
            
            # Extract key: string; pattern (leaf keys)
            key_match = re.match(r'^(\w+):\s*string;', line_clean)
            if key_match and path_stack:
                key = key_match.group(1)
                full_path = '.'.join(path_stack + [key])
                keys.add(full_path)
                continue
            
            # Handle quoted keys (e.g., "library.categories": string;)
            quoted_key_match = re.match(r'^["\']([^"\']+)["\']:\s*string;', line_clean)
            if quoted_key_match and path_stack:
                key = quoted_key_match.group(1)
                if '.' in key:
                    keys.add(key)
                else:
                    full_path = '.'.join(path_stack + [key])
                    keys.add(full_path)
                continue
            
            # Pop from stack when closing brace
            if close_braces > 0 and path_stack and brace_depth < prev_brace_depth:
                path_stack.pop()
            
            # Reset if we've closed the interface
            if brace_depth < 0:
                in_interface = False
                path_stack = []
        
        return keys
    
    def find_source_files(self) -> List[Path]:
        """Find all TypeScript/TSX source files"""
        files = []
        src_dir = self.frontend_dir / 'src'
        
        if not src_dir.exists():
            print(f"⚠️  Warning: {src_dir} not found")
            return files
        
        exclude_dirs = {'node_modules', 'dist', '.git', '__tests__', '.next', 'build'}
        exclude_files = {'.test.', '.spec.', '.d.ts', 'types.ts'}
        
        for root, dirs, filenames in os.walk(src_dir):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for filename in filenames:
                if any(excl in filename for excl in exclude_files):
                    continue
                
                if filename.endswith(('.ts', '.tsx')):
                    file_path = Path(root) / filename
                    files.append(file_path)
        
        return files
    
    def should_exclude_string(self, string: str) -> bool:
        """Check if a string should be excluded from analysis"""
        string = string.strip()
        
        # Exclude very short strings
        if len(string) < 3:
            return True
        
        # Exclude strings matching exclude patterns
        for pattern in self.exclude_patterns:
            if re.search(pattern, string):
                return True
        
        # Exclude strings that are all numbers or special characters
        if re.match(r'^[0-9\s\-_\.]+$', string):
            return True
        
        # Exclude strings that look like code identifiers
        if re.match(r'^[a-z_][a-z0-9_]*$', string) and len(string) < 20:
            # Might be a variable name, but if it's capitalized it's probably user-facing
            if not string[0].isupper():
                return True
        
        # Exclude strings that look like code
        if any(char in string for char in ['{', '}', '(', ')', '[', ']', '=', ':', ';', '//', '/*']):
            # But allow if it's clearly user-facing text (has spaces and letters)
            if not re.search(r'[a-zA-Z]{5,}', string) or ' ' not in string:
                return True
        
        # Exclude strings that are clearly not user-facing
        if string.startswith(('import', 'export', 'const', 'let', 'var', 'function', 'class', 'interface', 'type')):
            return True
        
        # Exclude strings that are clearly CSS/HTML attributes
        if string.startswith(('bg-', 'text-', 'p-', 'm-', 'w-', 'h-', 'flex', 'grid')):
            return True
        
        return False
    
    def extract_translation_keys_from_file(self, content: str) -> Set[str]:
        """Extract translation keys used in a file"""
        keys = set()
        
        # Pattern: t('key') or t("key")
        t_pattern = r"t\(['\"]([^'\"]+)['\"]\)"
        for match in re.finditer(t_pattern, content):
            keys.add(match.group(1))
        
        # Pattern: showToast.success(t('key'))
        toast_pattern = r"showToast\.(success|error|info|warning)\(t\(['\"]([^'\"]+)['\"]\)"
        for match in re.finditer(toast_pattern, content):
            keys.add(match.group(2))
        
        # Pattern: titleKey: 'key'
        title_key_pattern = r"titleKey:\s*['\"]([^'\"]+)['\"]"
        for match in re.finditer(title_key_pattern, content):
            keys.add(match.group(1))
        
        return keys
    
    def analyze_file(self, file_path: Path) -> FileAnalysis:
        """Analyze a single file for untranslated content"""
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"⚠️  Error reading {file_path}: {e}")
            return FileAnalysis(file_path=str(file_path), uses_translations=False)
        
        # Check if file uses translations
        uses_translations = any(re.search(pattern, content) for pattern in self.translation_patterns)
        
        # Extract translation keys used
        translation_keys_used = self.extract_translation_keys_from_file(content)
        
        # Find missing keys (used but not defined)
        missing_keys = {key for key in translation_keys_used if key not in self.translation_keys}
        
        # Find untranslated strings
        untranslated_strings = []
        lines = content.split('\n')
        
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, content, re.MULTILINE | re.DOTALL):
                    # Get the matched string (could be in different capture groups)
                    matched_string = None
                    for i in range(1, match.lastindex + 1 if match.lastindex else 0):
                        if match.group(i):
                            matched_string = match.group(i).strip()
                            break
                    
                    if not matched_string:
                        continue
                    
                    # Check if should be excluded
                    if self.should_exclude_string(matched_string):
                        continue
                    
                    # Find line number
                    line_number = content[:match.start()].count('\n') + 1
                    
                    # Get context (surrounding lines)
                    context_start = max(0, line_number - 2)
                    context_end = min(len(lines), line_number + 2)
                    context = '\n'.join(lines[context_start:context_end])
                    
                    # Determine severity
                    severity = 'medium'
                    if category in ['table_headers', 'dialog_content', 'button_text']:
                        severity = 'high'
                    elif category in ['toast_messages', 'error_messages']:
                        severity = 'high'
                    elif category in ['jsx_text_content', 'props']:
                        severity = 'high'
                    elif category in ['select_options', 'badge_text']:
                        severity = 'medium'
                    else:
                        severity = 'low'
                    
                    # Generate suggestion for translation key
                    suggestion = self.generate_translation_key_suggestion(matched_string, category)
                    
                    untranslated_strings.append(
                        UntranslatedString(
                            file_path=str(file_path.relative_to(self.frontend_dir)),
                            line_number=line_number,
                            content=matched_string,
                            context=context,
                            category=category,
                            severity=severity,
                            suggestion=suggestion
                        )
                    )
        
        return FileAnalysis(
            file_path=str(file_path.relative_to(self.frontend_dir)),
            uses_translations=uses_translations,
            untranslated_strings=untranslated_strings,
            translation_keys_used=translation_keys_used,
            missing_keys=missing_keys
        )
    
    def generate_translation_key_suggestion(self, string: str, category: str) -> Optional[str]:
        """Generate a suggested translation key for a string"""
        # Clean the string
        clean = string.strip()
        
        # Convert to camelCase and suggest key
        # This is a simple heuristic - could be improved
        words = re.findall(r'\w+', clean.lower())
        if not words:
            return None
        
        # Suggest based on category
        if category == 'table_headers':
            return f"common.{words[0]}"
        elif category == 'button_text':
            return f"common.{words[0]}"
        elif category == 'dialog_content':
            return f"common.{words[0]}"
        elif category == 'props':
            # Try to infer from context
            if 'placeholder' in clean.lower():
                return f"common.{words[0]}Placeholder"
            elif 'label' in clean.lower():
                return f"common.{words[0]}Label"
            else:
                return f"common.{words[0]}"
        else:
            return f"common.{words[0]}"
    
    def analyze(self) -> Dict:
        """Run the complete analysis"""
        print("🔍 Starting comprehensive translation analysis...\n")
        
        # Step 1: Extract translation keys
        print("📖 Extracting translation keys from types.ts...")
        self.translation_keys = self.extract_translation_keys()
        print(f"   Found {len(self.translation_keys)} translation keys\n")
        
        # Step 2: Find source files
        print("📁 Finding source files...")
        self.all_files = self.find_source_files()
        print(f"   Found {len(self.all_files)} source files\n")
        
        # Step 3: Analyze each file
        print("🔎 Analyzing files for untranslated content...")
        for i, file_path in enumerate(self.all_files, 1):
            if i % 50 == 0:
                print(f"   Progress: {i}/{len(self.all_files)} files analyzed...")
            analysis = self.analyze_file(file_path)
            self.file_analyses[str(file_path.relative_to(self.frontend_dir))] = analysis
        
        print(f"   Completed analysis of {len(self.all_files)} files\n")
        
        # Step 4: Generate statistics
        total_untranslated = sum(len(a.untranslated_strings) for a in self.file_analyses.values())
        files_with_untranslated = sum(1 for a in self.file_analyses.values() if a.untranslated_strings)
        files_using_translations = sum(1 for a in self.file_analyses.values() if a.uses_translations)
        total_missing_keys = len(set().union(*(a.missing_keys for a in self.file_analyses.values())))
        
        # Categorize by severity
        high_severity = sum(1 for a in self.file_analyses.values() 
                           for s in a.untranslated_strings if s.severity == 'high')
        medium_severity = sum(1 for a in self.file_analyses.values() 
                             for s in a.untranslated_strings if s.severity == 'medium')
        low_severity = sum(1 for a in self.file_analyses.values() 
                          for s in a.untranslated_strings if s.severity == 'low')
        
        return {
            'summary': {
                'total_files': len(self.all_files),
                'files_using_translations': files_using_translations,
                'files_with_untranslated': files_with_untranslated,
                'total_untranslated_strings': total_untranslated,
                'total_missing_keys': total_missing_keys,
                'high_severity': high_severity,
                'medium_severity': medium_severity,
                'low_severity': low_severity,
            },
            'translation_keys': sorted(self.translation_keys),
            'file_analyses': self.file_analyses,
        }
    
    def generate_report(self, analysis_results: Dict) -> str:
        """Generate a comprehensive markdown report"""
        summary = analysis_results['summary']
        file_analyses = analysis_results['file_analyses']
        
        # Group untranslated strings by category
        by_category = defaultdict(list)
        by_file = defaultdict(list)
        
        for file_path, analysis in file_analyses.items():
            for untranslated in analysis.untranslated_strings:
                by_category[untranslated.category].append(untranslated)
                by_file[file_path].append(untranslated)
        
        # Sort files by number of issues
        files_sorted = sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True)
        
        report = f"""# Comprehensive Translation Analysis Report

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 Summary

- **Total Files Analyzed**: {summary['total_files']}
- **Files Using Translations**: {summary['files_using_translations']} ({summary['files_using_translations']/summary['total_files']*100:.1f}%)
- **Files with Untranslated Content**: {summary['files_with_untranslated']} ({summary['files_with_untranslated']/summary['total_files']*100:.1f}%)
- **Total Untranslated Strings**: {summary['total_untranslated_strings']}
- **Missing Translation Keys**: {summary['total_missing_keys']}

### Severity Breakdown

- **🔴 High Severity**: {summary['high_severity']} issues (user-facing content that must be translated)
- **🟡 Medium Severity**: {summary['medium_severity']} issues (should be translated)
- **🟢 Low Severity**: {summary['low_severity']} issues (nice to have translated)

## 📋 Issues by Category

"""
        
        # Add category breakdown
        for category, strings in sorted(by_category.items(), key=lambda x: len(x[1]), reverse=True):
            report += f"### {category.replace('_', ' ').title()} ({len(strings)} issues)\n\n"
            report += f"Found {len(strings)} untranslated strings in this category.\n\n"
            
            # Show top 10 examples
            for s in strings[:10]:
                report += f"- **{s.file_path}:{s.line_number}** - `{s.content[:50]}{'...' if len(s.content) > 50 else ''}`\n"
            
            if len(strings) > 10:
                report += f"- ... and {len(strings) - 10} more\n"
            
            report += "\n"
        
        # Add top files with issues
        report += f"""## 🔥 Top Files Needing Translation Work

"""
        
        for file_path, strings in files_sorted[:20]:
            high_count = sum(1 for s in strings if s.severity == 'high')
            medium_count = sum(1 for s in strings if s.severity == 'medium')
            low_count = sum(1 for s in strings if s.severity == 'low')
            
            analysis = file_analyses[file_path]
            uses_translations = "✅" if analysis.uses_translations else "❌"
            
            report += f"""### {file_path} ({len(strings)} issues)

- **Uses Translations**: {uses_translations}
- **Severity**: 🔴 {high_count} | 🟡 {medium_count} | 🟢 {low_count}
- **Missing Keys**: {len(analysis.missing_keys)}

#### Examples:

"""
            # Show first 5 examples
            for s in strings[:5]:
                report += f"""**Line {s.line_number}** - {s.category} (Severity: {s.severity})
```
{s.content}
```
**Context:**
```
{s.context}
```
**Suggestion**: `{s.suggestion or 'N/A'}`

"""
            
            if len(strings) > 5:
                report += f"... and {len(strings) - 5} more issues\n\n"
        
        # Add recommendations
        report += f"""## 💡 Recommendations

1. **High Priority**: Fix all high-severity issues first (table headers, dialog content, button text)
2. **Add Missing Keys**: Add {summary['total_missing_keys']} missing translation keys to `types.ts`
3. **Replace Hardcoded Strings**: Replace hardcoded strings with `t('translation.key')` calls
4. **Focus on User-Facing Content**: Prioritize content visible to end users
5. **Test Translations**: Ensure all translations work in all 4 languages (en, ps, fa, ar)

## 📝 Next Steps

1. Review high-severity issues and add translation keys
2. Update components to use translation keys instead of hardcoded strings
3. Add translations for new keys in all language files (en.ts, ps.ts, fa.ts, ar.ts)
4. Test the application in all supported languages
5. Run this analysis again to verify improvements

## 🔍 How to Use This Report

- **High Severity**: Must be fixed - these are visible to users
- **Medium Severity**: Should be fixed - improves user experience
- **Low Severity**: Nice to have - can be fixed gradually

Focus on files with the most high-severity issues first.
"""
        
        return report


def main():
    """Main entry point"""
    # Get frontend directory (assume script is in project root)
    script_dir = Path(__file__).parent
    frontend_dir = script_dir / 'frontend'
    
    if not frontend_dir.exists():
        print(f"❌ Error: {frontend_dir} not found")
        print("   Make sure you're running this script from the project root")
        return
    
    # Create analyzer
    analyzer = TranslationAnalyzer(str(frontend_dir))
    
    # Run analysis
    results = analyzer.analyze()
    
    # Generate report
    report = analyzer.generate_report(results)
    
    # Save report
    output_file = script_dir / 'translation-analysis-comprehensive.md'
    output_file.write_text(report, encoding='utf-8')
    
    print(f"\n✅ Analysis complete!")
    print(f"📄 Report saved to: {output_file}\n")
    
    # Print summary
    summary = results['summary']
    print("📈 Summary:")
    print(f"   Total Files: {summary['total_files']}")
    print(f"   Files Using Translations: {summary['files_using_translations']}")
    print(f"   Files with Untranslated Content: {summary['files_with_untranslated']}")
    print(f"   Total Untranslated Strings: {summary['total_untranslated_strings']}")
    print(f"   Missing Translation Keys: {summary['total_missing_keys']}")
    print(f"   High Severity Issues: {summary['high_severity']}")
    print(f"   Medium Severity Issues: {summary['medium_severity']}")
    print(f"   Low Severity Issues: {summary['low_severity']}")


if __name__ == '__main__':
    main()

