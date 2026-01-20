---
name: School Setup Tour
overview: "Create a comprehensive onboarding tour for school admins covering the complete School Setup workflow: Edit School Details, Create Academic Year, Create Classes, Assign Classes to Academic Year, Create Subjects, and Assign Subjects to Classes (both class-level and academic-year scoped)."
todos: []
---

# S

chool Setup Tour Implementation Plan

## Overview

Create a new onboarding tour (`schoolSetup`) that guides school admins through the complete school setup workflow. The tour will be launchable automatically after Core Tour completion and manually from the Help Center.

## Architecture

### Tour Flow

```javascript
Core Tour Completion → Auto-start School Setup Tour (if eligible)
Help Center → Manual "School Setup Tour" button → Start School Setup Tour
```



### Tour Steps (7 steps total)

1. **Edit School Details** - Navigate to `/settings/schools`, open edit dialog, highlight form fields
2. **Create Academic Year** - Navigate to `/settings/academic-years`, highlight create button
3. **Create Classes** - Navigate to `/settings/classes`, highlight create button
4. **Assign Classes to Academic Year** - Stay on classes page, highlight "Assign to Year" button/tab
5. **Create Subjects** - Navigate to `/settings/subjects`, highlight create button
6. **Assign Subjects to Classes (Class-level)** - Stay on subjects page, switch to "Class Subjects" tab, highlight assignment
7. **Assign Subjects to Classes (Academic-year scoped)** - Switch to "Class Academic Year Subjects" tab, highlight assignment

## Implementation Tasks

### 1. Create Tour Definition Structure

**Files to create:**

- `frontend/src/onboarding/tours/schoolSetup/index.ts` - Tour definition export
- `frontend/src/onboarding/tours/schoolSetup/steps.ts` - Step definitions
- `frontend/src/onboarding/tours/schoolSetup/content.ts` - Step content (for i18n)

**Tour Definition:**

- `id: 'schoolSetup'`
- `version: '1.0.0'`
- `title: 'School Setup Tour'`
- `description: 'Complete guide to setting up your school: school details, academic years, classes, and subjects'`
- `priority: 90` (lower than appCore's 100, so it runs after)
- `eligible: (ctx) => ctx.isTourCompleted('appCore') && !ctx.isTourCompleted('schoolSetup')`

### 2. Define Tour Steps

**Step 1: Edit School Details**

- Route: `/settings/schools`
- Selector: `[data-tour="schools-edit-button"]` or first school row's edit button
- Pre-actions: Open sidebar group `academicSettings`, navigate to route
- Wait-for: Schools table or edit dialog
- Content: Explain editing school name, logo, address, contact info, language settings
- Optional: `false` (required step)

**Step 2: Create Academic Year**

- Route: `/settings/academic-years`
- Selector: `[data-tour="academic-years-create-button"]`
- Pre-actions: Navigate to route, open sidebar group `academicSettings`
- Wait-for: Academic years page loaded
- Content: Explain creating academic year with start/end dates
- Optional: `false` (required step)

**Step 3: Create Classes**

- Route: `/settings/classes`
- Selector: `[data-tour="classes-create-button"]`
- Pre-actions: Navigate to route, open sidebar group `academicSettings`
- Wait-for: Classes page loaded
- Content: Explain creating classes with name, code, grade level
- Optional: `false` (required step)

**Step 4: Assign Classes to Academic Year**

- Route: `/settings/classes` (stay on same page)
- Selector: `[data-tour="classes-assign-to-year-button"]` or assign dialog trigger
- Pre-actions: Ensure classes page is loaded, open assign dialog if needed
- Wait-for: Assign button or dialog
- Content: Explain assigning classes to academic year with sections
- Optional: `false` (required step)

**Step 5: Create Subjects**

- Route: `/settings/subjects`
- Selector: `[data-tour="subjects-create-button"]`
- Pre-actions: Navigate to route, open sidebar group `academicSettings`
- Wait-for: Subjects page loaded
- Content: Explain creating subjects with name and code
- Optional: `false` (required step)

**Step 6: Assign Subjects to Classes (Class-level)**

- Route: `/settings/subjects` (stay on same page)
- Selector: `[data-tour="subjects-class-subjects-tab"]` or assignment button in Class Subjects tab
- Pre-actions: Switch to "Class Subjects" tab (`switchTab` action with `containerId: 'subjects-tabs'`, `tabId: 'classSubjects'`)
- Wait-for: Class Subjects tab content
- Content: Explain class-level subject mapping (templates)
- Optional: `false` (required step)

**Step 7: Assign Subjects to Classes (Academic-year scoped)**

- Route: `/settings/subjects` (stay on same page)
- Selector: `[data-tour="subjects-academic-year-subjects-tab"]` or assignment button
- Pre-actions: Switch to "Class Academic Year Subjects" tab (`switchTab` action with `containerId: 'subjects-tabs'`, `tabId: 'academicYearSubjects'`)
- Wait-for: Academic Year Subjects tab content
- Content: Explain academic-year scoped subject enrollment
- Optional: `false` (required step)

### 3. Add data-tour Attributes to Components

**Files to modify:**

- `frontend/src/components/settings/SchoolsManagement.tsx`
- Add `data-tour="schools-edit-button"` to edit button in table row
- Add `data-tour="schools-page"` to main container
- `frontend/src/components/settings/AcademicYearsManagement.tsx`
- Add `data-tour="academic-years-create-button"` to create button
- Add `data-tour="academic-years-page"` to main container
- `frontend/src/components/settings/ClassesManagement.tsx`
- Add `data-tour="classes-create-button"` to create button
- Add `data-tour="classes-assign-to-year-button"` to assign button
- Add `data-tour="classes-page"` to main container
- `frontend/src/components/settings/SubjectsManagement.tsx`
- Add `data-tour="subjects-create-button"` to create button
- Add `data-tour="subjects-tabs"` to TabsList container
- Add `data-tour="tab-classSubjects"` to Class Subjects tab trigger
- Add `data-tour="tab-academicYearSubjects"` to Academic Year Subjects tab trigger
- Add `data-tour="subjects-page"` to main container

### 4. Register Tour in App.tsx

**File to modify:** `frontend/src/App.tsx`

- Import `schoolSetupTour` from `@/onboarding/tours/schoolSetup`
- Add to `TourProviderWrapper` tours array: `tours={[appCoreTour, schoolSetupTour]}`
- Add `onTourComplete` handler to auto-start next eligible tour:
  ```typescript
        onTourComplete={(tourId) => {
          if (tourId === 'appCore') {
            // Auto-start school setup tour after core tour completes
            setTimeout(() => {
              const { startTour } = useTour();
              startTour('schoolSetup');
            }, 1000);
          }
        }}
  ```


**Note:** The `onTourComplete` callback needs to be passed through `TourProviderWrapper` to `TourProvider`. Check if `TourProviderWrapper` supports this prop.

### 5. Add Help Center Button

**File to modify:** `frontend/src/pages/HelpCenter.tsx`

- Add a "School Setup Tour" button in a prominent location (e.g., featured section or quick actions)
- Use `useTour()` hook to start the tour: `startTour('schoolSetup')`
- Add translation keys for button text: `helpCenter.startSchoolSetupTour`

### 6. Add Translation Keys

**Files to modify:**

- `frontend/src/lib/translations/types.ts` - Add `onboarding.schoolSetup` section
- `frontend/src/lib/translations/en.ts` - Add English translations
- `frontend/src/lib/translations/ps.ts` - Add Pashto translations
- `frontend/src/lib/translations/fa.ts` - Add Farsi translations
- `frontend/src/lib/translations/ar.ts` - Add Arabic translations

**Translation keys needed:**

- `onboarding.schoolSetup.title` - "School Setup Tour"
- `onboarding.schoolSetup.description` - "Complete guide to setting up your school"
- `onboarding.schoolSetup.steps.editSchoolDetails.title` - "Edit School Details"
- `onboarding.schoolSetup.steps.editSchoolDetails.text` - Array of instruction paragraphs
- Similar keys for all 7 steps
- `helpCenter.startSchoolSetupTour` - "Start School Setup Tour"

### 7. Export Tour from Main Index

**File to modify:** `frontend/src/onboarding/index.ts`

- Export `schoolSetupTour` for easy importing

### 8. Handle Missing Permissions Gracefully

**Implementation:**

- Mark steps as `optional: true` if they require permissions that might not be available
- Add permission checks in step `waitFor` or use `optional: true` with helpful skip messages
- In step content, mention required permissions if step is skipped

### 9. Support Resume from Last Step

**Implementation:**

- The existing tour system already supports resume via `lastStepId` in localStorage
- Use `resumeTour('schoolSetup')` in Help Center button if tour was started but not completed
- Check `isTourCompleted('schoolSetup')` before showing resume option

### 10. RTL/LTR Support

**Implementation:**

- The existing tour system automatically handles RTL via `rtlPlacementFlip: true` (default)
- Ensure step content uses translation keys that support RTL languages
- Test placement in both RTL (Pashto/Dari) and LTR (English) modes

## Data-Tour Selector Summary

| Component | Selector | Element ||-----------|----------|---------|| SchoolsManagement | `schools-page` | Main page container || SchoolsManagement | `schools-edit-button` | Edit button in table row || AcademicYearsManagement | `academic-years-page` | Main page container || AcademicYearsManagement | `academic-years-create-button` | Create button || ClassesManagement | `classes-page` | Main page container || ClassesManagement | `classes-create-button` | Create button || ClassesManagement | `classes-assign-to-year-button` | Assign to Year button || SubjectsManagement | `subjects-page` | Main page container || SubjectsManagement | `subjects-create-button` | Create button || SubjectsManagement | `subjects-tabs` | TabsList container || SubjectsManagement | `tab-classSubjects` | Class Subjects tab trigger || SubjectsManagement | `tab-academicYearSubjects` | Academic Year Subjects tab trigger |

## Testing Checklist

- [ ] Tour auto-starts after Core Tour completion
- [ ] Tour can be manually started from Help Center
- [ ] All 7 steps execute in correct order
- [ ] Navigation between routes works correctly
- [ ] Sidebar groups open/close as needed
- [ ] Tabs switch correctly in Subjects page
- [ ] Missing permissions skip steps gracefully
- [ ] Resume from last step works
- [ ] RTL layout displays correctly
- [ ] LTR layout displays correctly
- [ ] Tour completion is saved per user + tenant
- [ ] Tour can be restarted from Help Center after completion

## Files to Create/Modify

### New Files (3)

1. `frontend/src/onboarding/tours/schoolSetup/index.ts`
2. `frontend/src/onboarding/tours/schoolSetup/steps.ts`
3. `frontend/src/onboarding/tours/schoolSetup/content.ts`

### Modified Files (8+)

1. `frontend/src/App.tsx` - Register tour, add auto-start logic
2. `frontend/src/components/settings/SchoolsManagement.tsx` - Add data-tour attributes
3. `frontend/src/components/settings/AcademicYearsManagement.tsx` - Add data-tour attributes
4. `frontend/src/components/settings/ClassesManagement.tsx` - Add data-tour attributes
5. `frontend/src/components/settings/SubjectsManagement.tsx` - Add data-tour attributes
6. `frontend/src/pages/HelpCenter.tsx` - Add "School Setup Tour" button
7. `frontend/src/lib/translations/types.ts` - Add translation types
8. `frontend/src/lib/translations/en.ts` - Add English translations
9. `frontend/src/lib/translations/ps.ts` - Add Pashto translations
10. `frontend/src/lib/translations/fa.ts` - Add Farsi translations
11. `frontend/src/lib/translations/ar.ts` - Add Arabic translations
12. `frontend/src/onboarding/index.ts` - Export schoolSetupTour (if needed)

## Implementation Order

1. Create tour definition files (index.ts, steps.ts, content.ts)
2. Add data-tour attributes to all target components
3. Register tour in App.tsx with auto-start logic
4. Add Help Center button
5. Add translation keys
6. Test tour flow end-to-end