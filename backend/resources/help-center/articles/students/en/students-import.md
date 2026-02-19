# Students Import

The Students Import page lets you bulk import students (and optionally their admissions to classes) from an Excel (.xlsx) file. You first build and download a template that matches the columns you need, then fill it with data, upload it, validate it, and confirm the import. This is useful when registering many students at once (e.g. at the start of the academic year) or when migrating data from another system.

---

## Page Overview

When you open the Students Import page, you will see:

### Tabs

- **Template Builder** — Choose which student and admission fields to include in the Excel template, optionally attach the template to classes for an academic year, set default residency/room per class, then download the template.
- **Upload & Import** — Select an Excel file, validate it, review valid and invalid rows, then run the import (if validation passes and your subscription allows).

### Back Button

A **"Back to Students"** button at the top takes you back to the main Students list.

---

## Template Builder Tab

### Student Fields

A list of checkboxes for columns to include in the template. **Full Name** and **Father Name** are required and always included (checkboxes disabled). You can add any of:

- Admission No, Student Code, Card Number, Grandfather Name, Mother Name, Birth Year, Birth Date, Age, Admission Year  
- Origin/Current Province, District, Village  
- Nationality, Preferred Language, Previous School  
- Guardian Name, Relation, Phone, Tazkira  
- Home Address  
- Zamin (Guarantor) Name, Phone, Tazkira, Address  
- Applying Grade, Is Orphan, Admission Fee Status, Student Status  
- Disability Status, Emergency Contact Name/Phone, Family Income  

Select the fields you will fill in Excel, then use **Download Template** so the file has the correct column headers.

### Admission Fields (optional)

If you want to import admissions (enrollment in classes) along with students, check the admission columns you need:

- Admission Year, Admission Date, Enrollment Status, Enrollment Type, Shift, Is Boarder, Fee Status, Placement Notes  

To get class-specific sheets in the template, you must select an **Academic Year** and one or more **Class Templates** (class sections). For each selected class you can set **Default Residency Type** and **Default Room**. These defaults apply to admissions created from that class’s sheet.

### Download Template

1. Select at least the required student fields (Full Name, Father Name; Gender is selected by default).  
2. If using class templates, select an academic year and one or more classes.  
3. Optionally set default residency type and room per class.  
4. Click **"Download Template"** (or **"Download"** on small screens).  
5. An Excel file is downloaded. Open it and fill the first data row and below (header row is already present).  
6. Save the file as .xlsx for upload.

---

## Upload & Import Tab

### Subscription Limit

- If your subscription has a student limit and it is reached, an alert explains that you cannot import more students until you upgrade. File upload and import are disabled.  
- If you are close to the limit, a warning may show how many slots remain. After validation, only valid rows within the remaining count may be imported; excess rows are reported as errors.

### Select File

1. Under **"Select XLSX file"**, click the file input and choose your filled .xlsx file.  
2. Only .xlsx is accepted. After selecting, the previous validation result is cleared.

### Validate

1. Click **"Validate File"** (or **"Validate"** on small screens).  
2. The system checks all rows and columns and reports:  
   - **Validation summary** — Total rows, valid rows, invalid rows.  
   - **Valid rows** — Which sheets and row numbers passed (e.g. "Sheet1: Rows 2, 3, 5").  
   - **Errors table** — For invalid rows: Sheet name, Row number, Field name, and Message (e.g. missing required field, duplicate admission no, or limit exceeded).  
3. Fix errors in your Excel file (add missing required values, correct formats, remove duplicates) and upload/validate again until you are satisfied.

### Import Now

1. **Import Now** is enabled only when: a file is selected, validation has been run, and **validation result is valid** (at least one valid row and no blocking errors). It stays disabled if the student limit is reached.  
2. Click **"Import Now"** (or **"Import"** on small screens).  
3. The system creates student records (and optionally admissions) for all valid rows.  
4. Success messages show how many students and admissions were created.  
5. You are redirected to the main **Students** page.

---

## What Gets Imported

- **Students**: All columns you included in the template are mapped to student fields. Required: Full Name, Father Name.  
- **Admissions**: If your template has class sheets and admission columns, admissions are created for the selected classes using the data in each row and the class defaults (residency type, room) you set.  
- **Limits**: The number of new students cannot exceed your subscription’s remaining student slots. If the file has more valid rows than remaining slots, only the first N valid rows (N = remaining) are imported; the rest are reported as errors.

---

## Tips & Best Practices

- **Use the same template you downloaded** — Do not change column order or header names; otherwise validation may fail or map incorrectly.  
- **Fix all validation errors before importing** — Invalid rows are never imported. Correct required fields, dates, and duplicates in Excel and re-validate.  
- **Start with a small file** — Test with a few rows to ensure format and mappings are correct, then run a full import.  
- **Check subscription usage** — Before a large import, confirm how many student slots remain so you can split the file or upgrade if needed.

---

## Related Pages

- [Students](/help-center/s/students/students) — View and manage the students you imported.  
- [Admissions](/help-center/s/students/admissions) — Manage admissions to classes and academic years.  
- [Admissions Report](/help-center/s/students/admissions-report) — View admission statistics and reports.

---

*Category: `students` | Language: `en`*
