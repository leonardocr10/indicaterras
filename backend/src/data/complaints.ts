export type ComplaintStatus = 'Pendente' | 'Em análise' | 'Urgente' | 'Resolvida' | 'Ignorada';

export type ComplaintAction = 'warn' | 'hide' | 'suspend7' | 'suspend30' | 'block' | 'restore';

/** Formato de cada evento da linha do tempo de uma denúncia, consumido pelo frontend admin. */
export interface ComplaintEvent {
  id: string;
  at: string;
  label: string;
  detail?: string;
  kind: 'received' | 'status' | 'view' | 'action' | 'note';
}

export const ACTION_LABELS: Record<ComplaintAction, string> = {
  warn: 'Advertência aplicada',
  hide: 'Profissional ocultado do app',
  suspend7: 'Suspensão por 7 dias',
  suspend30: 'Suspensão por 30 dias',
  block: 'Bloqueio permanente',
  restore: 'Prestador reativado no app',
};

/** Espelha o enum `ReportStatus` do schema.prisma (lado interno/banco). */
export type ReportStatusValue = 'PENDENTE' | 'EM_ANALISE' | 'URGENTE' | 'RESOLVIDA' | 'IGNORADA';

/** Espelha o enum `ProfessionalActionType` do schema.prisma (lado interno/banco). */
export type ProfessionalActionTypeValue = 'WARN' | 'HIDE' | 'SUSPEND_7' | 'SUSPEND_30' | 'BLOCK' | 'RESTORE';

/** Converte o status vindo do banco (enum em inglês) para o rótulo em português que o frontend admin consome. */
export const COMPLAINT_STATUS_TO_LABEL: Record<ReportStatusValue, ComplaintStatus> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em análise',
  URGENTE: 'Urgente',
  RESOLVIDA: 'Resolvida',
  IGNORADA: 'Ignorada',
};

/** Converte o rótulo em português (o que a tela admin envia) de volta para o enum do banco. */
export const COMPLAINT_LABEL_TO_STATUS: Record<ComplaintStatus, ReportStatusValue> = {
  Pendente: 'PENDENTE',
  'Em análise': 'EM_ANALISE',
  Urgente: 'URGENTE',
  Resolvida: 'RESOLVIDA',
  Ignorada: 'IGNORADA',
};

/** Converte a ação de moderação escolhida pelo admin para o enum `ProfessionalActionType` do banco. */
export const ACTION_TYPE_MAP: Record<ComplaintAction, ProfessionalActionTypeValue> = {
  warn: 'WARN',
  hide: 'HIDE',
  suspend7: 'SUSPEND_7',
  suspend30: 'SUSPEND_30',
  block: 'BLOCK',
  restore: 'RESTORE',
};
