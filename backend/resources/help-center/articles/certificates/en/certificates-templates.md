# Certificate Templates (Graduation)

The Certificate Templates (Graduation) page is used to create and manage **graduation certificate templates**. These templates define the layout, background image, and styling for certificates issued to students when they complete a graduation batch. Staff use this page to add templates, assign them to a school, upload a background image, and adjust layout (e.g. student name, father name, class, school name, graduation date, certificate number) using the Layout Editor. Templates can be school-specific or shared across schools.

---

## Page Overview

When you open the Certificate Templates (Graduation) page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

This page does not have filters or search. All graduation templates for your organization are listed.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|--------------|
| Template Name | Name or title of the template. |
| Description | Short description, or "–" if none. |
| School | The school this template is assigned to, or "All Schools" if not school-specific. |
| Background | "Yes" if a background image is set; "None" if not. |
| Status | Badge: "Active" or "Inactive". Inactive templates are not offered when issuing graduation certificates. |
| Created | Date the template was created. |
| Actions | Buttons: Edit Layout, Edit (pencil), Delete (trash). |

### Row Actions

When you use the action buttons on any row:

- **Edit Layout** — Opens the Layout Editor so you can drag and position fields (header, student name, father name, class, school name, academic year, certificate number, graduation date) on the certificate and adjust styling.
- **Edit (pencil)** — Opens the create/edit dialog with the template’s name, school, background image, description, layout settings (font size, font family, text color, RTL), and active status.
- **Delete (trash)** — Opens a confirmation dialog. Confirming permanently deletes the template.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Template

To create a new graduation certificate template, click the **"Create Template"** button at the top of the page. A dialog will open with the following:

### Main Fields

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| Template Name | Text | Yes | A unique name (e.g. "Graduation Certificate"). |
| School | Dropdown | Yes | The school this template belongs to. Required; select from the list of schools. |
| Background Image | File upload | No | Image file (e.g. PNG, JPG) used as the certificate background. If editing, leaving this empty keeps the current image. |
| Description | Textarea | No | Optional description of the template. |

### Layout Settings

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| Font Size | Number | No | Font size for certificate text (default 24). |
| Font Family | Text / Datalist | No | Font name; suggestions include Arial, Roboto, Bahij Nassim, Bahij Titr Bold, Times New Roman, Tahoma, Noto Sans Arabic. Use Bahij or Noto Sans Arabic for RTL languages. |
| Text Color | Color picker | No | Color for certificate text (default black). |
| Right-to-Left (RTL) | Switch | No | Enable for Pashto/Arabic. Default is on. |

### Options

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| Active | Switch | No | When on, the template can be used when issuing graduation certificates. Default is on. |

### What Happens After Submission

- The template is saved and the table refreshes.
- You can then use **Edit Layout** to position and style all elements (student name, class, school name, graduation date, certificate number, etc.) on the certificate.

---

## Editing a Template

To edit an existing template:

1. Find the template in the table.
2. Click the **Edit (pencil)** button.
3. The dialog opens with current name, school, description, layout settings, and active status. The current background image is kept unless you upload a new file.
4. Change any fields (e.g. name, school, description, font, color, RTL, active).
5. Click **"Save Template"**.
6. A success message appears and the table refreshes.

To change only the positions and layout of elements, use **Edit Layout**, then save from the Layout Editor.

---

## Deleting a Template

To delete a template:

1. Click the **Delete (trash)** button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this certificate template? This action cannot be undone."
3. Click **"Delete"** to remove the template permanently, or **"Cancel"** to keep it.
4. Ensure at least one template remains (or create a new one) before issuing graduation certificates.

---

## Layout Editor

The **Edit Layout** action opens a full-screen Layout Editor:

- **Background** — The template’s background image is shown (if set) so you can place fields accurately.
- **Draggable elements** — Header, student name, father name, class, school name, academic year, certificate number, and graduation date can be dragged to position them (positions stored as percentages).
- **Save / Cancel** — Save updates the template layout; Cancel closes without saving.

Use the Layout Editor after creating a template so graduation certificates match your school’s design.

---

## Export Options

This page does not provide PDF or Excel export. It is for managing templates only.

---

## Tips & Best Practices

- **Create at least one template per school** — Before creating graduation batches or issuing certificates, create and configure at least one active template for the school.
- **Use RTL and suitable fonts** — For Pashto, Arabic, or Farsi, keep "Right-to-Left (RTL)" on and use Bahij Nassim or Noto Sans Arabic for correct display.
- **Upload a high-quality background** — Use a clear, high-resolution image so certificates print well.
- **Test before issuing** — After editing layout, issue a test certificate from a graduation batch to confirm the result.
- **Keep templates active** — Only active templates appear when issuing certificates; turn "Active" off only when retiring a design.

---

## Related Pages

- [Certificate Templates (Course)](/help-center/s/certificates/certificate-templates) — Manage course completion certificate templates.
- [Certificates Issued](/help-center/s/certificates/certificates-issued) — View, download, verify, and revoke issued graduation certificates.
- [Graduation Batches](/help-center/s/graduation/graduation-batches) — Create batches and issue graduation certificates using these templates.

---

*Category: `certificates` | Language: `en`*
