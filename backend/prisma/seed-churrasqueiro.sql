-- Adiciona a categoria "Churrasqueiro" com os servicos que ela costuma oferecer.
-- Rode assim, no servidor:
--   mysql -u indicaterras -p indicaterras < prisma/seed-churrasqueiro.sql

SET @cat_id = UUID();
SET @next_order = (SELECT COALESCE(MAX(displayOrder), 0) + 1 FROM Category);

INSERT INTO Category (id, name, slug, icon, displayOrder, active, createdAt, updatedAt)
VALUES (@cat_id, 'Churrasqueiro', 'churrasqueiro', 'cooking', @next_order, 1, NOW(3), NOW(3));

SET @s1 = UUID();
SET @s2 = UUID();
SET @s3 = UUID();
SET @s4 = UUID();
SET @s5 = UUID();
SET @s6 = UUID();

INSERT INTO category_services (id, categoryId, name, slug, icon, displayOrder, active, createdAt, updatedAt) VALUES
(@s1, @cat_id, 'Churrasco para eventos',              'churrasco-para-eventos',              'cooking', 1, 1, NOW(3), NOW(3)),
(@s2, @cat_id, 'Churrasco em domicílio',               'churrasco-em-domicilio',              'cooking', 2, 1, NOW(3), NOW(3)),
(@s3, @cat_id, 'Espetinho para festas',                'espetinho-para-festas',               'cooking', 3, 1, NOW(3), NOW(3)),
(@s4, @cat_id, 'Buffet de churrasco',                  'buffet-de-churrasco',                 'cooking', 4, 1, NOW(3), NOW(3)),
(@s5, @cat_id, 'Corte e preparo de carnes',            'corte-e-preparo-de-carnes',           'wrench',  5, 1, NOW(3), NOW(3)),
(@s6, @cat_id, 'Montagem e limpeza de churrasqueira',  'montagem-e-limpeza-de-churrasqueira', 'broom',   6, 1, NOW(3), NOW(3));

INSERT INTO category_service_aliases (id, categoryServiceId, alias, normalizedAlias) VALUES
(UUID(), @s1, 'churrasco',            'churrasco'),
(UUID(), @s1, 'festa com churrasco',  'festa com churrasco'),
(UUID(), @s1, 'evento corporativo',   'evento corporativo'),
(UUID(), @s2, 'churrasco em casa',    'churrasco em casa'),
(UUID(), @s2, 'delivery de churrasco','delivery de churrasco'),
(UUID(), @s3, 'espetinho',            'espetinho'),
(UUID(), @s3, 'espeto corrido',       'espeto corrido'),
(UUID(), @s4, 'buffet',               'buffet'),
(UUID(), @s4, 'rodizio de carnes',    'rodizio de carnes'),
(UUID(), @s5, 'corte de carne',       'corte de carne'),
(UUID(), @s5, 'preparo de carne',     'preparo de carne'),
(UUID(), @s6, 'limpeza de churrasqueira', 'limpeza de churrasqueira'),
(UUID(), @s6, 'montar churrasqueira', 'montar churrasqueira');

SELECT 'Categoria criada:' AS info, @cat_id AS id;
SELECT id, name, slug FROM category_services WHERE categoryId = @cat_id ORDER BY displayOrder;
