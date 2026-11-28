-- Data de vencimento de cada assinatura, enviada pelo SaaS:
-- em teste (trial) = último dia do teste; ativa = próxima renovação (pagamento).
-- Usada pelos alertas de atraso e de fim de teste.
alter table gestao.assinaturas add column if not exists vence_em date;
