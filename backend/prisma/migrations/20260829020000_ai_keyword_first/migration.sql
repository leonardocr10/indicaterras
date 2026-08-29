-- Palavra-chave primeiro: economiza chamadas de IA quando o matcher local ja
-- resolve o problema com confianca alta.
ALTER TABLE `ai_settings`
  ADD COLUMN `keywordFirstEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `keywordFirstConfidence` DECIMAL(5, 2) NOT NULL DEFAULT 0.80;
