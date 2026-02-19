# DMS Settings

The DMS Settings page controls how document numbers are generated and how the year is used in numbering for the Document Management System. School administrators use this page to set prefixes for incoming and outgoing document numbers, choose the calendar or year mode, and decide whether numbering resets each year. These settings affect how documents are labelled across DMS pages (Incoming, Outgoing, Archive).

---

## Page Overview

When you open the DMS Settings page, you will see a single card titled **Numbering & Security Settings** with a form. There are no summary cards, filters, or data tables.

---

## Settings Form

The form contains the following fields. Change any of them as needed, then click **Save settings** to apply.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Incoming prefix | Text | No | Prefix used when generating or displaying incoming document numbers (e.g. "INC-" or "IN-"). Leave blank if you do not want a prefix. |
| Outgoing prefix | Text | No | Prefix used for outgoing document numbers (e.g. "OUT-" or "LTR-"). Leave blank if not needed. |
| Year mode | Text | No | How the year is determined for numbering (e.g. "gregorian", "jalali"). Must match a mode supported by your system. Default shown is often "gregorian". |
| Reset numbering yearly | Switch | No | When turned on, document number sequences reset each year so you get 1, 2, 3… again at the start of a new year. When off, numbering continues across years. Default is on (reset yearly). |

### Layout

- **Incoming prefix** and **Outgoing prefix** appear in a two-column grid on medium and larger screens, and stack on small screens.
- **Year mode** is a single text input below.
- **Reset numbering yearly** is a toggle (switch) with a label; turn it on to reset yearly, off to keep continuous numbering.
- The **Save settings** button is at the bottom of the card.

---

## Saving Settings

1. Open the DMS Settings page.
2. Optionally change **Incoming prefix**, **Outgoing prefix**, **Year mode**, or **Reset numbering yearly**.
3. Click **Save settings**.
4. The system sends your values to the server. On success, a "Settings saved" message appears.
5. If the save fails, an error message (e.g. "Save failed") or the server error is shown.

There is no separate "Edit" or "Delete" for settings; the page always shows the current values and updates them in place when you save.

---

## What These Settings Affect

- **Incoming prefix** — Used when displaying or generating numbers for incoming documents (e.g. on Incoming Documents and in the Archive). Keeps numbering consistent and recognizable.
- **Outgoing prefix** — Same idea for outgoing documents and letters; helps distinguish outgoing from incoming in lists and reports.
- **Year mode** — Determines which calendar/year is used in numbering (e.g. Gregorian vs Jalali). Must align with how your organization reports dates.
- **Reset numbering yearly** — When enabled, each new year starts from a fresh sequence (e.g. INC-2025-1, INC-2025-2). When disabled, numbers can continue across years (e.g. INC-104, INC-105).

---

## Tips & Best Practices

- **Set prefixes early** — Configure incoming and outgoing prefixes when you first set up the DMS so all new documents use the same format.
- **Match year mode to your calendar** — If your school uses Jalali or another calendar for official documents, set Year mode accordingly so numbers and reports stay consistent.
- **Reset yearly for clarity** — Resetting numbering each year keeps sequences short and makes it easier to refer to "document 5 of 1404" in meetings or correspondence.

---

## Related Pages

- [DMS Dashboard](/help-center/s/dms/dms-dashboard) — Overview of document counts and quick links.
- [DMS Incoming](/help-center/s/dms/dms-incoming) — Where incoming document numbers (with your incoming prefix) appear.
- [DMS Outgoing](/help-center/s/dms/dms-outgoing) — Where outgoing document numbers (with your outgoing prefix) appear.
- [DMS Reports](/help-center/s/dms/dms-reports) — Distribution and aging reports that reflect documents using these numbering settings.

---

*Category: `dms` | Language: `en`*
