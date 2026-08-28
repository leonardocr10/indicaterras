-- Adiciona a categoria "Churrasqueiro" com os servicos que ela costuma oferecer.
-- Seguro pra rodar mais de uma vez: reaproveita a categoria se ela ja existir
-- (nao duplica), e so recria servicos/apelidos que ainda nao estao la.
-- Rode assim, no servidor:
--   mysql -u indicaterras -p indicaterras < prisma/seed-churrasqueiro.sql

INSERT INTO Category (id, name, slug, icon, displayOrder, active, createdAt, updatedAt)
SELECT UUID(), 'Churrasqueiro', 'churrasqueiro', 'cooking',
       (SELECT COALESCE(MAX(displayOrder), 0) + 1 FROM Category AS c2), 1, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  -- o subselect precisa de mais uma camada de "derived table" (a_ja_existe),
  -- senao o MySQL recusa: nao deixa selecionar da mesma tabela que esta
  -- recebendo o INSERT sem esse truque
  SELECT 1 FROM (SELECT slug FROM Category) AS ja_existe WHERE ja_existe.slug = 'churrasqueiro'
);

SET @cat_id = (SELECT id FROM Category WHERE slug = 'churrasqueiro');

-- Cada servico so entra se ainda nao existir (categoryId + slug e unico)
INSERT INTO category_services (id, categoryId, name, slug, icon, displayOrder, active, createdAt, updatedAt)
SELECT novos.* FROM (SELECT
  UUID() AS id, @cat_id AS categoryId, 'Churrasco para eventos' AS name, 'churrasco-para-eventos' AS slug, 'cooking' AS icon, 1 AS displayOrder, 1 AS active, NOW(3) AS createdAt, NOW(3) AS updatedAt
  UNION ALL SELECT UUID(), @cat_id, 'Churrasco em domicílio', 'churrasco-em-domicilio', 'cooking', 2, 1, NOW(3), NOW(3)
  UNION ALL SELECT UUID(), @cat_id, 'Espetinho para festas', 'espetinho-para-festas', 'cooking', 3, 1, NOW(3), NOW(3)
  UNION ALL SELECT UUID(), @cat_id, 'Buffet de churrasco', 'buffet-de-churrasco', 'cooking', 4, 1, NOW(3), NOW(3)
  UNION ALL SELECT UUID(), @cat_id, 'Corte e preparo de carnes', 'corte-e-preparo-de-carnes', 'wrench', 5, 1, NOW(3), NOW(3)
  UNION ALL SELECT UUID(), @cat_id, 'Montagem e limpeza de churrasqueira', 'montagem-e-limpeza-de-churrasqueira', 'broom', 6, 1, NOW(3), NOW(3)
) AS novos
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT categoryId, slug FROM category_services) AS ja_existe
  WHERE ja_existe.categoryId = novos.categoryId AND ja_existe.slug = novos.slug
);

SET @s1 = (SELECT id FROM category_services WHERE categoryId = @cat_id AND slug = 'churrasco-para-eventos');
SET @s2 = (SELECT id FROM category_services WHERE categoryId = @cat_id AND slug = 'churrasco-em-domicilio');
SET @s3 = (SELECT id FROM category_services WHERE categoryId = @cat_id AND slug = 'espetinho-para-festas');
SET @s4 = (SELECT id FROM category_services WHERE categoryId = @cat_id AND slug = 'buffet-de-churrasco');
SET @s5 = (SELECT id FROM category_services WHERE categoryId = @cat_id AND slug = 'corte-e-preparo-de-carnes');
SET @s6 = (SELECT id FROM category_services WHERE categoryId = @cat_id AND slug = 'montagem-e-limpeza-de-churrasqueira');

-- Apelidos: cada um so entra se ainda nao existir (categoryServiceId + normalizedAlias e unico)
INSERT INTO category_service_aliases (id, categoryServiceId, alias, normalizedAlias)
SELECT novos.* FROM (SELECT
  UUID() AS id, @s1 AS categoryServiceId, 'churrasco' AS alias, 'churrasco' AS normalizedAlias
  UNION ALL SELECT UUID(), @s1, 'festa com churrasco', 'festa com churrasco'
  UNION ALL SELECT UUID(), @s1, 'evento corporativo', 'evento corporativo'
  UNION ALL SELECT UUID(), @s2, 'churrasco em casa', 'churrasco em casa'
  UNION ALL SELECT UUID(), @s2, 'delivery de churrasco', 'delivery de churrasco'
  UNION ALL SELECT UUID(), @s3, 'espetinho', 'espetinho'
  UNION ALL SELECT UUID(), @s3, 'espeto corrido', 'espeto corrido'
  UNION ALL SELECT UUID(), @s4, 'buffet', 'buffet'
  UNION ALL SELECT UUID(), @s4, 'rodizio de carnes', 'rodizio de carnes'
  UNION ALL SELECT UUID(), @s5, 'corte de carne', 'corte de carne'
  UNION ALL SELECT UUID(), @s5, 'preparo de carne', 'preparo de carne'
  UNION ALL SELECT UUID(), @s6, 'limpeza de churrasqueira', 'limpeza de churrasqueira'
  UNION ALL SELECT UUID(), @s6, 'montar churrasqueira', 'montar churrasqueira'
) AS novos
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT categoryServiceId, normalizedAlias FROM category_service_aliases) AS ja_existe
  WHERE ja_existe.categoryServiceId = novos.categoryServiceId AND ja_existe.normalizedAlias = novos.normalizedAlias
);

SELECT 'Categoria:' AS info, @cat_id AS id;
SELECT id, name, slug FROM category_services WHERE categoryId = @cat_id ORDER BY displayOrder;
