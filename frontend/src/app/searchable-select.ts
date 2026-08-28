import { CommonModule } from '@angular/common';
import { matchesSearch } from './search.util';
import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  ViewChild,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCheck, LucideChevronDown, LucideSearch } from '@lucide/angular';

type SelectOption = {
  value: unknown;
  label: string;
  disabled: boolean;
};

let searchableSelectId = 0;

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, LucideCheck, LucideChevronDown, LucideSearch],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchableSelectComponent), multi: true }],
  template: `
    <button
      class="select-trigger"
      type="button"
      [class.placeholder]="!hasSelection"
      [disabled]="disabled"
      [attr.aria-expanded]="open"
      [attr.aria-controls]="panelId"
      aria-haspopup="listbox"
      (click)="toggle()"
    >
      <span>{{ selectedLabel }}</span>
      <svg lucideChevronDown />
    </button>

    <section
      *ngIf="open"
      class="select-panel"
      [id]="panelId"
      [style.top.px]="panelTop"
      [style.left.px]="panelLeft"
      [style.width.px]="panelWidth"
      role="listbox"
    >
      <label class="select-search">
        <svg lucideSearch />
        <input
          #searchInput
          type="search"
          autocomplete="off"
          [value]="query"
          [placeholder]="searchPlaceholder"
          aria-label="Pesquisar opções"
          (input)="setQuery($event)"
          (keydown.escape)="close()"
        />
      </label>
      <div class="select-options">
        <button
          *ngFor="let option of filteredOptions; trackBy: trackOption"
          type="button"
          [disabled]="option.disabled"
          [class.selected]="valuesEqual(option.value, value)"
          [attr.aria-selected]="valuesEqual(option.value, value)"
          (click)="choose(option)"
        >
          <span>{{ option.label }}</span>
          <svg *ngIf="valuesEqual(option.value, value)" lucideCheck />
        </button>
        <p *ngIf="!filteredOptions.length">Nenhuma opção encontrada.</p>
      </div>
    </section>
  `,
  styles: [`
    :host { position: relative; display: block; min-width: 0; font-family: var(--if-font, 'Nunito', sans-serif); }
    .select-trigger { width: 100%; min-height: 42px; padding: 9px 12px; border: 1px solid #ccd6d1; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #1f2925; background: #fff; font: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease; }
    .select-trigger:hover { border-color: #9bb9aa; }
    .select-trigger:focus-visible { outline: 0; border-color: #065F46; box-shadow: var(--if-focus-ring); }
    .select-trigger:disabled { cursor: not-allowed; opacity: .6; background: #f5f7f6; }
    .select-trigger.placeholder { color: #667085; }
    .select-trigger span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .select-trigger svg { width: 17px; height: 17px; flex: 0 0 auto; transition: transform .18s ease; }
    :host(.is-open) .select-trigger svg { transform: rotate(180deg); }
    .select-panel { position: fixed; z-index: 12000; max-height: min(330px, calc(100dvh - 24px)); padding: 8px; border: 1px solid #d7e1dc; border-radius: 8px; display: grid; gap: 7px; color: #18231e; background: #fff; box-shadow: 0 18px 48px rgba(2,38,25,.2); animation: select-in .14s ease-out; }
    .select-search { min-height: 40px; padding: 0 10px; border: 1px solid #dce4df; border-radius: 6px; display: flex; align-items: center; gap: 8px; background: #f8faf9; }
    .select-search:focus-within { border-color: #065F46; box-shadow: var(--if-focus-ring); }
    .select-search svg { width: 17px; height: 17px; color: #607068; }
    .select-search input { min-width: 0; width: 100%; height: 38px; padding: 0; border: 0; outline: 0; color: #1f2925; background: transparent; font: 400 13px/18px var(--if-font, 'Nunito', sans-serif); box-shadow: none; }
    .select-options { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: grid; gap: 2px; }
    .select-options button { width: 100%; min-height: 38px; padding: 8px 10px; border: 0; border-radius: 5px; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #25352e; background: transparent; font: 500 13px/18px var(--if-font, 'Nunito', sans-serif); text-align: left; cursor: pointer; }
    .select-options button:hover, .select-options button:focus-visible { outline: 0; color: #075e3a; background: #edf6f1; }
    .select-options button.selected { color: #075e3a; background: #e4f2ea; font-weight: 700; }
    .select-options button:disabled { opacity: .45; cursor: not-allowed; }
    .select-options svg { width: 16px; height: 16px; flex: 0 0 auto; }
    .select-options p { margin: 8px; color: #667085; font-size: 12px; text-align: center; }
    @keyframes select-in { from { opacity: 0; transform: translateY(-4px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `],
  host: { '[class.is-open]': 'open' },
})
export class SearchableSelectComponent implements ControlValueAccessor, AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);

  @Input() items: readonly unknown[] | null | undefined = [];
  @Input() valueKey = '';
  @Input() labelKey = '';
  @Input() placeholder = 'Selecione';
  @Input() searchPlaceholder = 'Pesquisar...';
  @Input() emptyLabel = '';
  @Input() emptyValue: unknown = '';

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  protected readonly panelId = `searchable-select-${++searchableSelectId}`;
  protected open = false;
  protected disabled = false;
  protected query = '';
  protected value: unknown = '';
  protected panelTop = 0;
  protected panelLeft = 0;
  protected panelWidth = 240;
  private openedAt = 0;

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected get options(): SelectOption[] {
    const mapped = (this.items ?? []).map((item) => ({
      value: this.readProperty(item, this.valueKey, item),
      label: String(this.readProperty(item, this.labelKey, item) ?? ''),
      disabled: Boolean(this.readProperty(item, 'disabled', false)),
    }));
    return this.emptyLabel ? [{ value: this.emptyValue, label: this.emptyLabel, disabled: false }, ...mapped] : mapped;
  }

  protected get filteredOptions(): SelectOption[] {
    return this.options.filter((option) => matchesSearch(option.label, this.query));
  }

  protected get selectedLabel(): string {
    return this.options.find((option) => this.valuesEqual(option.value, this.value))?.label || this.placeholder;
  }

  protected get hasSelection(): boolean {
    return this.options.some((option) => this.valuesEqual(option.value, this.value));
  }

  ngAfterViewInit() {
    if (this.open) this.focusSearch();
  }

  writeValue(value: unknown): void {
    this.value = value;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.close();
  }

  protected toggle() {
    if (this.disabled) return;
    this.open ? this.close() : this.show();
  }

  protected show() {
    this.query = '';
    this.positionPanel();
    this.open = true;
    this.openedAt = Date.now();
    this.focusSearch();
  }

  protected close() {
    if (!this.open) return;
    this.open = false;
    this.query = '';
    this.onTouched();
  }

  protected setQuery(event: Event) {
    this.query = (event.target as HTMLInputElement).value;
  }

  protected choose(option: SelectOption) {
    if (option.disabled) return;
    this.value = option.value;
    this.onChange(option.value);
    this.close();
  }

  protected valuesEqual(left: unknown, right: unknown) {
    return Object.is(left, right) || String(left ?? '') === String(right ?? '');
  }

  protected trackOption(index: number, option: SelectOption) {
    return `${String(option.value)}-${index}`;
  }

  @HostListener('document:pointerdown', ['$event'])
  protected handleOutsidePointer(event: PointerEvent) {
    if (this.open && !this.element.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected handleViewportChange() {
    // Focar o campo de busca abre o teclado virtual no celular, o que por si só
    // já dispara resize/scroll — ignora esses eventos logo após abrir para não
    // fechar o painel na hora que ele acabou de aparecer.
    if (this.open && Date.now() - this.openedAt > 400) this.close();
  }

  private positionPanel() {
    const rect = this.element.nativeElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    this.panelWidth = Math.min(Math.max(rect.width, 240), viewportWidth - 16);
    this.panelLeft = Math.min(Math.max(8, rect.left), viewportWidth - this.panelWidth - 8);
    const estimatedHeight = Math.min(330, 57 + Math.max(1, Math.min(this.options.length, 6)) * 40);
    const hasRoomBelow = viewportHeight - rect.bottom >= Math.min(240, estimatedHeight);
    this.panelTop = hasRoomBelow ? rect.bottom + 5 : Math.max(8, rect.top - estimatedHeight - 5);
  }

  private focusSearch() {
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  private readProperty(item: unknown, key: string, fallback: unknown) {
    if (!key || item === null || typeof item !== 'object') return fallback;
    return (item as Record<string, unknown>)[key];
  }
}
