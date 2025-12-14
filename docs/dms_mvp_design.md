# Nazim Document Management System (DMS) MVP Design

This document summarizes the final, ready-to-build MVP scope for Nazim's school-focused Document Management System. It captures the sidebar IA, required pages, database schema, backend modules, frontend routes/components, printing guidance, and the deliverables checklist to keep implementation aligned and scoped.

## Sidebar Structure

**Document System**
1. Dashboard
2. Incoming Documents
3. Outgoing Documents
4. Issue Letter (Templates)
5. Templates
6. Letterheads
7. Departments & Routing
8. Archive & Search
9. Reports
10. Settings (Numbering + Security)

## Page Requirements

### Dashboard
- Cards: incoming/outgoing counts (week/month), pending routed docs, confidential+ docs (only for cleared users).
- Quick actions: new incoming, new outgoing, issue letter.
- Recent activity stream.

### Incoming Documents
- **List filters:** date range, sender org, subject, status, security level, indoc number, routed department.
- **Actions:** view, download scan, change status, link to outgoing response, print cover sheet (optional).
- **Create/Edit fields:** auto/manual numbering; external doc number & date; sender name/org/address; subject; received date; security level; routing department; assigned user; notes; upload scan/attachments.

### Outgoing Documents
- **List filters:** date range, recipient type, subject, status, security level, outdoc number, signed_by.
- **Actions:** view, download PDF, reprint, clone, cancel.
- **Create/Edit fields:** auto/manual numbering; recipient type (student/staff/applicant/external); security level; subject; HTML body; attachments; generate PDF toggle if not template-based.

### Issue Letter (Templates)
- Pick template and security level (cannot exceed user clearance).
- Auto/manual numbering.
- Choose recipient type/record; mass announcement supports filters (classes/sections/academic year), table preview (student list), portrait/landscape toggle.
- Live preview panel; issue & generate PDF; auto-log to outgoing.

### Templates
- CRUD with category (student/staff/applicant/general/announcement), variables (JSON), allow-edit-body toggle, default security level, layout (A4 portrait/landscape), active toggle, preview with mock data.

### Letterheads
- Upload letterhead PDFs/images; set defaults per layout; integrate school branding (logo/name/address); preview.

### Departments & Routing
- Department list with user assignments; optional routing rules (e.g., sender contains "Ministry" → Admin). Manual routing acceptable for MVP.

### Archive & Search
- Global search on indoc/outdoc number, subject, sender org, recipient name, template name.
- Enforce security filtering; admin-only bulk CSV export of metadata.

### Reports
- Incoming by month/department; outgoing by month/template; security level distribution (admin); pending documents aging.

### Settings
- Document numbering: prefixes per type, year format (gregorian/hijri/shamsi via year_key), yearly reset toggle.
- Security: security levels list + ranks; user clearance management.

## Database Schema (MVP)

### Core Lookups
- `security_levels`: id, organization_id, key, label, rank, active.
- `departments`: id, organization_id, school_id, name.
- `user_department`: pivot mapping users to departments.

### Numbering
- `document_sequences`: organization_id, school_id, doc_type (incoming/outgoing), prefix, year_key, last_number (locked for atomic increments).
- `document_settings`: organization_id, school_id, incoming_prefix, outgoing_prefix, year_mode, reset_yearly.

### Incoming / Outgoing
- `incoming_documents`: org/school, security_level_key, numbering fields (prefix/number/full/is_manual/manual_value), external doc number & date, sender info, subject, received date, routing department, assigned user, status, notes, created_by/updated_by, timestamps.
- `outgoing_documents`: org/school, security_level_key, numbering fields, recipient type/id or external recipient info, subject, body_html, pdf_path, issue_date, signed_by_user_id, status, timestamps.
- `document_links`: org/school, incoming_document_id, outgoing_document_id, relation_type, timestamps.

### Files / Scans
- `document_files`: org/school, owner_type (incoming/outgoing), owner_id, file_type (scan/attachment/generated_pdf), original_name, mime_type, size_bytes, storage_path, sha256 (optional), version (int), uploaded_by_user_id, timestamps.

### Templates & Letterheads
- `letter_templates`: org/school, name, category, body_html, variables (jsonb), allow_edit_body, default_security_level_key, page_layout, is_mass_template, active, timestamps.
- `letterheads`: org/school, name, file_path, default_for_layout (portrait/landscape), active.
- Optional `outgoing_letters_meta`: outgoing_document_id, announcement_scope (jsonb), table_payload (jsonb); for MVP these payloads can live directly on `outgoing_documents`.

### Audit Log
- `document_audit_logs`: org/school, actor_user_id, action (created/updated/viewed/downloaded/printed/status_changed), doc_type (incoming/outgoing/template), doc_id, meta (jsonb), created_at.

## Backend Scope (Laravel)

### Services
- **DocumentNumberingService:** `generateIncomingNumber` / `generateOutgoingNumber` using transactions + row locks on `document_sequences`.
- **SecurityGateService:** `canView(user, security_level_key)` based on clearance rank; applied via policies and scopes.
- **DocumentRenderingService:** renders HTML + letterhead + table payload with RTL support, repeated table headers, page breaks, and landscape handling.
- **PDF generation:** prefer `spatie/browsershot` for consistent print quality and RTL/table handling.

### Controllers
- IncomingDocumentsController (CRUD, upload, status changes)
- OutgoingDocumentsController (CRUD, generate PDF, print log)
- DocumentFilesController (upload/download, versioning)
- LetterTemplatesController
- LetterheadsController
- DepartmentsController
- DocumentReportsController
- DocumentSettingsController

### Policies & Permissions
- Permissions: `dms.incoming.read/create/update/delete`, `dms.outgoing.read/create/update/delete`, `dms.templates.read/create/update/delete`, `dms.letterheads.manage`, `dms.reports.read`, `dms.settings.manage`, `dms.security.manage_clearance`.
- Rule: permission + clearance rank >= document security rank + organization scope alignment.

## Frontend Scope (React + TS + shadcn)

### Routes
- `/dms/dashboard`, `/dms/incoming`, `/dms/incoming/new`, `/dms/incoming/:id`
- `/dms/outgoing`, `/dms/outgoing/new`, `/dms/outgoing/:id`
- `/dms/issue-letter`, `/dms/templates`, `/dms/templates/new`, `/dms/templates/:id`
- `/dms/letterheads`, `/dms/departments`, `/dms/archive`, `/dms/reports`, `/dms/settings`

### Shared Components
- `SecurityBadge`, `DocumentNumberBadge`, `FileUploader` (multi-file + versioning), `PdfPreviewDrawer`, `TemplateEditor` (HTML), `MassTableBuilder` (announcement preview).

### Data/Performance
- Server-side pagination; filters on indexed columns such as full_doc_number, subject, sender_org, received_date, issue_date, security_level_key.

## Printing & Long Tables
- Use Browsershot/Headless Chrome for PDF generation.
- HTML editor recommendation: TipTap (or Quill); tables via TanStack Table with virtualization for large lists.
- Store long announcement tables as structured `table_payload` JSON and render server-side; prefer landscape for wide tables and limit column count.

## Deliverables Checklist

### Backend
- [x] Migrations for all tables above
- [x] Services: numbering, rendering, security gate
- [x] CRUD APIs for incoming/outgoing/templates/letterheads/files/departments/settings
- [x] Policies enforced across endpoints
- [x] PDF generation endpoints verified

### Frontend
- [x] Sidebar and routes
- [x] Incoming/Outgoing logs with filters + pagination
- [x] Create forms with uploads
- [x] Issue Letter flow with live preview and mass table preview
- [x] Templates & Letterheads CRUD
- [x] Archive search page
- [x] Reports page (charts/cards)

This MVP scope focuses on security, predictable numbering, and high-quality PDFs while keeping implementation straightforward and ready to extend.
