import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Project, SyntaxKind } from "ts-morph";

const ROOT = process.cwd();
const TRANSLATIONS_DIR = path.join(ROOT, "src", "lib", "translations");
const OUT_MD = path.join(ROOT, "translation-duplicates.md");

// Which translation files to scan
const FILES = fs
  .readdirSync(TRANSLATIONS_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => path.join(TRANSLATIONS_DIR, f));

function stableId(str) {
  return crypto.createHash("md5").update(str).digest("hex").slice(0, 8);
}

function getPropKeyText(prop) {
  const nameNode = prop.getNameNode?.();
  if (!nameNode) return null;

  const kind = nameNode.getKind();

  if (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NoSubstitutionTemplateLiteral
  ) {
    return nameNode.getLiteralText();
  }

  if (kind === SyntaxKind.Identifier) {
    return nameNode.getText();
  }

  if (kind === SyntaxKind.ComputedPropertyName) {
    const expr = nameNode.getExpression();
    if (
      expr &&
      (expr.getKind() === SyntaxKind.StringLiteral ||
        expr.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)
    ) {
      return expr.getLiteralText();
    }
    return nameNode.getText();
  }

  return nameNode.getText();
}

function getValuePreview(prop) {
  const init = prop.getInitializer?.();
  if (!init) return "";
  const k = init.getKind();

  if (k === SyntaxKind.StringLiteral || k === SyntaxKind.NoSubstitutionTemplateLiteral) {
    const txt = init.getLiteralText();
    return txt.length > 80 ? txt.slice(0, 80) + "…" : txt;
  }

  // For nested objects or others, show short text
  const text = init.getText().replace(/\s+/g, " ");
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

function findRootObject(sourceFile, filePath) {
  // Heuristic: prefer exported const named like the filename (ar.ts -> ar)
  const baseName = path.basename(filePath, ".ts");
  for (const v of sourceFile.getVariableDeclarations()) {
    const init = v.getInitializer();
    const isExported = v.getVariableStatement()?.isExported?.() ?? false;
    if (
      isExported &&
      v.getName() === baseName &&
      init?.getKind() === SyntaxKind.ObjectLiteralExpression
    ) {
      return init;
    }
  }

  // Otherwise, first object literal in file
  return sourceFile.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
}

function walkObjectLiteral(objLit, fileRel, parentPath, duplicates) {
  const props = objLit.getProperties();

  // Map key -> occurrences (all, in order)
  const occurrences = new Map();

  for (const p of props) {
    if (p.getKind() === SyntaxKind.SpreadAssignment) continue;

    const key = getPropKeyText(p);
    if (!key) continue;

    const fullPath = parentPath ? `${parentPath}.${key}` : key;

    const arr = occurrences.get(key) ?? [];
    arr.push({
      fullPath,
      line: p.getStartLineNumber(),
      valuePreview: getValuePreview(p),
      nodeText: p.getText(),
    });
    occurrences.set(key, arr);

    // recurse into nested object literals
    const init = p.getInitializer?.();
    if (init?.getKind() === SyntaxKind.ObjectLiteralExpression) {
      walkObjectLiteral(init, fileRel, fullPath, duplicates);
    }
  }

  // Record duplicates at this object level (same key repeated)
  for (const [key, occs] of occurrences.entries()) {
    if (occs.length > 1) {
      // Keep last is common; but we only report here
      duplicates.push({
        file: fileRel,
        objectPath: parentPath || "(root)",
        key,
        fullKey: parentPath ? `${parentPath}.${key}` : key, // human-friendly
        occurrences: occs,
      });
    }
  }
}

function generateMarkdownReport(allDups) {
  const now = new Date().toISOString();

  const lines = [];
  lines.push(`# Translation Duplicate Keys Report`);
  lines.push(`Generated: \`${now}\``);
  lines.push("");
  lines.push(`Total duplicate groups: **${allDups.length}**`);
  lines.push("");

  if (allDups.length === 0) {
    lines.push("✅ No duplicate keys found.");
    lines.push("");
    return lines.join("\n");
  }

  // Group by file
  const byFile = new Map();
  for (const d of allDups) {
    const arr = byFile.get(d.file) ?? [];
    arr.push(d);
    byFile.set(d.file, arr);
  }

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| File | Duplicate groups |");
  lines.push("|---|---:|");
  for (const [file, arr] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| \`${file}\` | ${arr.length} |`);
  }
  lines.push("");

  // Copy/paste candidate list section (VERY IMPORTANT)
  // We output "full keys" (parentPath.key) one per line, so user can paste into delete list.
  lines.push("## Copy/Paste Key List (Full Paths)");
  lines.push("");
  lines.push("> Paste the keys you want to remove into `REMOVE_KEYS` in `remove-translation-keys.mjs`.");
  lines.push("");
  lines.push("```txt");
  // Unique list
  const uniqueKeys = [...new Set(allDups.map(d => `${d.file} :: ${d.fullKey}`))].sort();
  for (const k of uniqueKeys) lines.push(k);
  lines.push("```");
  lines.push("");

  // Detailed section
  lines.push("## Details");
  lines.push("");

  for (const [file, arr] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### ${file}`);
    lines.push("");

    for (const d of arr.sort((a, b) => a.fullKey.localeCompare(b.fullKey))) {
      const anchor = stableId(`${file}::${d.fullKey}::${d.objectPath}`);
      lines.push(`#### ${d.fullKey}`);
      lines.push(`- Object path: \`${d.objectPath}\``);
      lines.push(`- Key: \`${d.key}\``);
      lines.push(`- Anchor: \`${anchor}\``);
      lines.push("");
      lines.push("| # | Line | Value preview |");
      lines.push("|---:|---:|---|");
      d.occurrences.forEach((o, idx) => {
        const pv = o.valuePreview.replace(/\|/g, "\\|");
        lines.push(`| ${idx + 1} | ${o.line} | ${pv} |`);
      });
      lines.push("");
      lines.push("<details><summary>Show raw property text (each occurrence)</summary>");
      lines.push("");
      d.occurrences.forEach((o, idx) => {
        lines.push(`**Occurrence ${idx + 1} (line ${o.line})**`);
        lines.push("```ts");
        lines.push(o.nodeText);
        lines.push("```");
        lines.push("");
      });
      lines.push("</details>");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function main() {
  const project = new Project({
    tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  const allDups = [];

  for (const filePath of FILES) {
    const src = project.addSourceFileAtPath(filePath);
    const rootObj = findRootObject(src, filePath);

    const fileRel = path.relative(ROOT, filePath);
    if (!rootObj) continue;

    walkObjectLiteral(rootObj, fileRel, "", allDups);
  }

  const md = generateMarkdownReport(allDups);
  fs.writeFileSync(OUT_MD, md, "utf8");

  console.log(`✅ Report written: ${path.relative(ROOT, OUT_MD)}`);
  console.log(`Duplicate groups found: ${allDups.length}`);
}

main();
