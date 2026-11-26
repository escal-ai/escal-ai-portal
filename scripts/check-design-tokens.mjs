#!/usr/bin/env node
/**
 * Design-token ratchet.
 *
 * The portal mixes semantic tokens (`text-[var(--text-primary)]`) with raw Tailwind
 * palette classes (`text-emerald-600`). The tokens are what makes light/dark work;
 * the raw classes are the ones that broke contrast.
 *
 * A full migration of the existing ~370 classes is a visual change nobody can verify
 * from a diff, so this does not rewrite anything: it freezes today's set and fails
 * when a *new* raw palette class appears. Migrating a file means deleting entries from
 * the baseline, so the ratchet only turns one way.
 *
 * Usage: node scripts/check-design-tokens.mjs [--update]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "scripts", "design-token-baseline.json");
const PALETTE =
  /\b(?:bg|text|border|ring|from|to|via|divide|outline|shadow|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?\b/g;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") ? [full] : [];
  });
}

const found = new Map();
for (const file of sourceFiles(path.join(ROOT, "src"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.match(PALETTE) ?? []) {
    const rel = path.relative(ROOT, file);
    if (!found.has(rel)) found.set(rel, new Set());
    found.get(rel).add(match.replace(/\/\d+$/, ""));
  }
}

const current = {};
for (const [file, classes] of [...found.entries()].sort()) {
  current[file] = [...classes].sort();
}

if (process.argv.includes("--update")) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  const total = Object.values(current).reduce((sum, list) => sum + list.length, 0);
  console.log(`Baseline actualizada: ${total} clases de paleta en ${Object.keys(current).length} archivos.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE)
  ? JSON.parse(fs.readFileSync(BASELINE, "utf8"))
  : {};

const additions = [];
for (const [file, classes] of Object.entries(current)) {
  const allowed = new Set(baseline[file] ?? []);
  for (const cls of classes) {
    if (!allowed.has(cls)) additions.push(`${file}: ${cls}`);
  }
}

const removed = [];
for (const [file, classes] of Object.entries(baseline)) {
  for (const cls of classes) {
    if (!(current[file] ?? []).includes(cls)) removed.push(`${file}: ${cls}`);
  }
}

if (removed.length > 0) {
  console.log(`Migradas (quita ${removed.length} del baseline con --update):`);
  for (const entry of removed.slice(0, 20)) console.log(`  ~ ${entry}`);
}

if (additions.length > 0) {
  console.error(`\nNuevas clases de paleta cruda (${additions.length}). Usa un token semántico:`);
  for (const entry of additions) console.error(`  + ${entry}`);
  console.error(`\nTokens disponibles: var(--surface-base|raised|muted|canvas), var(--text-primary|secondary|muted),`);
  console.error(`var(--border-subtle|default). Si de verdad hace falta un color nuevo, defínelo como token en globals.css.`);
  process.exit(1);
}

console.log(
  `Sin clases de paleta nuevas. Baseline: ${Object.values(baseline).reduce((sum, list) => sum + list.length, 0)} clases pendientes de migrar.`
);
