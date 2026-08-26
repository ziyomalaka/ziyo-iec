/**
 * Static QA inventory — filesystem routes + known risks.
 * Run: node scripts/qa-static-inventory.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appLocale = path.join(root, "app", "[locale]");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name === "page.tsx") acc.push(full);
  }
  return acc;
}

function toRoute(file) {
  let rel = path.relative(appLocale, path.dirname(file)).replaceAll("\\", "/");
  rel = rel.replace(/\(public\)\/?/g, "");
  if (!rel || rel === ".") return "/[locale]";
  return `/[locale]/${rel}`.replace(/\/+/g, "/");
}

const pages = walk(appLocale).map(toRoute).sort();
const hasPlaywright = fs.existsSync(path.join(root, "node_modules", "@playwright", "test"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const report = {
  generatedAt: new Date().toISOString(),
  framework: `Next.js ${pkg.dependencies?.next ?? "?"}`,
  testScripts: Object.keys(pkg.scripts || {}),
  hasPlaywright,
  pageRoutes: pages,
  pageCount: pages.length,
  knownRoles: ["student", "boshqaruv", "nazoratchi", "it"],
  risks: [
    "Client-only auth guards (no middleware)",
    "Mock data still used in QualificationView / PortfolioView",
    "Material progress may fall back to localStorage",
    "Results may fall back to localStorage if /learning/results missing",
    "Hardcoded ngrok default in upstream/upload",
  ],
};

const out = path.join(root, "qa-report-static.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`Routes: ${report.pageCount}`);
pages.forEach((p) => console.log(p));
console.log(`\nWrote ${out}`);
