-- Jornada de atendimento e situacao de aprovacao do profissional.
-- Os cadastros existentes nascem APPROVED de proposito: eles ja estao no ar e
-- nao podem sumir do app por causa desta migration.
ALTER TABLE `Professional`
  ADD COLUMN `workingHours` JSON NULL,
  ADD COLUMN `approvalStatus` VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

CREATE INDEX `Professional_approvalStatus_active_idx` ON `Professional`(`approvalStatus`, `active`);
