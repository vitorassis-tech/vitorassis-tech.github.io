"""
Gerador de DADOS SIMULADOS para o "Painel de frota e entregas" do portfólio.

O que este script faz
---------------------
1. Gera, de forma reprodutível (semente fixa), uma operação logística fictícia:
   4 transportadoras genéricas, 5 regiões e ~60 dias úteis de entregas.
2. Cria um banco SQLite a partir de ``sql/schema.sql`` e insere os dados.
3. Executa as consultas de ``sql/consultas.sql`` (é o SQL que calcula os
   agregados e os indicadores No-Show e Spot).
4. Exporta o resultado para o site:
   - ``public/dados/fretes-simulados.json`` (consumido pelo painel interativo)
   - ``public/dados/entregas-simuladas.csv`` (download da base agregada)

Nenhum dado real é utilizado. Os nomes "Transportadora A/B/C/D" são
propositalmente genéricos. Só usa a biblioteca padrão do Python 3.10+.

Uso:  python3 dados-demo/gerar_dados.py
"""

from __future__ import annotations

import csv
import json
import random
import re
import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PROJETO = RAIZ.parent
SCHEMA = RAIZ / "sql" / "schema.sql"
CONSULTAS = RAIZ / "sql" / "consultas.sql"
BANCO = RAIZ / "saida" / "fretes_simulados.sqlite"
SAIDA_JSON = PROJETO / "public" / "dados" / "fretes-simulados.json"
SAIDA_CSV = PROJETO / "public" / "dados" / "entregas-simuladas.csv"

SEMENTE = 2026
DATA_INICIAL = date(2026, 1, 5)  # segunda-feira
DIAS_UTEIS = 60


@dataclass(frozen=True)
class PerfilTransportadora:
    nome: str
    contratados: int          # veículos contratados por dia
    taxa_presenca: float      # probabilidade de cada veículo contratado se apresentar
    taxa_no_prazo: float      # probabilidade de entrega no prazo
    taxa_completa: float      # probabilidade de entrega completa (sem falta/avaria)
    custo_base: float         # R$ fixo por entrega
    custo_kg: float           # R$ por kg


TRANSPORTADORAS = [
    PerfilTransportadora("Transportadora A", 12, 0.97, 0.95, 0.985, 38.0, 0.42),
    PerfilTransportadora("Transportadora B", 8, 0.92, 0.90, 0.97, 33.0, 0.38),
    PerfilTransportadora("Transportadora C", 6, 0.88, 0.86, 0.965, 29.0, 0.35),
    PerfilTransportadora("Transportadora D", 4, 0.95, 0.92, 0.98, 45.0, 0.50),
]

# Fator de distância relativo de cada região (afeta prazo e custo)
REGIOES = {
    "Região Centro": 0.8,
    "Região Norte": 1.0,
    "Região Oeste": 1.25,
    "Região Leste": 1.1,
    "Região Metropolitana": 1.4,
}

# Sazonalidade semanal da demanda (segunda=0 ... sexta=4)
FATOR_DIA_SEMANA = [1.15, 1.0, 0.95, 1.0, 1.1]
ENTREGAS_POR_VEICULO = 7


def dias_uteis(inicio: date, quantidade: int) -> list[date]:
    """Retorna `quantidade` dias de segunda a sexta a partir de `inicio`."""
    dias: list[date] = []
    atual = inicio
    while len(dias) < quantidade:
        if atual.weekday() < 5:
            dias.append(atual)
        atual += timedelta(days=1)
    return dias


def gerar_operacao(rng: random.Random):
    """Gera as linhas de operacao_diaria e entrega."""
    operacao: list[tuple] = []
    entregas: list[tuple] = []
    nomes_regioes = list(REGIOES)
    id_entrega = 1

    for dia in dias_uteis(DATA_INICIAL, DIAS_UTEIS):
        demanda = FATOR_DIA_SEMANA[dia.weekday()] * rng.uniform(0.9, 1.12)
        for t_id, perfil in enumerate(TRANSPORTADORAS, start=1):
            apresentados = sum(rng.random() < perfil.taxa_presenca for _ in range(perfil.contratados))
            necessidade = round(perfil.contratados * demanda)
            # Quando faltam veículos ou a demanda sobe, aciona-se frota extra (spot)
            utilizados = max(necessidade, 1)
            operacao.append((dia.isoformat(), t_id, apresentados, utilizados))

            qtd_entregas = sum(
                max(1, round(rng.gauss(ENTREGAS_POR_VEICULO, 1.5))) for _ in range(utilizados)
            )
            for _ in range(qtd_entregas):
                regiao = rng.choice(nomes_regioes)
                fator = REGIOES[regiao]
                peso = round(max(2.0, rng.lognormvariate(3.0, 0.6)), 1)
                prob_prazo = perfil.taxa_no_prazo - (fator - 1) * 0.08
                no_prazo = int(rng.random() < prob_prazo)
                completa = int(rng.random() < perfil.taxa_completa)
                custo = round((perfil.custo_base + perfil.custo_kg * peso) * fator * rng.uniform(0.95, 1.05), 2)
                entregas.append(
                    (id_entrega, dia.isoformat(), t_id, nomes_regioes.index(regiao) + 1,
                     no_prazo, completa, peso, custo)
                )
                id_entrega += 1
    return operacao, entregas


def carregar_consultas(caminho: Path) -> dict[str, str]:
    """Divide o arquivo .sql em blocos nomeados por '-- name: x'."""
    texto = caminho.read_text(encoding="utf-8")
    blocos = re.split(r"^-- name:\s*(\w+)\s*$", texto, flags=re.MULTILINE)
    return {blocos[i]: blocos[i + 1].strip() for i in range(1, len(blocos), 2)}


def criar_banco(caminho: Path, rng: random.Random) -> sqlite3.Connection:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    if caminho.exists():
        caminho.unlink()
    con = sqlite3.connect(caminho)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA.read_text(encoding="utf-8"))
    con.executemany(
        "INSERT INTO transportadora (id, nome, veiculos_contratados_dia) VALUES (?, ?, ?)",
        [(i, p.nome, p.contratados) for i, p in enumerate(TRANSPORTADORAS, start=1)],
    )
    con.executemany(
        "INSERT INTO regiao (id, nome) VALUES (?, ?)",
        [(i, nome) for i, nome in enumerate(REGIOES, start=1)],
    )
    operacao, entregas = gerar_operacao(rng)
    con.executemany(
        "INSERT INTO operacao_diaria (data, transportadora_id, veiculos_apresentados, veiculos_utilizados)"
        " VALUES (?, ?, ?, ?)",
        operacao,
    )
    con.executemany(
        "INSERT INTO entrega (id, data, transportadora_id, regiao_id, no_prazo, completa, peso_kg, custo_frete)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        entregas,
    )
    con.commit()
    return con


def colunar(linhas: list[dict]) -> dict:
    """Converte lista de dicionários em {colunas: [...], linhas: [[...], ...]}."""
    colunas = list(linhas[0].keys())
    return {"colunas": colunas, "linhas": [[linha[c] for c in colunas] for linha in linhas]}


def exportar(con: sqlite3.Connection) -> dict:
    consultas = carregar_consultas(CONSULTAS)
    entregas = [dict(r) for r in con.execute(consultas["entregas_por_dia"])]
    frota = [dict(r) for r in con.execute(consultas["frota_por_dia"])]

    payload = {
        "aviso": "DADOS SIMULADOS — gerados pelo script dados-demo/gerar_dados.py para fins de demonstração. "
                 "Não representam nenhuma empresa, transportadora ou operação real.",
        "simulado": True,
        "semente": SEMENTE,
        "periodo": {"inicio": entregas[0]["data"], "fim": entregas[-1]["data"]},
        "transportadoras": [p.nome for p in TRANSPORTADORAS],
        "regioes": list(REGIOES),
        # Formato colunar (cabeçalho + linhas) para reduzir o tamanho do arquivo
        "entregas": colunar(entregas),
        "frota": colunar(frota),
    }

    SAIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
    SAIDA_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    with SAIDA_CSV.open("w", newline="", encoding="utf-8") as arq:
        arq.write("# DADOS SIMULADOS - nao representam operacao real\n")
        escritor = csv.DictWriter(arq, fieldnames=list(entregas[0].keys()), delimiter=";")
        escritor.writeheader()
        escritor.writerows(entregas)
    return payload


def main() -> None:
    rng = random.Random(SEMENTE)
    con = criar_banco(BANCO, rng)
    try:
        payload = exportar(con)
        resumo = carregar_consultas(CONSULTAS)["resumo_transportadora"]
        print("Resumo por transportadora (dados simulados):")
        for linha in con.execute(resumo):
            print(f"  {linha['transportadora']}: {linha['entregas']} entregas | OTIF {linha['otif_pct']}% "
                  f"| R$ {linha['custo_por_entrega']}/entrega")
    finally:
        con.close()
    print(f"\nArquivos gerados:\n  {SAIDA_JSON.relative_to(PROJETO)}\n  {SAIDA_CSV.relative_to(PROJETO)}"
          f"\n  {BANCO.relative_to(PROJETO)}")
    print(f"Linhas: {len(payload['entregas']['linhas'])} agregados de entrega, "
          f"{len(payload['frota']['linhas'])} registros de frota.")


if __name__ == "__main__":
    main()
