# Exam Enrollment Flow

Exam enrollment is the process of registering which students will sit which exam. This article describes the overall flow: from creating an exam to enrolling students and where each step happens in the Nazim system. For the actual enrollment screen (selecting exam, class, and adding or removing students), see the **Exam Student Enrollment** page.

---

## Page Overview

There is no single “Enrollment” page. Enrollment is one step in the exam workflow. You reach the enrollment screen by opening an exam and choosing **Student Enrollment** from the exam row actions on the Exams list, or by going to the Student Enrollment page and selecting an exam and class there.

### Summary Cards

Not applicable; this article describes a workflow, not a single page. On the **Exam Student Enrollment** page you will see summary cards for Enrolled, Available, and Selected counts.

### Filters & Search

On the **Exam Student Enrollment** page you select **Exam** and **Class** to see available and enrolled students, and use search to filter the list of available students. See the Exam Student Enrollment article for details.

---

## Full Exam Workflow (Including Enrollment)

A typical sequence is:

1. **Create the exam** — On the [Exams](/help-center/s/exams/exams) page, click **Create Exam**, enter name and academic year, and save. The exam starts in **Draft** status.

2. **Assign classes and subjects** — From the exam row, click **Classes & Subjects**. Add the class-academic-year combinations that will sit this exam, and assign the subjects for each class. Save.

3. **Build the timetable (optional but recommended)** — From the exam row, click **Timetable**. Add time slots (date, time, class, subject, room, invigilator) for each exam session. This defines when each class sits each subject.

4. **Enroll students** — From the exam row, click **Student Enrollment** (or open the Student Enrollment page and select this exam). For each exam class:
   - Select the **Exam** and **Class**.
   - You see **Available students** (active admissions in that class for the academic year who are not yet enrolled) and **Enrolled students**.
   - Enroll by selecting one or more available students and clicking **Enroll**, or use **Enroll All Classes** to enroll all eligible students in all classes for this exam.
   - You can remove a student from the exam using the remove action in the enrolled table.

5. **Enter marks and run reports** — After enrollment, use **Marks Entry** to enter results and **Reports** to view or export data.

Enrollment is required before marks can be entered for students; the marks entry page lists only enrolled students for the selected exam and class.

---

## Where to Do Enrollment

- **From the Exams list:** Open the exam, then click the row actions menu (⋮) → **Student Enrollment**. You are taken to the Student Enrollment page with that exam pre-selected (if the app supports it via URL).
- **From the sidebar:** Go to the **Exam Student Enrollment** page (or equivalent menu). Then choose **Exam** and **Class** in the left panel. The rest of the page shows available and enrolled students and actions to enroll or remove.

Details of the enrollment UI (stats cards, filters, available vs enrolled lists, Enroll All, bulk enroll, remove, and validation) are in the [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) article.

---

## Who Can Enroll Students

Only users with the **exams.enroll_students** (or equivalent “assign”/enrollment) permission can enroll or remove students. If you do not see **Student Enrollment** in the exam row menu or cannot add/remove students, ask an administrator to grant the appropriate exam enrollment permission.

---

## Tips & Best Practices

- **Complete Classes & Subjects first** — Students can only be enrolled in exam classes that exist for that exam. If a class is missing, add it on the exam’s Classes & Subjects page.
- **Enroll before marks** — Marks entry shows only enrolled students. Enroll all intended students before entering marks.
- **Use “Enroll All Classes” when appropriate** — For a full exam, enrolling all active students in all exam classes at once can save time; then remove any exceptions manually.
- **Check available vs enrolled** — If “Available” is empty, either all students in that class are already enrolled or there are no active admissions for that class in the academic year. Verify class and academic year on the admissions side.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Create exams and open Classes & Subjects, Timetable, Student Enrollment, and Marks from the row menu.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — The page where you select exam and class and add or remove enrolled students.
- [Exam Timetables](/help-center/s/exams/exams-timetables) — Define when each class sits each subject.
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter marks for enrolled students.

---

*Category: `exams` | Language: `en`*
