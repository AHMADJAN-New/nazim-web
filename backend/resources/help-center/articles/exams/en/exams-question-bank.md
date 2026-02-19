# Question Bank

The Question Bank page is where you create and manage exam questions for your school. Teachers and staff use it to add questions by subject and class, set difficulty and marks, and build a reusable library of multiple-choice, short-answer, descriptive, true/false, and essay questions. Questions are linked to academic year, class, and subject so they can be used when building exam papers.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search questions by text. Type in the search box to filter the list.
- **Academic Year** — Filter by academic year. Defaults to the current academic year. Option "All Academic Years" shows all.
- **Class** — Filter by class (class academic year). Available after selecting an academic year. Option "All Classes" shows all.
- **Type** — Filter by question type: All Types, Multiple Choice, Short Answer, Descriptive, True/False, or Essay.
- **Difficulty** — Filter by difficulty: All Difficulties, Easy, Medium, or Hard.

Filters use your default school when you have one set in your profile.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Checkbox | Select one or more questions for bulk Activate/Deactivate. Header checkbox selects all on the page. |
| Question | Question text (truncated). RTL text is right-aligned when applicable. |
| Type | Badge: Multiple Choice, Short Answer, Descriptive, True/False, or Essay. |
| Difficulty | Badge: Easy, Medium, or Hard. |
| Marks | Marks assigned to the question. |
| Subject | Subject name (from class subject). |
| Status | Active or Inactive. |
| Actions | Dropdown menu (⋮) for row actions. |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a read-only dialog with full question text, options (for MCQ/True–False), correct answer, reference, subject, and class.
- **Edit** — Opens the edit form with current data. School, Academic Year, Class, and Subject are fixed; you can change type, difficulty, marks, text, options, model answer, reference, and active status.
- **Duplicate** — Creates a copy of the question so you can edit and save as a new question.
- **Delete** — Opens a confirmation dialog. Confirming removes the question permanently.

### Bulk Actions

When one or more questions are selected, two buttons appear at the top:

- **Activate (n)** — Sets all selected questions to Active.
- **Deactivate (n)** — Sets all selected questions to Inactive.

---

## Creating a New Question

To create a new question, click the **"Create Question"** button at the top of the page. A form will open with the following fields:

### Form Fields (single section, scrollable)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School | Select or read-only | Yes | School. If you have a default school it is shown read-only; otherwise choose from the list. |
| Academic Year | Select | Yes | Academic year for the question. |
| Class | Select | Yes | Class (class academic year). List depends on selected academic year. |
| Subject | Select | Yes | Subject (class subject) for this class. List depends on selected class. |
| Type | Select | Yes | Multiple Choice, Short Answer, Descriptive, True/False, or Essay. |
| Difficulty | Select | Yes | Easy, Medium, or Hard. |
| Marks | Number (0.5–100) | Yes | Marks for the question. |
| Question Text | Textarea, RTL toggle | Yes | The question text. Use the RTL switch for right-to-left languages. |
| Options | Dynamic list (MCQ/True–False only) | Conditional | For MCQ: option key (A, B, …), option text, and "Correct" checkbox. Add/remove options (2–6). For True/False: True and False with one marked correct. |
| Model Answer | Textarea | No | For Short Answer, Descriptive, or Essay: optional model/correct answer. |
| Reference | Text | No | e.g. chapter, page. |
| Active | Switch | Yes | Whether the question is active (default On). |

### What Happens After Submission

- The system validates that class subject is selected and that MCQ/True–False have at least one correct option.
- On success, a success message is shown, the dialog closes, and the questions table refreshes.
- The new question appears in the list and can be used in exam papers.

---

## Editing a Question

To edit an existing question:

1. Find the question in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit form opens with current data. School, Academic Year, Class, and Subject are fixed; you can change type, difficulty, marks, text, options, model answer, reference, and active status.
4. Make your changes.
5. Click **"Update"**.
6. On success, a message appears and the table refreshes.

---

## Deleting a Question

To delete a question:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears asking you to confirm.
3. Click **"Confirm"** (or the destructive action button) to permanently remove the question.
4. Deleting cannot be undone. If the question is used in exam papers, consider marking it Inactive instead of deleting.

---

## Viewing a Question

- Click the actions menu (⋮) → **View** to open a read-only dialog.
- The dialog shows type, difficulty, marks, status, full question text, options (with correct one marked), model answer (if any), reference, subject, and class.
- From the dialog you can click **Edit** to switch to the edit form (if you have update permission).

---

## Export Options

PDF and Excel export are available from the **Report Export** buttons next to "Create Question" when there are questions in the list. Export uses the current filter results and can include: Question, Type, Difficulty, Marks, Subject, Class, Status, and Correct Answer. Choose PDF or Excel; the report title is "Question Bank" and the filters summary (e.g. type, difficulty, status, total count) is included.

---

## Tips & Best Practices

- Use **Academic Year** and **Class** filters to focus on one class or year when building or reviewing questions.
- For MCQ and True/False, always mark exactly one option as correct; the form will not submit until you do.
- Use **Duplicate** to create similar questions quickly, then edit the text and options.
- Set **Active** to Off for questions you no longer want in new papers but want to keep for history.
- Use **Reference** to note textbook chapter or page for easier review and alignment with curriculum.

---

## Related Pages

- [Exam Papers](/help-center/s/exams/exams-papers) — Create and manage exam papers that use questions from the question bank
- [Exam Paper Templates](/help-center/s/exams/exams-paper-templates) — Manage paper templates and template files
- [Exams](/help-center/s/exams/exams) — Overview of exams and exam management

---

*Category: `exams` | Language: `en`*
