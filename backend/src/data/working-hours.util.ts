/** Bloco de atendimento salvo em `workingHours`. 0 = domingo. */
export interface BlocoDeJornada {
  days: number[];
  start: string;
  end: string;
}

const NOMES_DOS_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Lê o JSON da jornada descartando blocos malformados. */
export function blocosDeJornada(valor: unknown): BlocoDeJornada[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is BlocoDeJornada => {
    const bloco = item as Partial<BlocoDeJornada>;
    return Array.isArray(bloco?.days) && typeof bloco?.start === 'string' && typeof bloco?.end === 'string';
  });
}

export function jornadaDeHoje(blocos: BlocoDeJornada[]) {
  const diaDaSemana = new Date().getDay();
  return blocos.find((bloco) => bloco.days.includes(diaDaSemana)) ?? null;
}

/** Primeiro bloco a partir de amanhã, olhando no máximo uma semana adiante. */
function proximoBloco(blocos: BlocoDeJornada[]) {
  const hoje = new Date().getDay();
  for (let adiante = 1; adiante <= 7; adiante++) {
    const dia = (hoje + adiante) % 7;
    const bloco = blocos.find((item) => item.days.includes(dia));
    if (bloco) return { dia: NOMES_DOS_DIAS[dia], bloco };
  }
  return null;
}

/**
 * Sem atendimento hoje não é o mesmo que sem jornada cadastrada: quem atende de
 * segunda a sexta precisa ver isso no sábado, e não "sem horário definido".
 */
export function textoDeDisponibilidade(blocos: BlocoDeJornada[], hoje: BlocoDeJornada | null) {
  if (hoje) return `${hoje.start} – ${hoje.end}`;
  if (!blocos.length) return 'Nenhum horário cadastrado';
  const proximo = proximoBloco(blocos);
  return proximo ? `Atende ${proximo.dia}, ${proximo.bloco.start} – ${proximo.bloco.end}` : 'Nenhum horário cadastrado';
}

/**
 * Resumo para o cliente. Sem jornada cadastrada não inventamos disponibilidade:
 * o app pede para consultar, que é o que se pode afirmar com honestidade.
 */
export function disponibilidadePublica(valor: unknown) {
  const blocos = blocosDeJornada(valor);
  const hoje = jornadaDeHoje(blocos);
  if (!blocos.length) return { today: false, text: 'Consulte disponibilidade' };
  return { today: Boolean(hoje), text: textoDeDisponibilidade(blocos, hoje) };
}
