// Validates content/ and public/strips/ against the schemas and reference rules.
// Usage: npm run validate:content [-- --strict]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatError,
  validateContent,
  type ContentFile,
  type ValidationError,
} from "../src/content/validate";

const strict = process.argv.includes("--strict");
const parseErrors: ValidationError[] = [];

function readJson(file: string): ContentFile | null {
  try {
    return { file, data: JSON.parse(readFileSync(file, "utf8")) };
  } catch (err) {
    parseErrors.push({ file, field: "", message: `ogiltig JSON: ${(err as Error).message}` });
    return null;
  }
}

function readDir(dir: string): ContentFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson(join(dir, name)))
    .filter((f): f is ContentFile => f !== null);
}

function readOptional(file: string): ContentFile | null {
  return existsSync(file) ? readJson(file) : null;
}

const input = {
  findings: readDir("content/findings"),
  ecgPresets: readDir("content/ecg-presets"),
  strips: readDir("public/strips"),
  scenarios: readDir("content/scenarios"),
  checklists: readDir("content/checklists"),
  protocol: readOptional("content/protocol.json"),
  sources: readOptional("content/sources.json"),
};

const errors = [...parseErrors, ...validateContent(input, { strict })];
const counts = Object.entries(input)
  .map(([kind, v]) => `${kind}: ${Array.isArray(v) ? v.length : v ? 1 : 0}`)
  .join(", ");

if (errors.length > 0) {
  for (const e of errors) console.error(formatError(e));
  console.error(`\n${errors.length} fel${strict ? " (--strict)" : ""}. ${counts}`);
  process.exit(1);
}
console.log(`Innehållet är giltigt${strict ? " (--strict)" : ""}. ${counts}`);
