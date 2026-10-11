/**
 * Executa um comando Python de forma compatível com Windows, macOS e Linux.
 * Procura, nesta ordem: py (Windows), python3, python.
 * Uso: node scripts/python.mjs <argumentos do python>
 *   ex.: node scripts/python.mjs dados-demo/gerar_dados.py
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const candidatos = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];

for (const cmd of candidatos) {
  const teste = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: false });
  if (teste.status === 0) {
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
    process.exit(r.status ?? 1);
  }
}
console.error('Python 3 não encontrado. Instale em https://www.python.org/downloads/ (marque "Add python.exe to PATH").');
process.exit(1);
