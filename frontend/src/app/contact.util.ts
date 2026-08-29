import { Professional } from './models';

/** Mantém apenas os dígitos e garante o DDI do Brasil, no formato que o wa.me espera. */
export function whatsappNumber(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

/** Mensagem padrão de primeiro contato, dizendo de onde veio a indicação. */
export function whatsappGreeting(professionalName: string, residentName: string, condominiumName: string): string {
  const firstName = String(professionalName ?? '').split(' ')[0] || 'Olá';
  const condominium = condominiumName?.trim() || 'nosso condomínio';
  const resident = residentName?.trim();
  const identification = resident ? `Meu nome é ${resident} e sou cliente` : 'Sou cliente';
  return [
    `Olá, ${firstName}!`,
    `${identification} do ${condominium}.`,
    'Encontrei seu contato pelo IndicaFácil, onde você foi recomendado por clientes.',
    'Você teria disponibilidade para um orçamento?',
  ].join(' ');
}

export function buildWhatsappLink(professional: Professional, residentName: string, condominiumName: string): string {
  const number = whatsappNumber(professional.whatsapp || professional.phone);
  const text = encodeURIComponent(whatsappGreeting(professional.name, residentName, condominiumName));
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Link que abre o discador do celular. */
export function buildPhoneLink(professional: Professional): string {
  const digits = String(professional.phone || professional.whatsapp || '').replace(/\D/g, '');
  return digits ? `tel:+${digits.startsWith('55') ? digits : `55${digits}`}` : 'tel:';
}
