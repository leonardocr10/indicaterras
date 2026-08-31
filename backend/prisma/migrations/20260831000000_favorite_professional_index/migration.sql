-- Lista de quem favoritou o profissional: filtra por professionalId e ordena por
-- createdAt. A chave estrangeira ja indexa professionalId sozinho, mas nao cobre
-- a ordenacao; este indice composto evita o filesort a cada pagina.
CREATE INDEX `Favorite_professionalId_createdAt_idx` ON `Favorite`(`professionalId`, `createdAt`);
