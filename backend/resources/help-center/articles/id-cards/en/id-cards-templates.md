# ID Card Templates

The ID Card Templates page lets you create and manage reusable ID card designs for your school. Administrators and staff use templates to define the layout, background images, and fields (name, photo, class, QR code, etc.) that appear on student ID cards. Templates are then used when assigning cards to students and when exporting cards for printing.

---

## Page Overview

When you open the ID Card Templates page, you will see:

### Summary Cards

This page does not have summary cards. The main content is a table of all templates.

### Filters & Search

There are no filters or search on this page. All templates for your organization are listed in the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Template Name | The name of the template. A "Default" badge appears next to the name if this template is set as the default. |
| Description | Short description of the template, or "-" if none. |
| Background | Indicates whether front and/or back background images are set (Front, Back, or "None"). |
| Status | Active or Inactive badge. Inactive templates are not available when assigning or exporting cards. |
| Created | The date the template was created. |
| Actions | Buttons: Set as Default, Edit Layout, Edit, Delete. |

### Row Actions

When you use the action buttons on any row:

- **Set as Default** — Marks this template as the default. Only one template can be default; the badge appears next to its name. This button is hidden for the template that is already default.
- **Edit Layout** — Opens the Layout Editor dialog where you can customize which fields appear on the card and their positions (front and back).
- **Edit** — Opens the create/edit form with the template’s current data so you can change name, description, backgrounds, and options.
- **Delete** — Opens a confirmation dialog. Confirming removes the template permanently.

### Bulk Actions

No bulk actions are available on this page.

---

## Creating a New Template

To create a new template, click the **"Create Template"** button at the top of the page. A dialog will open with the following fields:

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Template Name | Text | Yes | A unique name for the template (e.g. "Student ID Card"). |
| Description | Textarea | No | Optional description of the template. |
| Background Image (Front) | File upload (image) | No | Image file for the front side of the card. Accepted formats: image/*. |
| Background Image (Back) | File upload (image) | No | Image file for the back side of the card. |
| Set as Default | Switch | No | If enabled, this template becomes the default. |
| Active | Switch | No | If enabled, the template is active and available for assignment and export. Default is On. |

There is no separate tab structure; all fields are in one form. Card size is fixed as CR80 (standard ID card size) and is not shown in the form.

### What Happens After Submission

1. The system validates that the template name is not empty.
2. If you uploaded new front or back images, they are saved. If you left them empty when editing, the current images are kept.
3. Layout configuration uses defaults: front shows student name, student code, admission number, class, student photo, and QR code; back shows school name, expiry date, and card number.
4. A success message appears (e.g. "ID card template created successfully").
5. The dialog closes and the table refreshes to show the new template.

---

## Editing a Template

To edit an existing template:

1. Find the template in the table.
2. Click the **Edit** button (pencil icon) in the Actions column.
3. The dialog opens with the current name, description, default and active toggles, and layout config. Background images are not re-uploaded; the form shows "Current image will be kept" for front/back if you do not choose a new file.
4. Change any fields (name, description, new front/back images, Set as Default, Active).
5. Click **"Save Template"**.
6. A success message appears and the table refreshes.

---

## Editing Layout (Edit Layout)

To customize which fields appear and where they are placed:

1. Find the template in the table.
2. Click the **"Edit Layout"** button (layout icon).
3. The Layout Editor dialog opens with two tabs: **Front** and **Back**.
4. For each side you can:
   - Enable or disable fields (e.g. student name, student code, admission number, class, student photo, QR code on front; school name, expiry date, card number on back).
   - Drag elements to reposition them on the card.
   - Adjust font size, font family, text color, and RTL option.
   - For the QR code, choose the value source (e.g. student ID, student code, admission number, card number, roll number).
5. Click **Save** in the layout editor to store the layout. The dialog closes and the template is updated.

---

## Deleting a Template

To delete a template:

1. Click the **Delete** button (trash icon) on the template row.
2. A confirmation dialog appears: "Are you sure you want to delete this ID card template? This action cannot be undone."
3. Click **"Delete"** to remove the template permanently, or **"Cancel"** to keep it.
4. If you delete a template that is in use, assignments that reference it may be affected; consider reassigning those students to another template first.

---

## Export Options

This page does not offer PDF or Excel export. Templates are managed only here; actual ID card data is exported from the ID Card Export page.

---

## Tips & Best Practices

- Create at least one template and set it as default so it is pre-selected when assigning or exporting cards.
- Use the Edit Layout feature after creating a template to match your school’s preferred layout and fields.
- Upload clear, high-resolution background images (front and back) for a professional look.
- Keep one template Active and mark older or experimental ones Inactive instead of deleting them until you are sure they are no longer needed.
- If you have both regular students and course students, you can use the same template or create separate templates for each type.

---

## Related Pages

- [ID Card Assignment](/help-center/s/id-cards/id-cards-assignment) — Assign a template to students and manage fee/print status.
- [ID Card Export](/help-center/s/id-cards/id-cards-export) — Export assigned ID cards as ZIP or PDF for printing.

---

*Category: `id-cards` | Language: `en`*
