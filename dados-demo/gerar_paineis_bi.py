"""
Gera os DADOS FICTÍCIOS das réplicas interativas dos painéis de Power BI.

Os painéis originais (Painel de Expedição e Painel de Logística Varejo) foram feitos
no Power BI com dados internos da empresa, que não podem ser publicados. Este script
cria uma operação inventada, com a mesma estrutura, para que as réplicas em código
funcionem no navegador.

Nada aqui vem da empresa: transportadoras, regiões, rotas, volumes, valores, datas e
motivos são inventados. A semente é fixa, então o resultado é sempre o mesmo.

Saídas:
  - public/dados/painel-expedicao-ficticio.json
  - public/dados/painel-varejo-ficticio.json

Uso:  python dados-demo/gerar_paineis_bi.py   (ou: npm run dados)
"""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

PROJETO = Path(__file__).resolve().parent.parent
SAIDA_EXPEDICAO = PROJETO / "public" / "dados" / "painel-expedicao-ficticio.json"
SAIDA_VAREJO = PROJETO / "public" / "dados" / "painel-varejo-ficticio.json"

SEMENTE = 20261105
AVISO = (
    "DADOS FICTÍCIOS — gerados por dados-demo/gerar_paineis_bi.py para as réplicas "
    "interativas do portfólio. Não representam dados de nenhuma empresa."
)
FIM = date(2026, 10, 31)  # sábado
QTD_DIAS = 30


def dias_operacao(fim: date, quantidade: int) -> list[date]:
    """Dias de terça a sábado, terminando em `fim` (inclusive)."""
    dias: list[date] = []
    d = fim
    while len(dias) < quantidade:
        if d.weekday() in (1, 2, 3, 4, 5):  # terça (1) a sábado (5)
            dias.append(d)
        d -= timedelta(days=1)
    return sorted(dias)


def colunar(linhas: list[dict]) -> dict:
    colunas = list(linhas[0].keys())
    return {"colunas": colunas, "linhas": [[linha[c] for c in colunas] for linha in linhas]}


def gravar(caminho: Path, dados: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


# ---------------------------------------------------------------- Expedição

TRANSP_EXPEDICAO = [
    # nome, veículos previstos por dia, volume médio por veículo
    ("Transportadora Alfa", 16, 68),
    ("Transportadora Beta", 8, 72),
    ("Transportadora Gama", 30, 82),
    ("Transportadora Delta", 8, 74),
    ("Transportadora Ômega", 0, 95),
]
MOTIVOS = ["Excesso de volume", "Falta de volume", "Cliente fechado", "Documentação pendente"]
OPERACOES = ["Distribuição", "Varejo"]


def gerar_expedicao(rng: random.Random, dias: list[date]) -> dict:
    frota, expedido, pendencias = [], [], []
    for d in dias:
        dia_ruim = rng.random() < 0.12  # alguns dias com mais pendência
        for nome, previstos, vol_veic in TRANSP_EXPEDICAO:
            if previstos == 0:
                saidas = 1 if rng.random() < 0.35 else 0
            else:
                saidas = previstos + rng.choices([-1, 0, 1], weights=[12, 74, 14])[0]
            frota.append({"data": d.isoformat(), "transportadora": nome, "previstos": previstos, "saidas": saidas})
            if saidas == 0:
                continue
            programado = int(saidas * vol_veic * rng.uniform(0.85, 1.15))
            if previstos == 0:
                taxa = 1.0
            elif dia_ruim and rng.random() < 0.6:
                taxa = rng.uniform(0.55, 0.88)
            else:
                taxa = min(1.0, rng.gauss(0.965, 0.03))
            vol_exp = round(programado * taxa)
            vol_pend = programado - vol_exp
            valor_por_volume = rng.uniform(380, 460)
            expedido.append(
                {
                    "data": d.isoformat(),
                    "transportadora": nome,
                    "volume": vol_exp,
                    "valor": round(vol_exp * valor_por_volume),
                    "clientes": max(1, round(vol_exp / rng.uniform(4.0, 5.2))),
                    "fretes": saidas,
                }
            )
            restante = vol_pend
            while restante > 0:
                parte = restante if restante < 12 else rng.randint(6, max(6, restante))
                restante -= parte
                pendencias.append(
                    {
                        "data": d.isoformat(),
                        "transportadora": nome,
                        "operacao": rng.choices(OPERACOES, weights=[70, 30])[0],
                        "motivo": rng.choices(MOTIVOS, weights=[55, 25, 12, 8])[0],
                        "volume": parte,
                        "valor": round(parte * valor_por_volume * rng.uniform(0.9, 1.4)),
                        "clientes": max(1, round(parte / rng.uniform(5, 15))),
                    }
                )
    return {
        "simulado": True,
        "aviso": AVISO,
        "transportadoras": [t[0] for t in TRANSP_EXPEDICAO],
        "parametros": {"meta_expedido": 80, "atencao_expedido": 60, "pendente_critico": 25, "pendente_atencao": 10},
        "frota": colunar(frota),
        "expedido": colunar(expedido),
        "pendencias": colunar(pendencias),
    }


# ---------------------------------------------------------------- Varejo

PERFIS = {"Utilitário": 200, "VUC": 350, "Caminhão 3/4": 500}
TRANSP_VAREJO = ["Transportadora Alfa", "Transportadora Beta", "Transportadora Gama", "Transportadora Delta", "Transportadora Sigma"]
REGIOES = [
    # nome, perfil, transportadora, ocupação média, nº de rotas
    ("Região Norte 1", "Caminhão 3/4", 0, 1.35, 9),
    ("Região Norte 2", "Utilitário", 0, 0.88, 5),
    ("Região Norte 3", "VUC", 1, 0.84, 6),
    ("Região Sul 1", "Utilitário", 1, 1.08, 5),
    ("Região Sul 2", "Caminhão 3/4", 2, 0.93, 7),
    ("Região Sul 3", "VUC", 2, 0.80, 4),
    ("Região Leste 1", "Utilitário", 2, 0.86, 4),
    ("Região Leste 2", "VUC", 3, 0.83, 6),
    ("Região Leste 3", "Utilitário", 3, 0.80, 3),
    ("Região Oeste 1", "Caminhão 3/4", 4, 0.96, 8),
    ("Região Oeste 2", "VUC", 4, 0.93, 5),
    ("Região Oeste 3", "Utilitário", 4, 0.72, 3),
    ("Região Centro 1", "VUC", 0, 0.78, 5),
    ("Região Centro 2", "Utilitário", 1, 0.66, 3),
    ("Região Serra", "Caminhão 3/4", 3, 0.78, 6),
    ("Região Litoral", "VUC", 2, 0.84, 5),
]


def gerar_varejo(rng: random.Random, dias: list[date]) -> dict:
    codigos_usados: set[int] = set()

    def novo_codigo() -> int:
        while True:
            c = rng.randint(100, 899)
            if c not in codigos_usados:
                codigos_usados.add(c)
                return c

    regioes, rotas_fixas = [], {}
    for nome, perfil, i_transp, _, n_rotas in REGIOES:
        regioes.append({"regiao": nome, "perfil": perfil, "capacidade": PERFIS[perfil], "transportadora": TRANSP_VAREJO[i_transp]})
        # pesos fixos por rota: uma rota "âncora" maior e as demais menores
        pesos = [rng.uniform(0.3, 1.0) for _ in range(n_rotas)]
        pesos[0] *= rng.uniform(2.5, 6.0)
        rotas_fixas[nome] = [(novo_codigo(), p) for p in pesos]

    rotas = []
    for d in dias:
        for nome, perfil, _, ocup_media, _ in REGIOES:
            ocup = max(0.35, rng.gauss(ocup_media, 0.08))
            volume_regiao = round(PERFIS[perfil] * ocup)
            itens = rotas_fixas[nome]
            ativos = [r for r in itens if rng.random() < 0.9] or itens[:1]
            soma = sum(p * rng.uniform(0.8, 1.2) for _, p in ativos)
            acumulado = 0
            for k, (codigo, peso) in enumerate(ativos):
                if k == len(ativos) - 1:
                    vol = volume_regiao - acumulado
                else:
                    vol = max(1, round(volume_regiao * peso / soma))
                acumulado += vol
                if vol > 0:
                    rotas.append({"data": d.isoformat(), "regiao": nome, "rota": codigo, "volume": vol})
    return {
        "simulado": True,
        "aviso": AVISO,
        "transportadoras": TRANSP_VAREJO,
        "faixas": {"atencao": 90, "acima": 100},
        "regioes": colunar(regioes),
        "rotas": colunar(rotas),
    }


def main() -> None:
    dias = dias_operacao(FIM, QTD_DIAS)
    gravar(SAIDA_EXPEDICAO, gerar_expedicao(random.Random(SEMENTE), dias))
    gravar(SAIDA_VAREJO, gerar_varejo(random.Random(SEMENTE + 1), dias))
    print(f"Gerados {SAIDA_EXPEDICAO.relative_to(PROJETO)} e {SAIDA_VAREJO.relative_to(PROJETO)} ({len(dias)} dias, fictícios).")


if __name__ == "__main__":
    main()
