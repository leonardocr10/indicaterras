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

  it('pré-seleciona poucas categorias para a IA, priorizando a mais provável', async () => {
    const candidatas = await service.candidateCategories('meu chuveiro queimou', 3);

    expect(candidatas).toHaveLength(3);
    expect(candidatas[0].name).toBe('Eletricista');
    expect(candidatas.length).toBeLessThan(categories.length);
  });

  it('devolve categorias mesmo quando o texto não pontua, para a IA ter contexto', async () => {
    const candidatas = await service.candidateCategories('xyzabc sem sentido nenhum', 4);

    expect(candidatas).toHaveLength(4);
  });

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

/**
 * Corretor de Seguros e uma categoria unica com os tipos de seguro como
 * servicos - e nao uma categoria por tipo. Estes casos garantem que a frase
 * natural do cliente cai no servico certo dentro dela.
 */
describe('CatalogService com Corretor de Seguros', () => {
  const seguros = category('broker', 'Corretor de Seguros', 'corretor-seguros', 'Serviços profissionais', [
    ['Seguro Auto', ['carro', 'moto', 'frota', 'seguro de carro', 'seguro do carro', 'seguro para carro', 'seguro automóvel', 'seguro de frota', 'seguro para frota', 'renovar seguro carro']],
    ['Seguro Residencial', ['casa', 'apartamento', 'imóvel', 'seguro de casa', 'seguro da casa', 'seguro residencial', 'seguro para casa']],
    ['Seguro Empresarial', ['loja', 'empresa', 'comércio', 'seguro da empresa', 'seguro para empresa', 'seguro empresarial', 'seguro de loja']],
    ['Seguro Saúde', ['plano de saúde', 'seguro saúde', 'plano de saúde empresa', 'plano para empresa', 'plano empresarial']],
    ['Seguro de Máquinas e Equipamentos', ['trator', 'colheitadeira', 'seguro trator', 'seguro para trator', 'seguro colheitadeira', 'seguro de colheitadeira', 'seguro de máquina']],
    ['Seguro Agro', ['fazenda', 'lavoura', 'seguro para fazenda', 'seguro da fazenda', 'seguro lavoura', 'seguro rural', 'seguro agro']],
    ['Seguro de Vida', ['seguro de vida', 'seguro vida']],
  ]);
  const outras = [
    category('electrician', 'Eletricista', 'eletricista', 'Casa e manutenção', [['Chuveiro', ['chuveiro queimou']]]),
    category('air', 'Ar-condicionado', 'ar-condicionado', 'Casa e manutenção', [['Manutenção', ['ar nao gela']]]),
    category('health', 'Psicólogo', 'psicologo', 'Saúde e bem-estar', [['Psicoterapia individual', ['psicologa']]]),
  ];
  const service = new CatalogService({
    category: { findMany: jest.fn().mockResolvedValue([seguros, ...outras]) },
    professional: { findMany: jest.fn().mockResolvedValue([]) },
  } as never);

  it.each([
    ['Quero fazer seguro do meu carro', 'Seguro Auto'],
    ['Preciso de seguro para minha empresa', 'Seguro Empresarial'],
    ['Quero seguro da minha casa', 'Seguro Residencial'],
    ['Preciso de plano de saude para minha empresa', 'Seguro Saúde'],
    ['Quero fazer seguro da minha colheitadeira', 'Seguro de Máquinas e Equipamentos'],
    ['Preciso de seguro para o trator', 'Seguro de Máquinas e Equipamentos'],
    ['Quero seguro para minha fazenda', 'Seguro Agro'],
    ['Preciso de seguro para minha frota', 'Seguro Auto'],
    ['quero fazer um seguro de vida', 'Seguro de Vida'],
    ['Quero proteger minha lavoura', 'Seguro Agro'],
    ['Preciso de plano de saúde para minha empresa', 'Seguro Saúde'],
  ])('interpreta "%s"', async (frase, servicoEsperado) => {
    const resultado = await service.match(frase);
    expect(resultado.category?.name).toBe('Corretor de Seguros');
    expect(resultado.services[0]?.name).toBe(servicoEsperado);
  });

  it('nao rouba buscas de outras categorias', async () => {
    const chuveiro = await service.match('meu chuveiro queimou');
    expect(chuveiro.category?.name).toBe('Eletricista');
  });
});
