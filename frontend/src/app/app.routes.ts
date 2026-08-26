import { Routes } from '@angular/router';
import {
  AdminCrudPageComponent,
  AdminDashboardPageComponent,
  FavoritesPageComponent,
  HomePageComponent,
  IndicatePageComponent,
  IndicationsPageComponent,
  LoginPageComponent,
  ProfessionalProfilePageComponent,
  ProfessionalsPageComponent,
  RegisterPageComponent,
  VerifyEmailPageComponent,
  ReviewsPageComponent,
} from './pages';
import { AdminLoginPageComponent, AdminSectionPageComponent, ResidentProfilePageComponent } from './extra-pages';
import { AdminLayoutComponent, MobileLayoutComponent } from './layouts';
import { adminGuard, residentGuard } from './guards/auth.guard';
import { AdminCategoryPageComponent } from './admin-category-page';
import { AdminReviewDetailsPageComponent, AdminReviewsPageComponent } from './admin-reviews-page';
import { CommentsPageComponent } from './comments-page';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'cadastro', component: RegisterPageComponent },
  { path: 'verificar-email', component: VerifyEmailPageComponent },
  { path: 'admin/login', component: AdminLoginPageComponent },
  {
    path: 'app',
    component: MobileLayoutComponent,
    canActivate: [residentGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomePageComponent },
      { path: 'buscar', component: ProfessionalsPageComponent },
      { path: 'profissionais', component: ProfessionalsPageComponent },
      { path: 'profissional/:id/comentarios', component: CommentsPageComponent },
      { path: 'profissional/:id', component: ProfessionalProfilePageComponent },
      { path: 'indicar', component: IndicatePageComponent },
      { path: 'avaliacoes/:id', component: ReviewsPageComponent },
      { path: 'favoritos', component: FavoritesPageComponent },
      { path: 'minhas-indicacoes', component: IndicationsPageComponent },
      { path: 'perfil', component: ResidentProfilePageComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardPageComponent },
      { path: 'condominios/novo', redirectTo: 'condominios', pathMatch: 'full' },
      { path: 'condominios/:id', redirectTo: 'condominios', pathMatch: 'full' },
      { path: 'condominios', component: AdminCrudPageComponent, data: { resource: 'condominiums' } },
      { path: 'moradores', component: AdminCrudPageComponent, data: { resource: 'residents' } },
      { path: 'usuarios', component: AdminCrudPageComponent, data: { resource: 'users' } },
      { path: 'profissionais', component: AdminCrudPageComponent, data: { resource: 'professionals' } },
      { path: 'categorias', component: AdminCategoryPageComponent },
      { path: 'avaliacoes', component: AdminReviewsPageComponent },
      { path: 'avaliacoes/:id', component: AdminReviewDetailsPageComponent },
      { path: 'indicacoes', component: AdminSectionPageComponent, data: { section: 'recommendations' } },
      { path: 'denuncias', component: AdminSectionPageComponent, data: { section: 'reports' } },
      { path: 'configuracoes', component: AdminSectionPageComponent, data: { section: 'settings' } },
      { path: 'relatorios', component: AdminSectionPageComponent, data: { section: 'reports-dashboard' } },
    ],
  },
  { path: 'home', redirectTo: 'app/home', pathMatch: 'full' },
  { path: 'profissionais', redirectTo: 'app/profissionais', pathMatch: 'full' },
  { path: 'profissionais/:id', redirectTo: 'app/profissional/:id', pathMatch: 'full' },
  { path: 'indicar', redirectTo: 'app/indicar', pathMatch: 'full' },
  { path: 'favoritos', redirectTo: 'app/favoritos', pathMatch: 'full' },
  { path: 'minhas-indicacoes', redirectTo: 'app/minhas-indicacoes', pathMatch: 'full' },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
