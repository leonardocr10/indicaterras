import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LucideCheck, LucideSparkles, LucideX } from '@lucide/angular';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';
import { AiAnalysisLogRow, AiProblemAnalysisResult, AiSettings, AiUsageSummary } from './models';

const PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter (em breve)' },
];

@Component({
  selector: 'admin-ai-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideSparkles, LucideCheck, LucideX],
  template: `
    <main class="admin-content">
      <header class="admin-topbar">
        <div>
          <p class="admin-eyebrow">Gestão IndicaFácil</p>
          <h1>Inteligência Artificial</h1>
          <p>Configure como o IndicaFácil utiliza IA para interpretar as necessidades dos clientes.</p>
        </div>
      </header>

      <section class="admin-ai-metrics" *ngIf="usage() as data">
        <article><span>Chamadas hoje</span><strong>{{ data.today.total }}</strong><small>{{ data.today.aiCalls }} via IA</small></article>
        <article><span>Chamadas no mês</span><strong>{{ data.month.total }}</strong><small>{{ data.month.aiCalls }} via IA</small></article>
        <article><span>Fallback hoje</span><strong>{{ percent(data.today.fallbackCalls, data.today.total) }}</strong><small>{{ data.today.fallbackCalls }} análises</small></article>
        <article><span>Erros hoje</span><strong>{{ percent(data.today.errors, data.today.total) }}</strong><small>{{ data.today.errors }} falhas</small></article>
        <article><span>Tempo médio</span><strong>{{ data.averageLatencyMs !== null ? data.averageLatencyMs + 'ms' : '—' }}</strong><small>respostas de hoje</small></article>
        <article><span>Confiança média</span><strong>{{ data.averageConfidence !== null ? (data.averageConfidence * 100 | number: '1.0-0') + '%' : '—' }}</strong><small>respostas de hoje</small></article>
      </section>

      <form class="settings-grid" [formGroup]="form" (ngSubmit)="save()">
        <section class="settings-card">
          <h2>Status da IA</h2>
          <label class="switch-row"><input type="checkbox" formControlName="enabled" /> Ativar IA no aplicativo</label>
          <small>Quando ativada, a IA ajuda o cliente a interpretar o problema e identificar os serviços mais adequados.</small>
          <p class="admin-ai-status" [class.on]="form.controls.enabled.value">
            <svg lucideSparkles />{{ form.controls.enabled.value ? 'IA ATIVA' : 'IA INATIVA' }}
          </p>
        </section>

        <section class="settings-card">
          <h2>Provedor e modelo</h2>
          <label>Provedor
            <select formControlName="provider">
              <option *ngFor="let option of providerOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label>Modelo<input formControlName="model" placeholder="gemini-2.5-flash-lite" /></label>
          <label>Chave de API<input formControlName="apiKey" [placeholder]="apiKeyPlaceholder()" autocomplete="off" /></label>
          <small>{{ apiKeyHint() }}</small>
          <label>Endpoint (opcional)<input formControlName="endpointUrl" placeholder="https://generativelanguage.googleapis.com/v1beta" /></label>
          <div class="admin-ai-inline">
            <label>Temperatura<input type="number" min="0" max="2" step="0.05" formControlName="temperature" /></label>
            <label>Máximo de tokens<input type="number" min="1" formControlName="maxOutputTokens" /></label>
            <label>Timeout (ms)<input type="number" min="1000" formControlName="timeoutMs" /></label>
          </div>
          <button class="secondary-button" type="button" (click)="testConnection()" [disabled]="testingConnection()">{{ testingConnection() ? 'Testando...' : 'Testar conexão' }}</button>
          <small *ngIf="connectionResult() as result" [class.admin-ai-error]="!result.ok">{{ result.message }} ({{ result.latencyMs }}ms)</small>
        </section>

        <section class="settings-card">
          <h2>Regras de interpretação</h2>
          <label class="switch-row"><input type="checkbox" formControlName="problemAnalysisEnabled" /> Interpretar problema do cliente</label>
          <label class="switch-row"><input type="checkbox" formControlName="categorySuggestionEnabled" /> Sugerir categoria</label>
          <label class="switch-row"><input type="checkbox" formControlName="serviceSuggestionEnabled" /> Sugerir serviços</label>
          <label class="switch-row"><input type="checkbox" formControlName="summaryEnabled" /> Gerar resumo do problema</label>
          <label class="switch-row"><input type="checkbox" formControlName="clarificationEnabled" /> Fazer pergunta quando houver dúvida</label>
          <label class="switch-row"><input type="checkbox" formControlName="fallbackKeywordsEnabled" /> Usar palavras-chave caso a IA falhe</label>
        </section>

        <section class="settings-card">
          <h2>Confiança e fallback</h2>
          <label>Confiança mínima<input type="number" min="0" max="1" step="0.05" formControlName="minimumConfidence" /></label>
          <small>Abaixo desse valor o cliente recebe uma pergunta de esclarecimento.</small>
          <label>Confiança para aplicar automaticamente<input type="number" min="0" max="1" step="0.05" formControlName="autoApplyConfidence" /></label>
          <small>Acima desse valor o resultado é exibido diretamente.</small>
        </section>

        <section class="settings-card">
          <h2>Limites de uso</h2>
          <label>Limite diário de chamadas<input type="number" min="0" formControlName="dailyLimit" /></label>
          <label>Limite mensal<input type="number" min="0" formControlName="monthlyLimit" /></label>
          <label>Máximo de caracteres<input type="number" min="20" formControlName="maxInputLength" /></label>
          <small>Ao atingir o limite, o sistema volta a usar o matcher local por palavras-chave.</small>
        </section>

        <section class="settings-card">
          <h2>Textos da Home</h2>
          <label>Título<input formControlName="homeTitle" /></label>
          <label>Subtítulo<input formControlName="homeSubtitle" /></label>
          <label>Placeholder<input formControlName="homePlaceholder" /></label>
          <label>Texto auxiliar<input formControlName="homeHelperText" /></label>
          <label>Mensagem de sucesso<input formControlName="successMessage" /></label>
          <label>Mensagem de baixa confiança<input formControlName="lowConfidenceMessage" /></label>
          <label>Mensagem de fallback<input formControlName="fallbackMessage" /></label>
        </section>

        <div class="settings-actions">
          <span class="form-feedback">{{ feedback() }}</span>
          <button class="primary-button" type="submit">Salvar configurações</button>
        </div>
      </form>

      <section class="settings-card admin-ai-test">
        <h2>Testar a IA</h2>
        <label>Digite uma frase para testar<input [(ngModel)]="testText" placeholder="Ex.: meu chuveiro queimou" /></label>
        <button class="secondary-button" type="button" (click)="runTest()" [disabled]="testing()">{{ testing() ? 'Analisando...' : 'Analisar' }}</button>
        <dl class="admin-ai-test-result" *ngIf="testResult() as result">
          <div><dt>Categoria</dt><dd>{{ result.category?.name || '—' }}</dd></div>
          <div><dt>Serviços</dt><dd>{{ serviceNames(result) || '—' }}</dd></div>
          <div><dt>Confiança</dt><dd>{{ (result.confidence * 100) | number: '1.0-0' }}%</dd></div>
          <div><dt>Origem</dt><dd>{{ result.usedAi ? 'IA' : 'Fallback' }}</dd></div>
        </dl>
      </section>

      <section class="admin-table-panel">
        <header><h2>Logs de análise</h2><span>{{ logsTotal() }} registros</span></header>
        <div class="admin-table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Problema</th><th>Resultado</th><th>Confiança</th><th>Origem</th><th>Status</th><th>Tempo</th><th>Ações</th></tr></thead>
            <tbody>
              <tr *ngFor="let log of logs()">
                <td>{{ log.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ log.inputText }}</td>
                <td>{{ log.normalizedText || '—' }}</td>
                <td>{{ log.confidence !== null ? ((log.confidence * 100) | number: '1.0-0') + '%' : '—' }}</td>
                <td>{{ log.usedAi ? 'IA' : 'Fallback' }}</td>
                <td>{{ log.status }}</td>
                <td>{{ log.latencyMs !== null ? log.latencyMs + 'ms' : '—' }}</td>
                <td class="admin-ai-log-actions">
                  <button type="button" [class.active]="log.adminFeedback === 'correct'" (click)="setFeedback(log, 'correct')" aria-label="Marcar como correto"><svg lucideCheck /></button>
                  <button type="button" [class.active]="log.adminFeedback === 'incorrect'" (click)="setFeedback(log, 'incorrect')" aria-label="Marcar como incorreto"><svg lucideX /></button>
                </td>
              </tr>
              <tr *ngIf="!logs().length"><td colspan="8" class="admin-review-empty">Nenhuma análise registrada ainda.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
})
export class AdminAiPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly providerOptions = PROVIDER_OPTIONS;
  protected readonly settings = signal<AiSettings | null>(null);
  protected readonly usage = signal<AiUsageSummary | null>(null);
  protected readonly logs = signal<AiAnalysisLogRow[]>([]);
  protected readonly logsTotal = signal(0);
  protected readonly feedback = signal('');
  protected readonly testResult = signal<AiProblemAnalysisResult | null>(null);
  protected readonly testing = signal(false);
  protected readonly testingConnection = signal(false);
  protected readonly connectionResult = signal<{ ok: boolean; message: string; latencyMs: number } | null>(null);
  protected testText = '';

  protected readonly form = this.fb.nonNullable.group({
    enabled: false,
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    apiKey: '',
    endpointUrl: '',
    temperature: 0.2,
    maxOutputTokens: 500,
    timeoutMs: 15000,
    problemAnalysisEnabled: true,
    categorySuggestionEnabled: true,
    serviceSuggestionEnabled: true,
    summaryEnabled: true,
    clarificationEnabled: true,
    fallbackKeywordsEnabled: true,
    minimumConfidence: 0.75,
    autoApplyConfidence: 0.85,
    dailyLimit: 500,
    monthlyLimit: 10000,
    maxInputLength: 500,
    homeTitle: '',
    homeSubtitle: '',
    homePlaceholder: '',
    homeHelperText: '',
    successMessage: '',
    lowConfidenceMessage: '',
    fallbackMessage: '',
  });

  ngOnInit() {
    this.loadSettings();
    this.loadUsage();
    this.loadLogs();
  }

  protected apiKeyPlaceholder() {
    const source = this.settings()?.apiKeySource;
    if (source === 'env') return 'Definida pela variável de ambiente';
    return this.settings()?.apiKey ?? 'Cole a chave do provedor';
  }

  protected apiKeyHint() {
    const source = this.settings()?.apiKeySource;
    if (source === 'env') return 'A chave vem da variável de ambiente GEMINI_API_KEY e tem prioridade sobre a salva aqui.';
    if (source === 'database') return 'A chave salva nunca é exibida novamente. Preencha somente para substituí-la.';
    return 'Nenhuma chave configurada. Sem chave, o sistema continua funcionando pelo matcher local.';
  }

  protected percent(value: number, total: number) {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }

  protected serviceNames(result: AiProblemAnalysisResult) {
    return result.services.map((service) => service.name).join(', ');
  }

  protected save() {
    const payload = { ...this.form.getRawValue() } as Partial<AiSettings>;
    // Campo vazio significa "manter a chave atual", não apagá-la.
    if (!payload.apiKey) delete payload.apiKey;
    this.api.updateAdminAiSettings(payload).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.feedback.set('Configurações salvas.');
        this.toast.success('Configurações de IA atualizadas.');
      },
      error: () => this.toast.error('Não foi possível salvar as configurações de IA.'),
    });
  }

  protected testConnection() {
    this.testingConnection.set(true);
    this.connectionResult.set(null);
    const form = this.form.getRawValue();
    // Testa o que está na tela: sem isso o botão validaria a configuração antiga,
    // justamente a que a pessoa está tentando substituir.
    this.api.testAiConnection({
      model: form.model,
      apiKey: form.apiKey || undefined,
      endpointUrl: form.endpointUrl || undefined,
      timeoutMs: form.timeoutMs,
    }).subscribe({
      next: (result) => {
        this.connectionResult.set(result);
        this.testingConnection.set(false);
      },
      error: () => {
        this.testingConnection.set(false);
        this.toast.error('Não foi possível testar a conexão.');
      },
    });
  }

  protected runTest() {
    const text = this.testText.trim();
    if (!text) return;
    this.testing.set(true);
    this.api.testAiAnalysis(text).subscribe({
      next: (result) => {
        this.testResult.set(result);
        this.testing.set(false);
      },
      error: () => {
        this.testing.set(false);
        this.toast.error('Não foi possível executar o teste.');
      },
    });
  }

  protected setFeedback(log: AiAnalysisLogRow, feedback: 'correct' | 'incorrect') {
    this.api.setAiLogFeedback(log.id, feedback).subscribe({
      next: () => this.logs.update((rows) => rows.map((row) => (row.id === log.id ? { ...row, adminFeedback: feedback } : row))),
      error: () => this.toast.error('Não foi possível registrar o feedback.'),
    });
  }

  private loadSettings() {
    this.api.getAdminAiSettings().subscribe({
      next: (settings) => this.applySettings(settings),
      error: () => this.toast.error('Não foi possível carregar as configurações de IA.'),
    });
  }

  private applySettings(settings: AiSettings) {
    this.settings.set(settings);
    this.form.patchValue({
      enabled: settings.enabled,
      provider: settings.provider,
      model: settings.model,
      // A chave chega mascarada; o campo fica vazio para não reenviar a máscara ao salvar.
      apiKey: '',
      endpointUrl: settings.endpointUrl ?? '',
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      timeoutMs: settings.timeoutMs,
      problemAnalysisEnabled: settings.problemAnalysisEnabled,
      categorySuggestionEnabled: settings.categorySuggestionEnabled,
      serviceSuggestionEnabled: settings.serviceSuggestionEnabled,
      summaryEnabled: settings.summaryEnabled,
      clarificationEnabled: settings.clarificationEnabled,
      fallbackKeywordsEnabled: settings.fallbackKeywordsEnabled,
      minimumConfidence: settings.minimumConfidence,
      autoApplyConfidence: settings.autoApplyConfidence,
      dailyLimit: settings.dailyLimit ?? 0,
      monthlyLimit: settings.monthlyLimit ?? 0,
      maxInputLength: settings.maxInputLength,
      homeTitle: settings.homeTitle ?? '',
      homeSubtitle: settings.homeSubtitle ?? '',
      homePlaceholder: settings.homePlaceholder ?? '',
      homeHelperText: settings.homeHelperText ?? '',
      successMessage: settings.successMessage ?? '',
      lowConfidenceMessage: settings.lowConfidenceMessage ?? '',
      fallbackMessage: settings.fallbackMessage ?? '',
    });
  }

  private loadUsage() {
    this.api.getAiUsage().subscribe({ next: (usage) => this.usage.set(usage), error: () => undefined });
  }

  private loadLogs() {
    this.api.getAiAnalysisLogs(1, 20).subscribe({
      next: (result) => {
        this.logs.set(result.items);
        this.logsTotal.set(result.total);
      },
      error: () => undefined,
    });
  }
}
