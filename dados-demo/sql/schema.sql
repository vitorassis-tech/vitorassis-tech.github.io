-- =====================================================================
-- Modelo de dados das demonstrações (DADOS FICTÍCIOS)
-- ---------------------------------------------------------------------
-- Criado exclusivamente para o portfólio. Transportadoras, regiões,
-- volumes, custos, cargas e pendências são FICTÍCIOS, independentes de
-- qualquer empresa, e não reproduzem quantidades, indicadores ou regras reais.
-- Compatível com SQLite 3.
-- =====================================================================

DROP TABLE IF EXISTS carga;
DROP TABLE IF EXISTS entrega;
DROP TABLE IF EXISTS operacao_diaria;
DROP TABLE IF EXISTS regiao;
DROP TABLE IF EXISTS transportadora;

-- Transportadoras genéricas (A, B, C, D) e uma frota de referência fictícia
CREATE TABLE transportadora (
    id               INTEGER PRIMARY KEY,
    nome             TEXT    NOT NULL UNIQUE,
    frota_referencia INTEGER NOT NULL CHECK (frota_referencia > 0)
);

-- Regiões de entrega (agrupamento geográfico genérico)
CREATE TABLE regiao (
    id   INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

-- Frota por dia e transportadora
CREATE TABLE operacao_diaria (
    data                 TEXT    NOT NULL,             -- AAAA-MM-DD
    transportadora_id    INTEGER NOT NULL REFERENCES transportadora (id),
    veiculos_necessarios INTEGER NOT NULL CHECK (veiculos_necessarios >= 0),  -- calculado pela demanda do dia
    veiculos_disponiveis INTEGER NOT NULL CHECK (veiculos_disponiveis >= 0),  -- veículos que se apresentaram
    veiculos_em_rota     INTEGER NOT NULL CHECK (veiculos_em_rota >= 0),      -- veículos que saíram com entregas
    PRIMARY KEY (data, transportadora_id),
    CHECK (veiculos_em_rota <= veiculos_disponiveis)
);

-- Cada linha é uma entrega realizada
CREATE TABLE entrega (
    id                INTEGER PRIMARY KEY,
    data              TEXT    NOT NULL,
    transportadora_id INTEGER NOT NULL REFERENCES transportadora (id),
    regiao_id         INTEGER NOT NULL REFERENCES regiao (id),
    no_prazo          INTEGER NOT NULL CHECK (no_prazo IN (0, 1)),
    completa          INTEGER NOT NULL CHECK (completa IN (0, 1)),
    peso_kg           REAL    NOT NULL CHECK (peso_kg > 0),
    custo_frete       REAL    NOT NULL CHECK (custo_frete >= 0)
);

-- Cada linha é uma carga programada para expedição
CREATE TABLE carga (
    id                INTEGER PRIMARY KEY,
    data              TEXT    NOT NULL,
    transportadora_id INTEGER NOT NULL REFERENCES transportadora (id),
    expedida          INTEGER NOT NULL CHECK (expedida IN (0, 1)),
    motivo_pendencia  TEXT,                 -- preenchido só quando expedida = 0
    horas_pendencia   REAL,                 -- tempo em aberto, só quando expedida = 0
    CHECK ((expedida = 1 AND motivo_pendencia IS NULL AND horas_pendencia IS NULL)
        OR (expedida = 0 AND motivo_pendencia IS NOT NULL AND horas_pendencia > 0))
);

CREATE INDEX idx_entrega_data ON entrega (data);
CREATE INDEX idx_entrega_transp ON entrega (transportadora_id);
CREATE INDEX idx_carga_data ON carga (data);
