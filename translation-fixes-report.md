# Translation Fixes Migration Plan

Generated: 2025-12-08T06:23:24.778Z

## Summary

- **Error Messages to Replace**: 0
- **Hardcoded Strings to Replace**: 0
- **Files Affected**: 0
- **Missing Keys to Add**: 199

## Step 1: Replace Hardcoded Error Messages

### Files Requiring Import Changes

These files need `useLanguage` hook or `t` function import:



### Detailed Replacements by File



## Step 2: Replace Hardcoded Strings in JSX

### Files with Hardcoded Strings (0 total)



## Step 3: Add Missing Translation Keys

These keys are used in the codebase but not defined in `TranslationKeys` interface.

**Total Missing Keys**: 199

### Top Priority Missing Keys

**Note**: Keys that already exist in types.ts or are not translation keys (like font file paths) have been filtered out.

1. `.context-menu-trigger`
2. `admissions.admissionNumber`
3. `admissions.noClassesAssignedToYear`
4. `admissions.noClassesForYear`
5. `admissions.noRoomsFound`
6. `admissions.noStudentsFound`
7. `admissions.searchRoom`
8. `admissions.searchStudent`
9. `admissions.selectAcademicYearFirst`
10. `admissions.selectAcademicYearToSeeClasses`
11. `admissions.student`
12. `attendancePage.selectAtLeastOneClass`
13. `attendanceTotalsReport.room`
14. `buildings.buildingCreated`
15. `buildings.buildingDeleted`
16. `buildings.buildingUpdated`
17. `certificateTemplates.description`
18. `common.more`
19. `common.total`
20. `courses.active`
21. `courses.addStudent`
22. `courses.all`
23. `courses.completionRate`
24. `courses.currentlyEnrolled`
25. `courses.delete`
26. `courses.documents`
27. `courses.dropRate`
28. `courses.edit`
29. `courses.generated`
30. `courses.manageDocuments`
31. `courses.sessions`
32. `courses.summary`
33. `courses.totalCourses`
34. `courses.viewDetails`
35. `courses.viewManageStudents`
36. `courses.viewStudents`
37. `hostel.overview`
38. `landing.benefits.cloudBased.description`
39. `landing.benefits.cloudBased.title`
40. `landing.benefits.lightningFast.description`
41. `landing.benefits.lightningFast.title`
42. `landing.benefits.mobileReady.description`
43. `landing.benefits.mobileReady.title`
44. `landing.benefits.multiLanguage.description`
45. `landing.benefits.multiLanguage.title`
46. `landing.benefits.secureReliable.description`
47. `landing.benefits.secureReliable.title`
48. `landing.benefits.support24x7.description`
49. `landing.benefits.support24x7.title`
50. `landing.contact.messageSent`

... and 149 more keys

### How to Add Missing Keys

1. **Add to `frontend/src/lib/translations/types.ts`**:
   ```typescript
   export interface TranslationKeys {
     // ... existing keys ...
     yourCategory: {
       yourKey: string;
     };
   }
   ```

2. **Add translations to all language files**:
   - `frontend/src/lib/translations/en.ts`
   - `frontend/src/lib/translations/ps.ts`
   - `frontend/src/lib/translations/fa.ts`
   - `frontend/src/lib/translations/ar.ts`

## Step 4: Apply Changes

### Manual Application

1. Review each replacement in the files listed above
2. Apply changes one file at a time
3. Test after each file to ensure nothing breaks
4. Add missing imports where needed

### Automated Application (Coming Soon)

Run with `--apply` flag to automatically apply changes (with backups).

## Notes

- All replacements preserve the original code structure
- Translation keys are already translated in all 4 languages
- Some replacements may need manual review for context
- Test translations in all languages after applying changes
