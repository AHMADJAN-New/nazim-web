# Schools Management

The Schools Management page lets you manage school records and branding for your organization. Each school has a name, contact details, colors, fonts, logos, and report settings that are used across the system (e.g., in PDF and Excel reports). If your organization has the multi-school feature, you can add more than one school; otherwise, you manage the single school linked to your organization. Administrators also use this page to manage watermarks and school rules per school.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards at the top.

### Filters & Search

- **Search** — Search schools by name (any language), email, phone, or website. Type to filter the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| School Name | Primary name of the school. |
| Arabic Name | School name in Arabic, if set. |
| Pashto Name | School name in Pashto, if set. |
| Email | School email address. |
| Phone | School phone number. |
| Status | Active or Inactive badge. |
| Actions | Dropdown menu (⋮) with: View Details, Manage Watermarks, School Rules, Edit, Delete. |

### Row Actions

When you click the actions menu (⋮) on any row:

- **View Details** — Opens a read-only dialog showing full school information: names, address, contact, status, colors, font, report font size, and all three logos (primary, secondary, ministry) with usage. From there you can click **Edit** to open the edit form.
- **Manage Watermarks** — Expands a Watermark Management section below the table for this school, where you can add or edit text/image watermarks used in reports.
- **School Rules** — Expands a School Rules Management section below the table for this school.
- **Edit** — Opens the create/edit dialog with all current data and logo settings so you can update the school.
- **Delete** — Opens a confirmation dialog. Confirming deletes the school record. (Only shown if you have delete permission.)

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New School

To add a new school, click the **"Add School"** button at the top. The button is disabled if your organization does not have the **multi_school** feature—in that case only one school exists and you edit it instead of adding another. A form dialog will open with the following:

### Basic Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School Name | Text | Yes | Primary name of the school. Max 255 characters. |
| Arabic Name | Text | No | School name in Arabic. Max 255 characters. |
| Pashto Name | Text | No | School name in Pashto. Max 255 characters. |
| Address | Text | No | School address. |
| Phone | Text | No | Phone number. Max 50 characters. |
| Email | Text (email) | No | Valid email address. |
| Website | Text | No | Website URL. Max 200 characters. |

### Branding: Colors & Font

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Primary Color | Color picker + hex text | No | Default #0b0b56. Used in reports and UI. |
| Secondary Color | Color picker + hex text | No | Default #0056b3. |
| Accent Color | Color picker + hex text | No | Default #ff6b35. |
| Font Family | Select + custom text | No | Options include Bahij Nassim, Arial, Tahoma, DejaVu Sans, etc. You can type a custom font name. |
| Report Font Size | Select | No | 10px–20px. Default 12px. Affects text size in generated reports. |
| Calendar Preference | Select | No | Gregorian, Hijri, or Solar. Affects date display in reports. |

### Logos

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Primary Logo | File upload (image) | No | Main school logo. Preview shown when selected or when editing and existing logo is present. |
| Secondary Logo | File upload (image) | No | Second logo (e.g., partner or ministry). |
| Ministry Logo | File upload (image) | No | Ministry or authority logo. |

**Report logo settings** — You can enable at most **two** of the three logos to show on reports. For each logo you can:

- Toggle **Show** on/off (primary is on by default).
- Choose **Position**: Left or Right.

If two logos are already enabled, the third cannot be enabled until you disable one. A message reminds you when the maximum is reached.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Primary Logo Usage | Select | No | Where to use primary logo: Header, Footer, Both, or None. |
| Secondary Logo Usage | Select | No | Same options. Default Footer. |
| Ministry Logo Usage | Select | No | Same options. Default Header. |
| Header Text | Text | No | Optional text in report header. Max 500 characters. |

### Status

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Active | Switch | No | Whether the school is active. Default On. |

### What Happens After Submission

- Validation runs (e.g., required school name, valid email, hex colors, max two logos enabled).
- On success, the dialog closes and the schools table refreshes. The new school appears in the list and can be selected as default school for users and used in report templates and branding.

---

## Editing a School

To edit an existing school:

1. Find the school in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The same form opens with all current data and logo settings pre-filled. Existing logos are shown if present; you can upload new files to replace them (leaving the field empty keeps the current logo).
4. Make your changes in any section.
5. Click **"Update"** (or "Create" for the submit button label).
6. On success, the dialog closes and the table refreshes.

---

## Deleting a School

To delete a school:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears with the school name.
3. Click **"Delete"** to confirm or **"Cancel"** to keep the school.
4. Deleting removes the school record. Ensure no critical data (e.g., students, staff, report templates) depends on this school before deleting, or migrate them to another school first.

---

## View Details Dialog

The **View Details** action opens a read-only dialog showing:

- All basic info (names, address, phone, email, website, status).
- Primary, secondary, and accent colors (with swatches and hex codes).
- Font family and report font size.
- All three logos (if uploaded) with filename and size; usage (header/footer/both/none) is shown. If no logo is uploaded, "No logo uploaded" is shown.

From this dialog you can click **Edit** to open the edit form, or **Close** to return.

---

## Manage Watermarks & School Rules

- **Manage Watermarks** — When you choose this from the row menu, a **Watermark Management** block appears below the table for that school. There you can create and manage text or image watermarks that can be used in report templates for this school.
- **School Rules** — When you choose **School Rules** from the row menu, a **School Rules Management** block appears below the table for that school, where you can manage school rules text.

---

## What This Setting Controls

- **School branding** (name, logos, colors, fonts) is used in PDF and Excel reports, report templates, and anywhere the system shows school identity.
- **Report templates** are linked to a school; when generating a report you choose a school (branding) and optionally a report template for that school.
- **Users** have a default school; data is often filtered by the user's default school. Adding or removing schools affects which school users can select as default.
- Creating additional schools **requires the multi_school feature** for your organization; otherwise the **Add School** button is disabled.

---

## Tips & Best Practices

- Upload at least a primary logo so reports and certificates look professional and identifiable.
- Use at most two logos on reports to avoid a crowded header/footer; choose position (left/right) to balance layout.
- Keep school name, email, and phone up to date so they appear correctly on reports and in the phonebook.
- Use **View Details** to double-check branding before generating important reports.

---

## Related Pages

- [Report Templates](/help-center/s/settings/settings-report-templates) — Configure report header, footer, and logo per report type and school
- [User Permissions](/help-center/s/settings/settings-user-permissions) — Assign users and their default school
- [Roles](/help-center/s/settings/settings-roles) — Manage roles used for access control

---

*Category: `settings` | Language: `en`*
