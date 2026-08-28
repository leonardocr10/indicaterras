-- O Google fechou o gemini-2.5-flash-lite para contas novas: a API responde 404
-- "no longer available to new users" e indica o gemini-3.5-flash-lite no lugar.
ALTER TABLE `ai_settings` MODIFY `model` VARCHAR(120) NOT NULL DEFAULT 'gemini-3.5-flash-lite';

-- Corrige instalacoes que ja tinham gravado o modelo descontinuado. Quem escolheu
-- outro modelo de proposito nao e afetado.
UPDATE `ai_settings` SET `model` = 'gemini-3.5-flash-lite' WHERE `model` = 'gemini-2.5-flash-lite';
