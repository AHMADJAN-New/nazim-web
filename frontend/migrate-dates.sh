#!/bin/bash

# Automated Date Formatting Migration Script
# This script updates all date formatting calls to use calendar-aware formatters

set -e  # Exit on error

echo "======================================"
echo "Date Formatting Migration Script"
echo "======================================"
echo ""

# Change to frontend directory
cd /home/user/nazim-web/frontend/src

# Create backup
echo "📦 Creating backup..."
BACKUP_DIR="/tmp/nazim-date-migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r pages components "$BACKUP_DIR/"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Counter for changes
TOTAL_FILES=0
TOTAL_CHANGES=0

echo "🔄 Starting migration..."
echo ""

# Function to process a file
process_file() {
    local file="$1"
    local changes_made=0

    # Create temp file
    local temp_file=$(mktemp)

    # Read file content
    cp "$file" "$temp_file"

    # Track if we need to add import
    local needs_import=false
    local has_utils_import=false
    local has_format_import=false

    # Check if file already imports from utils
    if grep -q "from '@/lib/utils'" "$file" 2>/dev/null; then
        has_utils_import=true
    fi

    # Check if file imports format from date-fns
    if grep -q "import.*format.*from 'date-fns'" "$file" 2>/dev/null; then
        has_format_import=true
    fi

    # Pattern 1: Replace format(new Date(xxx), 'format string') with formatDate(xxx)
    if grep -q "format(new Date(" "$file" 2>/dev/null; then
        # Replace various format patterns
        sed -i "s/format(new Date(\([^)]*\)), *'[^']*')/formatDate(\1)/g" "$temp_file"
        sed -i 's/format(new Date(\([^)]*\)), *"[^"]*")/formatDate(\1)/g' "$temp_file"
        sed -i 's/format(new Date(\([^)]*\)), *`[^`]*`)/formatDate(\1)/g' "$temp_file"
        changes_made=$((changes_made + 1))
        needs_import=true
    fi

    # Pattern 2: Replace .toLocaleDateString() with formatDate()
    if grep -q "toLocaleDateString()" "$file" 2>/dev/null; then
        # Replace new Date(xxx).toLocaleDateString()
        sed -i "s/new Date(\([^)]*\))\.toLocaleDateString([^)]*)/formatDate(\1)/g" "$temp_file"
        # Replace variable.toLocaleDateString()
        sed -i "s/\([a-zA-Z_][a-zA-Z0-9_.]*\)\.toLocaleDateString([^)]*)/formatDate(\1)/g" "$temp_file"
        changes_made=$((changes_made + 1))
        needs_import=true
    fi

    # Pattern 3: Replace .toLocaleString() with formatDateTime()
    if grep -q "toLocaleString()" "$file" 2>/dev/null; then
        # Replace new Date(xxx).toLocaleString()
        sed -i "s/new Date(\([^)]*\))\.toLocaleString([^)]*)/formatDateTime(\1)/g" "$temp_file"
        # Replace variable.toLocaleString()
        sed -i "s/\([a-zA-Z_][a-zA-Z0-9_.]*\)\.toLocaleString([^)]*)/formatDateTime(\1)/g" "$temp_file"
        changes_made=$((changes_made + 1))
        needs_import=true
    fi

    # Add import if needed
    if [ "$needs_import" = true ] && [ "$has_utils_import" = false ]; then
        # Find the first import statement and add after it
        sed -i "1,/^import/ {/^import/a\\import { formatDate, formatDateTime } from '@/lib/utils';
}" "$temp_file"
        changes_made=$((changes_made + 1))
    elif [ "$needs_import" = true ] && [ "$has_utils_import" = true ]; then
        # Add formatDate to existing utils import if not already there
        if ! grep -q "formatDate" "$temp_file"; then
            sed -i "s/from '@\/lib\/utils'/formatDate, formatDateTime } from '@\/lib\/utils'/g" "$temp_file"
            sed -i "s/import { /import { formatDate, formatDateTime, /g" "$temp_file"
        fi
    fi

    # Remove date-fns import if no longer needed
    if [ "$has_format_import" = true ]; then
        # Check if format is still used for other purposes
        if ! grep -q "format(" "$temp_file" || grep -q "formatDate\|formatDateTime" "$temp_file"; then
            sed -i "/import.*format.*from 'date-fns'/d" "$temp_file"
            # Also remove from grouped imports
            sed -i "s/, *format *from 'date-fns'//g" "$temp_file"
            sed -i "s/format *, *from 'date-fns'/from 'date-fns'/g" "$temp_file"
        fi
    fi

    # Only update if changes were made
    if [ $changes_made -gt 0 ]; then
        mv "$temp_file" "$file"
        echo "✅ Updated: $file ($changes_made changes)"
        TOTAL_FILES=$((TOTAL_FILES + 1))
        TOTAL_CHANGES=$((TOTAL_CHANGES + changes_made))
    else
        rm "$temp_file"
    fi
}

# Process all TypeScript/TSX files in pages
echo "📄 Processing pages..."
find pages -name "*.tsx" -o -name "*.ts" | while read file; do
    if grep -q "format(new Date\|toLocaleDateString()\|toLocaleString()" "$file" 2>/dev/null; then
        process_file "$file"
    fi
done

# Process all TypeScript/TSX files in components
echo ""
echo "📄 Processing components..."
find components -name "*.tsx" -o -name "*.ts" | while read file; do
    if grep -q "format(new Date\|toLocaleDateString()\|toLocaleString()" "$file" 2>/dev/null; then
        process_file "$file"
    fi
done

echo ""
echo "======================================"
echo "✅ Migration Complete!"
echo "======================================"
echo ""
echo "📊 Summary:"
echo "  Files updated: $TOTAL_FILES"
echo "  Total changes: $TOTAL_CHANGES"
echo "  Backup location: $BACKUP_DIR"
echo ""
echo "🧪 Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test build: npm run build"
echo "  3. Test app: npm run dev"
echo "  4. If issues, restore: cp -r $BACKUP_DIR/* src/"
echo ""
