"""Testes do gerador de dados fictícios (python -m unittest)."""

import json
import random
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import gerar_dados as g  # noqa: E402

TERMOS_PROIBIDOS = ("no-show", "no_show", "noshow", "spot", "máximo", "maximo", "contrat")


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
        self.assertEqual(g.gerar_operacao(random.Random(1)), g.gerar_operacao(random.Random(1)))

    def test_consultas_nomeadas(self):
        self.assertEqual(
            set(self.consultas),
            {"entregas_por_dia", "frota_por_dia", "cargas_por_dia", "pendencias", "resumo_transportadora"},
        )

    def test_frota_coerente(self):
        for r in self.con.execute(self.consultas["frota_por_dia"]):
            self.assertGreater(r["necessarios"], 0)
            self.assertLessEqual(r["em_rota"], r["disponiveis"])
            self.assertLessEqual(r["em_rota"], r["necessarios"])

    def test_entregas_da_frota_batem_com_a_tabela_bruta(self):
        total_frota = sum(r["entregas"] for r in self.con.execute(self.consultas["frota_por_dia"]))
        total_bruto = self.con.execute("SELECT COUNT(*) FROM entrega").fetchone()[0]
        self.assertEqual(total_frota, total_bruto)

    def test_otif_nao_excede_componentes(self):
        for r in self.con.execute(self.consultas["entregas_por_dia"]):
            self.assertLessEqual(r["otif"], r["no_prazo"])
            self.assertLessEqual(r["otif"], r["completas"])
            self.assertLessEqual(r["no_prazo"], r["entregas"])

    def test_agregado_bate_com_tabela_bruta(self):
        total_bruto = self.con.execute("SELECT COUNT(*) FROM entrega").fetchone()[0]
        total_agregado = sum(r["entregas"] for r in self.con.execute(self.consultas["entregas_por_dia"]))
        self.assertEqual(total_bruto, total_agregado)

    def test_cargas_consistentes(self):
        for r in self.con.execute(self.consultas["cargas_por_dia"]):
            self.assertEqual(r["programadas"], r["expedidas"] + r["pendentes"])
            if r["pendentes"] == 0:
                self.assertEqual(r["horas_pendencia"], 0)
        n_pend = len(list(self.con.execute(self.consultas["pendencias"])))
        n_agreg = sum(r["pendentes"] for r in self.con.execute(self.consultas["cargas_por_dia"]))
        self.assertEqual(n_pend, n_agreg)

    def test_existem_dias_sem_pendencia(self):
        """Garante que a demonstração exercita o estado 'sem pendências'."""
        zeros = [r for r in self.con.execute(self.consultas["cargas_por_dia"]) if r["pendentes"] == 0]
        self.assertGreater(len(zeros), 0)

    def test_resumo_sql_bate_com_calculo_manual(self):
        for r in self.con.execute(self.consultas["resumo_transportadora"]):
            t_id = self.con.execute("SELECT id FROM transportadora WHERE nome = ?", (r["transportadora"],)).fetchone()[0]
            nec, disp, rota = self.con.execute(
                "SELECT SUM(veiculos_necessarios), SUM(veiculos_disponiveis), SUM(veiculos_em_rota)"
                " FROM operacao_diaria WHERE transportadora_id = ?", (t_id,)).fetchone()
            ent = self.con.execute("SELECT COUNT(*) FROM entrega WHERE transportadora_id = ?", (t_id,)).fetchone()[0]
            self.assertAlmostEqual(r["cobertura_pct"], round(100 * disp / nec, 1), places=1)
            self.assertAlmostEqual(r["entregas_por_veiculo_em_rota"], round(ent / rota, 2), places=2)

    def test_divisao_por_zero_retorna_nulo(self):
        valor = self.con.execute("SELECT 1.0 * 5 / NULLIF(0, 0)").fetchone()[0]
        self.assertIsNone(valor)

    def test_integridade_referencial(self):
        orfas = self.con.execute(
            "SELECT COUNT(*) FROM entrega e LEFT JOIN transportadora t ON t.id = e.transportadora_id "
            "WHERE t.id IS NULL"
        ).fetchone()[0]
        self.assertEqual(orfas, 0)

    def test_nomes_genericos(self):
        for p in g.TRANSPORTADORAS:
            self.assertRegex(p.nome, r"^Transportadora [A-D]$")

    def test_sem_termos_de_regras_reais_no_codigo_sql(self):
        for arq in (g.SCHEMA, g.CONSULTAS):
            texto = arq.read_text(encoding="utf-8").lower()
            for termo in TERMOS_PROIBIDOS:
                self.assertNotIn(termo, texto, f"{termo} em {arq.name}")


class TestArquivosPublicados(unittest.TestCase):
    """Garante que os JSON consumidos pelo site existem e estão marcados como fictícios."""

    def _ler(self, caminho):
        self.assertTrue(caminho.exists(), "Rode: npm run dados")
        return json.loads(caminho.read_text(encoding="utf-8"))

    def test_json_do_painel(self):
        dados = self._ler(g.SAIDA_JSON)
        self.assertIs(dados["simulado"], True)
        self.assertIn("FICTÍCIOS", dados["aviso"])
        self.assertGreater(len(dados["entregas"]["linhas"]), 0)
        self.assertEqual(len(dados["frota"]["linhas"]), g.DIAS_UTEIS * len(g.TRANSPORTADORAS))
        for bloco in ("entregas", "frota"):
            n = len(dados[bloco]["colunas"])
            self.assertTrue(all(len(linha) == n for linha in dados[bloco]["linhas"]))

    def test_json_da_torre(self):
        dados = self._ler(g.SAIDA_TORRE)
        self.assertIs(dados["simulado"], True)
        self.assertIn("FICTÍCIOS", dados["aviso"])
        self.assertEqual(dados["parametros_padrao"]["atencao"], 95)
        self.assertEqual(dados["parametros_padrao"]["critico"], 85)
        self.assertIn("fictícios", dados["parametros_padrao"]["observacao"])
        for bloco in ("frota", "cargas", "pendencias"):
            self.assertGreater(len(dados[bloco]["linhas"]), 0)

    def test_arquivos_sem_termos_de_regras_reais(self):
        for caminho in (g.SAIDA_JSON, g.SAIDA_TORRE, g.SAIDA_CSV):
            texto = caminho.read_text(encoding="utf-8").lower()
            for termo in TERMOS_PROIBIDOS:
                self.assertNotIn(termo, texto, f"{termo} em {caminho.name}")

    def test_csv_tem_aviso(self):
        primeira = g.SAIDA_CSV.read_text(encoding="utf-8").splitlines()[0]
        self.assertIn("FICTICIOS", primeira)


if __name__ == "__main__":
    unittest.main()
