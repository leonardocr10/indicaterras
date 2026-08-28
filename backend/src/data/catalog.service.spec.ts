import { CatalogService } from './catalog.service';

const category = (id: string, name: string, slug: string, group: string, services: Array<[string, string[]]>) => ({
  id, name, slug, group: { id: `group-${group}`, name: group, slug: group },
  services: services.map(([serviceName, aliases], index) => ({ id: `${id}-${index}`, categoryId: id, name: serviceName, slug: serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), aliases: aliases.map((alias) => ({ alias })) })),
});

describe('CatalogService', () => {
  const categories = [
    category('electrician', 'Eletricista', 'eletricista', 'Casa e manutenção', [['Chuveiro', ['chuveiro queimou', 'chuveiro nao esquenta', 'resistencia queimada']]]),
    category('plumber', 'Encanador', 'encanador', 'Casa e manutenção', [['Vazamento', ['pia vazando', 'torneira pingando']]]),
    category('gas', 'Gás', 'gas', 'Casa e manutenção', [['Instalação de cooktop', ['instalar cooktop']], ['Teste de vazamento', ['cheiro de gas']]]),
    category('air', 'Ar-condicionado', 'ar-condicionado', 'Casa e manutenção', [['Manutenção', ['ar nao gela']]]),
    category('psychologist', 'Psicólogo', 'psicologo', 'Saúde e bem-estar', [['Psicoterapia individual', ['psicologa', 'terapia']], ['Terapia de casal', ['terapia de casal']]]),
    category('computer', 'Informática', 'informatica', 'Tecnologia', [['Notebook lento', ['notebook lento']]]),
    category('furniture', 'Montador de móveis', 'montador-moveis', 'Casa e manutenção', [['Montagem de guarda-roupa', ['montar guarda roupa', 'montar guarda-roupa']]]),
  ];
  const service = new CatalogService({ category: { findMany: jest.fn().mockResolvedValue(categories) }, professional: { findMany: jest.fn().mockResolvedValue([]) } } as never);

  it.each([
    ['meu chuveiro queimou', 'Eletricista', 'Chuveiro'],
    ['minha pia esta vazando', 'Encanador', 'Vazamento'],
    ['quero instalar um cooktop', 'Gás', 'Instalação de cooktop'],
    ['meu ar nao gela', 'Ar-condicionado', 'Manutenção'],
    ['preciso de psicologa', 'Psicólogo', 'Psicoterapia individual'],
    ['meu notebook esta muito lento', 'Informática', 'Notebook lento'],
    ['preciso montar um guarda roupa', 'Montador de móveis', 'Montagem de guarda-roupa'],
  ])('identifica %s', async (query, expectedCategory, expectedService) => {
    const result = await service.match(query);
    expect(result.category?.name).toBe(expectedCategory);
    expect(result.services[0]?.name).toBe(expectedService);
  });
});
