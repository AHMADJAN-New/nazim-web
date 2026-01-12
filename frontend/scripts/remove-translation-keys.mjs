import fs from "fs";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";

const ROOT = process.cwd();
const TRANSLATIONS_DIR = path.join(ROOT, "src", "lib", "translations");

// ✅ YOU CONTROL THIS LIST.
// Format per line:  "relative/path/to/file.ts :: full.key.path"
// Example:
// "src/lib/translations/ar.ts :: finance.dashboard"
const REMOVE_KEYS = [
  "src/lib/translations/ar.ts :: common.breadcrumb",
  "src/lib/translations/ar.ts :: common.example",
  "src/lib/translations/ar.ts :: common.fair",
  "src/lib/translations/ar.ts :: common.good",
  "src/lib/translations/ar.ts :: common.kb",
  "src/lib/translations/ar.ts :: common.none",
  "src/lib/translations/ar.ts :: common.notifications",
  "src/lib/translations/ar.ts :: common.on",
  "src/lib/translations/ar.ts :: common.optional",
  "src/lib/translations/ar.ts :: common.searchAndFilters",
  "src/lib/translations/ar.ts :: common.strong",
  "src/lib/translations/ar.ts :: common.weak",
  "src/lib/translations/ar.ts :: nav.academic.academicYears.title",
  "src/lib/translations/ar.ts :: nav.academic.classes.title",
  "src/lib/translations/ar.ts :: nav.academic.residencyTypes.title",
  "src/lib/translations/ar.ts :: nav.academic.scheduleSlots.title",
  "src/lib/translations/ar.ts :: nav.academic.subjects.title",
  "src/lib/translations/ar.ts :: nav.assets",
  "src/lib/translations/ar.ts :: nav.assets.assignments",
  "src/lib/translations/ar.ts :: nav.assets.categories",
  "src/lib/translations/ar.ts :: nav.assets.dashboard",
  "src/lib/translations/ar.ts :: nav.assets.management",
  "src/lib/translations/ar.ts :: nav.assets.reports",
  "src/lib/translations/ar.ts :: nav.certificates.issued",
  "src/lib/translations/ar.ts :: nav.certificates.templates",
  "src/lib/translations/ar.ts :: nav.classSubjectMarkSheet",
  "src/lib/translations/ar.ts :: nav.consolidatedMarkSheet",
  "src/lib/translations/ar.ts :: nav.courseCertificates",
  "src/lib/translations/ar.ts :: nav.dms.archive",
  "src/lib/translations/ar.ts :: nav.dms.dashboard",
  "src/lib/translations/ar.ts :: nav.dms.departments",
  "src/lib/translations/ar.ts :: nav.dms.incoming",
  "src/lib/translations/ar.ts :: nav.dms.issueLetter",
  "src/lib/translations/ar.ts :: nav.dms.issueLetterNav",
  "src/lib/translations/ar.ts :: nav.dms.letterTypes",
  "src/lib/translations/ar.ts :: nav.dms.letterheads",
  "src/lib/translations/ar.ts :: nav.dms.outgoing",
  "src/lib/translations/ar.ts :: nav.dms.reports",
  "src/lib/translations/ar.ts :: nav.dms.settings",
  "src/lib/translations/ar.ts :: nav.dms.templates",
  "src/lib/translations/ar.ts :: nav.document-system",
  "src/lib/translations/ar.ts :: nav.events",
  "src/lib/translations/ar.ts :: nav.events.addGuest",
  "src/lib/translations/ar.ts :: nav.events.all",
  "src/lib/translations/ar.ts :: nav.events.checkin",
  "src/lib/translations/ar.ts :: nav.events.types",
  "src/lib/translations/ar.ts :: nav.events.users",
  "src/lib/translations/ar.ts :: nav.examDocuments",
  "src/lib/translations/ar.ts :: nav.examNumberReports",
  "src/lib/translations/ar.ts :: nav.examPaperPrintTracking",
  "src/lib/translations/ar.ts :: nav.examPapers",
  "src/lib/translations/ar.ts :: nav.examTypes",
  "src/lib/translations/ar.ts :: nav.finance",
  "src/lib/translations/ar.ts :: nav.finance.accounts",
  "src/lib/translations/ar.ts :: nav.finance.dashboard",
  "src/lib/translations/ar.ts :: nav.finance.donors",
  "src/lib/translations/ar.ts :: nav.finance.expenseCategories",
  "src/lib/translations/ar.ts :: nav.finance.expenses",
  "src/lib/translations/ar.ts :: nav.finance.fees",
  "src/lib/translations/ar.ts :: nav.finance.fees.assignments",
  "src/lib/translations/ar.ts :: nav.finance.fees.dashboard",
  "src/lib/translations/ar.ts :: nav.finance.fees.exceptions",
  "src/lib/translations/ar.ts :: nav.finance.fees.payments",
  "src/lib/translations/ar.ts :: nav.finance.fees.reports",
  "src/lib/translations/ar.ts :: nav.finance.fees.structures",
  "src/lib/translations/ar.ts :: nav.finance.financeDocuments",
  "src/lib/translations/ar.ts :: nav.finance.income",
  "src/lib/translations/ar.ts :: nav.finance.incomeCategories",
  "src/lib/translations/ar.ts :: nav.finance.projects",
  "src/lib/translations/ar.ts :: nav.finance.reports",
  "src/lib/translations/ar.ts :: nav.finance.settings",
  "src/lib/translations/ar.ts :: nav.grades.management",
  "src/lib/translations/ar.ts :: nav.graduation.batches",
  "src/lib/translations/ar.ts :: nav.helpCenter",
  "src/lib/translations/ar.ts :: nav.hostel",
  "src/lib/translations/ar.ts :: nav.hostel.overview",
  "src/lib/translations/ar.ts :: nav.hostel.reports",
  "src/lib/translations/ar.ts :: nav.idCards",
  "src/lib/translations/ar.ts :: nav.idCards.assignment",
  "src/lib/translations/ar.ts :: nav.idCards.export",
  "src/lib/translations/ar.ts :: nav.idCards.templates",
  "src/lib/translations/ar.ts :: nav.leaveReports",
  "src/lib/translations/ar.ts :: nav.library",
  "src/lib/translations/ar.ts :: nav.library.books",
  "src/lib/translations/ar.ts :: nav.library.categories",
  "src/lib/translations/ar.ts :: nav.library.dashboard",
  "src/lib/translations/ar.ts :: nav.library.distribution",
  "src/lib/translations/ar.ts :: nav.library.reports",
  "src/lib/translations/ar.ts :: nav.markAttendance",
  "src/lib/translations/ar.ts :: nav.phoneBook",
  "src/lib/translations/ar.ts :: nav.settings",
  "src/lib/translations/ar.ts :: nav.shortTermCourses",
  "src/lib/translations/ar.ts :: nav.staff",
  "src/lib/translations/ar.ts :: nav.staffManagement",
  "src/lib/translations/ar.ts :: nav.staffReports",
  "src/lib/translations/ar.ts :: nav.studentHistory",
  "src/lib/translations/ar.ts :: nav.studentManagement",
  "src/lib/translations/ar.ts :: nav.studentReportCard",
  "src/lib/translations/ar.ts :: nav.studentReports",
  "src/lib/translations/ar.ts :: nav.students",
  "src/lib/translations/ar.ts :: nav.studentsImport",
  "src/lib/translations/ar.ts :: nav.teacherSubjectAssignments.title",
  "src/lib/translations/ar.ts :: nav.timetable.title",
  "src/lib/translations/ar.ts :: nav.timetables",
  "src/lib/translations/ar.ts :: nav.translations",
  "src/lib/translations/ar.ts :: students.status",
  "src/lib/translations/en.ts :: students.status",
  "src/lib/translations/fa.ts :: students.status",
  "src/lib/translations/ps.ts :: students.status",
];

function parseRemoveKeys() {
  const map = new Map(); // fileRel -> Set(fullKey)
  for (const entry of REMOVE_KEYS) {
    const parts = entry.split("::").map((s) => s.trim());
    if (parts.length !== 2) continue;
    const fileRel = parts[0];
    const fullKey = parts[1];
    const set = map.get(fileRel) ?? new Set();
    set.add(fullKey);
    map.set(fileRel, set);
  }
  return map;
}

function getPropKeyText(prop) {
  const nameNode = prop.getNameNode?.();
  if (!nameNode) return null;

  const kind = nameNode.getKind();
  if (kind === SyntaxKind.StringLiteral || kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
    return nameNode.getLiteralText();
  }
  if (kind === SyntaxKind.Identifier) return nameNode.getText();
  if (kind === SyntaxKind.ComputedPropertyName) {
    const expr = nameNode.getExpression();
    if (expr && (expr.getKind() === SyntaxKind.StringLiteral || expr.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)) {
      return expr.getLiteralText();
    }
    return nameNode.getText();
  }
  return nameNode.getText();
}

function findRootObject(sourceFile, filePath) {
  const baseName = path.basename(filePath, ".ts");
  for (const v of sourceFile.getVariableDeclarations()) {
    const init = v.getInitializer();
    const isExported = v.getVariableStatement()?.isExported?.() ?? false;
    if (isExported && v.getName() === baseName && init?.getKind() === SyntaxKind.ObjectLiteralExpression) {
      return init;
    }
  }
  return sourceFile.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
}

function collectAllOccurrences(objLit, parentPath, toRemoveSet, occurrences) {
  const props = objLit.getProperties();

  for (const p of props) {
    if (p.getKind() === SyntaxKind.SpreadAssignment) continue;

    const key = getPropKeyText(p);
    if (!key) continue;

    const fullPath = parentPath ? `${parentPath}.${key}` : key;

    // If this exact full key is in removal list, collect it
    if (toRemoveSet.has(fullPath)) {
      const line = p.getStartLineNumber();
      if (!occurrences.has(fullPath)) {
        occurrences.set(fullPath, []);
      }
      occurrences.get(fullPath).push({ prop: p, line, fullPath });
    }

    // Recurse
    const init = p.getInitializer?.();
    if (init?.getKind() === SyntaxKind.ObjectLiteralExpression) {
      collectAllOccurrences(init, fullPath, toRemoveSet, occurrences);
    }
  }
}

function removeKeysFromObject(objLit, parentPath, toRemoveSet, removedLog, firstOccurrenceOnly) {
  const props = objLit.getProperties();

  for (const p of props) {
    if (p.getKind() === SyntaxKind.SpreadAssignment) continue;

    const key = getPropKeyText(p);
    if (!key) continue;

    const fullPath = parentPath ? `${parentPath}.${key}` : key;

    // If this exact full key is in removal list
    if (toRemoveSet.has(fullPath)) {
      if (firstOccurrenceOnly) {
        // Only remove if this is marked as the first occurrence
        const shouldRemove = firstOccurrenceOnly.get(fullPath) === p;
        if (shouldRemove) {
          removedLog.push({ key: fullPath, line: p.getStartLineNumber() });
          p.remove();
          continue;
        }
      } else {
        // Old behavior: remove all
        removedLog.push({ key: fullPath, line: p.getStartLineNumber() });
        p.remove();
        continue;
      }
    }

    // Recurse
    const init = p.getInitializer?.();
    if (init?.getKind() === SyntaxKind.ObjectLiteralExpression) {
      removeKeysFromObject(init, fullPath, toRemoveSet, removedLog, firstOccurrenceOnly);
    }
  }
}

function main() {
  const byFile = parseRemoveKeys();
  if (byFile.size === 0) {
    console.log("Nothing to remove. Add entries to REMOVE_KEYS first.");
    process.exit(0);
  }

  const project = new Project({
    tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  for (const [fileRel, keysSet] of byFile.entries()) {
    const filePath = path.join(ROOT, fileRel);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${fileRel}`);
      continue;
    }

    const src = project.addSourceFileAtPath(filePath);
    const rootObj = findRootObject(src, filePath);
    if (!rootObj) {
      console.warn(`⚠️ No object literal found in: ${fileRel}`);
      continue;
    }

    // First pass: collect all occurrences of keys to remove
    const occurrences = new Map(); // fullKey -> Array<{prop, line, fullPath}>
    collectAllOccurrences(rootObj, "", keysSet, occurrences);

    // For each key, identify the first occurrence (lowest line number) to remove
    const firstOccurrenceOnly = new Map(); // fullKey -> Property (the one to remove)
    for (const [fullKey, occs] of occurrences.entries()) {
      if (occs.length > 0) {
        // Sort by line number and take the first one (lowest line = first occurrence)
        occs.sort((a, b) => a.line - b.line);
        firstOccurrenceOnly.set(fullKey, occs[0].prop);
      }
    }

    // Second pass: remove only the first occurrence of each key
    const removedLog = [];
    removeKeysFromObject(rootObj, "", keysSet, removedLog, firstOccurrenceOnly);

    if (removedLog.length === 0) {
      console.log(`- No matches removed in: ${fileRel}`);
      continue;
    }

    src.formatText({ indentSize: 2 });
    src.saveSync();

    console.log(`✅ Removed ${removedLog.length} keys from: ${fileRel}`);
    for (const r of removedLog.slice(0, 25)) {
      console.log(`  - ${r.key} (line ${r.line})`);
    }
    if (removedLog.length > 25) console.log(`  ... +${removedLog.length - 25} more`);
  }

  console.log("\nDone. Now run: npm run build");
}

main();
