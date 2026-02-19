# Finance Documents

The Finance Documents page is where you upload, view, and manage finance-related files such as invoices, receipts, budgets, reports, tax documents, vouchers, and bank statements. Staff use it to keep all supporting documents in one place, filter by type or date, and export lists for audits or reporting. Documents can be linked to fee collections, students, or staff when applicable.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

- **Total Documents** — Number of documents matching the current filters.
- **Total Amount** — Sum of the "amount" field across all filtered documents (formatted as currency). Useful when documents have amounts entered.
- **Document Types** — A card showing counts for up to three document types (e.g., Invoice: 5, Receipt: 3, Budget: 2) based on filtered data.

### Filters & Search

- **Document Type** — Filter by type: All, or one of Invoice, Receipt, Budget, Report, Tax Document, Voucher, Bank Statement, Other.
- **Start Date** — Only show documents with document date on or after this date.
- **End Date** — Only show documents with document date on or before this date.
- **Search** — Search within document fields (e.g., title, reference). Results and summary cards update based on filters.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Document Type | Badge with the type (Invoice, Receipt, Budget, etc.). |
| Title | Document title; description shown below if present (truncated). |
| Reference Number | Reference number if entered; otherwise "-". |
| Amount | Amount if entered (formatted as currency); otherwise "-". |
| Document Date | Date of the document (if set). |
| File Name | Name of the uploaded file with a file-type icon. |
| File Size | Size of the file (e.g., KB, MB). |
| Uploaded At | When the document was uploaded. |
| Actions | Download and Delete buttons. |

Clicking a row opens the **Preview** dialog for that document. Use the Download or Delete buttons in the Actions column (they do not open the preview).

### Row Actions

- **Preview** — Click anywhere on the row to open the preview dialog and see document details.
- **Download** — Downloads the file to your device.
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the document permanently.

### Bulk Actions

No bulk actions available on this page.

---

## Uploading a New Document

To upload a new finance document, click the **"Upload Document"** button at the top. The upload dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Document Type | Select | Yes | One of: Invoice, Receipt, Budget, Report, Tax Document, Voucher, Bank Statement, Other. |
| Title | Text | Yes | Short title for the document (max 255 characters). |
| Description | Textarea | No | Optional description. |
| Amount | Number | No | Monetary amount (e.g., for invoices or receipts). |
| Reference Number | Text | No | Reference or voucher number (max 100 characters). |
| Document Date | Date picker | No | Date of the document. |
| File | File upload | Yes | The file to upload. Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG. Maximum size: 20 MB. |

Click **Upload** to submit. While uploading, the button shows a loading state. On success, the dialog closes and the table refreshes.

### What Happens After Submission

- The document is saved and appears in the table.
- A success message is shown.
- You can open the row to preview, or use Download/Delete as needed.

---

## Editing a Document

This page does not support editing documents after upload. To change details, you would need to delete the document and upload a new one with corrected information (if your organization allows it).

---

## Deleting a Document

To delete a document:

1. Click the Delete (trash) button in the Actions column for that row.
2. A confirmation dialog appears asking you to confirm deletion.
3. Click **Delete** to remove the document permanently, or **Cancel** to keep it.
4. Deletion cannot be undone; the file is removed from the system.

---

## Preview Dialog

Clicking a table row opens the preview dialog. It shows the document’s type, title, description, reference number, amount, document date, file name, file size, and uploaded-at date. Use it to verify details before downloading or sharing. Close the dialog to return to the table.

---

## Export Options

PDF and Excel export are available in the page header. The export uses the current filtered list and includes: Document Type, Title, Reference Number, Amount, Document Date, File Name, File Size, Uploaded At. A filter summary (document type, date range, search) can be included. Template type is "finance_documents". Exports match the on-screen filters.

---

## Tips & Best Practices

- Always choose the correct Document Type so filters and reports are accurate.
- Enter a clear Title and, when relevant, Reference Number and Amount for easier search and reporting.
- Use Document Date for the actual date of the document (e.g., invoice date), not the upload date.
- Keep file sizes under 20 MB; compress large PDFs or images if needed.
- Use the filters and search to find documents quickly for audits or reporting.

---

## Related Pages

- [Finance Income](/help-center/s/finance/finance-income) — Record income; you may attach or reference finance documents
- [Finance Expenses](/help-center/s/finance/finance-expenses) — Record expenses; you may attach or reference finance documents
- [Finance Reports](/help-center/s/finance/finance-reports) — Reports that may reference or summarize document data

---

*Category: `finance` | Language: `en`*
