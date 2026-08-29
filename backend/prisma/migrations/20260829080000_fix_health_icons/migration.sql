-- Os icones vieram com o nome do componente Lucide ("Brain", "SmilePlus"), mas o
-- app monta a URL do arquivo em /assets/taxonomy-icons/<icone>.svg, em kebab-case.
-- Com o nome errado a imagem dava 404 e a categoria aparecia quebrada no app.
UPDATE `Category` SET `icon` = 'brain' WHERE `slug` = 'psicologo';
UPDATE `Category` SET `icon` = 'smile-plus' WHERE `slug` = 'dentista';
