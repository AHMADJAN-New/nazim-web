import fs from "fs";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";

const ROOT = process.cwd();
const TRANSLATIONS_DIR = path.join(ROOT, "src", "lib", "translations");

// ✅ YOU CONTROL THIS LIST.
// Format per line:  "relative/path/to/file.ts :: full.key.path"
// Example:
// "src/lib/translations/ar.ts :: finance.dashboard"
// This list contains duplicate keys found by report-translation-duplicates.mjs
// The script will remove the FIRST occurrence and keep the LAST one
const REMOVE_KEYS = [
  // Arabic (ar.ts) duplicates
  "src/lib/translations/ar.ts :: assets.allStatuses",
  "src/lib/translations/ar.ts :: assets.categoryDistribution",
  "src/lib/translations/ar.ts :: assets.filterByStatus",
  "src/lib/translations/ar.ts :: assets.notAvailable",
  "src/lib/translations/ar.ts :: assets.totalCopiesLabel",
  "src/lib/translations/ar.ts :: common.selectSchool",
  "src/lib/translations/ar.ts :: dms.archiveSearch",
  "src/lib/translations/ar.ts :: dms.letterType",
  "src/lib/translations/ar.ts :: dms.letterheads",
  "src/lib/translations/ar.ts :: dms.letterheadsDescription",
  "src/lib/translations/ar.ts :: dms.templates",
  "src/lib/translations/ar.ts :: finance.includeAssetsAndBooks",
  "src/lib/translations/ar.ts :: finance.libraryBooks",
  "src/lib/translations/ar.ts :: finance.libraryBooksBreakdown",
  "src/lib/translations/ar.ts :: finance.libraryBooksBreakdownDescription",
  "src/lib/translations/ar.ts :: finance.libraryBooksByAccount",
  "src/lib/translations/ar.ts :: finance.libraryBooksByCurrency",
  "src/lib/translations/ar.ts :: finance.totalLibraryBooksValue",
  "src/lib/translations/ar.ts :: finance.viewLibraryBooks",
  "src/lib/translations/ar.ts :: library.bookNumber",
  "src/lib/translations/ar.ts :: library.perBook",
  "src/lib/translations/ar.ts :: library.title",
  "src/lib/translations/ar.ts :: nav.examTypes",
  "src/lib/translations/ar.ts :: nav.permissionsManagement",
  "src/lib/translations/ar.ts :: nav.profileManagement",
  "src/lib/translations/ar.ts :: nav.reportTemplates",
  "src/lib/translations/ar.ts :: nav.rolesManagement",
  "src/lib/translations/ar.ts :: nav.staffTypes",
  "src/lib/translations/ar.ts :: nav.userManagement",
  "src/lib/translations/ar.ts :: nav.userPermissions",
  // Farsi (fa.ts) duplicates
  "src/lib/translations/fa.ts :: assets.allStatuses",
  "src/lib/translations/fa.ts :: assets.categoryDistribution",
  "src/lib/translations/fa.ts :: assets.filterByStatus",
  "src/lib/translations/fa.ts :: assets.notAvailable",
  "src/lib/translations/fa.ts :: assets.totalCopiesLabel",
  "src/lib/translations/fa.ts :: dms.archiveSearch",
  "src/lib/translations/fa.ts :: dms.letterType",
  "src/lib/translations/fa.ts :: dms.letterheads",
  "src/lib/translations/fa.ts :: dms.letterheadsDescription",
  "src/lib/translations/fa.ts :: dms.templates",
  "src/lib/translations/fa.ts :: finance.includeAssetsAndBooks",
  "src/lib/translations/fa.ts :: finance.libraryBooks",
  "src/lib/translations/fa.ts :: finance.libraryBooksBreakdown",
  "src/lib/translations/fa.ts :: finance.libraryBooksBreakdownDescription",
  "src/lib/translations/fa.ts :: finance.libraryBooksByAccount",
  "src/lib/translations/fa.ts :: finance.libraryBooksByCurrency",
  "src/lib/translations/fa.ts :: finance.totalLibraryBooksValue",
  "src/lib/translations/fa.ts :: finance.viewLibraryBooks",
  "src/lib/translations/fa.ts :: library.bookNumber",
  "src/lib/translations/fa.ts :: library.perBook",
  "src/lib/translations/fa.ts :: library.title",
  "src/lib/translations/fa.ts :: nav.examTypes",
  "src/lib/translations/fa.ts :: nav.permissionsManagement",
  "src/lib/translations/fa.ts :: nav.profileManagement",
  "src/lib/translations/fa.ts :: nav.reportTemplates",
  "src/lib/translations/fa.ts :: nav.rolesManagement",
  "src/lib/translations/fa.ts :: nav.staffTypes",
  "src/lib/translations/fa.ts :: nav.userManagement",
  "src/lib/translations/fa.ts :: nav.userPermissions",
  // Pashto (ps.ts) duplicates
  "src/lib/translations/ps.ts :: dms.archive",
  "src/lib/translations/ps.ts :: dms.archiveSearch",
  "src/lib/translations/ps.ts :: dms.letterheads",
  "src/lib/translations/ps.ts :: dms.letterheadsDescription",
  "src/lib/translations/ps.ts :: dms.reports",
  "src/lib/translations/ps.ts :: dms.reportsPage",
  "src/lib/translations/ps.ts :: dms.settings",
  "src/lib/translations/ps.ts :: dms.settingsPage",
  "src/lib/translations/ps.ts :: dms.templates",
  "src/lib/translations/ps.ts :: library.bookNumber",
  "src/lib/translations/ps.ts :: settings.buildings.exportErrorExcel",
  "src/lib/translations/ps.ts :: settings.buildings.exportErrorNoBuildings",
  "src/lib/translations/ps.ts :: settings.buildings.exportErrorNoSchool",
  "src/lib/translations/ps.ts :: settings.buildings.exportErrorPdf",
  "src/lib/translations/ps.ts :: settings.buildings.exportSuccessExcel",
  "src/lib/translations/ps.ts :: settings.buildings.exportSuccessPdf",
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
