"""
Gera o currículo em PDF (compatível com ATS) a partir do conteúdo do portfólio.

Uso, na pasta do projeto:
    python scripts/curriculo/gerar_curriculo.py

Saída: public/curriculo/vitor-assis-curriculo.pdf
Requer: pip install reportlab

Regras de ATS seguidas: uma coluna, texto real (sem imagens nem tabelas de layout),
títulos de seção padronizados, datas no formato mês/ano e fonte comum.
Tudo vem de src/content/*.json; o resumo e os grupos de competências abaixo
resumem apenas o que já está registrado nesses arquivos.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

RAIZ = Path(__file__).resolve().parents[2]
CONTEUDO = RAIZ / "src" / "content"
SAIDA = RAIZ / "public" / "curriculo" / "vitor-assis-curriculo.pdf"
PORTFOLIO = "vitorassis-tech.github.io"

MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

AZUL = HexColor("#17365D")
TINTA = HexColor("#202B3A")
CINZA = HexColor("#4A5A70")
LARANJA = HexColor("#E8650F")


def ler(nome: str):
    return json.loads((CONTEUDO / f"{nome}.json").read_text(encoding="utf-8"))


def mes_ano(data: str | None) -> str:
    if not data:
        return "atual"
    ano, mes = data.split("-")[:2]
    return f"{MESES[int(mes) - 1]}/{ano}"


def registrar_fontes() -> tuple[str, str, str]:
    """Carlito (Linux) ou Calibri (Windows); se nenhuma existir, Helvetica."""
    candidatas = [
        ("/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf", "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf", "/usr/share/fonts/truetype/crosextra/Carlito-Italic.ttf"),
        (r"C:\Windows\Fonts\calibri.ttf", r"C:\Windows\Fonts\calibrib.ttf", r"C:\Windows\Fonts\calibrii.ttf"),
    ]
    for normal, negrito, italico in candidatas:
        if all(os.path.exists(f) for f in (normal, negrito, italico)):
            pdfmetrics.registerFont(TTFont("CV", normal))
            pdfmetrics.registerFont(TTFont("CV-Bold", negrito))
            pdfmetrics.registerFont(TTFont("CV-Italic", italico))
            pdfmetrics.registerFontFamily("CV", normal="CV", bold="CV-Bold", italic="CV-Italic", boldItalic="CV-Bold")
            return "CV", "CV-Bold", "CV-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


def main() -> None:
    site = ler("site")
    experiencias = ler("experiencias")
    formacao = ler("formacao")
    cursos = ler("cursos")
    instituicoes = {i["id"]: i["nome"] for i in ler("instituicoes")}
    canais = {c["id"]: c for c in ler("contatos")["canais"] if c.get("exibir")}

    normal, negrito, italico = registrar_fontes()
    s_nome = ParagraphStyle("nome", fontName=negrito, fontSize=22, leading=26, textColor=AZUL)
    s_cargo = ParagraphStyle("cargo", fontName=normal, fontSize=12, leading=15, textColor=TINTA, spaceBefore=2)
    s_contato = ParagraphStyle("contato", fontName=normal, fontSize=9, leading=12.5, textColor=CINZA, spaceBefore=4)
    s_secao = ParagraphStyle("secao", fontName=negrito, fontSize=11.5, leading=14, textColor=AZUL, spaceBefore=8, spaceAfter=1)
    s_texto = ParagraphStyle("texto", fontName=normal, fontSize=9.8, leading=13, textColor=TINTA, alignment=TA_LEFT)
    s_item = ParagraphStyle("item", parent=s_texto, fontSize=9.5, leading=12.3)
    s_empresa = ParagraphStyle("empresa", fontName=negrito, fontSize=10.6, leading=14, textColor=TINTA, spaceBefore=6)
    s_cargo_exp = ParagraphStyle("cargoexp", fontName=negrito, fontSize=10, leading=13.5, textColor=AZUL, spaceBefore=4)

    def secao(titulo: str):
        return [
            Paragraph(titulo.upper(), s_secao),
            HRFlowable(width="100%", thickness=0.8, color=LARANJA, spaceBefore=1, spaceAfter=4),
        ]

    def lista(itens: list[str]):
        return ListFlowable(
            [ListItem(Paragraph(t, s_item), leftIndent=11, value="•") for t in itens],
            bulletType="bullet",
            bulletFontName=normal,
            bulletFontSize=8,
            leftIndent=11,
            bulletColor=LARANJA,
            spaceBefore=1,
        )

    hist = []
    # ---------- Cabeçalho ----------
    hist.append(Paragraph(site["nomeCompleto"], s_nome))
    hist.append(Paragraph(f"{site['cargoAtual']} | Logística, Análise de Dados e Business Intelligence", s_cargo))
    contatos = [site["local"]]
    if "email" in canais:
        contatos.append(canais["email"]["valor"])
    if "linkedin" in canais:
        contatos.append(canais["linkedin"]["valor"])
    if "github" in canais:
        contatos.append(canais["github"]["valor"])
    contatos.append(f"Portfólio: {PORTFOLIO}")
    hist.append(Paragraph("  |  ".join(contatos), s_contato))

    # ---------- Resumo ----------
    profarma = next(e for e in experiencias if e["id"] == "profarma")
    inicio = mes_ano(profarma["inicio"])
    hist += secao("Resumo profissional")
    hist.append(
        Paragraph(
            f"Profissional de logística no {profarma['nome']} desde {inicio}, com trajetória do depósito à área de transportes: "
            "expedição, roteirização de entregas no Roadnet, documentação fiscal e de transporte e gestão de transportadoras e fretes. "
            "Desenvolve e mantém dashboards gerenciais em Power BI (Power Query e DAX), um deles em uso diário pela gerência no "
            "acompanhamento da expedição. Formação técnica em Logística e em Qualidade, graduação tecnológica em Logística em andamento "
            "e cursos concluídos de Python, banco de dados, Power BI e Inteligência Artificial, com SQL em formação. "
            f"Objetivo: {site['objetivo'][0].lower()}{site['objetivo'][1:]}",
            s_texto,
        )
    )

    # ---------- Competências ----------
    hist += secao("Competências")
    grupos = [
        ("Logística e transporte", "roteirização de entregas (Roadnet), expedição, gestão de transportadoras e fretes, documentação fiscal e de transporte (CT-e, XML de NF-e, DANFE), gerenciamento de riscos (GR), agendamento de cargas e entregas, rastreamento de entregas, inventário e 5S"),
        ("Dados e BI", "Power BI, Power Query (M), DAX, Excel avançado (tabelas dinâmicas), indicadores (KPIs) e relatórios gerenciais"),
        ("Programação e bancos de dados", "Python, SQL, MySQL, SQLite, modelagem relacional (MER/DER), JSON, Flask, HTML, CSS, JavaScript, Git e GitHub"),
        ("Inteligência Artificial", "curso de Inteligência Artificial concluído (FAETEC, 168h)"),
        ("Sistemas", "SAP, Roadnet, TMS, e-ColdWeb, Emite, Comprovei, Cervello e coletores de dados"),
    ]
    for titulo, texto in grupos:
        hist.append(Paragraph(f"<b>{titulo}:</b> {texto}.", s_item))
        hist.append(Spacer(1, 2.2))

    # ---------- Experiência ----------
    hist += secao("Experiência profissional")
    for emp in experiencias:
        cab = Paragraph(f"{emp['nome']}  <font color='#4A5A70' name='{normal}'>| {mes_ano(emp['inicio'])} – {mes_ano(emp['fim'])}</font>", s_empresa)
        primeiro = True
        for cargo in emp["cargos"]:
            bloco = []
            if primeiro:
                bloco.append(cab)
                primeiro = False
            bloco.append(Paragraph(f"{cargo['titulo']}  <font color='#4A5A70' name='{normal}'>| {mes_ano(cargo['inicio'])} – {mes_ano(cargo['fim'])}</font>", s_cargo_exp))
            bloco.append(lista(cargo["atividades"][:1]))
            hist.append(KeepTogether(bloco))
            if len(cargo["atividades"]) > 1:
                hist.append(lista(cargo["atividades"][1:]))

    # ---------- Formação ----------
    hist += secao("Formação acadêmica")
    for f in formacao:
        situacao = f"previsão de conclusão em {mes_ano(f['data'])}" if f["status"] == "andamento" else f"concluído em {mes_ano(f['data'])}"
        hist.append(Paragraph(f"<b>{f['curso']}</b> — {instituicoes.get(f['instituicao'], f['instituicao'])} ({situacao})", s_item))
        hist.append(Spacer(1, 2))

    # ---------- Cursos ----------
    hist += secao("Cursos e certificações")
    itens = []
    for c in cursos:
        situacao = "em andamento" if c["status"] == "andamento" else f"concluído em {mes_ano(c['data'])}"
        horas = f", {c['cargaHoraria']}h" if c.get("cargaHoraria") else ""
        itens.append(f"<b>{c['curso']}</b> — {instituicoes.get(c['instituicao'], c['instituicao'])}{horas} ({situacao})")
    hist.append(lista(itens))

    # ---------- Projetos ----------
    hist += secao("Projetos")
    projetos = [
        "<b>Painel de Expedição</b> (Grupo Profarma) — dashboard em Power BI em uso diário pela gerência: frota, expedição e pendências por transportadora, com faróis de status. Power BI, Power Query, DAX.",
        "<b>Painel de Logística Varejo</b> (Grupo Profarma) — volume roteirizado por região e rota e ocupação dos veículos. Power BI, Power Query, DAX.",
        "<b>Banco de dados de uma escola de música</b> (Firjan SENAI) — modelo relacional com tabelas, restrições, consultas com JOIN, views e procedures. MySQL.",
        "<b>Atividade Flask</b> (Senac RJ) — aplicação web com cadastro, consulta e edição de conteúdos. Python, Flask, SQLite, HTML, CSS, JavaScript; código no GitHub.",
        f"Demonstrações com dados fictícios (simulação de torre de controle, painel de frota e laboratório de roteirização) em {PORTFOLIO}.",
    ]
    hist.append(lista(projetos))

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(SAIDA),
        pagesize=A4,
        leftMargin=17 * mm,
        rightMargin=17 * mm,
        topMargin=13 * mm,
        bottomMargin=14 * mm,
        title=f"Currículo — {site['nomeCompleto']}",
        author=site["nomeCompleto"],
        subject="Currículo: Logística, Análise de Dados e Business Intelligence",
        keywords="Logística, Roteirização, Power BI, DAX, Power Query, Excel, SQL, Python, Análise de Dados, BI",
        lang="pt-BR",
    )

    def rodape(canvas, d):
        canvas.saveState()
        canvas.setFont(normal, 8)
        canvas.setFillColor(CINZA)
        canvas.drawRightString(A4[0] - 17 * mm, 9 * mm, f"{site['nomeCompleto']} — página {d.page}")
        canvas.restoreState()

    doc.build(hist, onFirstPage=rodape, onLaterPages=rodape)
    print(f"Currículo gerado: {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
