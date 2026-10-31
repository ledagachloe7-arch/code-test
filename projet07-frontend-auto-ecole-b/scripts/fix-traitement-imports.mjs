import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../src/modules/reception/traitement-dossier');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(root);
for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1; // 0 = root file
  const prefixUp = '../'.repeat(depth + 1); // from traitement-dossier subfolder to reception parent... wrong

  s = s.replace(/from ['"]\.\.\/services\/circuit-suivi\.service['"]/g, "from '../services/circuit-suivi.api'");
  s = s.replace(/from ['"]\.\.\/\.\.\/services\/circuit-suivi\.service['"]/g, "from '../../services/circuit-suivi.api'");

  // hooks/, utils/, services/, components/, types/ are 1 level under traitement-dossier → ../../../../shared
  if (rel.includes('/')) {
    s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/");
    s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/store['"]/g, "from '../../../../store'");
    s = s.replace(/from ['"]\.\.\/\.\.\/cnepc\//g, "from '../../../cnepc/");
    s = s.replace(/from ['"]\.\.\/\.\.\/pieces-justificatives\//g, "from '../../../pieces-justificatives/");
  }

  // pages/ is traitement-dossier/pages → ../../.. to modules? pages to shared: ../../../../../../shared - count
  // traitement-dossier/pages/X.tsx: ../../../ = reception, ../../../../ = modules, ../../../../../ = src
  if (rel.startsWith('pages/')) {
    s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../../shared/");
    s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/\.\.\/store['"]/g, "from '../../../../../store'");
  }

  fs.writeFileSync(file, s);
}

console.log('patched', files.length, 'files');
