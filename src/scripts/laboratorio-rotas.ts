/** Laboratório de roteirização: desenha e compara rotas sobre pontos simulados. */
import { distanciaRota, doisOpt, gerarPontos, vizinhoMaisProximo, type Ponto } from '../lib/roteirizacao';
import { numero, percentual } from '../lib/formato';
import { svgEl, corToken } from './svg';

const LARGURA = 100;
const ALTURA = 60;

export function iniciarLaboratorio(raiz: HTMLElement): void {
  const mapa = raiz.querySelector<HTMLElement>('.mapa')!;
  const faixa = raiz.querySelector<HTMLInputElement>('input[name="qtd"]')!;
  const saida = raiz.querySelector<HTMLOutputElement>('output')!;
  const botao = raiz.querySelector<HTMLButtonElement>('.gerar')!;
  const lista = raiz.querySelector<HTMLOListElement>('.sequencia')!;
  const resumo = raiz.querySelector<HTMLElement>('.resumo-rota')!;
  const reducaoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  let semente = 7;
  let pontos: Ponto[] = [];
  let rotaVizinho: number[] = [];
  let rotaOtimizada: number[] = [];

  const modo = () => (raiz.querySelector<HTMLInputElement>('input[name="modo"]:checked')?.value ?? 'otimizada') as 'vizinho' | 'otimizada';

  const calcular = () => {
    pontos = gerarPontos(Number(faixa.value), semente, LARGURA, ALTURA);
    rotaVizinho = vizinhoMaisProximo(pontos);
    rotaOtimizada = doisOpt(pontos, rotaVizinho);
    const dV = distanciaRota(pontos, rotaVizinho);
    const dO = distanciaRota(pontos, rotaOtimizada);
    raiz.querySelector('[data-m="vizinho"]')!.textContent = numero(dV, 1);
    raiz.querySelector('[data-m="otimizada"]')!.textContent = numero(dO, 1);
    raiz.querySelector('[data-m="ganho"]')!.textContent = percentual(dV > 0 ? ((dV - dO) / dV) * 100 : null);
    desenhar();
  };

  const desenhar = () => {
    const rota = modo() === 'vizinho' ? rotaVizinho : rotaOtimizada;
    const corRota = modo() === 'vizinho' ? corToken('--serie-1', '#2563a8') : corToken('--navy', '#17365d');
    const svg = svgEl('svg', { viewBox: `0 0 ${LARGURA} ${ALTURA}`, 'aria-hidden': 'true' });

    // Rota fechada (volta ao depósito)
    const d = [...rota, rota[0]].map((idx, i) => `${i === 0 ? 'M' : 'L'} ${pontos[idx].x.toFixed(2)} ${pontos[idx].y.toFixed(2)}`).join(' ');
    const caminho = svgEl('path', {
      d,
      fill: 'none',
      stroke: corRota,
      'stroke-width': 0.45,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      'stroke-dasharray': modo() === 'vizinho' ? '1.4 0.9' : 'none',
    });
    svg.append(caminho);

    // Pontos de entrega com número da ordem de visita
    rota.forEach((idx, ordem) => {
      if (idx === 0) return;
      const p = pontos[idx];
      svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: 1.55, fill: '#fff', stroke: corRota, 'stroke-width': 0.35 }));
      svg.append(
        svgEl('text', { x: p.x, y: p.y + 0.62, 'text-anchor': 'middle', 'font-size': 1.7, 'font-weight': 600, fill: corToken('--ink', '#15253b') }, String(ordem)),
      );
    });

    // Depósito (CD)
    const cd = pontos[0];
    svg.append(svgEl('rect', { x: cd.x - 2.2, y: cd.y - 2.2, width: 4.4, height: 4.4, rx: 0.8, fill: corToken('--accent', '#e58a2b'), stroke: '#fff', 'stroke-width': 0.4 }));
    svg.append(svgEl('text', { x: cd.x, y: cd.y + 0.62, 'text-anchor': 'middle', 'font-size': 1.7, 'font-weight': 700, fill: '#2b1603' }, 'CD'));

    mapa.replaceChildren(svg);

    if (!reducaoMovimento.matches && typeof caminho.getTotalLength === 'function') {
      const comprimento = caminho.getTotalLength();
      if (modo() === 'otimizada') {
        caminho.style.strokeDasharray = String(comprimento);
        caminho.style.strokeDashoffset = String(comprimento);
        caminho.getBoundingClientRect();
        caminho.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)';
        caminho.style.strokeDashoffset = '0';
      }
    }

    // Lista textual acessível
    lista.replaceChildren(
      ...rota.slice(1).map((idx) => {
        const li = document.createElement('li');
        li.textContent = `Ponto ${idx} (x ${numero(pontos[idx].x, 0)}, y ${numero(pontos[idx].y, 0)})`;
        return li;
      }),
    );
    const final = document.createElement('li');
    final.textContent = 'Retorno ao CD';
    lista.append(final);

    resumo.textContent = `Exibindo a rota ${modo() === 'vizinho' ? 'do vizinho mais próximo' : 'após 2-opt'} com ${rota.length - 1} entregas.`;
  };

  faixa.addEventListener('input', () => {
    saida.value = faixa.value;
    calcular();
  });
  raiz.querySelectorAll<HTMLInputElement>('input[name="modo"]').forEach((r) => r.addEventListener('change', desenhar));
  botao.addEventListener('click', () => {
    semente = (semente * 48271 + 11) % 2147483647;
    calcular();
  });

  calcular();
}
