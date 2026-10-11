/** Laboratório de roteirização: desenha e compara rotas sobre pontos fictícios. */
import { distanciaRota, doisOpt, gerarPontos, trechosRota, vizinhoMaisProximo, type Ponto } from '../lib/roteirizacao';
import { numero, percentual } from '../lib/formato';
import { corToken, svgEl } from './svg';

const LARGURA = 100;
const ALTURA = 60;
/** Tamanhos mínimos em pixels na tela, para legibilidade em qualquer largura */
const FONTE_PX = 11;
const RAIO_PX = 8.5;

export function iniciarLaboratorio(raiz: HTMLElement): void {
  const mapa = raiz.querySelector<HTMLElement>('.mapa')!;
  const faixa = raiz.querySelector<HTMLInputElement>('input[name="qtd"]')!;
  const saida = raiz.querySelector<HTMLOutputElement>('output')!;
  const botao = raiz.querySelector<HTMLButtonElement>('.gerar')!;
  const lista = raiz.querySelector<HTMLOListElement>('.sequencia')!;
  const resumo = raiz.querySelector<HTMLElement>('.resumo-rota')!;
  const corpoTrechos = raiz.querySelector<HTMLTableSectionElement>('table.trechos tbody')!;
  const totalTrechos = raiz.querySelector<HTMLElement>('.total-trechos')!;
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
    desenhar(true);
  };

  const rotulo = (indiceNaRota: number) => (indiceNaRota === 0 ? 'CD' : `Entrega ${indiceNaRota}`);

  const desenhar = (animar = false) => {
    const rota = modo() === 'vizinho' ? rotaVizinho : rotaOtimizada;
    const otimizada = modo() === 'otimizada';
    const corRota = otimizada ? corToken('--trace', '#cfe2f6') : corToken('--serie-1-escuro', '#4f9bd9');
    const escalaPx = Math.max(1, mapa.clientWidth / LARGURA); // pixels por unidade do plano
    const fonte = FONTE_PX / escalaPx;
    const raio = RAIO_PX / escalaPx;
    const svg = svgEl('svg', { viewBox: `0 0 ${LARGURA} ${ALTURA}`, 'aria-hidden': 'true' });

    const d = [...rota, rota[0]].map((idx, i) => `${i === 0 ? 'M' : 'L'} ${pontos[idx].x.toFixed(2)} ${pontos[idx].y.toFixed(2)}`).join(' ');
    const caminho = svgEl('path', {
      d,
      fill: 'none',
      stroke: corRota,
      'stroke-width': 2 / escalaPx,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      'stroke-dasharray': otimizada ? 'none' : `${6 / escalaPx} ${4 / escalaPx}`,
    });
    svg.append(caminho);

    // Entregas numeradas pela ordem de visita (1..N); o CD não recebe número
    rota.forEach((idx, ordem) => {
      if (ordem === 0) return;
      const p = pontos[idx];
      svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: raio, fill: '#0b1a2c', stroke: corRota, 'stroke-width': 1.5 / escalaPx, 'data-ordem': ordem }));
      svg.append(
        svgEl('text', { x: p.x, y: p.y + fonte * 0.36, 'text-anchor': 'middle', 'font-size': fonte, 'font-weight': 600, fill: '#ffffff', 'data-ordem': ordem }, String(ordem)),
      );
    });

    const cd = pontos[0];
    const lado = raio * 2.6;
    svg.append(svgEl('rect', { x: cd.x - lado / 2, y: cd.y - lado / 2, width: lado, height: lado, rx: lado * 0.18, fill: corToken('--signal', '#e58a2b') }));
    svg.append(svgEl('text', { x: cd.x, y: cd.y + fonte * 0.36, 'text-anchor': 'middle', 'font-size': fonte, 'font-weight': 700, fill: '#1b0f02' }, 'CD'));

    mapa.replaceChildren(svg);

    if (animar && otimizada && !reducaoMovimento.matches && typeof caminho.getTotalLength === 'function') {
      const comprimento = caminho.getTotalLength();
      caminho.style.strokeDasharray = String(comprimento);
      caminho.style.strokeDashoffset = String(comprimento);
      caminho.getBoundingClientRect();
      caminho.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)';
      caminho.style.strokeDashoffset = '0';
    }

    // Sequência: "Saída do CD" e "Retorno ao CD" ficam fora da lista numerada
    lista.replaceChildren(
      ...rota.slice(1).map((idx) => {
        const li = document.createElement('li');
        li.textContent = `Ponto em x ${numero(pontos[idx].x, 0)}, y ${numero(pontos[idx].y, 0)}`;
        return li;
      }),
    );

    // Trechos com distância; a soma é exatamente a distância total exibida
    const trechos = trechosRota(pontos, rota);
    const posicao = new Map(rota.map((idx, i) => [idx, i]));
    corpoTrechos.replaceChildren(
      ...trechos.map((t) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = `${rotulo(posicao.get(t.de)!)} → ${rotulo(posicao.get(t.para)!)}`;
        const td2 = document.createElement('td');
        td2.className = 'num';
        td2.textContent = numero(t.distancia, 1);
        tr.append(td1, td2);
        return tr;
      }),
    );
    totalTrechos.textContent = numero(distanciaRota(pontos, rota), 1);

    resumo.textContent = `Exibindo a rota ${otimizada ? 'após 2-opt' : 'do vizinho mais próximo'}: saída do CD, ${rota.length - 1} entregas e retorno ao CD.`;
  };

  faixa.addEventListener('input', () => {
    saida.value = faixa.value;
    calcular();
  });
  raiz.querySelectorAll<HTMLInputElement>('input[name="modo"]').forEach((r) => r.addEventListener('change', () => desenhar(true)));
  botao.addEventListener('click', () => {
    semente = (semente * 48271 + 11) % 2147483647;
    calcular();
  });

  let largura = 0;
  new ResizeObserver(() => {
    if (Math.abs(mapa.clientWidth - largura) < 1) return;
    largura = mapa.clientWidth;
    if (pontos.length) desenhar(false);
  }).observe(mapa);

  calcular();
}
