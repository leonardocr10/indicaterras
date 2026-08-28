import { NearbyProfessionalsService } from './nearby-professionals.service';

const profissional = (id: string, nome: string, extras: Record<string, unknown> = {}) => ({
  id,
  name: nome,
  companyName: null,
  bio: null,
  phone: '(34) 99999-0000',
  whatsapp: null,
  instagram: null,
  city: 'Uberlandia',
  neighborhood: 'Santa Monica',
  avatar: null,
  coverImage: null,
  featured: false,
  professionalCategories: [{ categoryId: 'cat-1', category: { id: 'cat-1', name: 'Eletricista', slug: 'eletricista' } }],
  professionalServices: [],
  recommendations: [],
  reviews: [],
  ...extras,
});

const construir = (profissionais: unknown[], distancias: Array<{ id: string; distanceKm: number }> = []) => {
  const findMany = jest.fn().mockResolvedValue(profissionais);
  const queryRaw = jest.fn().mockResolvedValue(distancias);
  const prisma = { professional: { findMany }, $queryRaw: queryRaw } as never;
  return { service: new NearbyProfessionalsService(prisma), findMany, queryRaw };
};

describe('NearbyProfessionalsService', () => {
  it('ordena por distância quando há localização', async () => {
    const { service } = construir(
      [profissional('longe', 'Longe'), profissional('perto', 'Perto'), profissional('medio', 'Medio')],
      [
        { id: 'longe', distanceKm: 9.4 },
        { id: 'perto', distanceKm: 0.8 },
        { id: 'medio', distanceKm: 3.1 },
      ],
    );

    const resultado = await service.search({ lat: -18.91, lng: -48.27 });

    expect(resultado.items.map((item) => item.id)).toEqual(['perto', 'medio', 'longe']);
    expect(resultado.hasLocation).toBe(true);
    expect(resultado.items[0].distanceKm).toBe(0.8);
  });

  it('marca a distância como aproximada, pois vem do centroide do bairro', async () => {
    const { service } = construir([profissional('a', 'A')], [{ id: 'a', distanceKm: 2.4 }]);

    const resultado = await service.search({ lat: -18.91, lng: -48.27 });

    expect(resultado.items[0].approximateDistance).toBe(true);
  });

  it('desempata pela reputação quando dois estão no mesmo bairro', async () => {
    const { service } = construir(
      [
        profissional('sem-fama', 'Sem fama'),
        profissional('indicado', 'Indicado', { recommendations: [{ id: 'r1' }, { id: 'r2' }] }),
      ],
      [
        { id: 'sem-fama', distanceKm: 2.4 },
        { id: 'indicado', distanceKm: 2.4 },
      ],
    );

    const resultado = await service.search({ lat: -18.91, lng: -48.27 });

    expect(resultado.items.map((item) => item.id)).toEqual(['indicado', 'sem-fama']);
  });

  it('aplica o raio e informa quantos ficaram sem localização', async () => {
    const { service } = construir(
      [profissional('dentro', 'Dentro'), profissional('fora', 'Fora'), profissional('sem-coord', 'Sem coordenada')],
      [
        { id: 'dentro', distanceKm: 3 },
        { id: 'fora', distanceKm: 18 },
      ],
    );

    const resultado = await service.search({ lat: -18.91, lng: -48.27, radius: 5 });

    expect(resultado.items.map((item) => item.id)).toEqual(['dentro']);
    expect(resultado.outsideRadius).toBe(1);
    expect(resultado.withoutLocation).toBe(1);
  });

  it('não inventa distância para quem está sem coordenada', async () => {
    const { service } = construir([profissional('sem-coord', 'Sem coordenada')], []);

    const resultado = await service.search({ lat: -18.91, lng: -48.27 });

    expect(resultado.items[0].distanceKm).toBeNull();
  });

  it('joga quem não tem coordenada para o fim, nunca para o topo', async () => {
    const { service } = construir(
      [profissional('sem-coord', 'Sem coordenada'), profissional('com-coord', 'Com coordenada')],
      [{ id: 'com-coord', distanceKm: 7.2 }],
    );

    const resultado = await service.search({ lat: -18.91, lng: -48.27, sort: 'distance' });

    expect(resultado.items.map((item) => item.id)).toEqual(['com-coord', 'sem-coord']);
  });

  it('sem localização não consulta distância e ordena por reputação', async () => {
    const { service, queryRaw } = construir([
      profissional('a', 'A'),
      profissional('b', 'B', { recommendations: [{ id: 'r1' }] }),
    ]);

    const resultado = await service.search({});

    expect(queryRaw).not.toHaveBeenCalled();
    expect(resultado.hasLocation).toBe(false);
    expect(resultado.items.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('exclui das listagens quem está inativo ou punido pela moderação', async () => {
    const { service, findMany } = construir([]);

    await service.search({});

    const filtro = findMany.mock.calls[0][0].where;
    expect(filtro.active).toBe(true);
    expect(filtro.actions.none.action.in).toEqual(['HIDE', 'SUSPEND_7', 'SUSPEND_30', 'BLOCK']);
    // Punição vencida não pode continuar escondendo o profissional.
    expect(filtro.actions.none.OR).toEqual([{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }]);
  });

  it('filtra por avaliação mínima e por recomendados', async () => {
    const { service } = construir([
      profissional('bom', 'Bom', { reviews: [{ rating: 5 }, { rating: 5 }], recommendations: [{ id: 'r1' }] }),
      profissional('fraco', 'Fraco', { reviews: [{ rating: 3 }] }),
    ]);

    const porNota = await service.search({ minRating: 4.5 });
    expect(porNota.items.map((item) => item.id)).toEqual(['bom']);

    const porRecomendacao = await service.search({ recommended: true });
    expect(porRecomendacao.items.map((item) => item.id)).toEqual(['bom']);
  });

  it('pagina o resultado', async () => {
    const { service } = construir([profissional('a', 'A'), profissional('b', 'B'), profissional('c', 'C')]);

    const resultado = await service.search({ sort: 'az', page: 2, limit: 2 });

    expect(resultado.items.map((item) => item.id)).toEqual(['c']);
    expect(resultado.total).toBe(3);
  });
});
