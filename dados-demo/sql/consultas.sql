-- =====================================================================
-- Consultas analíticas — Painel de frota e entregas (DADOS SIMULADOS)
-- Cada bloco começa com "-- name: <identificador>" para que o script
-- Python consiga executá-los individualmente.
-- =====================================================================

-- name: entregas_por_dia
-- Agregado diário por transportadora e região. Alimenta o painel do site.
-- OTIF = entregas no prazo E completas / total de entregas.
SELECT
    e.data,
    t.nome                                     AS transportadora,
    r.nome                                     AS regiao,
    COUNT(*)                                   AS entregas,
    SUM(e.no_prazo)                            AS no_prazo,
    SUM(e.completa)                            AS completas,
    SUM(CASE WHEN e.no_prazo = 1 AND e.completa = 1 THEN 1 ELSE 0 END) AS otif,
    ROUND(SUM(e.peso_kg), 1)                   AS peso_kg,
    ROUND(SUM(e.custo_frete), 2)               AS custo_frete
FROM entrega e
JOIN transportadora t ON t.id = e.transportadora_id
JOIN regiao r         ON r.id = e.regiao_id
GROUP BY e.data, t.nome, r.nome
ORDER BY e.data, t.nome, r.nome;

-- name: frota_por_dia
-- No-Show       = MAX(Contratado - Apresentado, 0)
-- Spot (extra)  = MAX(Utilizado  - Contratado, 0)
SELECT
    o.data,
    t.nome                                                     AS transportadora,
    t.veiculos_contratados_dia                                 AS contratados,
    o.veiculos_apresentados                                    AS apresentados,
    o.veiculos_utilizados                                      AS utilizados,
    MAX(t.veiculos_contratados_dia - o.veiculos_apresentados, 0) AS no_show,
    MAX(o.veiculos_utilizados - t.veiculos_contratados_dia, 0)   AS spot
FROM operacao_diaria o
JOIN transportadora t ON t.id = o.transportadora_id
ORDER BY o.data, t.nome;

-- name: resumo_transportadora
-- Visão consolidada do período por transportadora.
SELECT
    t.nome                                                      AS transportadora,
    COUNT(*)                                                    AS entregas,
    ROUND(100.0 * SUM(CASE WHEN e.no_prazo = 1 AND e.completa = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otif_pct,
    ROUND(SUM(e.custo_frete) / COUNT(*), 2)                     AS custo_por_entrega,
    ROUND(SUM(e.custo_frete) / SUM(e.peso_kg), 2)               AS custo_por_kg
FROM entrega e
JOIN transportadora t ON t.id = e.transportadora_id
GROUP BY t.nome
ORDER BY otif_pct DESC;
