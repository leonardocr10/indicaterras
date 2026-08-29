-- Complementa o catálogo de saúde sem criar tabelas ou repetir registros existentes.
INSERT IGNORE INTO `CategoryGroup` (`id`, `name`, `slug`, `icon`, `displayOrder`, `active`, `createdAt`, `updatedAt`)
VALUES ('catalog-saude-bem-estar', 'Saúde e bem-estar', 'saude-bem-estar', 'HeartPulse', 4, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

UPDATE `Category` c
JOIN `CategoryGroup` g ON g.`slug` = 'saude-bem-estar'
SET c.`name` = 'Psicólogo(a)', c.`icon` = 'Brain', c.`groupId` = g.`id`, c.`active` = true
WHERE c.`slug` = 'psicologo';

INSERT INTO `Category` (`id`, `groupId`, `name`, `slug`, `icon`, `displayOrder`, `active`, `createdAt`, `updatedAt`)
SELECT 'catalog-psicologo', `id`, 'Psicólogo(a)', 'psicologo', 'Brain', 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `CategoryGroup` WHERE `slug` = 'saude-bem-estar'
AND NOT EXISTS (SELECT 1 FROM `Category` WHERE `slug` = 'psicologo');

INSERT INTO `Category` (`id`, `groupId`, `name`, `slug`, `icon`, `displayOrder`, `active`, `createdAt`, `updatedAt`)
SELECT 'catalog-dentista', `id`, 'Dentista', 'dentista', 'SmilePlus', 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `CategoryGroup` WHERE `slug` = 'saude-bem-estar'
AND NOT EXISTS (SELECT 1 FROM `Category` WHERE `slug` = 'dentista');

INSERT INTO `category_services` (`id`, `categoryId`, `name`, `slug`, `icon`, `displayOrder`, `active`, `createdAt`, `updatedAt`)
SELECT CONCAT('catalog-psicologo-', item.`slug`), c.`id`, item.`name`, item.`slug`, 'Brain', item.`position`, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Category` c
CROSS JOIN (
  SELECT 'Psicoterapia individual' AS `name`, 'psicoterapia-individual' AS `slug`, 1 AS `position` UNION ALL
  SELECT 'Psicoterapia infantil', 'psicoterapia-infantil', 2 UNION ALL
  SELECT 'Psicoterapia para adolescentes', 'psicoterapia-para-adolescentes', 3 UNION ALL
  SELECT 'Terapia de casal', 'terapia-de-casal', 4 UNION ALL
  SELECT 'Terapia familiar', 'terapia-familiar', 5 UNION ALL
  SELECT 'Orientação profissional', 'orientacao-profissional', 6 UNION ALL
  SELECT 'Acompanhamento psicológico', 'acompanhamento-psicologico', 7 UNION ALL
  SELECT 'Atendimento online', 'atendimento-online', 8 UNION ALL
  SELECT 'Atendimento presencial', 'atendimento-presencial', 9 UNION ALL
  SELECT 'Avaliação psicológica', 'avaliacao-psicologica', 10
) item
WHERE c.`slug` = 'psicologo'
AND NOT EXISTS (SELECT 1 FROM `category_services` s WHERE s.`categoryId` = c.`id` AND s.`slug` = item.`slug`);

INSERT INTO `category_services` (`id`, `categoryId`, `name`, `slug`, `icon`, `displayOrder`, `active`, `createdAt`, `updatedAt`)
SELECT CONCAT('catalog-dentista-', item.`slug`), c.`id`, item.`name`, item.`slug`, 'SmilePlus', item.`position`, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Category` c
CROSS JOIN (
  SELECT 'Consulta odontológica' AS `name`, 'consulta-odontologica' AS `slug`, 1 AS `position` UNION ALL
  SELECT 'Avaliação odontológica', 'avaliacao-odontologica', 2 UNION ALL
  SELECT 'Limpeza dentária', 'limpeza-dentaria', 3 UNION ALL
  SELECT 'Tratamento de cárie', 'tratamento-de-carie', 4 UNION ALL
  SELECT 'Restauração', 'restauracao', 5 UNION ALL
  SELECT 'Dor de dente', 'dor-de-dente', 6 UNION ALL
  SELECT 'Extração dentária', 'extracao-dentaria', 7 UNION ALL
  SELECT 'Canal', 'canal', 8 UNION ALL
  SELECT 'Clareamento dental', 'clareamento-dental', 9 UNION ALL
  SELECT 'Aparelho ortodôntico', 'aparelho-ortodontico', 10 UNION ALL
  SELECT 'Ortodontia', 'ortodontia', 11 UNION ALL
  SELECT 'Implante dentário', 'implante-dentario', 12 UNION ALL
  SELECT 'Prótese dentária', 'protese-dentaria', 13 UNION ALL
  SELECT 'Facetas', 'facetas', 14 UNION ALL
  SELECT 'Lentes de contato dental', 'lentes-de-contato-dental', 15 UNION ALL
  SELECT 'Tratamento de gengiva', 'tratamento-de-gengiva', 16 UNION ALL
  SELECT 'Periodontia', 'periodontia', 17 UNION ALL
  SELECT 'Odontopediatria', 'odontopediatria', 18 UNION ALL
  SELECT 'Urgência odontológica', 'urgencia-odontologica', 19 UNION ALL
  SELECT 'Dente quebrado', 'dente-quebrado', 20 UNION ALL
  SELECT 'Bruxismo', 'bruxismo', 21
) item
WHERE c.`slug` = 'dentista'
AND NOT EXISTS (SELECT 1 FROM `category_services` s WHERE s.`categoryId` = c.`id` AND s.`slug` = item.`slug`);

-- Aliases alimentam a busca textual e o classificador local; a coluna normalizada evita duplicações por acentuação.
INSERT IGNORE INTO `category_service_aliases` (`id`, `categoryServiceId`, `alias`, `normalizedAlias`)
SELECT CONCAT('alias-', cs.`id`, '-', aliases.`normalizedAlias`), cs.`id`, aliases.`alias`, aliases.`normalizedAlias`
FROM `category_services` cs
JOIN `Category` c ON c.`id` = cs.`categoryId`
JOIN (
  SELECT 'psicólogo' AS `alias`, 'psicologo' AS `normalizedAlias`, 'psicoterapia-individual' AS `serviceSlug` UNION ALL
  SELECT 'psicóloga', 'psicologa', 'psicoterapia-individual' UNION ALL SELECT 'psicologia', 'psicologia', 'psicoterapia-individual' UNION ALL
  SELECT 'terapia', 'terapia', 'psicoterapia-individual' UNION ALL SELECT 'psicoterapia', 'psicoterapia', 'psicoterapia-individual' UNION ALL
  SELECT 'terapeuta', 'terapeuta', 'psicoterapia-individual' UNION ALL SELECT 'preciso de psicóloga', 'preciso de psicologa', 'psicoterapia-individual' UNION ALL
  SELECT 'preciso de psicólogo', 'preciso de psicologo', 'psicoterapia-individual' UNION ALL SELECT 'quero fazer terapia', 'quero fazer terapia', 'psicoterapia-individual' UNION ALL
  SELECT 'consulta psicológica', 'consulta psicologica', 'psicoterapia-individual' UNION ALL SELECT 'psicólogo infantil', 'psicologo infantil', 'psicoterapia-infantil' UNION ALL
  SELECT 'psicóloga infantil', 'psicologa infantil', 'psicoterapia-infantil' UNION ALL SELECT 'terapia para criança', 'terapia para crianca', 'psicoterapia-infantil' UNION ALL
  SELECT 'terapia adolescente', 'terapia adolescente', 'psicoterapia-para-adolescentes' UNION ALL SELECT 'terapia de casal', 'terapia de casal', 'terapia-de-casal' UNION ALL
  SELECT 'orientação profissional', 'orientacao profissional', 'orientacao-profissional' UNION ALL SELECT 'acompanhamento psicológico', 'acompanhamento psicologico', 'acompanhamento-psicologico' UNION ALL
  SELECT 'terapia online', 'terapia online', 'atendimento-online' UNION ALL SELECT 'psicólogo online', 'psicologo online', 'atendimento-online' UNION ALL
  SELECT 'psicóloga online', 'psicologa online', 'atendimento-online' UNION ALL SELECT 'terapia presencial', 'terapia presencial', 'atendimento-presencial'
) aliases ON aliases.`serviceSlug` = cs.`slug`
WHERE c.`slug` = 'psicologo';

INSERT IGNORE INTO `category_service_aliases` (`id`, `categoryServiceId`, `alias`, `normalizedAlias`)
SELECT CONCAT('alias-', cs.`id`, '-', aliases.`normalizedAlias`), cs.`id`, aliases.`alias`, aliases.`normalizedAlias`
FROM `category_services` cs
JOIN `Category` c ON c.`id` = cs.`categoryId`
JOIN (
  SELECT 'dentista' AS `alias`, 'dentista' AS `normalizedAlias`, 'consulta-odontologica' AS `serviceSlug` UNION ALL
  SELECT 'odontologista', 'odontologista', 'consulta-odontologica' UNION ALL SELECT 'odontologia', 'odontologia', 'consulta-odontologica' UNION ALL
  SELECT 'limpeza dos dentes', 'limpeza dos dentes', 'limpeza-dentaria' UNION ALL SELECT 'limpeza dentária', 'limpeza dentaria', 'limpeza-dentaria' UNION ALL
  SELECT 'cárie', 'carie', 'tratamento-de-carie' UNION ALL SELECT 'carie', 'carie', 'tratamento-de-carie' UNION ALL
  SELECT 'dor de dente', 'dor de dente', 'dor-de-dente' UNION ALL SELECT 'dente doendo', 'dente doendo', 'dor-de-dente' UNION ALL
  SELECT 'dente quebrado', 'dente quebrado', 'dente-quebrado' UNION ALL SELECT 'quebrei o dente', 'quebrei o dente', 'dente-quebrado' UNION ALL
  SELECT 'canal', 'canal', 'canal' UNION ALL SELECT 'tratamento de canal', 'tratamento de canal', 'canal' UNION ALL
  SELECT 'clareamento', 'clareamento', 'clareamento-dental' UNION ALL SELECT 'clareamento dental', 'clareamento dental', 'clareamento-dental' UNION ALL
  SELECT 'aparelho', 'aparelho', 'aparelho-ortodontico' UNION ALL SELECT 'aparelho nos dentes', 'aparelho nos dentes', 'aparelho-ortodontico' UNION ALL
  SELECT 'ortodontista', 'ortodontista', 'ortodontia' UNION ALL SELECT 'implante', 'implante', 'implante-dentario' UNION ALL
  SELECT 'implante dentário', 'implante dentario', 'implante-dentario' UNION ALL SELECT 'prótese', 'protese', 'protese-dentaria' UNION ALL
  SELECT 'dentadura', 'dentadura', 'protese-dentaria' UNION ALL SELECT 'faceta', 'faceta', 'facetas' UNION ALL
  SELECT 'lente dental', 'lente dental', 'lentes-de-contato-dental' UNION ALL SELECT 'gengiva sangrando', 'gengiva sangrando', 'tratamento-de-gengiva' UNION ALL
  SELECT 'tratamento de gengiva', 'tratamento de gengiva', 'tratamento-de-gengiva' UNION ALL SELECT 'dentista infantil', 'dentista infantil', 'odontopediatria' UNION ALL
  SELECT 'dentista para criança', 'dentista para crianca', 'odontopediatria' UNION ALL SELECT 'odontopediatra', 'odontopediatra', 'odontopediatria' UNION ALL
  SELECT 'arrancar dente', 'arrancar dente', 'extracao-dentaria' UNION ALL SELECT 'extrair dente', 'extrair dente', 'extracao-dentaria' UNION ALL
  SELECT 'extração', 'extracao', 'extracao-dentaria' UNION ALL SELECT 'urgência dentista', 'urgencia dentista', 'urgencia-odontologica' UNION ALL
  SELECT 'dentista urgente', 'dentista urgente', 'urgencia-odontologica' UNION ALL SELECT 'bruxismo', 'bruxismo', 'bruxismo'
) aliases ON aliases.`serviceSlug` = cs.`slug`
WHERE c.`slug` = 'dentista';
