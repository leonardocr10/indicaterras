import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideBadgeCheck,
  LucideCheck,
  LucideCircleDollarSign,
  LucideClipboardList,
  LucideHeartHandshake,
  LucideMenu,
  LucideMessageCircle,
  LucideSearch,
  LucideShieldCheck,
  LucideStar,
  LucideUsersRound,
} from '@lucide/angular';
import { brand } from './brand';

@Component({
  selector: 'landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowRight, LucideBadgeCheck, LucideCheck, LucideCircleDollarSign, LucideClipboardList, LucideHeartHandshake, LucideMenu, LucideMessageCircle, LucideSearch, LucideShieldCheck, LucideStar, LucideUsersRound],
  template: `
    <main class="landing-page">
      <header class="landing-nav">
        <a class="landing-brand" routerLink="/"><img [src]="brand.assets.logoPrimary" [alt]="brand.name" /></a>
        <nav aria-label="Navegação da página">
          <a href="#como-funciona">Como funciona</a><a href="#beneficios">Benefícios</a><a href="#profissionais">Para profissionais</a><a href="#depoimentos">Depoimentos</a>
        </nav>
        <div class="landing-nav-actions"><a routerLink="/login" class="landing-login">Entrar</a><a routerLink="/cadastro" class="landing-cta small">Quero receber propostas <svg lucideArrowRight /></a></div>
        <button class="landing-menu" type="button" aria-label="Abrir menu"><svg lucideMenu /></button>
      </header>

      <section class="landing-hero">
        <div class="landing-hero-copy">
          <span class="landing-kicker"><svg lucideShieldCheck />O lugar onde cliente e profissional se encontram</span>
          <h1>Precisou?<br />Indica<span>Fácil.</span></h1>
          <p>Encontre profissionais qualificados para resolver qualquer problema, ou cadastre-se como prestador e <b>receba propostas de clientes perto de você.</b></p>
          <div class="landing-audience-toggle" role="group" aria-label="Você é...">
            <span class="active"><svg lucideSearch />Preciso de um serviço</span>
            <a href="#profissionais"><svg lucideHeartHandshake />Sou profissional</a>
          </div>
          <div class="landing-hero-actions"><a routerLink="/cadastro" class="landing-cta">Quero receber propostas <svg lucideArrowRight /></a><a routerLink="/login" class="landing-outline">Entrar no sistema <svg lucideArrowRight /></a></div>
          <div class="landing-trust"><span><svg lucideBadgeCheck />Profissionais verificados</span><span><svg lucideStar />Avaliações reais</span><span><svg lucideClipboardList />Propostas comparadas</span><span><svg lucideCircleDollarSign />Pagamento seguro</span></div>
        </div>
        <div class="landing-hero-visual" aria-label="Prévia do aplicativo IndicaFácil">
          <div class="landing-orb orb-one"></div><div class="landing-orb orb-two"></div>
          <article class="phone-mock phone-home"><i></i><small>Olá, Leonardo!</small><em>Uberlândia, MG</em><h3>Qual problema você<br /><b>precisa resolver?</b></h3><div class="phone-search"><svg lucideSearch />Descreva seu problema...</div><strong>Categorias populares</strong><div class="phone-categories"><span>Casa</span><span>Instalações</span><span>Limpeza</span></div><div class="phone-request">Quero receber propostas<button>Começar agora</button></div></article>
          <article class="phone-mock phone-proposals"><i></i><h3>Propostas recebidas</h3><p><b>5 propostas</b> para sua solicitação</p><div class="proposal-card"><span class="proposal-avatar"></span><div><b>Clima Certo</b><small>Instalações</small><em>4,9 (120)</em><strong>R$ 250,00</strong></div><button>Aceitar proposta</button></div><div class="proposal-card muted"><span class="proposal-avatar"></span><div><b>Ar Plus</b><small>Instalações</small><strong>R$ 230,00</strong></div></div></article>
        </div>
      </section>

      <section class="landing-stats" aria-label="Números da IndicaFácil"><div><svg lucideUsersRound /><b>+15 mil</b><span>Profissionais ativos</span></div><div><svg lucideShieldCheck /><b>+50 mil</b><span>Problemas resolvidos</span></div><div><svg lucideMessageCircle /><b>+120 mil</b><span>Propostas enviadas</span></div><div><svg lucideStar /><b>4,8</b><span>Avaliação média</span></div><div><svg lucideHeartHandshake /><b>98%</b><span>Clientes satisfeitos</span></div></section>

      <section class="landing-section landing-steps" id="como-funciona"><span class="section-eyebrow">Como funciona</span><h2>Resolver ficou <span>mais fácil.</span></h2><p class="section-intro">Em poucos passos você encontra a solução ideal para o seu problema.</p><div class="steps-grid"><article><i><svg lucideMessageCircle /></i><b>1</b><h3>Conte seu problema</h3><p>Descreva o que você precisa resolver de forma simples e rápida.</p></article><article><i><svg lucideUsersRound /></i><b>2</b><h3>Receba propostas</h3><p>Profissionais qualificados enviam propostas para você.</p></article><article><i><svg lucideStar /></i><b>3</b><h3>Compare e escolha</h3><p>Avalie preço, avaliações e escolha a melhor opção.</p></article><article><i><svg lucideCheck /></i><b>4</b><h3>Problema resolvido</h3><p>Acompanhe o serviço e avalie o profissional.</p></article></div></section>

      <section class="landing-benefits" id="beneficios"><div class="benefits-copy"><span class="section-eyebrow">Benefícios</span><h2>Tudo para tornar sua vida mais <span>fácil</span></h2><p>Conectamos você aos melhores profissionais da sua região com praticidade, segurança e transparência.</p><ul><li><svg lucideCheck />Profissionais verificados e avaliados</li><li><svg lucideCheck />Compare propostas e preços</li><li><svg lucideCheck />Acompanhe todo o serviço</li><li><svg lucideCheck />Suporte dedicado sempre que precisar</li></ul></div><div class="benefits-visual"><article class="benefits-card"><header><span class="benefits-card-avatar"><svg lucideBadgeCheck /></span><div><b>Perfil verificado</b><small>Documentos e antecedentes conferidos</small></div></header><div class="benefits-card-rating"><span class="benefits-card-stars">★★★★★</span><b>4,9</b><small>de 5 · 312 avaliações</small></div><div class="benefits-card-bar"><i style="width:96%"></i></div></article><article class="floating-review first"><b>★★★★★</b><p>Encontrei o profissional perfeito em menos de 10 minutos!</p><strong>Juliana S.</strong><small>Uberlândia, MG</small></article><article class="floating-review second"><b>★★★★★</b><p>Serviço rápido, profissional e preço justo.</p><strong>Carlos A.</strong></article></div></section>

      <section class="landing-professionals" id="profissionais"><div><span class="section-eyebrow dark">Para profissionais</span><h2>Mais serviços,<br />mais clientes,<br /><span>mais crescimento</span></h2><p>Cadastre-se gratuitamente e receba oportunidades de serviço todos os dias.</p><ul><li><svg lucideCheck />Receba propostas de clientes perto de você</li><li><svg lucideCheck />Gerencie sua agenda de forma simples</li><li><svg lucideCheck />Destaque seu perfil e aumente suas avaliações</li></ul><a routerLink="/cadastro" class="landing-white-cta">Quero me cadastrar <svg lucideArrowRight /></a></div><article class="professional-phone"><i></i><h3>Propostas</h3><span>Instalação de ar condicionado<button>Enviar proposta</button></span><span>Limpeza de caixa d'água<button>Enviar proposta</button></span><span>Reforma de banheiro<button>Enviar proposta</button></span></article><aside><b>+ de 15 mil</b><span>Profissionais ativos</span><b>+ de 50 mil</b><span>Serviços realizados</span><b>Pagamento rápido</b><span>Receba pelo app com segurança</span></aside></section>

      <section class="landing-section testimonials" id="depoimentos"><span class="section-eyebrow">Depoimentos</span><h2>O que nossos <span>usuários</span> dizem</h2><div class="testimonial-grid"><article><b>“</b><p>Encontrei um eletricista excelente pelo IndicaFácil. Atendimento rápido e preço justo!</p><strong>Maria Silva</strong><small>Uberlândia, MG</small></article><article><b>“</b><p>Plataforma muito fácil de usar. Recebi várias propostas e consegui escolher a melhor.</p><strong>João Pereira</strong><small>Uberlândia, MG</small></article><article><b>“</b><p>Como profissional, o IndicaFácil me ajuda a encher minha agenda todos os dias!</p><strong>Ricardo Oliveira</strong><small>Profissional</small></article></div></section>

      <section class="landing-final"><span><img [src]="brand.assets.icon" alt="" /></span><div><h2>Pronto para resolver seu problema?</h2><p>Conte seu problema agora e receba propostas de profissionais qualificados.</p></div><a routerLink="/cadastro" class="landing-cta">Quero receber propostas <svg lucideArrowRight /></a></section>
      <footer class="landing-footer"><div><img [src]="brand.assets.logoReverse" [alt]="brand.name" /><p>Conectamos pessoas aos melhores profissionais para resolver qualquer problema com facilidade e segurança.</p></div><div><b>Navegação</b><a href="#como-funciona">Como funciona</a><a href="#beneficios">Benefícios</a><a href="#profissionais">Para profissionais</a></div><div><b>Sistema</b><a routerLink="/login">Entrar no sistema</a><a routerLink="/cadastro">Criar conta</a><a routerLink="/admin/login">Área administrativa</a></div></footer>
    </main>
  `,
})
export class LandingPageComponent { protected readonly brand = brand; }
