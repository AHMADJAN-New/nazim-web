# Library Books Finance Linkage Analysis

## Executive Summary

This document analyzes how the **Assets** system is linked to the **Finance** system and applies the same pattern to **Library Books** to enable proper financial tracking of library inventory value.

## Assets System Finance Linkage (Current Implementation)

### Database Schema

**Table: `assets`**
- `currency_id` (UUID, nullable) - Foreign key to `currencies` table
- `finance_account_id` (UUID, nullable) - Foreign key to `finance_accounts` table
- `purchase_price` (decimal) - Asset purchase price

**Migration:** `2025_12_19_081300_add_finance_fields_to_assets_table.php`
- Adds `currency_id` and `finance_account_id` columns
- Creates foreign key constraints
- Creates indexes for performance

### Model Relationships

**Asset Model** (`backend/app/Models/Asset.php`):
```php
public function currency()
{
    return $this->belongsTo(Currency::class, 'currency_id');
}

public function financeAccount()
{
    return $this->belongsTo(FinanceAccount::class, 'finance_account_id');
}
```

**FinanceAccount Model** (`backend/app/Models/FinanceAccount.php`):
```php
public function assets()
{
    return $this->hasMany(Asset::class, 'finance_account_id');
}
```

### Controller Validation

**AssetController** (`backend/app/Http/Controllers/AssetController.php`):
- Validates `finance_account_id` belongs to user's organization
- Validates `currency_id` belongs to user's organization
- Auto-sets `currency_id` from finance account if not provided
- Ensures organization isolation

### Finance Account Balance Calculation

**FinanceAccount::recalculateBalance()** includes assets:
1. Fetches all assets linked to the account
2. Filters by status: `available`, `assigned`, `maintenance`
3. Converts asset prices to account's currency using exchange rates
4. Adds total assets value to account balance
5. Handles currency conversion with fallback logic

**Key Logic:**
- Uses asset's `currency_id` if available
- Falls back to finance account's currency if asset has no currency
- Converts using `ExchangeRate::getRate()` with purchase date
- Includes only assets with `purchase_price > 0`

### Finance Reports Integration

**FinanceReportController** (`backend/app/Http/Controllers/FinanceReportController.php`):
- Includes assets in total assets value calculation
- Groups assets by finance account
- Groups assets by currency
- Converts all asset values to target currency for reporting
- Provides breakdown by account and currency

### Frontend Integration

**Types:**
- `frontend/src/types/api/asset.ts` - API types with `currency_id` and `finance_account_id`
- `frontend/src/types/domain/asset.ts` - Domain types with nested `currency` and `financeAccount` objects

**Components:**
- Asset forms include finance account and currency selection
- Asset reports show finance account and currency information
- Finance dashboard includes assets value in balance calculations

## Library Books System Current State

### Database Schema

**Table: `library_books`**
- `price` (decimal) - Book price
- **NO `currency_id` field**
- **NO `finance_account_id` field**

### Model Relationships

**LibraryBook Model** (`backend/app/Models/LibraryBook.php`):
- **NO currency relationship**
- **NO financeAccount relationship**

### Controller

**LibraryBookController** (`backend/app/Http/Controllers/LibraryBookController.php`):
- **NO finance field validation**
- **NO currency validation**

### Finance Account Balance Calculation

**FinanceAccount::recalculateBalance()**:
- **DOES NOT include library books**
- Only includes: income entries, expense entries, and assets

### Finance Reports

**FinanceReportController**:
- **DOES NOT include library books**
- Only includes assets in asset value calculations

### Frontend

**Library Dashboard** (`frontend/src/pages/LibraryDashboard.tsx`):
- Calculates total library value (price × copies)
- **NOT linked to finance accounts**
- **NO currency information**

## Gap Analysis

### Missing Components for Library Books

1. **Database:**
   - ❌ No `currency_id` column
   - ❌ No `finance_account_id` column
   - ❌ No foreign key constraints
   - ❌ No indexes

2. **Model:**
   - ❌ No `currency()` relationship
   - ❌ No `financeAccount()` relationship
   - ❌ FinanceAccount model has no `libraryBooks()` relationship

3. **Controller:**
   - ❌ No finance account validation
   - ❌ No currency validation
   - ❌ No auto-set currency from account

4. **Finance Integration:**
   - ❌ Library books NOT included in balance calculations
   - ❌ Library books NOT included in finance reports
   - ❌ No currency conversion for library books

5. **Frontend:**
   - ❌ No finance account selection in book forms
   - ❌ No currency selection in book forms
   - ❌ Types don't include finance fields

## Implementation Plan

### Phase 1: Database Migration
- Create migration to add `currency_id` and `finance_account_id` to `library_books` table
- Add foreign key constraints
- Add indexes
- Follow same pattern as assets migration

### Phase 2: Model Updates
- Add `currency()` and `financeAccount()` relationships to LibraryBook model
- Add `libraryBooks()` relationship to FinanceAccount model
- Update `$fillable` array

### Phase 3: Controller Updates
- Add finance account validation in LibraryBookController
- Add currency validation
- Auto-set currency from account if not provided
- Follow same pattern as AssetController

### Phase 4: Finance Integration
- Update `FinanceAccount::recalculateBalance()` to include library books
- Add library books to finance reports
- Implement currency conversion for library books
- Calculate total value: `price × total_copies`

### Phase 5: Frontend Updates
- Update API types to include finance fields
- Update domain types with nested objects
- Update mappers
- Add finance account and currency selection to book forms
- Update library dashboard to show finance account info

## Implementation Details

### Library Books Value Calculation

**Formula:**
```
Total Library Books Value = Σ(book.price × book.total_copies)
```

**Where:**
- Only include books with `price > 0`
- Only include books with `total_copies > 0`
- Convert to finance account's currency using exchange rates
- Use book's `currency_id` if available, fallback to finance account's currency

### Currency Conversion Logic

**Same as Assets:**
1. Get book's currency from `currency_id`
2. If no currency, use finance account's currency
3. If still no currency, use target currency (graceful degradation)
4. Convert using `ExchangeRate::getRate()` with book creation date
5. If rate not found, use original price (graceful degradation)

### Finance Account Balance Update

**Updated Formula:**
```
current_balance = opening_balance 
                + total_income 
                - total_expenses 
                + total_assets_value 
                + total_library_books_value
```

## Benefits

1. **Complete Financial Tracking:** Library inventory value is now tracked in finance accounts
2. **Multi-Currency Support:** Library books can have different currencies
3. **Accurate Balance Calculations:** Finance accounts include all asset types
4. **Consistent Pattern:** Library books follow same pattern as assets
5. **Better Reporting:** Finance reports include library inventory value
6. **Organization Isolation:** All finance fields respect organization boundaries

## Implementation Status

### ✅ Completed

1. **Database Migration** - Created migration to add `currency_id` and `finance_account_id` to `library_books` table
2. **Model Updates** - Added `currency()` and `financeAccount()` relationships to LibraryBook model
3. **Controller Updates** - Added finance field validation in LibraryBookController
4. **Finance Integration** - Updated FinanceAccount::recalculateBalance() to include library books
5. **Finance Reports** - Updated FinanceReportController to include library books in reports
6. **Frontend Types** - Updated domain types to include finance fields

### ⏳ Pending

1. **Frontend Forms** - Update library book create/edit forms to include finance account and currency selection
   - This requires finding the library book form components and adding Select components for finance account and currency
   - Should follow the same pattern as asset forms

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Library books can be created with finance account and currency
- [ ] Finance account balance includes library books value
- [ ] Currency conversion works correctly
- [ ] Finance reports include library books
- [ ] Frontend forms include finance fields (PENDING)
- [ ] Organization isolation is maintained
- [ ] Existing library books (without finance fields) still work

## Notes

- Library books with `price = 0` or `total_copies = 0` are excluded from balance calculations
- Currency conversion uses book creation date (or current date if not available)
- Finance account's currency is used as fallback if book has no currency
- All changes maintain backward compatibility (fields are nullable)

