const fs = require('fs');
const p = 'src/modules/reception/components/EtapeAccordion.tsx';
let s = fs.readFileSync(p, 'utf8');
// Line 351-352: replace old comment with structure doc (apostrophe in file may be U+2019)
const lines = s.split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('masque le bouton') && l.includes('Paiement'));
if (idx === -1) {
  console.log('Line not found');
  process.exit(1);
}
const next = lines.findIndex((l, i) => i > idx && l.includes('dernier n'));
const replaceFrom = idx;
const replaceTo = (next >= 0 && next <= idx + 2) ? next + 1 : idx + 1;
const newComments = [
  '  // Structure réponse API : { success, merchant, count, data: { subscription, payments } }.',
  "  // response.success et merchant ne valident pas ; on extrait data.payments (id, status, created_at, ...).",
  '  // Tant que payments[].status === "FAILED", paiement non validé, pas d\'étape suivante.'
];
const before = lines.slice(0, replaceFrom);
const after = lines.slice(replaceTo);
const result = [...before, ...newComments, ...after].join('\n');
fs.writeFileSync(p, result);
console.log('Done');
