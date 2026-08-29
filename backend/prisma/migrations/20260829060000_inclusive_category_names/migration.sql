-- Atualiza apenas os rótulos das categorias; slugs, IDs e vínculos permanecem inalterados.
UPDATE `Category`
SET `name` = CASE `slug`
  WHEN 'encanador' THEN 'Encanador(a)'
  WHEN 'chaveiro' THEN 'Chaveiro(a)'
  WHEN 'montador-moveis' THEN 'Montador(a) de móveis'
  WHEN 'jardineiro' THEN 'Jardineiro(a)'
  WHEN 'pedreiro' THEN 'Pedreiro(a)'
  WHEN 'pintor' THEN 'Pintor(a)'
  WHEN 'gesseiro' THEN 'Gesseiro(a)'
  WHEN 'cabeleireiro' THEN 'Cabeleireiro(a)'
  WHEN 'barbeiro' THEN 'Barbeiro(a)'
  WHEN 'mecanico' THEN 'Mecânico(a)'
  WHEN 'veterinario' THEN 'Veterinário(a)'
  WHEN 'passeador-caes' THEN 'Passeador(a) de cães'
  WHEN 'professor-particular' THEN 'Professor(a) particular'
  WHEN 'professor-idiomas' THEN 'Professor(a) de idiomas'
  WHEN 'fotografo' THEN 'Fotógrafo(a)'
  WHEN 'contador' THEN 'Contador(a)'
  WHEN 'advogado' THEN 'Advogado(a)'
  WHEN 'designer-grafico' THEN 'Designer gráfico(a)'
  ELSE `name`
END
WHERE `slug` IN ('encanador', 'chaveiro', 'montador-moveis', 'jardineiro', 'pedreiro', 'pintor', 'gesseiro', 'cabeleireiro', 'barbeiro', 'mecanico', 'veterinario', 'passeador-caes', 'professor-particular', 'professor-idiomas', 'fotografo', 'contador', 'advogado', 'designer-grafico');
