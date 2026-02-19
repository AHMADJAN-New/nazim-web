# Dashboard

The Dashboard is the main overview page you see after logging into the Nazim School Management System. It shows key numbers (students, staff, classes, rooms, buildings), charts such as students by class, quick links to important pages, and optional tabs for Finance, Assets, Library, Attendance, Leave, and Documents. School administrators and staff use it to monitor activity at a glance and jump quickly into daily tasks.

---

## Page Overview

When you open the Dashboard, you will see:

### Welcome Section

- A **welcome banner** at the top with a greeting (e.g. "Welcome back, [username]!") and a short message such as "Here's what's happening at your school today."
- The **current date** is shown (often on the right), using your preferred calendar (Gregorian, Jalali, or Qamari).

### Summary Cards

The top of the page shows up to four **summary cards**. Which cards appear depends on your **permissions**:

- **Total Students** — Number of active students in your organization/school. Click the card or "View Students" to go to the Students page.
- **Total Staff** — Number of active staff. Click to go to the Staff page.
- **Total Classes** — Number of active classes. Click to go to Settings → Classes.
- **Total Rooms** — Number of available rooms. Click to go to Settings → Buildings.
- **Total Buildings** — Number of school buildings. Click to go to Settings → Buildings.

If you do not have permission for a module (e.g. students or staff), that card is hidden. Cards are clickable and take you to the related page.

### Charts

- **Students by Class** — A bar chart showing how many students are in each class. Only visible if you have permission to view classes. A "View All" button takes you to the Students page.

### Quick Actions

- A set of **buttons** (e.g. Students, Staff, Classes, Buildings) that take you directly to the corresponding page. Only actions for modules you have permission to use are shown.

### Today's Summary

- A card that may show **Upcoming Exams** (count) if you have exam permission, and a short message about viewing other tabs (Finance, Assets, Library, etc.) for more details.

### Tabs

Below the overview content, the Dashboard may show **tabs**:

- **Overview** — The default view described above (welcome, cards, charts, quick actions, today's summary).
- **Finance** — Finance dashboard (if you have any finance-related permission).
- **Assets** — Assets dashboard (if you have assets permission).
- **Library** — Library dashboard (if you have library permissions).
- **Attendance** — Attendance dashboard (if you have attendance session permissions).
- **Leave Requests** — Leave requests dashboard (if you have leave permission).
- **Documents** — Documents/DMS dashboard (if you have document management permissions).

Only tabs for which you have permission are visible. Click a tab to see that module’s dashboard content (each tab may have its own cards and charts).

---

## How to Use the Dashboard

1. **Check key numbers** — Use the summary cards to see totals for students, staff, classes, and rooms at a glance.
2. **Use quick actions** — Click a quick action button to go straight to Students, Staff, Classes, or Buildings.
3. **View charts** — Use "Students by Class" to see distribution across classes; click "View All" to open the full Students list.
4. **Switch tabs** — If you see Finance, Library, Attendance, etc., click the tab to open that module’s dashboard.
5. **Navigate to details** — Click any summary card to open the related list or settings page.

---

## Permission-Based Visibility

- **Students** — Cards, chart, and quick action appear only with `students.read` (and related feature flags).
- **Staff** — Shown only with `staff.read`.
- **Classes** — Shown only with `classes.read`.
- **Buildings / Rooms** — Shown only with `buildings.read` / `rooms.read`.
- **Finance tab** — Visible if you have any of the finance permissions (e.g. finance accounts, income, expenses, fees, reports).
- **Assets, Library, Attendance, Leave, Documents tabs** — Each depends on the corresponding module permissions.

If you expect to see a card or tab but it is missing, contact your administrator to check your permissions.

---

## Event Users

If your account is set as an **event user** (linked to a specific event), you are redirected to that event’s page instead of the main Dashboard. The standard Dashboard is for regular school staff and administrators.

---

## Tips & Best Practices

- **Use the Dashboard as your home base** — After login, review the cards and then use quick actions or the sidebar to go to the module you need.
- **Check the correct school** — If you have multiple schools, ensure the school switcher is set to the school you want before relying on the numbers and charts.
- **Use tabs for deeper summaries** — Open the Finance, Library, or Attendance tab to see module-specific dashboards without leaving the Dashboard page.
- **Click through for details** — Summary cards and "View All" links take you to the full list or report; use them when you need to work with individual records.

---

## Related Pages

- [Getting Started](/help-center/s/general/getting-started) — First steps and logging in
- [Account & Profile](/help-center/s/general/account-profile) — Your profile and settings
- [Phone Book](/help-center/s/general/phonebook) — Quick access to contacts (students, staff, donors, guests)

---

*Category: `general` | Language: `en`*
