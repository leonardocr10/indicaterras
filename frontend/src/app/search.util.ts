// Busca tolerante: ignora acentos, hifens, pontuacao e a ordem das palavras.
// "ar condicionado", "Ar-Condicionado" e "arcondicionado" encontram a mesma coisa.

export function normalizeSearch(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchTerms(query: string): string[] {
  return normalizeSearch(query).split(' ').filter(Boolean);
}

/**
 * Verifica se o texto atende a busca. Cada palavra digitada precisa aparecer,
 * em qualquer ordem. Palavras de ate dois caracteres exigem correspondencia
 * exata, para "ar" nao casar com "reparo".
 */
export function matchesSearch(haystack: string, query: string): boolean {
  const terms = searchTerms(query);
  if (!terms.length) return true;
  const target = normalizeSearch(haystack);
  if (!target) return false;
  const compact = target.replace(/ /g, '');
  return terms.every((term) => {
    if (term.length <= 2) return new RegExp(`(^| )${term}( |$)`).test(target);
    return target.includes(term) || compact.includes(term);
  });
}
