/**
 * Simulação da Torre de Controle — DADOS E PARÂMETROS FICTÍCIOS.
 * Independente de qualquer empresa. Sem bibliotecas externas.
 */
import {
  agruparPor,
  deColunar,
  farol,
  LIMITES_PADRAO,
  resumirCargas,
  resumirFrota,
  ROTULO_FAROL,
  validarLimites,
  type LimitesFarol,
  type LinhaCargas,
  type LinhaFrota,
  type LinhaPendencia,
  type Tabela,
} from '../lib/kpis';
import { numero, percentual } from '../lib/formato';

interface PayloadTorre {
  simulado: boolean;
  periodo: { inicio: string; fim: string };
  transportadoras: string[];
  parametros_padrao: { atencao: number; critico: number };
  frota: Tabela;
  cargas: Tabela;
  pendencias: Tabela;
}

const MAX_LINHAS_PENDENCIA = 40;

const dataLonga = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
const horas = (v: number | null) => (v === null ? 'sem pendências' : `${numero(v, 1)} h`);

function validar(dados: unknown): asserts dados is PayloadTorre {
  const d = dados as Partial<PayloadTorre>;
  if (!d || d.simulado !== true || !d.frota || !d.cargas || !d.pendencias || !Array.isArray(d.transportadoras)) {
    throw new Error('Arquivo da simulação com formato inesperado.');
  }
}

export async function iniciarSimulacaoTorre(raiz: HTMLElement): Promise<void> {
  const estado = raiz.querySelector<HTMLElement>('.estado')!;
  const conteudo = raiz.querySelector<HTMLElement>('.conteudo-torre')!;
  const fonte = raiz.dataset.fonte || '/dados/torre-simulacao.json';

  let dados: PayloadTorre;
  let frota: LinhaFrota[];
  let cargas: LinhaCargas[];
  let pendencias: LinhaPendencia[];
  try {
    const r = await fetch(fonte, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json: unknown = await r.json();
    validar(json);
    dados = json;
    frota = deColunar<LinhaFrota>(dados.frota);
    cargas = deColunar<LinhaCargas>(dados.cargas);
    pendencias = deColunar<LinhaPendencia>(dados.pendencias);
  } catch (erro) {
    console.warn('[simulacao-torre] Falha ao carregar dados:', erro);
    estado.classList.add('erro');
    estado.textContent = 'Não foi possível carregar a simulação. Recarregue a página; se continuar, gere os dados com "npm run dados".';
    return;
  }

  const selPeriodo = raiz.querySelector<HTMLSelectElement>('select[name="periodo"]')!;
  const selTransp = raiz.querySelector<HTMLSelectElement>('select[name="transportadora"]')!;
  const inAtencao = raiz.querySelector<HTMLInputElement>('input[name="atencao"]')!;
  const inCritico = raiz.querySelector<HTMLInputElement>('input[name="critico"]')!;
  const btRestaurar = raiz.querySelector<HTMLButtonElement>('.restaurar')!;
  const erroParam = raiz.querySelector<HTMLElement>('.erro-parametros')!;
  for (const t of dados.transportadoras) selTransp.add(new Option(t, t));
  [selPeriodo, selTransp, inAtencao, inCritico, btRestaurar].forEach((el) => (el.disabled = false));

  const padrao: LimitesFarol = {
    atencao: dados.parametros_padrao?.atencao ?? LIMITES_PADRAO.atencao,
    critico: dados.parametros_padrao?.critico ?? LIMITES_PADRAO.critico,
  };
  let limites: LimitesFarol = { ...padrao };
  const dias = [...new Set(frota.map((f) => f.data))].sort();

  const lerLimites = () => {
    const proposta = { atencao: inAtencao.valueAsNumber, critico: inCritico.valueAsNumber };
    const erros = validarLimites(proposta);
    inAtencao.setAttribute('aria-invalid', String(erros.some((e) => e.startsWith('Atenção') || e.startsWith('O limite'))));
    inCritico.setAttribute('aria-invalid', String(erros.some((e) => e.startsWith('Crítico') || e.startsWith('O limite'))));
    if (erros.length) {
      erroParam.textContent = `${erros.join(' ')} Mantidos os últimos valores válidos: atenção ${limites.atencao}% e crítico ${limites.critico}%.`;
      return;
    }
    erroParam.textContent = '';
    limites = proposta;
    render();
  };

  const render = () => {
    const n = Number(selPeriodo.value);
    const diasAtivos = new Set(n > 0 ? dias.slice(-n) : dias);
    const transp = selTransp.value;
    const filtra = <T extends { data: string; transportadora: string }>(l: T) =>
      diasAtivos.has(l.data) && (!transp || l.transportadora === transp);
    const frt = frota.filter(filtra);
    const crg = cargas.filter(filtra);
    const pend = pendencias.filter(filtra);
    const lista = transp ? [transp] : dados.transportadoras;

    estado.textContent = '';
    conteudo.hidden = false;
    const ordenados = [...diasAtivos].sort();
    raiz.querySelector('.periodo-ativo')!.textContent =
      ordenados.length === 1
        ? `Dia exibido: ${dataLonga(ordenados[0])}`
        : `Período exibido: ${dataLonga(ordenados[0])} a ${dataLonga(ordenados[ordenados.length - 1])} (${ordenados.length} dias úteis)`;

    // Indicadores gerais
    const rc = resumirCargas(crg);
    const definir = (kpi: string, valor: string) => (raiz.querySelector(`[data-kpi="${kpi}"] .valor`)!.textContent = valor);
    definir('programadas', numero(rc.programadas));
    definir('expedidas', numero(rc.expedidas));
    definir('pendentes', numero(rc.pendentes));
    definir('taxa', percentual(rc.taxaExpedicaoPct));
    definir('tempo', horas(rc.tempoMedioPendencia));

    // Quadro de status
    const fT = agruparPor(frt, (l) => l.transportadora);
    const cT = agruparPor(crg, (l) => l.transportadora);
    raiz.querySelector('table.quadro tbody')!.replaceChildren(
      ...lista.map((t) => {
        const f = resumirFrota(fT.get(t) ?? []);
        const c = resumirCargas(cT.get(t) ?? []);
        const status = farol([f.coberturaPct, c.taxaExpedicaoPct], limites);
        const tr = document.createElement('tr');
        tr.dataset.transportadora = t;
        tr.dataset.status = status;
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = t;
        tr.append(th);
        for (const v of [percentual(f.coberturaPct), percentual(c.taxaExpedicaoPct), numero(c.pendentes)]) {
          const td = document.createElement('td');
          td.className = 'num';
          td.textContent = v;
          tr.append(td);
        }
        const tdS = document.createElement('td');
        const selo = document.createElement('span');
        selo.className = 'farol';
        selo.dataset.status = status;
        selo.textContent = ROTULO_FAROL[status];
        tdS.append(selo);
        tr.append(tdS);
        return tr;
      }),
    );

    // Lista de pendências (estado vazio tratado)
    const corpo = raiz.querySelector('table.lista-pend tbody')!;
    const resumoPend = raiz.querySelector<HTMLElement>('.pend-resumo')!;
    const tabelaPend = raiz.querySelector<HTMLElement>('.pendencias .tabela-rolagem')!;
    if (pend.length === 0) {
      corpo.replaceChildren();
      tabelaPend.hidden = true;
      resumoPend.textContent = 'Nenhuma carga pendente no período e na transportadora selecionados.';
    } else {
      tabelaPend.hidden = false;
      const ordem = [...pend].sort((a, b) => b.data.localeCompare(a.data) || b.horas - a.horas);
      const visiveis = ordem.slice(0, MAX_LINHAS_PENDENCIA);
      resumoPend.textContent =
        pend.length > visiveis.length
          ? `${numero(pend.length)} cargas pendentes. Exibindo as ${visiveis.length} mais recentes.`
          : `${numero(pend.length)} ${pend.length === 1 ? 'carga pendente' : 'cargas pendentes'}.`;
      corpo.replaceChildren(
        ...visiveis.map((p) => {
          const tr = document.createElement('tr');
          for (const [v, num] of [
            [dataLonga(p.data), false],
            [p.transportadora, false],
            [p.motivo, false],
            [numero(p.horas, 1), true],
          ] as const) {
            const td = document.createElement('td');
            if (num) td.className = 'num';
            td.textContent = v;
            tr.append(td);
          }
          return tr;
        }),
      );
    }
  };

  selPeriodo.addEventListener('change', render);
  selTransp.addEventListener('change', render);
  inAtencao.addEventListener('change', lerLimites);
  inCritico.addEventListener('change', lerLimites);
  btRestaurar.addEventListener('click', () => {
    inAtencao.value = String(padrao.atencao);
    inCritico.value = String(padrao.critico);
    lerLimites();
  });

  render();
}
