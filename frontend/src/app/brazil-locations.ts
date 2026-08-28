// Cidades vem da API publica e gratuita do IBGE (dados oficiais, sem chave).
// Bairros nao tem uma API publica confiavel cobrindo todo o Brasil, entao
// mantemos uma lista curada so das cidades que realmente importam pro
// condominio hoje (Uberlandia). Cidades fora dessa lista caem no campo de
// texto livre de bairro.
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { normalizeSearch } from './search.util';

interface IbgeMunicipio {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

export function fetchBrazilianCities(http: HttpClient) {
  return http.get<IbgeMunicipio[]>('https://servicodados.ibge.gov.br/api/v1/localidades/municipios').pipe(
    map((municipios) =>
      municipios
        .map((item) => ({ name: item.nome, uf: item.microrregiao?.mesorregiao?.UF?.sigla ?? '' }))
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    ),
  );
}

// Fonte: lista de bairros por regiao (Central, Norte, Sul, Leste, Oeste) de Uberlandia-MG.
const UBERLANDIA_NEIGHBORHOODS = [
  'Aclimação', 'Alto Umuarama', 'Alvorada', 'Bom Jesus', 'Brasil', 'Carajás', 'Cazeca',
  'Chácaras Panorama', 'Chácaras Tubalina', 'Cidade Jardim', 'Custódio Pereira', 'Daniel Fonseca',
  'Distrito Industrial', 'Dona Zulmira', 'Fundinho', 'Granada', 'Grand Ville', 'Granja Marileusa',
  'Guarani', 'Jaraguá', 'Jardim Brasília', 'Jardim Canaã', 'Jardim Europa', 'Jardim Holanda',
  'Jardim Inconfidência', 'Jardim Ipanema', 'Jardim Karaíba', 'Jardim das Palmeiras', 'Jardim Patrícia',
  'Jardim Sul', 'Lagoinha', 'Laranjeiras', 'Lídice', 'Luizote de Freitas', 'Mansões Aeroporto',
  'Mansour', 'Maravilha', 'Marta Helena', 'Martins', 'Minas Gerais', 'Monte Hebron', 'Morada da Colina',
  'Morada do Sol', 'Morada dos Pássaros', 'Morumbi', 'Nossa Senhora Aparecida', 'Nossa Senhora das Graças',
  'Nova Uberlândia', 'Novo Mundo', 'Osvaldo Rezende', 'Pacaembu', 'Pampulha', 'Patrimônio', 'Planalto',
  'Portal do Vale', 'Presidente Roosevelt', 'Residencial Gramado', 'Residencial Integração',
  'Residencial Pequis', 'Santa Luzia', 'Santa Mônica', 'Santa Rosa', 'Saraiva', 'Segismundo Pereira',
  'São Jorge', 'São José', 'Shopping Park', 'Taiaman', 'Tabajaras', 'Tibery', 'Tocantins', 'Tubalina',
  'Umuarama', 'Vigilato Pereira',
].sort((left, right) => left.localeCompare(right, 'pt-BR'));

const NEIGHBORHOODS_BY_CITY: Record<string, string[]> = {
  [normalizeSearch('Uberlândia')]: UBERLANDIA_NEIGHBORHOODS,
};

export function neighborhoodsForCity(city: string): string[] {
  return NEIGHBORHOODS_BY_CITY[normalizeSearch(city)] ?? [];
}
