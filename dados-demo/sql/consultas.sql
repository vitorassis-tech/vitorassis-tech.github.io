-- =====================================================================
-- Consultas analíticas das demonstrações (DADOS FICTÍCIOS)
-- Cada bloco começa com "-- name: <identificador>" para que o script
-- Python consiga executá-los individualmente.
-- Indicadores didáticos, independentes de qualquer empresa:
--   OTIF                         = entregas no prazo E completas ÷ entregas
--   Cobertura de frota (%)       = veículos disponíveis ÷ veículos necessários × 100
--   Entregas por veículo em rota = entregas ÷ veículos em rota
--   Taxa de expedição (%)        = cargas expedidas ÷ cargas programadas × 100
-- Divisões por zero retornam NULL (sem dados), nunca 0.
-- =====================================================================

-- name: entregas_por_dia
-- Agregado diário por transportadora e região. Alimenta o painel de frota e entregas.
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
-- Frota por dia e transportadora, com o total de entregas do dia (todas as regiões).
SELECT
    o.data,
    t.nome                     AS transportadora,
    o.veiculos_necessarios     AS necessarios,
    o.veiculos_disponiveis     AS disponiveis,
    o.veiculos_em_rota         AS em_rota,
    (SELECT COUNT(*) FROM entrega e
      WHERE e.data = o.data AND e.transportadora_id = o.transportadora_id) AS entregas
FROM operacao_diaria o
JOIN transportadora t ON t.id = o.transportadora_id
ORDER BY o.data, t.nome;

-- name: cargas_por_dia
-- Cargas programadas, expedidas e pendentes por dia e transportadora.
SELECT
    c.data,
    t.nome                                        AS transportadora,
    COUNT(*)                                      AS programadas,
    SUM(c.expedida)                               AS expedidas,
    SUM(1 - c.expedida)                           AS pendentes,
    ROUND(COALESCE(SUM(c.horas_pendencia), 0), 1) AS horas_pendencia
FROM carga c
JOIN transportadora t ON t.id = c.transportadora_id
GROUP BY c.data, t.nome
ORDER BY c.data, t.nome;

-- name: pendencias
-- Lista das cargas pendentes (fictícias), com motivo genérico e tempo em aberto.
SELECT
    c.data,
    t.nome              AS transportadora,
    c.motivo_pendencia  AS motivo,
    c.horas_pendencia   AS horas
FROM carga c
JOIN transportadora t ON t.id = c.transportadora_id
WHERE c.expedida = 0
ORDER BY c.data, t.nome, c.id;

-- name: resumo_transportadora
-- Visão consolidada do período por transportadora.
SELECT
    t.nome AS transportadora,
    ent.entregas,
    ROUND(100.0 * ent.otif / NULLIF(ent.entregas, 0), 1)              AS otif_pct,
    ROUND(ent.custo / NULLIF(ent.entregas, 0), 2)                     AS custo_por_entrega,
    ROUND(100.0 * frt.disponiveis / NULLIF(frt.necessarios, 0), 1)    AS cobertura_pct,
    ROUND(1.0 * ent.entregas / NULLIF(frt.em_rota, 0), 2)             AS entregas_por_veiculo_em_rota,
    ROUND(100.0 * crg.expedidas / NULLIF(crg.programadas, 0), 1)      AS taxa_expedicao_pct
FROM transportadora t
JOIN (SELECT transportadora_id, COUNT(*) AS entregas,
             SUM(CASE WHEN no_prazo = 1 AND completa = 1 THEN 1 ELSE 0 END) AS otif,
             SUM(custo_frete) AS custo
        FROM entrega GROUP BY transportadora_id) ent ON ent.transportadora_id = t.id
JOIN (SELECT transportadora_id, SUM(veiculos_necessarios) AS necessarios,
             SUM(veiculos_disponiveis) AS disponiveis, SUM(veiculos_em_rota) AS em_rota
        FROM operacao_diaria GROUP BY transportadora_id) frt ON frt.transportadora_id = t.id
JOIN (SELECT transportadora_id, COUNT(*) AS programadas, SUM(expedida) AS expedidas
        FROM carga GROUP BY transportadora_id) crg ON crg.transportadora_id = t.id
ORDER BY t.nome;
