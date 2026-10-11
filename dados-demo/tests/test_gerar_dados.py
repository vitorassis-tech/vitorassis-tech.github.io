"""Testes do gerador de dados simulados (python3 -m unittest)."""

import json
import random
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import gerar_dados as g  # noqa: E402


class TestGerador(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.con = g.criar_banco(Path(cls.tmp.name) / "teste.sqlite", random.Random(g.SEMENTE))
        cls.consultas = g.carregar_consultas(g.CONSULTAS)

    @classmethod
    def tearDownClass(cls):
        cls.con.close()
        cls.tmp.cleanup()

    def test_dias_uteis_sem_fim_de_semana(self):
        dias = g.dias_uteis(g.DATA_INICIAL, 10)
        self.assertEqual(len(dias), 10)
        self.assertTrue(all(d.weekday() < 5 for d in dias))

    def test_reprodutivel(self):
        a = g.gerar_operacao(random.Random(1))
        b = g.gerar_operacao(random.Random(1))
        self.assertEqual(a, b)

    def test_consultas_nomeadas(self):
        self.assertEqual(set(self.consultas), {"entregas_por_dia", "frota_por_dia", "resumo_transportadora"})

    def test_no_show_e_spot_conforme_regra(self):
        for r in self.con.execute(self.consultas["frota_por_dia"]):
            self.assertEqual(r["no_show"], max(r["contratados"] - r["apresentados"], 0))
            self.assertEqual(r["spot"], max(r["utilizados"] - r["contratados"], 0))

    def test_otif_nao_excede_componentes(self):
        for r in self.con.execute(self.consultas["entregas_por_dia"]):
            self.assertLessEqual(r["otif"], r["no_prazo"])
            self.assertLessEqual(r["otif"], r["completas"])
            self.assertLessEqual(r["no_prazo"], r["entregas"])

    def test_agregado_bate_com_tabela_bruta(self):
        total_bruto = self.con.execute("SELECT COUNT(*) FROM entrega").fetchone()[0]
        total_agregado = sum(r["entregas"] for r in self.con.execute(self.consultas["entregas_por_dia"]))
        self.assertEqual(total_bruto, total_agregado)

    def test_integridade_referencial(self):
        orfas = self.con.execute(
            "SELECT COUNT(*) FROM entrega e LEFT JOIN transportadora t ON t.id = e.transportadora_id "
            "WHERE t.id IS NULL"
        ).fetchone()[0]
        self.assertEqual(orfas, 0)


class TestArquivoPublicado(unittest.TestCase):
    """Garante que o JSON consumido pelo site existe e está marcado como simulado."""

    def test_json_publicado(self):
        self.assertTrue(g.SAIDA_JSON.exists(), "Rode: python3 dados-demo/gerar_dados.py")
        dados = json.loads(g.SAIDA_JSON.read_text(encoding="utf-8"))
        self.assertIs(dados["simulado"], True)
        self.assertIn("SIMULADOS", dados["aviso"])
        self.assertGreater(len(dados["entregas"]["linhas"]), 0)
        self.assertEqual(len(dados["frota"]["linhas"]), g.DIAS_UTEIS * len(g.TRANSPORTADORAS))
        for bloco in ("entregas", "frota"):
            n = len(dados[bloco]["colunas"])
            self.assertTrue(all(len(linha) == n for linha in dados[bloco]["linhas"]))


if __name__ == "__main__":
    unittest.main()
