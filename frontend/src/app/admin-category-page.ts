import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  LucideBell,
  LucideChevronDown,
  LucideGripVertical,
  LucideInfo,
  LucidePencil,
  LucidePlus,
  LucideSave,
  LucideTrash2,
  LucideUpload,
  LucideX,
  LucideSearch,
  LucideChevronLeft,
  LucideChevronRight,
} from '@lucide/angular';
import { Category, CategoryService } from './models';
import { ApiService } from './services/api.service';
import { normalizeSearch } from './search.util';
import { ToastService } from './services/toast.service';
import { SpreadsheetService } from './services/spreadsheet.service';
import { SearchableSelectComponent } from './searchable-select';

type CategoryDraft = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  displayOrder: number;
  active: boolean;
};
type ServiceDraft = Pick<CategoryService, 'name' | 'slug' | 'icon' | 'displayOrder' | 'active' | 'aliases'> & { id?: string };
type IconTarget = 'category' | 'service';

@Component({
  selector: 'admin-category-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchableSelectComponent,
    LucideBell,
    LucideChevronDown,
    LucideGripVertical,
    LucideInfo,
    LucidePencil,
    LucidePlus,
    LucideSave,
    LucideTrash2,
    LucideUpload,
    LucideX,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  template: `
    <main class="admin-content category-admin-content">
      <header class="category-admin-header">
        <div>
          <nav class="category-breadcrumb"><span>Admin</span><b>/</b><strong>Categorias</strong></nav>
          <h1>Categorias</h1><p>Gerencie categorias, serviços, palavras-chave e ícones.</p>
        </div>
        <div class="category-header-actions">
          <button class="notification-button" type="button" aria-label="Notificações"><svg lucideBell /><span>3</span></button>
          <div class="category-admin-user"><img src="/assets/placeholders/default-avatar.svg" alt="Foto padrão do administrador" /><span><b>Administrador</b><small>Super admin</small></span><svg lucideChevronDown /></div>
        </div>
      </header>
      <p *ngIf="feedback()" class="category-feedback" [class.error]="hasError()">{{ feedback() }}</p>

      <section class="admin-table-panel admin-data-panel category-list-panel">
        <div class="admin-data-toolbar">
          <label class="admin-search-field"><svg lucideSearch /><input [ngModel]="searchTerm()" (ngModelChange)="setSearch($event)" placeholder="Buscar categoria..." /></label>
          <app-searchable-select class="admin-toolbar-select" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)" [items]="categoryStatusOptions" valueKey="value" labelKey="label" emptyLabel="Todos os status" searchPlaceholder="Pesquisar status..." />
          <span class="toolbar-spacer"></span>
          <label class="admin-file-button"><svg lucideUpload /> Importar Excel<input type="file" accept=".xlsx,.xls,.csv" (change)="importExcel($event)" /></label>
          <button class="primary-button" type="button" (click)="newCategory(true)"><svg lucidePlus /> Nova categoria</button>
        </div>
        <div class="admin-table-wrap"><table><thead><tr><th>Categoria</th><th>Slug</th><th>Ícone</th><th>Serviços</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          <tr *ngFor="let category of pagedCategories()"><td><strong>{{ category.name }}</strong></td><td>{{ category.slug }}</td><td><span class="taxonomy-icon"><img *ngIf="iconImage(category.icon) as iconUrl; else listGlyph" [src]="iconUrl" alt="" /><ng-template #listGlyph>{{ iconGlyph(category.icon) }}</ng-template></span></td><td>{{ category.services.length || 0 }}</td><td>{{ category.displayOrder }}</td><td><span class="category-status" [class.inactive]="category.active === false"><i></i>{{ category.active === false ? 'Inativa' : 'Ativa' }}</span></td><td class="admin-actions"><button type="button" (click)="editCategory(category.id)">Editar</button><button type="button" class="danger-action" (click)="deleteCategory(category.id)">Excluir</button></td></tr>
          <tr *ngIf="!pagedCategories().length"><td colspan="7" class="admin-empty-row">Nenhuma categoria encontrada.</td></tr>
        </tbody></table></div>
        <footer class="admin-pagination"><span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filteredCategories().length }}</span><label>Itens por página <app-searchable-select class="page-size-select" [ngModel]="pageSize()" (ngModelChange)="setPageSize($event)" [items]="pageSizeOptions" searchPlaceholder="Pesquisar quantidade..." /></label><div><button type="button" [disabled]="page() === 1" (click)="setPage(page() - 1)"><svg lucideChevronLeft /></button><b>{{ page() }} / {{ totalPages() }}</b><button type="button" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)"><svg lucideChevronRight /></button></div></footer>
      </section>
    </main>

    <div *ngIf="editorOpen()" class="admin-modal-backdrop category-editor-backdrop" (click)="closeCategoryEditor()">
      <section class="category-editor-modal" (click)="$event.stopPropagation()">
        <header class="admin-modal-header"><div><h2>{{ selectedId() ? 'Editar categoria' : 'Nova categoria' }}</h2><p>Cadastre os dados, serviços, palavras-chave e ícones.</p></div><button type="button" aria-label="Fechar" (click)="closeCategoryEditor()"><svg lucideX /></button></header>
        <section class="category-editor-column">
          <article class="category-admin-panel category-data-panel">
            <h2><span>1.</span> Dados da categoria</h2>
            <div class="category-form-grid">
              <label class="category-field"><span>Nome da categoria <i>*</i></span>
                <input [(ngModel)]="draft.name" (ngModelChange)="updateName($event)" placeholder="Ex.: Eletricista" />
              </label>
              <label class="category-field"><span>Slug <i>*</i></span>
                <input [(ngModel)]="draft.slug" placeholder="eletricista" />
                <small>Usado na URL e buscas internas. Ex.: eletricista</small>
              </label>

              <div class="category-icon-field">
                <b>Ícone da categoria <i>*</i></b>
                <div><span class="taxonomy-icon large"><img *ngIf="iconImage(draft.icon) as iconUrl; else categoryGlyph" [src]="iconUrl" alt="Ícone da categoria" /><ng-template #categoryGlyph>{{ iconGlyph(draft.icon) }}</ng-template></span><button type="button" (click)="openIconPicker('category')"><svg lucideUpload /> Alterar ícone</button></div>
                <small>Ícone que representa a categoria no app</small>
              </div>
              <label class="category-field compact"><span>Ordem de exibição <i>*</i></span>
                <input type="number" min="1" [(ngModel)]="draft.displayOrder" />
                <small>Define a posição da categoria na listagem</small>
              </label>
              <label class="category-field compact"><span>Status <i>*</i></span>
                <app-searchable-select [(ngModel)]="draft.active" [items]="activeOptions" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar status..." />
                <small>Categoria visível para moradores</small>
              </label>
              <label class="category-field full">Descrição curta <span>(opcional)</span>
                <textarea maxlength="160" [(ngModel)]="draft.description" placeholder="Descreva os profissionais e serviços desta categoria"></textarea>
                <small>Breve descrição exibida no app e no site (máx. 160 caracteres) <em>{{ draft.description.length }}/160</em></small>
              </label>
            </div>
          </article>

          <article class="category-admin-panel category-services-panel">
            <div class="category-services-heading">
              <div><h2><span>2.</span> Serviços e palavras-chave</h2><p>Os serviços e palavras-chave definem o que o profissional pode fazer e melhoram a busca dos moradores.</p></div>
              <button class="primary-button" type="button" (click)="openServiceEditor()"><svg lucidePlus /> Adicionar serviço</button>
            </div>
            <div class="category-services-table-wrap">
              <table class="category-services-table">
                <thead><tr><th></th><th>Nome do serviço</th><th>Ícone</th><th>Sinônimos / palavras-chave</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  <tr *ngFor="let service of services()">
                    <td class="drag-cell"><svg lucideGripVertical /></td>
                    <td><strong>{{ service.name }}</strong></td>
                    <td><span class="taxonomy-icon"><img *ngIf="iconImage(service.icon) as iconUrl; else serviceGlyph" [src]="iconUrl" [alt]="'Ícone de ' + service.name" /><ng-template #serviceGlyph>{{ iconGlyph(service.icon) }}</ng-template></span></td>
                    <td class="aliases-cell">{{ service.aliases.join(', ') || 'Sem sinônimos' }}</td>
                    <td>{{ service.displayOrder }}</td>
                    <td><span class="category-status" [class.inactive]="!service.active"><i></i>{{ service.active ? 'Ativo' : 'Inativo' }}</span></td>
                    <td><div class="service-row-actions"><button type="button" aria-label="Editar serviço" (click)="openServiceEditor(service)"><svg lucidePencil /></button><button type="button" class="danger" aria-label="Excluir serviço" (click)="deleteService(service)"><svg lucideTrash2 /></button></div></td>
                  </tr>
                  <tr *ngIf="!services().length"><td colspan="7" class="empty-services">Nenhum serviço cadastrado. Use “Adicionar serviço” para começar.</td></tr>
                </tbody>
              </table>
            </div>
            <div class="services-info"><svg lucideInfo /> Estes serviços poderão ser vinculados aos profissionais desta categoria e utilizados nas buscas.</div>
          </article>
        </section>
        <footer class="category-modal-actions">
        <button class="secondary-button" type="button" (click)="closeCategoryEditor()">Cancelar</button>
        <button class="primary-button" type="button" [disabled]="saving()" (click)="saveCategory()"><svg lucideSave /> {{ saving() ? 'Salvando...' : 'Salvar categoria' }}</button>
        </footer>
      </section>
    </div>

    <div *ngIf="serviceEditorOpen()" class="admin-modal-backdrop" (click)="closeServiceEditor()">
      <form class="admin-modal category-service-modal" (click)="$event.stopPropagation()" (ngSubmit)="saveService()">
        <header><div><h2>{{ serviceDraft.id ? 'Editar serviço' : 'Adicionar serviço' }}</h2><p>Vincule um serviço e suas palavras-chave à categoria.</p></div><button type="button" (click)="closeServiceEditor()"><svg lucideX /></button></header>
        <label><span>Nome do serviço <i>*</i></span><input name="serviceName" required [(ngModel)]="serviceDraft.name" (ngModelChange)="updateServiceName($event)" placeholder="Ex.: Tomada" /></label>
        <label><span>Slug <i>*</i></span><input name="serviceSlug" required [(ngModel)]="serviceDraft.slug" placeholder="tomada" /></label>
        <div class="service-icon-selection"><b>Ícone do serviço <i>*</i></b><div><span class="taxonomy-icon large"><img *ngIf="iconImage(serviceDraft.icon) as iconUrl; else modalServiceGlyph" [src]="iconUrl" alt="Ícone escolhido" /><ng-template #modalServiceGlyph>{{ iconGlyph(serviceDraft.icon) }}</ng-template></span><button type="button" class="secondary-button" (click)="openIconPicker('service')"><svg lucideUpload /> Escolher ou enviar ícone</button></div></div>
        <label>Sinônimos / palavras-chave<textarea name="serviceAliases" [(ngModel)]="serviceAliasesText" placeholder="tomadas, plug, ponto elétrico"></textarea><small>Separe os termos por vírgulas.</small></label>
        <div class="service-modal-grid"><label>Ordem<input name="serviceOrder" type="number" min="1" [(ngModel)]="serviceDraft.displayOrder" /></label><label>Status<app-searchable-select name="serviceActive" [(ngModel)]="serviceDraft.active" [items]="activeOptions" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar status..." /></label></div>
        <div class="admin-editor-actions"><button type="button" class="secondary-button" (click)="closeServiceEditor()">Cancelar</button><button type="submit" class="primary-button">Salvar serviço</button></div>
      </form>
    </div>

    <div *ngIf="iconPickerOpen()" class="admin-modal-backdrop icon-picker-backdrop" (click)="closeIconPicker()">
      <section class="admin-modal icon-picker-modal" (click)="$event.stopPropagation()">
        <header><div><h2>Escolher ícone</h2><p>Selecione um ícone da biblioteca ou envie seu próprio arquivo.</p></div><button type="button" (click)="closeIconPicker()"><svg lucideX /></button></header>
        <div class="icon-catalog"><button *ngFor="let icon of iconCatalog" type="button" [class.selected]="currentIcon() === icon.value || (currentIcon() === 'sparkles' && icon.value === 'broom')" (click)="chooseIcon(icon.value)"><span><img [src]="iconAsset(icon.value)" [alt]="icon.label" /></span><small>{{ icon.label }}</small></button></div>
        <label class="icon-upload-option"><svg lucideUpload /><span><b>Enviar ícone personalizado</b><small>PNG, SVG ou WebP, até 1 MB</small></span><input type="file" accept="image/png,image/svg+xml,image/webp" (change)="uploadIcon($event)" /></label>
      </section>
    </div>
  `,
})
export class AdminCategoryPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly spreadsheet = inject(SpreadsheetService);
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoryStatusOptions = [{ value: 'active', label: 'Ativas' }, { value: 'inactive', label: 'Inativas' }];
  protected readonly activeOptions = [{ value: true, label: 'Ativo' }, { value: false, label: 'Inativo' }];
  protected readonly pageSizeOptions = [5, 10, 25];
  protected readonly services = signal<ServiceDraft[]>([]);
  protected readonly selectedId = signal('');
  protected readonly saving = signal(false);
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly serviceEditorOpen = signal(false);
  protected readonly iconPickerOpen = signal(false);
  protected readonly iconTarget = signal<IconTarget>('category');
  protected readonly editorOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected serviceAliasesText = '';
  protected draft: CategoryDraft = this.emptyCategory();
  protected serviceDraft: ServiceDraft = this.emptyService();
  protected readonly iconCatalog = [
    { value: 'bolt', glyph: '⚡', label: 'Energia' }, { value: 'plug', glyph: '🔌', label: 'Tomada' },
    { value: 'shower', glyph: '🚿', label: 'Chuveiro' }, { value: 'lightbulb', glyph: '💡', label: 'Lâmpada' },
    { value: 'lamp', glyph: '◉', label: 'Iluminação' }, { value: 'circuit-board', glyph: '▣', label: 'Quadro elétrico' },
    { value: 'cable', glyph: '〰', label: 'Fiação' }, { value: 'droplets', glyph: '💧', label: 'Hidráulica' },
    { value: 'wrench', glyph: '🔧', label: 'Manutenção' }, { value: 'toolbox', glyph: '🧰', label: 'Ferramentas' },
    { value: 'hammer', glyph: '🔨', label: 'Obra' }, { value: 'construction', glyph: '🛠', label: 'Construção' },
    { value: 'brick-wall', glyph: '▦', label: 'Alvenaria' }, { value: 'hard-hat', glyph: '◠', label: 'Pedreiro' },
    { value: 'drill', glyph: '⌁', label: 'Furadeira' }, { value: 'ruler', glyph: '📏', label: 'Medição' },
    { value: 'paintbrush', glyph: '🖌', label: 'Pintura' }, { value: 'broom', glyph: '🧹', label: 'Limpeza' },
    { value: 'spray-can', glyph: '▥', label: 'Produtos de limpeza' }, { value: 'washing-machine', glyph: '◉', label: 'Lavanderia' },
    { value: 'fan', glyph: '✣', label: 'Climatização' }, { value: 'air-vent', glyph: '▤', label: 'Ar-condicionado' },
    { value: 'leaf', glyph: '🌿', label: 'Jardinagem' }, { value: 'trees', glyph: '🌳', label: 'Árvores' },
    { value: 'flower', glyph: '✿', label: 'Paisagismo' }, { value: 'package', glyph: '▤', label: 'Montagem' },
    { value: 'armchair', glyph: '▰', label: 'Móveis' }, { value: 'bed', glyph: '▱', label: 'Quartos' },
    { value: 'toilet', glyph: '◫', label: 'Sanitário' }, { value: 'tool-case', glyph: '▣', label: 'Marido de aluguel' },
    { value: 'key', glyph: '⚿', label: 'Chaveiro' }, { value: 'shield', glyph: '◇', label: 'Segurança' },
    { value: 'camera', glyph: '◉', label: 'Câmeras' }, { value: 'laptop', glyph: '▰', label: 'Informática' },
    { value: 'cooking', glyph: '◡', label: 'Cozinha' }, { value: 'car', glyph: '▰', label: 'Automotivo' },
    { value: 'paw', glyph: '●', label: 'Pets' }, { value: 'bug', glyph: '◆', label: 'Dedetização' },
    { value: 'pool', glyph: '≈', label: 'Piscina' }, { value: 'truck', glyph: '▰', label: 'Mudanças' },
    { value: 'scissors', glyph: '✂', label: 'Costura' }, { value: 'grid', glyph: '•••', label: 'Outros' },
  ];
  protected readonly filteredCategories = computed(() => {
    const search = this.normalize(this.searchTerm());
    return this.categories().filter((category) => {
      const matchesSearch = !search || this.normalize(`${category.name} ${category.slug} ${category.description || ''}`).includes(search);
      const matchesStatus = !this.statusFilter() || (this.statusFilter() === 'active' ? category.active !== false : category.active === false);
      return matchesSearch && matchesStatus;
    });
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCategories().length / this.pageSize())));
  protected readonly pagedCategories = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredCategories().slice(start, start + this.pageSize());
  });

  ngOnInit(): void { void this.loadCategories(); }

  protected isImageIcon(icon: string | undefined): boolean { return Boolean(icon?.startsWith('data:image/') || icon?.startsWith('http') || icon?.startsWith('/')); }
  protected iconAsset(icon: string | undefined): string {
    const value = icon === 'sparkles' ? 'broom' : icon;
    return this.iconCatalog.some((item) => item.value === value) ? `/assets/taxonomy-icons/${value}.svg` : '';
  }
  protected iconImage(icon: string | undefined): string { return this.isImageIcon(icon) ? String(icon) : this.iconAsset(icon); }
  protected iconGlyph(icon: string | undefined): string { return this.iconCatalog.find((item) => item.value === icon)?.glyph ?? '✦'; }
  protected currentIcon(): string { return this.iconTarget() === 'category' ? this.draft.icon : this.serviceDraft.icon; }

  protected async selectCategory(id: string): Promise<void> {
    if (!id) { this.newCategory(true); return; }
    const category = this.categories().find((item) => item.id === id);
    if (!category) return;
    this.selectedId.set(id);
    this.draft = {
      name: category.name, slug: category.slug, icon: category.icon || 'grid', description: category.description || '',
      displayOrder: category.displayOrder || 1, active: category.active !== false,
    };
    const services = await firstValueFrom(this.api.getCategoryServices(id, true));
    this.services.set(services.map((item) => ({ ...item, aliases: item.aliases || [] })));
    this.clearFeedback();
  }

  protected newCategory(openEditor = false): void {
    this.selectedId.set('');
    this.draft = this.emptyCategory();
    this.services.set([]);
    this.clearFeedback();
    this.editorOpen.set(openEditor);
  }

  protected async editCategory(id: string): Promise<void> { await this.selectCategory(id); this.editorOpen.set(true); }
  protected closeCategoryEditor(): void { this.editorOpen.set(false); this.serviceEditorOpen.set(false); this.iconPickerOpen.set(false); }
  protected setSearch(value: string): void { this.searchTerm.set(value); this.page.set(1); }
  protected setStatusFilter(value: string): void { this.statusFilter.set(value); this.page.set(1); }
  protected setPage(value: number): void { this.page.set(Math.min(Math.max(1, Number(value)), this.totalPages())); }
  protected setPageSize(value: number): void { this.pageSize.set(Number(value)); this.page.set(1); }
  protected pageStart(): number { return this.filteredCategories().length ? (this.page() - 1) * this.pageSize() + 1 : 0; }
  protected pageEnd(): number { return Math.min(this.page() * this.pageSize(), this.filteredCategories().length); }

  protected async importExcel(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.saving.set(true);
    try {
      const rows = await this.spreadsheet.import(file);
      let imported = 0;
      for (const row of rows) {
        const entries = new Map(Object.entries(row).map(([key, value]) => [this.normalize(key), value]));
        const name = String(entries.get('nome') ?? entries.get('name') ?? '').trim();
        if (!name) continue;
        await firstValueFrom(this.api.createAdminRecord('categories', {
          name,
          slug: String(entries.get('slug') || this.slugify(name)),
          icon: String(entries.get('icone') ?? entries.get('icon') ?? 'grid'),
          description: String(entries.get('descricao') ?? entries.get('description') ?? ''),
          displayOrder: Number(entries.get('ordem') ?? entries.get('displayorder') ?? this.categories().length + imported + 1),
          active: this.normalize(String(entries.get('status') ?? 'ativa')) !== 'inativa',
        }));
        imported += 1;
      }
      await this.loadCategories();
      this.showFeedback(`${imported} categoria(s) importada(s) com sucesso.`);
    } catch (error) { this.showFeedback(this.errorMessage(error, 'Não foi possível importar a planilha.'), true); }
    finally { this.saving.set(false); input.value = ''; }
  }

  protected resetCurrent(): void {
    const id = this.selectedId();
    if (id) void this.selectCategory(id); else this.newCategory();
  }

  protected updateName(name: string): void {
    const previous = this.slugify(this.draft.name);
    this.draft.name = name;
    if (!this.draft.slug || this.draft.slug === previous) this.draft.slug = this.slugify(name);
  }

  protected updateServiceName(name: string): void {
    const previous = this.slugify(this.serviceDraft.name);
    this.serviceDraft.name = name;
    if (!this.serviceDraft.slug || this.serviceDraft.slug === previous) this.serviceDraft.slug = this.slugify(name);
  }

  protected async saveCategory(): Promise<void> {
    if (!this.draft.name.trim() || !this.draft.slug.trim()) { this.showFeedback('Preencha o nome e o slug da categoria.', true); return; }
    this.saving.set(true);
    try {
      let id = this.selectedId();
      if (id) {
        await firstValueFrom(this.api.updateAdminRecord('categories', id, { ...this.draft }));
      } else {
        const created = await firstValueFrom(this.api.createAdminRecord('categories', { ...this.draft }));
        id = String(created['id']);
        for (const service of this.services()) await firstValueFrom(this.api.createCategoryService(id, this.servicePayload(service)));
      }
      await this.loadCategories(id);
      this.showFeedback('Categoria salva com sucesso.');
      this.editorOpen.set(false);
    } catch (error) {
      this.showFeedback(this.errorMessage(error, 'Não foi possível salvar a categoria.'), true);
    } finally { this.saving.set(false); }
  }

  protected async deleteCategory(categoryId?: string): Promise<void> {
    const id = categoryId || this.selectedId();
    if (!id || !window.confirm('Excluir esta categoria e seus serviços?')) return;
    try {
      await firstValueFrom(this.api.deleteAdminRecord('categories', id));
      await this.loadCategories();
      this.newCategory(false);
      this.showFeedback('Categoria excluída.');
    } catch (error) { this.showFeedback(this.errorMessage(error, 'Não foi possível excluir a categoria.'), true); }
  }

  protected openServiceEditor(service?: ServiceDraft): void {
    this.serviceDraft = service ? { ...service, aliases: [...service.aliases] } : this.emptyService(this.services().length + 1);
    this.serviceAliasesText = this.serviceDraft.aliases.join(', ');
    this.serviceEditorOpen.set(true);
  }

  protected closeServiceEditor(): void { this.serviceEditorOpen.set(false); }

  protected async saveService(): Promise<void> {
    if (!this.serviceDraft.name.trim()) return;
    this.serviceDraft.slug = this.serviceDraft.slug || this.slugify(this.serviceDraft.name);
    this.serviceDraft.aliases = this.serviceAliasesText.split(',').map((item) => item.trim()).filter(Boolean);
    const id = this.selectedId();
    try {
      if (!id) {
        const pendingId = this.serviceDraft.id || `pending-${Date.now()}`;
        const next = { ...this.serviceDraft, id: pendingId };
        this.services.update((items) => this.serviceDraft.id ? items.map((item) => item.id === this.serviceDraft.id ? next : item) : [...items, next]);
      } else if (this.serviceDraft.id) {
        await firstValueFrom(this.api.updateCategoryService(this.serviceDraft.id, this.servicePayload(this.serviceDraft)));
        await this.reloadServices(id);
      } else {
        await firstValueFrom(this.api.createCategoryService(id, this.servicePayload(this.serviceDraft)));
        await this.reloadServices(id);
      }
      this.closeServiceEditor();
    } catch (error) { this.showFeedback(this.errorMessage(error, 'Não foi possível salvar o serviço.'), true); }
  }

  protected async deleteService(service: ServiceDraft): Promise<void> {
    if (!window.confirm(`Excluir o serviço “${service.name}”?`)) return;
    if (!this.selectedId() || service.id?.startsWith('pending-')) { this.services.update((items) => items.filter((item) => item.id !== service.id)); return; }
    try { await firstValueFrom(this.api.deleteCategoryService(service.id!)); await this.reloadServices(this.selectedId()); }
    catch (error) { this.showFeedback(this.errorMessage(error, 'Não foi possível excluir o serviço.'), true); }
  }

  protected openIconPicker(target: IconTarget): void { this.iconTarget.set(target); this.iconPickerOpen.set(true); }
  protected closeIconPicker(): void { this.iconPickerOpen.set(false); }
  protected chooseIcon(icon: string): void { if (this.iconTarget() === 'category') this.draft.icon = icon; else this.serviceDraft.icon = icon; this.closeIconPicker(); }

  protected uploadIcon(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { this.showFeedback('O ícone deve ter no máximo 1 MB.', true); return; }
    const reader = new FileReader();
    reader.onload = () => this.chooseIcon(String(reader.result || 'grid'));
    reader.readAsDataURL(file);
  }

  private async loadCategories(preferredId = ''): Promise<void> {
    const records = await firstValueFrom(this.api.getAdminRecords('categories'));
    const categories = records.map((record) => record as unknown as Category).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    this.categories.set(categories);
    const id = preferredId || (this.editorOpen() ? this.selectedId() : '');
    if (id) await this.selectCategory(id);
    this.setPage(this.page());
  }

  private async reloadServices(categoryId: string): Promise<void> {
    const services = await firstValueFrom(this.api.getCategoryServices(categoryId, true));
    this.services.set(services.map((item) => ({ ...item, aliases: item.aliases || [] })));
  }

  private servicePayload(service: ServiceDraft): Partial<CategoryService> {
    return { name: service.name, slug: service.slug, icon: service.icon, displayOrder: Number(service.displayOrder), active: service.active, aliases: service.aliases };
  }

  private emptyCategory(): CategoryDraft { return { name: '', slug: '', icon: 'bolt', description: '', displayOrder: this.categories().length + 1 || 1, active: true }; }
  private emptyService(order = 1): ServiceDraft { return { name: '', slug: '', icon: 'plug', displayOrder: order, active: true, aliases: [] }; }
  private slugify(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  private normalize(value: string): string { return normalizeSearch(value); }
  private clearFeedback(): void { this.feedback.set(''); this.hasError.set(false); }
  private showFeedback(message: string, error = false): void {
    this.feedback.set(message);
    this.hasError.set(error);
    if (error) this.toast.error(message); else this.toast.success(message);
  }
  private errorMessage(error: unknown, fallback: string): string { return (error as { error?: { message?: string } })?.error?.message || fallback; }
}
