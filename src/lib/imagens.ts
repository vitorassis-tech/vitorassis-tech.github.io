/**
 * Versões menores de uma imagem de public/ para srcset, encontradas pelo nome:
 * "/img/perfil/vitor-assis.webp" → "/img/perfil/vitor-assis-420.webp", "-800.webp"...
 * Só entram as versões que existem de fato; sem nenhuma, o srcset fica só com o original.
 * Assim, uma foto nova trocada pelo painel continua funcionando mesmo sem versões menores.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { url } from './formato';

const LARGURAS = [420, 640, 800, 1080, 1600];

export function srcsetResponsivo(arquivo: string, larguraOriginal: number): string {
  const ponto = arquivo.lastIndexOf('.');
  const base = arquivo.slice(0, ponto);
  const ext = arquivo.slice(ponto);
  const versoes = LARGURAS.filter((w) => w < larguraOriginal)
    .map((w) => ({ w, caminho: `${base}-${w}${ext}` }))
    .filter((v) => existsSync(join(process.cwd(), 'public', v.caminho)));
  return [...versoes.map((v) => `${url(v.caminho)} ${v.w}w`), `${url(arquivo)} ${larguraOriginal}w`].join(', ');
}
