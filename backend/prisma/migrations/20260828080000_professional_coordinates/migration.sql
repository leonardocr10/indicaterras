-- Coordenadas do profissional, usadas para ordenar por proximidade. Ficam nulas
-- ate o geocode rodar; quem nao tem coordenada nao recebe distancia estimada.
ALTER TABLE `Professional`
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- A busca por raio percorre so quem tem coordenada e esta ativo.
CREATE INDEX `Professional_active_latitude_longitude_idx` ON `Professional`(`active`, `latitude`, `longitude`);
