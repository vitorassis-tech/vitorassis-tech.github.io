-- =====================================================================
-- Modelo de dados — Painel de frota e entregas (DADOS SIMULADOS)
-- ---------------------------------------------------------------------
-- Este modelo foi criado exclusivamente para a demonstração do portfólio.
-- Transportadoras, regiões, volumes e custos são FICTÍCIOS e não
-- representam nenhuma empresa real.
-- Compatível com SQLite 3 (e, com pequenos ajustes de tipos, MySQL).
-- =====================================================================

DROP TABLE IF EXISTS entrega;
DROP TABLE IF EXISTS operacao_diaria;
DROP TABLE IF EXISTS regiao;
DROP TABLE IF EXISTS transportadora;

-- Cadastro de transportadoras e contrato diário de veículos
CREATE TABLE transportadora (
    id                       INTEGER PRIMARY KEY,
    nome                     TEXT    NOT NULL UNIQUE,
    veiculos_contratados_dia INTEGER NOT NULL CHECK (veiculos_contratados_dia >= 0)
);

-- Regiões de entrega (agrupamento geográfico genérico)
CREATE TABLE regiao (
    id   INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);

-- Apresentação e uso de frota por dia e transportadora
CREATE TABLE operacao_diaria (
    data                 TEXT    NOT NULL,             -- AAAA-MM-DD
    transportadora_id    INTEGER NOT NULL REFERENCES transportadora (id),
    veiculos_apresentados INTEGER NOT NULL CHECK (veiculos_apresentados >= 0),
    veiculos_utilizados   INTEGER NOT NULL CHECK (veiculos_utilizados >= 0),
    PRIMARY KEY (data, transportadora_id)
);

-- Cada linha é uma entrega (nota/pedido) realizada
CREATE TABLE entrega (
    id                INTEGER PRIMARY KEY,
    data              TEXT    NOT NULL,
    transportadora_id INTEGER NOT NULL REFERENCES transportadora (id),
    regiao_id         INTEGER NOT NULL REFERENCES regiao (id),
    no_prazo          INTEGER NOT NULL CHECK (no_prazo IN (0, 1)),  -- entregue dentro do prazo
    completa          INTEGER NOT NULL CHECK (completa IN (0, 1)),  -- entregue sem falta/avaria
    peso_kg           REAL    NOT NULL CHECK (peso_kg > 0),
    custo_frete       REAL    NOT NULL CHECK (custo_frete >= 0)
);

CREATE INDEX idx_entrega_data ON entrega (data);
CREATE INDEX idx_entrega_transp ON entrega (transportadora_id);
