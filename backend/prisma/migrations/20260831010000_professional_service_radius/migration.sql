-- Raio de atendimento do profissional, em km.
-- Nulo de proposito: ninguem informou ainda, e um valor inventado viraria uma
-- promessa de atendimento que o profissional nunca fez. A busca por
-- oportunidades trata nulo com um padrao conservador.
ALTER TABLE `Professional` ADD COLUMN `serviceRadiusKm` INT NULL;
