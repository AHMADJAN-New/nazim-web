# Asset Reports

The Asset Reports page provides analytics on your assets: summary totals, status breakdown, category breakdown, assets needing maintenance, and value analysis (top valued assets and highest maintenance costs). All numbers respect the current status and category filters. Use it for planning, budgeting, and maintenance follow-up.

---

## Page Overview

When you open the Asset Reports page you will see a title and short description, four summary cards, two filters (Status and Category), and a set of tabs: Status Breakdown, Category Breakdown, Needs Maintenance, and Value Analysis. Each tab shows one or more tables or cards.

### Summary Cards

- **Total Assets** — Number of asset types matching the filters. Description line shows total copies (e.g. "X Total Copies").
- **Total Price** — Sum of purchase price for one unit of each asset (grouped by currency when multiple currencies exist). Description: "Sum of prices" (one unit per asset).
- **Total Value** — Total value = price × copies for each asset, summed (grouped by currency). Description: "Price × copies".
- **Maintenance Cost** — Total maintenance cost for filtered assets. Description shows how many assets "need attention" (e.g. warranty expired or maintenance overdue).

### Filters

- **Status** — All Statuses, Available, Assigned, Maintenance, Retired, Lost, Disposed. Tables and stats use only assets matching this status.
- **Category** — All Categories or a specific category name (from your asset categories). Combined with status to filter the data.

---

## Tabs

### Status Breakdown

- **Table columns:** Status, Count, Copies, Assigned, Total Value, Percentage.
- Each row is one status (Available, Assigned, Maintenance, etc.) with:
  - Count of assets in that status.
  - Total copies.
  - Assigned count (assigned / total copies).
  - Total value (by currency if applicable).
  - Percentage of total asset count.
- Status badges use the same colors as elsewhere (e.g. green available, blue assigned, yellow maintenance).

### Category Breakdown

- **Table columns:** Category, Count, Copies, Assigned, Total Value, Percentage.
- One row per category (or "Uncategorized"). Same metrics as Status Breakdown but grouped by category. Helps compare value and usage across categories.

### Needs Maintenance

- **Table columns:** Name, Tag, Status, Issue, Last Maintenance.
- Lists assets that need attention: warranty expired and/or maintenance overdue (next due date in the past).
- **Issue** column shows badges such as "Warranty Expired" and "Maintenance Overdue".
- **Last Maintenance** shows the date of the last performed maintenance or "Never".
- If no assets need maintenance, a message like "No assets need maintenance" is shown.

### Value Analysis

Two side-by-side tables:

- **Top Valued Assets** — Up to 10 assets with highest purchase price (single-unit price). Columns: Name, Value (with currency symbol).
- **Maintenance Cost Leaders** — Up to 10 assets with highest total maintenance cost. Columns: Name (with tag below), Maintenance Cost. If no assets have maintenance cost, a message like "No maintenance costs" is shown.

---

## How to Use the Reports

1. Open **Assets** in the menu, then **Asset Reports** (or go to `/assets/reports`).
2. Optionally set **Status** and **Category** to focus on a subset (e.g. only Available, or only one category).
3. Review the four summary cards for totals and "need attention" count.
4. Open **Status Breakdown** to see distribution by status and value per status.
5. Open **Category Breakdown** to see distribution by category and value per category.
6. Open **Needs Maintenance** to get a list of assets to repair or schedule; use Last Maintenance and Issue to prioritize.
7. Open **Value Analysis** to see highest-value assets and highest maintenance spend for budgeting and replacement planning.

---

## Export Options

This page is focused on on-screen analytics. If export buttons are added to the reports section in the future, they would typically export the visible table (e.g. status breakdown, category breakdown, needs maintenance list, or value analysis tables) to PDF or Excel. Check the card headers for any **Export** or **PDF/Excel** controls.

---

## Tips & Best Practices

- Use **Needs Maintenance** regularly to schedule repairs and avoid overdue items.
- Use **Total Value** and **Maintenance Cost** together to see whether maintenance spend is proportional to asset value.
- Filter by **Category** when reporting to management for a specific department or type of asset.
- Use **Top Valued Assets** and **Maintenance Cost Leaders** to decide which items to insure or replace first.

---

## Related Pages

- [Assets](/help-center/s/assets/assets) — Register and edit assets; set category and status.
- [Assets Dashboard](/help-center/s/assets/assets-dashboard) — Quick overview and charts.
- [Asset Categories](/help-center/s/assets/assets-categories) — Define categories used in these reports.
- [Asset Assignments](/help-center/s/assets/assets-assignments) — See who has which asset.

---

*Category: `assets` | Language: `en`*
