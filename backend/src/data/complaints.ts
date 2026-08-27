export type ComplaintStatus = 'Pendente' | 'Em análise' | 'Urgente' | 'Resolvida' | 'Ignorada';

export type ComplaintAction = 'warn' | 'hide' | 'suspend7' | 'suspend30' | 'block' | 'restore';

export interface ComplaintEvent {
  id: string;
  at: string;
  label: string;
  detail?: string;
  kind: 'received' | 'status' | 'view' | 'action' | 'note';
}

export interface Complaint {
  id: string;
  professionalId: string;
  professionalName: string;
  residentName: string;
  residentBlock: string;
  residentUnit: string;
  reason: string;
  description: string;
  status: ComplaintStatus;
  channel: string;
  createdAt: string;
  images: string[];
  history: ComplaintEvent[];
  adminNote: string;
  notifyParties: boolean;
}

export interface ProfessionalAction {
  id: string;
  complaintId: string;
  professionalId: string;
  action: ComplaintAction;
  label: string;
  until: string | null;
  createdAt: string;
}

export const ACTION_LABELS: Record<ComplaintAction, string> = {
  warn: 'Advertência aplicada',
  hide: 'Profissional ocultado do app',
  suspend7: 'Suspensão por 7 dias',
  suspend30: 'Suspensão por 30 dias',
  block: 'Bloqueio permanente',
  restore: 'Prestador reativado no app',
};

/** Motivos usados nas denúncias de demonstração. */
export const demoComplaints: Array<Omit<Complaint, 'professionalId' | 'professionalName' | 'history'>> = [
  {
    id: 'den-1',
    residentName: 'Mariana Pires',
    residentBlock: 'Bloco C',
    residentUnit: 'Apto 301',
    reason: 'Má conduta',
    description:
      'O profissional foi grosseiro durante o atendimento, respondeu de forma inadequada e desrespeitou os moradores. O serviço foi concluído, mas a postura foi inaceitável.',
    status: 'Urgente',
    channel: 'App do morador',
    createdAt: '2026-05-11T11:20:00.000Z',
    images: [],
    adminNote: '',
    notifyParties: true,
  },
  {
    id: 'den-2',
    residentName: 'Ricardo Lopes',
    residentBlock: 'Bloco A',
    residentUnit: 'Apto 102',
    reason: 'Atraso',
    description: 'Profissional não chegou no horário combinado e não avisou.',
    status: 'Pendente',
    channel: 'App do morador',
    createdAt: '2026-05-14T09:12:00.000Z',
    images: [],
    adminNote: '',
    notifyParties: true,
  },
  {
    id: 'den-3',
    residentName: 'Ana Paula',
    residentBlock: 'Bloco B',
    residentUnit: 'Apto 204',
    reason: 'Orçamento',
    description: 'Valor cobrado diferente do combinado no orçamento inicial.',
    status: 'Em análise',
    channel: 'App do morador',
    createdAt: '2026-05-09T15:40:00.000Z',
    images: [],
    adminNote: '',
    notifyParties: true,
  },
  {
    id: 'den-4',
    residentName: 'Marcos Lima',
    residentBlock: 'Bloco D',
    residentUnit: 'Apto 410',
    reason: 'Serviço mal executado',
    description: 'O acabamento ficou irregular e o profissional não retornou para corrigir.',
    status: 'Pendente',
    channel: 'Portaria',
    createdAt: '2026-05-12T14:05:00.000Z',
    images: [],
    adminNote: '',
    notifyParties: true,
  },
  {
    id: 'den-5',
    residentName: 'Juliana Freitas',
    residentBlock: 'Bloco A',
    residentUnit: 'Apto 705',
    reason: 'Não compareceu',
    description: 'Agendou visita para orçamento e não apareceu, sem justificativa.',
    status: 'Resolvida',
    channel: 'App do morador',
    createdAt: '2026-05-05T10:30:00.000Z',
    images: [],
    adminNote: 'Profissional se justificou e reagendou o atendimento.',
    notifyParties: true,
  },
];
