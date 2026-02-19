# Assets Dashboard

The Assets Dashboard gives you a single-page overview of your organization's assets: total count and value, maintenance cost, assigned vs available, and charts by status and category. Use it to spot trends and jump quickly to the asset list, assignments, or categories.

---

## Page Overview

When you open the Assets Dashboard you will see a header with the current month date range, summary cards, and a row of charts and lists. A download (export) button is available in the header.

### Summary Cards

- **Total Assets** — Total number of asset types in inventory. Below it shows how many are "available" and a **View Assets** button that goes to the main Assets list.
- **Total Value** — Combined purchase value of all assets, with a percentage change vs last month (e.g. "+12.5% vs last month"). Displayed in your currency.
- **Maintenance Cost** — Total amount spent on maintenance, with percentage change vs last month.
- **Assigned Assets** — Count of assets (or copies) currently assigned. Shows number of "recent assignments" and a **View Assignments** button that goes to the Asset Assignments page.
- **In Maintenance** — Count of assets in "maintenance" status. Subtitle: "Requires attention."

### Charts and Sections

- **Status Breakdown** — Pie chart and list showing how many assets are in each status (e.g. Available, Assigned, Maintenance, Retired, Lost, Disposed). Each segment shows count and percentage of total. If there is no data, "No status data" is shown.
- **Assets by Category** — Bar chart and list of categories with total value and item count per category. A **View Categories** button links to the Asset Categories page. If there is no data, "No category data" is shown.
- **Assets by Finance Account** (if available) — List of finance accounts that have linked assets, with account name, item count, currency, and total value. **View Accounts** links to Finance accounts.
- **Recent Assignments** — List of the most recent assignments: asset name, assigned date, assignee name, and status badge (active, returned, etc.). **View All** goes to the Asset Assignments page. If there are no assignments, "No recent assignments" is shown.

### Quick Actions

- **View Assets** — Navigate to `/assets` (main asset list).
- **View Assignments** — Navigate to `/assets/assignments`.
- **View Categories** — Navigate to `/assets/categories`.
- **View All** (in Recent Assignments) — Navigate to `/assets/assignments`.
- **View Accounts** — Navigate to Finance accounts (when the finance section is visible).
- **Download** (header) — Export or download dashboard data (behavior may vary by implementation).

---

## How to Use the Dashboard

1. Open **Assets** in the menu, then **Assets Dashboard** (or go directly to `/assets/dashboard`).
2. Review the five summary cards to see total assets, value, maintenance cost, assigned count, and in-maintenance count.
3. Use **Status Breakdown** to see how assets are distributed by status.
4. Use **Assets by Category** to see value and count per category; click **View Categories** to manage categories.
5. Use **Recent Assignments** to see latest assignments; click **View Assignments** to manage them.
6. If **Assets by Finance Account** is shown, use it to see which accounts hold asset value; click **View Accounts** to open Finance.

---

## Tips & Best Practices

- Check **In Maintenance** regularly so assets that need repair or inspection are not forgotten.
- Use **Total Value** and **Maintenance Cost** together to assess whether maintenance spend is proportional to asset value.
- Use **View Assets** and **View Assignments** from the dashboard to avoid digging through the menu when you need to update records.

---

## Related Pages

- [Assets](/help-center/s/assets/assets) — Main asset list, create/edit/delete, maintenance tab.
- [Asset Assignments](/help-center/s/assets/assets-assignments) — Manage who has which asset.
- [Asset Categories](/help-center/s/assets/assets-categories) — Manage categories.
- [Asset Reports](/help-center/s/assets/assets-reports) — Detailed status, category, maintenance, and value reports.

---

*Category: `assets` | Language: `en`*
