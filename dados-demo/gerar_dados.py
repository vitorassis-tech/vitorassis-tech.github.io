"""
Gerador de DADOS FICTÍCIOS para as demonstrações do portfólio.

O que este script faz
---------------------
1. Gera, de forma reprodutível (semente fixa), uma operação logística fictícia:
   4 transportadoras genéricas (A, B, C, D), 5 regiões e 60 dias úteis de
   frota, entregas, cargas programadas e pendências.
2. Cria um banco SQLite a partir de ``sql/schema.sql`` e insere os dados.
3. Executa as consultas de ``sql/consultas.sql`` (é o SQL que agrega os dados).
4. Exporta o resultado para o site:
   - ``public/dados/fretes-simulados.json``  → Painel de frota e entregas
   - ``public/dados/torre-simulacao.json``   → Simulação da Torre de Controle
   - ``public/dados/entregas-simuladas.csv`` → download da base agregada

Todos os dados, indicadores e parâmetros são fictícios e independentes de
qualquer empresa: não reproduzem quantidades, fórmulas ou regras reais.
Só usa a biblioteca padrão do Python 3.10+.

Uso:  python dados-demo/gerar_dados.py   (ou: npm run dados)
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
BANCO = RAIZ / "saida" / "dados_ficticios.sqlite"
SAIDA_JSON = PROJETO / "public" / "dados" / "fretes-simulados.json"
SAIDA_TORRE = PROJETO / "public" / "dados" / "torre-simulacao.json"
SAIDA_CSV = PROJETO / "public" / "dados" / "entregas-simuladas.csv"

SEMENTE = 2026
DATA_INICIAL = date(2026, 1, 5)  # segunda-feira
DIAS_UTEIS = 60

AVISO = (
    "DADOS FICTÍCIOS — gerados pelo script dados-demo/gerar_dados.py para fins de demonstração. "
    "Não representam nenhuma empresa, transportadora ou operação real e não reproduzem "
    "quantidades, indicadores ou regras reais."
)

# Parâmetros demonstrativos FICTÍCIOS do farol da simulação (ajustáveis na tela)
PARAMETROS_FAROL = {"atencao": 95, "critico": 85}


@dataclass(frozen=True)
class PerfilTransportadora:
    nome: str
    frota_referencia: int      # frota de referência FICTÍCIA (base da demanda diária)
    taxa_disponibilidade: float  # probabilidade de cada veículo candidato se apresentar
    taxa_no_prazo: float       # probabilidade de entrega no prazo
    taxa_completa: float       # probabilidade de entrega completa (sem falta/avaria)
    custo_base: float          # R$ fixo por entrega (fictício)
    custo_kg: float            # R$ por kg (fictício)
    taxa_pendencia: float      # probabilidade base de uma carga ficar pendente


TRANSPORTADORAS = [
    PerfilTransportadora("Transportadora A", 15, 0.95, 0.95, 0.985, 38.0, 0.42, 0.015),
    PerfilTransportadora("Transportadora B", 11, 0.91, 0.90, 0.970, 33.0, 0.38, 0.030),
    PerfilTransportadora("Transportadora C", 9, 0.86, 0.86, 0.965, 29.0, 0.35, 0.050),
    PerfilTransportadora("Transportadora D", 5, 0.93, 0.92, 0.980, 45.0, 0.50, 0.020),
]

# Fator de distância relativo de cada região (afeta prazo e custo)
REGIOES = {
    "Região Centro": 0.8,
    "Região Norte": 1.0,
    "Região Oeste": 1.25,
    "Região Leste": 1.1,
    "Região Metropolitana": 1.4,
}

# Motivos genéricos e fictícios de pendência
MOTIVOS_SEM_VEICULO = ["Aguardando veículo"]
MOTIVOS_GERAIS = ["Documentação pendente", "Reprogramada", "Conferência em andamento"]

# Sazonalidade semanal da demanda (segunda=0 ... sexta=4)
FATOR_DIA_SEMANA = [1.15, 1.0, 0.95, 1.0, 1.1]
ENTREGAS_POR_VEICULO = 7
CARGAS_POR_VEICULO = 2


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
    """Gera as linhas de operacao_diaria, entrega e carga."""
    operacao: list[tuple] = []
    entregas: list[tuple] = []
    cargas: list[tuple] = []
    nomes_regioes = list(REGIOES)
    id_entrega = 1
    id_carga = 1

    for dia in dias_uteis(DATA_INICIAL, DIAS_UTEIS):
        demanda = FATOR_DIA_SEMANA[dia.weekday()] * rng.uniform(0.9, 1.12)
        for t_id, perfil in enumerate(TRANSPORTADORAS, start=1):
            necessarios = max(1, round(perfil.frota_referencia * demanda))
            candidatos = necessarios + rng.randint(0, 2)
            disponiveis = sum(rng.random() < perfil.taxa_disponibilidade for _ in range(candidatos))
            em_rota = min(disponiveis, necessarios)
            operacao.append((dia.isoformat(), t_id, necessarios, disponiveis, em_rota))

            # Entregas realizadas pelos veículos em rota
            qtd_entregas = sum(
                max(1, round(rng.gauss(ENTREGAS_POR_VEICULO, 1.5))) for _ in range(em_rota)
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

            # Cargas programadas: pendências aumentam quando falta veículo
            falta = max(necessarios - disponiveis, 0)
            prob_pendencia = perfil.taxa_pendencia + (falta / necessarios) * 0.6
            programadas = necessarios * CARGAS_POR_VEICULO + rng.randint(0, 3)
            for _ in range(programadas):
                if rng.random() < prob_pendencia:
                    motivos = MOTIVOS_SEM_VEICULO * 3 + MOTIVOS_GERAIS if falta else MOTIVOS_GERAIS
                    motivo = rng.choice(motivos)
                    horas = round(rng.uniform(1.0, 30.0), 1)
                    cargas.append((id_carga, dia.isoformat(), t_id, 0, motivo, horas))
                else:
                    cargas.append((id_carga, dia.isoformat(), t_id, 1, None, None))
                id_carga += 1
    return operacao, entregas, cargas


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
        "INSERT INTO transportadora (id, nome, frota_referencia) VALUES (?, ?, ?)",
        [(i, p.nome, p.frota_referencia) for i, p in enumerate(TRANSPORTADORAS, start=1)],
    )
    con.executemany(
        "INSERT INTO regiao (id, nome) VALUES (?, ?)",
        [(i, nome) for i, nome in enumerate(REGIOES, start=1)],
    )
    operacao, entregas, cargas = gerar_operacao(rng)
    con.executemany(
        "INSERT INTO operacao_diaria (data, transportadora_id, veiculos_necessarios, veiculos_disponiveis,"
        " veiculos_em_rota) VALUES (?, ?, ?, ?, ?)",
        operacao,
    )
    con.executemany(
        "INSERT INTO entrega (id, data, transportadora_id, regiao_id, no_prazo, completa, peso_kg, custo_frete)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        entregas,
    )
    con.executemany(
        "INSERT INTO carga (id, data, transportadora_id, expedida, motivo_pendencia, horas_pendencia)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        cargas,
    )
    con.commit()
    return con


def colunar(linhas: list[dict]) -> dict:
    """Converte lista de dicionários em {colunas: [...], linhas: [[...], ...]}."""
    colunas = list(linhas[0].keys())
    return {"colunas": colunas, "linhas": [[linha[c] for c in colunas] for linha in linhas]}


def _gravar_json(caminho: Path, dados: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def exportar(con: sqlite3.Connection) -> tuple[dict, dict]:
    consultas = carregar_consultas(CONSULTAS)
    entregas = [dict(r) for r in con.execute(consultas["entregas_por_dia"])]
    frota = [dict(r) for r in con.execute(consultas["frota_por_dia"])]
    cargas = [dict(r) for r in con.execute(consultas["cargas_por_dia"])]
    pendencias = [dict(r) for r in con.execute(consultas["pendencias"])]
    periodo = {"inicio": entregas[0]["data"], "fim": entregas[-1]["data"]}
    base = {
        "aviso": AVISO,
        "simulado": True,
        "semente": SEMENTE,
        "periodo": periodo,
        "transportadoras": [p.nome for p in TRANSPORTADORAS],
    }

    # Resumo calculado pelo SQL: usado nos testes para conferir o que o painel exibe
    resumo = [dict(r) for r in con.execute(consultas["resumo_transportadora"])]
    painel = {
        **base,
        "regioes": list(REGIOES),
        "entregas": colunar(entregas),
        "frota": colunar(frota),
        "resumo_sql": colunar(resumo),
    }
    torre = {
        **base,
        "parametros_padrao": {**PARAMETROS_FAROL, "observacao": "Parâmetros demonstrativos fictícios, ajustáveis."},
        "frota": colunar(frota),
        "cargas": colunar(cargas),
        "pendencias": colunar(pendencias),
    }
    _gravar_json(SAIDA_JSON, painel)
    _gravar_json(SAIDA_TORRE, torre)

    with SAIDA_CSV.open("w", newline="", encoding="utf-8") as arq:
        arq.write("# DADOS FICTICIOS - nao representam nenhuma empresa ou operacao real\n")
        escritor = csv.DictWriter(arq, fieldnames=list(entregas[0].keys()), delimiter=";")
        escritor.writeheader()
        escritor.writerows(entregas)
    return painel, torre


def main() -> None:
    rng = random.Random(SEMENTE)
    con = criar_banco(BANCO, rng)
    try:
        painel, torre = exportar(con)
        resumo = carregar_consultas(CONSULTAS)["resumo_transportadora"]
        print("Resumo por transportadora (dados fictícios):")
        for l in con.execute(resumo):
            print(f"  {l['transportadora']}: {l['entregas']} entregas | OTIF {l['otif_pct']}% | "
                  f"cobertura {l['cobertura_pct']}% | {l['entregas_por_veiculo_em_rota']} entregas/veículo | "
                  f"expedição {l['taxa_expedicao_pct']}%")
    finally:
        con.close()
    for caminho in (SAIDA_JSON, SAIDA_TORRE, SAIDA_CSV, BANCO):
        print(f"Gerado: {caminho.relative_to(PROJETO)}")
    print(f"Linhas: {len(painel['entregas']['linhas'])} agregados de entrega, "
          f"{len(painel['frota']['linhas'])} registros de frota, "
          f"{len(torre['cargas']['linhas'])} registros de cargas, "
          f"{len(torre['pendencias']['linhas'])} pendências.")


if __name__ == "__main__":
    main()
