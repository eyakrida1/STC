// Vérifie qu'aucune propriété physique (gauche/droite) n'est utilisée : l'app doit pouvoir passer en arabe (RTL).
// Utiliser ms/me, ps/pe, start/end, border-s/e, rounded-s/e, text-start/end.
// src/components/ui (généré par shadcn en mode rtl) est exclu.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("../src", import.meta.url))
const EXCLUDED = [join("components", "ui")]

const CLASS_RE =
  /(?<![\w-])-?(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-[\w./[\]-]+|(?<![\w-])(?:text-left|text-right|float-left|float-right|clear-left|clear-right)(?![\w-])/g
const CSS_RE = /\b(?:margin|padding|border)-(?:left|right)\b|(?<![\w-])(?:left|right)\s*:/g

const offenders = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = relative(ROOT, full)
    if (EXCLUDED.some((e) => rel.startsWith(e))) continue
    if (statSync(full).isDirectory()) walk(full)
    // classes Tailwind : composants .tsx, CSS, et correspondances de lib/ (les ids des mocks ne sont pas concernés)
    else if (/\.(tsx|css)$/.test(name) || rel.startsWith("lib")) check(full, rel)
  }
}

function check(file, rel) {
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((line, i) => {
    if (line.includes("logical-ok")) return
    const re = file.endsWith(".css") ? CSS_RE : CLASS_RE
    for (const m of line.matchAll(re)) offenders.push(`src/${rel.replaceAll("\\", "/")}:${i + 1}  « ${m[0]} »`)
  })
}

walk(ROOT)

if (offenders.length) {
  console.error("Propriétés physiques interdites (utiliser les propriétés logiques) :\n" + offenders.join("\n"))
  process.exit(1)
}
console.log("check-logical : OK (propriétés logiques uniquement)")
