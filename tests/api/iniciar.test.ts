/**
 * Teste do comando "npm run admin" completo: painel + prévia do site.
 * Sobe os dois processos de verdade, confere que respondem e que o Ctrl + C (SIGINT)
 * encerra ambos. Usa cópia de teste do conteúdo e portas próprias.
 */
import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import net from 'node:net';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function responde(url: string): Promise<number> {
  try {
    return (await fetch(url)).status;
  } catch {
    return 0;
  }
}

async function aguardar(url: string, limiteMs = 45_000) {
  const fim = Date.now() + limiteMs;
  while (Date.now() < fim) {
    if ((await responde(url)) === 200) return true;
    await esperar(500);
  }
  return false;
}

function iniciar(args: string[]) {
  const saida: string[] = [];
  const proc = spawn(process.execPath, ['scripts/admin/iniciar.mjs', '--copia-de-teste', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => saida.push(String(d)));
  proc.stderr.on('data', (d) => saida.push(String(d)));
  return { proc, saida };
}

async function encerrar(proc: ReturnType<typeof spawn>) {
  const fim = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGINT');
  await fim;
  await esperar(1000);
}

describe('npm run admin (painel + prévia)', () => {
  it('sobe painel e prévia, e o Ctrl + C encerra os dois', async () => {
    const { proc, saida } = iniciar(['--porta', '4351', '--porta-site', '4352']);
    try {
      expect(await aguardar('http://127.0.0.1:4351/'), saida.join('')).toBe(true);
      expect(await aguardar('http://localhost:4352/'), `prévia não respondeu:\n${saida.join('')}`).toBe(true);
      expect(await responde('http://localhost:4352/sobre/')).toBe(200);
    } finally {
      await encerrar(proc);
    }
    expect(await responde('http://127.0.0.1:4351/')).toBe(0);
    expect(await responde('http://localhost:4352/')).toBe(0);
  }, 90_000);

  it('usa outra porta para a prévia quando a padrão está ocupada e avisa', async () => {
    const ocupante = net.createServer().listen(4362);
    await new Promise((r) => ocupante.once('listening', r));
    const { proc, saida } = iniciar(['--porta', '4361', '--porta-site', '4362']);
    try {
      expect(await aguardar('http://127.0.0.1:4361/')).toBe(true);
      expect(await aguardar('http://localhost:4363/'), saida.join('')).toBe(true);
      expect(saida.join('')).toContain('a porta 4362 está ocupada');
    } finally {
      await encerrar(proc);
      ocupante.close();
    }
  }, 90_000);
});
