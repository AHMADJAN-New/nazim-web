#!/bin/bash

# Date Conversion Migration Helper
# This script helps identify files that need manual updates

echo "======================================"
echo "Date Conversion Migration Report"
echo "======================================"
echo ""

cd /home/user/nazim-web/frontend/src

echo "📊 CURRENT STATUS"
echo "======================================"
echo ""

# Already automatic
AUTO_COUNT=$(grep -rl "formatDate(" pages/ components/ 2>/dev/null | wc -l)
echo "✅ Files already using formatDate (AUTOMATIC): $AUTO_COUNT"
echo ""

echo "⚠️  FILES NEEDING UPDATES"
echo "======================================"
echo ""

# Need changes - date-fns format
FORMAT_COUNT=$(grep -rl "format(new Date" pages/ components/ 2>/dev/null | wc -l)
echo "1. Direct date-fns format() calls: $FORMAT_COUNT files"
if [ $FORMAT_COUNT -gt 0 ]; then
    echo "   Files:"
    grep -rl "format(new Date" pages/ components/ 2>/dev/null | head -10
    if [ $FORMAT_COUNT -gt 10 ]; then
        echo "   ... and $((FORMAT_COUNT - 10)) more"
    fi
fi
echo ""

# Need changes - toLocaleDateString
LOCALE_COUNT=$(grep -rl "toLocaleDateString()" pages/ components/ 2>/dev/null | wc -l)
echo "2. Direct toLocaleDateString() calls: $LOCALE_COUNT files"
if [ $LOCALE_COUNT -gt 0 ]; then
    echo "   Files:"
    grep -rl "toLocaleDateString()" pages/ components/ 2>/dev/null | head -10
    if [ $LOCALE_COUNT -gt 10 ]; then
        echo "   ... and $((LOCALE_COUNT - 10)) more"
    fi
fi
echo ""

# Date pickers
INPUT_COUNT=$(grep -rl "type=\"date\"" pages/ components/ 2>/dev/null | wc -l)
echo "3. Native date inputs: $INPUT_COUNT files"
if [ $INPUT_COUNT -gt 0 ]; then
    echo "   Files:"
    grep -rl "type=\"date\"" pages/ components/ 2>/dev/null | head -10
    if [ $INPUT_COUNT -gt 10 ]; then
        echo "   ... and $((INPUT_COUNT - 10)) more"
    fi
fi
echo ""

echo "📈 SUMMARY"
echo "======================================"
TOTAL_UPDATES=$((FORMAT_COUNT + LOCALE_COUNT))
TOTAL_PICKERS=$INPUT_COUNT
echo "Display updates needed: $TOTAL_UPDATES files (~2-3 hours)"
echo "Date picker updates: $TOTAL_PICKERS files (~3-4 hours)"
echo "Already automatic: $AUTO_COUNT files (0 hours)"
echo ""

COVERAGE=$((AUTO_COUNT * 100 / (AUTO_COUNT + TOTAL_UPDATES)))
echo "Current coverage: ${COVERAGE}% automatic"
echo "After display updates: 100% automatic"
echo ""

echo "🎯 RECOMMENDED PRIORITY"
echo "======================================"
echo "1. HIGH: Update date-fns format() calls (88 files)"
echo "2. HIGH: Update toLocaleDateString() calls (47 files)"
echo "3. MEDIUM: Update date pickers (86 files)"
echo ""

echo "💡 QUICK WINS (Top 10 files to update first)"
echo "======================================"
echo "Most date formatting calls per file:"
for file in $(grep -rl "format(new Date\|toLocaleDateString()" pages/ 2>/dev/null); do
    count=$(grep -c "format(new Date\|toLocaleDateString()" "$file" 2>/dev/null)
    echo "$count $file"
done | sort -rn | head -10
echo ""

echo "✅ NEXT STEPS"
echo "======================================"
echo "1. Run: npm run dev"
echo "2. Test calendar switching in User Settings"
echo "3. Update high-priority files (see list above)"
echo "4. Test each updated page"
echo "5. Commit changes incrementally"
echo ""
