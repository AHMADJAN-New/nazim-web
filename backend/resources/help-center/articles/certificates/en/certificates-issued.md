# Issued Certificates

The Issued Certificates page lists all **graduation certificates** that have been issued to students. School staff use this page to view issued certificates, preview or download them as PDF, verify certificates via a public verification link, and revoke a certificate when necessary (e.g. if it was issued in error). You can filter by school, batch, or student ID and export the list to PDF or Excel.

---

## Page Overview

When you open the Issued Certificates page, you will see:

### Summary Cards

This page does not have summary cards. The main content is a filter panel and a table of issued certificates.

### Filters & Search

- **School** — Dropdown to filter certificates by school. If your organization has one school, it may be auto-selected; otherwise choose a school or leave as selected to see that school’s certificates.
- **Batches** — Text input to filter by batch ID (e.g. paste a batch UUID). Optional.
- **Student ID** — Text input to filter by student ID. Optional; use to find all certificates for one student.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|--------------|
| Certificate No | Unique certificate number assigned when the certificate was issued. |
| Student | Full name of the student who received the certificate (from student record). |
| Status | Badge: "Valid" (green) or "Revoked" (red). Revoked certificates are no longer considered valid. |
| Issued At | Date and time the certificate was issued. |
| Actions | Dropdown menu (⋮) with: Preview, Download PDF, Verify Certificate, and (if valid) Revoke Certificate. |

Clicking a row (not the actions menu) opens a **details side panel** with full certificate, student, batch, and school information and quick actions (Preview, Download, Verify, Revoke).

### Row Actions

When you click the actions menu (⋮) on any row:

- **Preview** — Opens a dialog that shows the certificate as it would appear when printed or downloaded (PDF preview).
- **Download PDF** — Downloads the certificate as a PDF file. If you have multiple schools, ensure the correct school is selected in the filter (or the certificate’s school is used) so the download works correctly.
- **Verify Certificate** — Opens the public verification page in a new tab. Anyone with the link can confirm that the certificate is genuine and see key details (e.g. student name, status). The link uses a unique verification hash.
- **Revoke Certificate** — (Only for certificates with status "Valid".) Opens a dialog where you must enter a **Revoke Reason** (required). If your organization has multiple schools, you may need to select the school for the certificate. Confirming revokes the certificate; it will then show as "Revoked" and the revoke reason is stored.

### Bulk Actions

No bulk actions available on this page. Actions are per certificate.

---

## Certificate Details Side Panel

When you click a row (not the actions menu), a side panel opens on the right with:

- **Status** — Valid or Revoked; if revoked, the revoke reason is shown.
- **Certificate Information** — Certificate number, issued date, revoked date (if applicable), and verification hash.
- **Student Information** — Student name, father name, student ID.
- **Batch Information** — Graduation date, class.
- **School Information** — School name.
- **Actions** — Buttons: Preview, Download PDF, Verify, and (if valid) Revoke.

Closing the panel returns you to the table.

---

## Revoking a Certificate

To revoke an issued certificate:

1. Find the certificate in the table (status must be "Valid").
2. Click the actions menu (⋮) → **Revoke Certificate** (or open the row and click **Revoke** in the side panel).
3. In the dialog, if you have multiple schools, select the **School** for this certificate if not already set.
4. Enter **Revoke Reason** (required). Example: "Issued in error – wrong student."
5. Click **"Revoke Certificate"**.
6. The certificate status changes to "Revoked", the revoke reason and date are stored, and the dialog closes. Revocation cannot be undone.

---

## Export Options

At the top right of the page, **Report Export** buttons allow you to export the current list:

- **PDF** — Generates a report in PDF format with columns: Certificate No, Student, Student ID, Graduation Date, Class, Issued At, Status, Revoked At, Revoke Reason. The report respects the current filters (school, batch, student ID).
- **Excel** — Same data exported to Excel. Useful for record-keeping or further analysis.

Export uses the same filters as the table; only certificates that match the current School, Batch, and Student ID filters are included.

---

## Tips & Best Practices

- **Select the correct school** — If you have multiple schools, choose the school in the filter before downloading or revoking so the system uses the right context.
- **Use Verify for authenticity** — Share the verification link with employers or other parties so they can confirm a certificate is genuine and see its current status (valid or revoked).
- **Document revoke reasons** — Always enter a clear revoke reason for audit and future reference.
- **Use filters to find certificates** — Use Batch or Student ID when you need to find a specific certificate or all certificates for one student.
- **Preview before download** — Use Preview to check the certificate appearance before downloading or sharing.

---

## Related Pages

- [Certificate Templates (Course)](/help-center/s/certificates/certificate-templates) — Manage course completion certificate templates.
- [Certificates Templates (Graduation)](/help-center/s/certificates/certificates-templates) — Create and edit graduation certificate templates used when issuing.
- [Graduation Batches](/help-center/s/graduation/graduation-batches) — Create batches and issue graduation certificates; issued certificates appear on this page.

---

*Category: `certificates` | Language: `en`*
