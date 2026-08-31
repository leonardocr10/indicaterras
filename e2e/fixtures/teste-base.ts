import { test as base, expect, type Page } from '@playwright/test';
import { Diagnostico } from './diagnostics';
import { entrarComo } from './sessao';
import { mockGoogleMaps } from './maps-mock';
import { LoginPage } from '../pages/LoginPage';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';
import { ProfessionalProfilePage } from '../pages/ProfessionalProfilePage';
import { CommentsPage } from '../pages/CommentsPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { ServiceRequestPage } from '../pages/ServiceRequestPage';
import { ProfessionalDashboardPage } from '../pages/ProfessionalDashboardPage';
import { AdminCrudPage } from '../pages/AdminCrudPage';
import { AdminCategoriesPage } from '../pages/AdminCategoriesPage';
import { AdminAiPage } from '../pages/AdminAiPage';
import { AdminReportsPage } from '../pages/AdminReportsPage';
import { NavegacaoInferior } from '../pages/NavegacaoInferior';

interface Paginas {
  login: LoginPage;
  loginAdmin: AdminLoginPage;
  cadastro: RegisterPage;
  home: HomePage;
  busca: SearchPage;
  perfilProfissional: ProfessionalProfilePage;
  comentarios: CommentsPage;
  favoritos: FavoritesPage;
  solicitacao: ServiceRequestPage;
  painelProfissional: ProfessionalDashboardPage;
  adminCrud: AdminCrudPage;
  adminCategorias: AdminCategoriesPage;
  adminIa: AdminAiPage;
  adminDenuncias: AdminReportsPage;
  navegacao: NavegacaoInferior;
}

interface FixturesDoProjeto extends Paginas {
  diagnostico: Diagnostico;
  comoCliente: Page;
  comoProfissional: Page;
  comoAdmin: Page;
}

export const test = base.extend<FixturesDoProjeto>({
  /**
   * Ligado em todo teste. No teardown, se sobrou erro de console ou resposta
   * HTTP inesperada, o teste falha - mesmo que todos os `expect` tenham passado.
   * E o que cumpre os itens 33 e 34 sem espalhar checagem por cada arquivo.
   */
  diagnostico: async ({ page }, usar) => {
    const diagnostico = new Diagnostico(page);
    await usar(diagnostico);
    const relatorio = diagnostico.relatorio();
    expect(relatorio, `A pagina reportou problemas durante o teste:\n\n${relatorio}`).toBe('');
  },

  // O mapa e mockado por padrao: nenhuma suite deve depender da rede do Google.
  // Os testes marcados @maps-real desfazem isso explicitamente.
  page: async ({ page }, usar) => {
    await mockGoogleMaps(page);
    await usar(page);
  },

  comoCliente: async ({ page }, usar) => {
    await entrarComo(page, 'cliente');
    await usar(page);
  },
  comoProfissional: async ({ page }, usar) => {
    await entrarComo(page, 'profissional');
    await usar(page);
  },
  comoAdmin: async ({ page }, usar) => {
    await entrarComo(page, 'admin');
    await usar(page);
  },

  login: async ({ page }, usar) => usar(new LoginPage(page)),
  loginAdmin: async ({ page }, usar) => usar(new AdminLoginPage(page)),
  cadastro: async ({ page }, usar) => usar(new RegisterPage(page)),
  home: async ({ page }, usar) => usar(new HomePage(page)),
  busca: async ({ page }, usar) => usar(new SearchPage(page)),
  perfilProfissional: async ({ page }, usar) => usar(new ProfessionalProfilePage(page)),
  comentarios: async ({ page }, usar) => usar(new CommentsPage(page)),
  favoritos: async ({ page }, usar) => usar(new FavoritesPage(page)),
  solicitacao: async ({ page }, usar) => usar(new ServiceRequestPage(page)),
  painelProfissional: async ({ page }, usar) => usar(new ProfessionalDashboardPage(page)),
  adminCrud: async ({ page }, usar) => usar(new AdminCrudPage(page)),
  adminCategorias: async ({ page }, usar) => usar(new AdminCategoriesPage(page)),
  adminIa: async ({ page }, usar) => usar(new AdminAiPage(page)),
  adminDenuncias: async ({ page }, usar) => usar(new AdminReportsPage(page)),
  navegacao: async ({ page }, usar) => usar(new NavegacaoInferior(page)),
});

export { expect } from '@playwright/test';
