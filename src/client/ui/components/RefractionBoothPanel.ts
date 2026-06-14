import { REFRACTION_BOOTH_CONFIG } from '../../../shared/cityMinigames/refractionBoothConfig.js';

import { calculateRefractionBoothScore } from '../../../shared/cityMinigames/refractionBoothScore.js';

import type {

  RefractionBoothCompleteSuccess,

  RefractionBoothLeaderboardEntry,

  RefractionBoothQuoteResult,

  RefractionBoothStarted,

} from '../../../shared/cityMinigames/refractionBoothTypes.js';

import { RefractionBoothArenaController } from '../../cityMinigames/refractionBooth/RefractionBoothArenaController.js';

import {

  onRefractionBoothComplete,

  onRefractionBoothQuote,

  onRefractionBoothStarted,

  requestRefractionBoothComplete,

  requestRefractionBoothQuote,

  requestRefractionBoothStart,

} from '../../cityMinigames/refractionBoothClient.js';

import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';

import { alertSystem } from '../alertSystem.js';

import { formatVolts } from '../../../shared/economy/premiumCurrency.js';

import { BaseUIComponent } from '../UIComponent.js';

import { uiEvents, UIEventType } from '../uiEvents.js';



export type RefractionBoothContext = {

  readonly objectId: string;

  readonly label: string;

};



type SessionState = {

  readonly sessionId: string;

  readonly startedAtMs: number;

  readonly expiresAtMs: number;

};



/** HUD do Estande de Refração — minigame Duck Hunt ~45s, validação no servidor. */

export class RefractionBoothPanel extends BaseUIComponent {

  private context: RefractionBoothContext = {

    objectId: 'refraction_booth',

    label: 'Estande de Refração',

  };



  private quote: RefractionBoothQuoteResult | null = null;

  private quoteLoading = false;

  private session: SessionState | null = null;

  private hits = 0;

  private misses = 0;

  private hitTimings: number[] = [];

  private arenaController: RefractionBoothArenaController | null = null;

  private timerFrameId: number | null = null;

  private failedEarly = false;

  private completing = false;

  private startPending = false;

  private phase: 'idle' | 'playing' | 'result' = 'idle';

  private lastResult: RefractionBoothCompleteSuccess | null = null;

  private leaderboard: readonly RefractionBoothLeaderboardEntry[] = [];



  constructor() {

    super({

      id: 'refractionBooth',

      rootClassName: 'ui-panel ui-panel--refraction-booth ui-panel--movable',

    });



    onRefractionBoothQuote((payload) => {

      this.quoteLoading = false;

      if (!payload.ok) {

        alertSystem(payload.reason);

        this.render();

        return;

      }

      this.quote = payload;

      this.leaderboard = payload.leaderboard;

      this.render();

    });



    onRefractionBoothStarted((payload) => {

      this.startPending = false;

      if (!payload.ok) {

        alertSystem(payload.reason);

        if (this.isOpen() && this.phase !== 'playing') {

          this.close();

        }

        this.render();

        return;

      }

      this.beginLocalSession(payload);

    });



    onRefractionBoothComplete((payload) => {

      this.completing = false;

      if (!payload.ok) {

        alertSystem(payload.reason);

        this.phase = 'idle';

        this.session = null;

        this.requestQuote();

        return;

      }

      this.lastResult = payload;

      this.leaderboard = payload.leaderboard;

      this.phase = 'result';

      this.render();

    });

  }



  openForBooth(context: RefractionBoothContext): void {

    this.context = { ...context };

    this.phase = 'idle';

    this.lastResult = null;

    this.session = null;

    this.startPending = false;

    this.resetCounters();

    this.render();

    this.open();

    this.requestQuote();

  }



  /** Fluxo via NPC — debita entrada e abre direto no simulador. */

  startChallengeFromNpc(): void {

    this.context = {

      objectId: 'refraction_booth',

      label: 'Estande de Refração',

    };

    this.phase = 'idle';

    this.lastResult = null;

    this.session = null;

    this.startPending = true;

    this.resetCounters();

    this.render();

    this.open();



    if (!requestRefractionBoothStart()) {

      this.startPending = false;

      alertSystem('Conexão indisponível.');

      this.close();

    }

  }



  protected override onClose(): void {

    this.stopLocalSession();

    const snapshot = endWorldHudInteractionSession();

    if (snapshot) {

      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);

    }

  }



  protected override shouldUseDynamicLayout(): boolean {

    return true;

  }



  protected override getDynamicLayoutOptions() {

    return {

      fitRootSelector: '[data-hud-fit-root]',

      itemSelector: '[data-hud-fit-item]',

      secondarySelector: '[data-hud-fit-secondary]',

      minVisibleItems: 2,

    };

  }



  createTemplate(): string {

    if (this.phase === 'playing') {

      return this.renderPlayingTemplate();

    }

    if (this.phase === 'result' && this.lastResult) {

      return this.renderResultTemplate(this.lastResult);

    }

    if (this.startPending) {

      return this.renderStartingTemplate();

    }

    return this.renderIdleTemplate();

  }



  private renderStartingTemplate(): string {

    const entryCost = REFRACTION_BOOTH_CONFIG.entryCostVolts;



    return `

      <header class="ui-panel__header refraction-booth__header" data-panel-drag-handle>

        <div class="refraction-booth__header-main">

          <span class="refraction-booth__tag">CIDADE 01 // REFRAÇÃO</span>

          <h2 class="ui-panel__title refraction-booth__title">${this.context.label}</h2>

        </div>

        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar estande">×</button>

      </header>

      <div class="ui-panel__body refraction-booth__body" data-hud-fit-root>

        <p class="refraction-booth__intro" data-hud-fit-secondary>

          Debitando ${formatVolts(entryCost)} e preparando o simulador…

        </p>

      </div>

    `;

  }



  private renderIdleTemplate(): string {

    const entryCost = this.quote?.entryCostVolts ?? REFRACTION_BOOTH_CONFIG.entryCostVolts;

    const cooldownMs = this.quote?.cooldownRemainingMs ?? 0;

    const canAfford = this.quote?.canAfford ?? true;

    const dailyRemaining = this.quote?.dailyPrizeRemainingVolts ?? REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts;

    const cooldownLabel = cooldownMs > 0 ? this.formatDuration(cooldownMs) : 'Pronto';

    const startDisabled =

      this.quoteLoading || cooldownMs > 0 || !canAfford || this.completing ? ' disabled' : '';



    return `

      <header class="ui-panel__header refraction-booth__header" data-panel-drag-handle>

        <div class="refraction-booth__header-main">

          <span class="refraction-booth__tag">CIDADE 01 // REFRAÇÃO</span>

          <h2 class="ui-panel__title refraction-booth__title">${this.context.label}</h2>

        </div>

        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar estande">×</button>

      </header>

      <div class="ui-panel__body refraction-booth__body" data-hud-fit-root>

        <p class="refraction-booth__intro" data-hud-fit-secondary>

          Patos cruzam o simulador em curvas — acerte o máximo antes do tempo ou de 15 escapadas.

        </p>

        <dl class="refraction-booth__stats" data-hud-fit-item>

          <div><dt>Entrada</dt><dd>${formatVolts(entryCost)}</dd></div>

          <div><dt>Cooldown</dt><dd>${cooldownLabel}</dd></div>

          <div><dt>Prêmio hoje</dt><dd>${formatVolts(dailyRemaining)} restantes</dd></div>

        </dl>

        <button type="button" class="refraction-booth__start"${startDisabled} data-action="start">

          ${this.quoteLoading ? 'Consultando…' : 'Iniciar simulador'}

        </button>

        ${this.renderLeaderboardBlock()}

      </div>

    `;

  }



  private renderPlayingTemplate(): string {

    const remainingMs = this.session

      ? Math.max(0, this.session.expiresAtMs - Date.now())

      : 0;

    const missLimit = REFRACTION_BOOTH_CONFIG.maxMisses;

    const missClass =

      this.misses >= missLimit - 3 ? ' refraction-booth__hud-misses--danger' : '';



    return `

      <header class="ui-panel__header refraction-booth__header" data-panel-drag-handle>

        <div class="refraction-booth__header-main">

          <span class="refraction-booth__tag">${this.failedEarly ? 'LIMITE DE QUEDAS' : 'SIMULADOR ATIVO'}</span>

          <h2 class="ui-panel__title refraction-booth__title">${this.formatDuration(remainingMs)}</h2>

        </div>

      </header>

      <div class="ui-panel__body refraction-booth__body refraction-booth__body--playing" data-hud-fit-root>

        <div class="refraction-booth__hud" data-hud-fit-secondary>

          <span>Hits: ${this.hits}</span>

          <span class="refraction-booth__hud-misses${missClass}">Caídos: ${this.misses}/${missLimit}</span>

          <span>Score: ${calculateRefractionBoothScore(this.hits, this.misses)}</span>

        </div>

        <div class="refraction-booth__arena" data-refraction-arena></div>

        <p class="refraction-booth__hint" data-hud-fit-secondary>Patos cruzam a tela — clique para derrubar.</p>

      </div>

    `;

  }



  private renderResultTemplate(result: RefractionBoothCompleteSuccess): string {

    const failNote = this.failedEarly

      ? '<p class="refraction-booth__footnote refraction-booth__footnote--fail" data-hud-fit-secondary>Limite de quedas atingido — simulador encerrado.</p>'

      : '';



    return `

      <header class="ui-panel__header refraction-booth__header" data-panel-drag-handle>

        <div class="refraction-booth__header-main">

          <span class="refraction-booth__tag">SESSÃO ENCERRADA</span>

          <h2 class="ui-panel__title refraction-booth__title">Score ${result.score}</h2>

        </div>

        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar estande">×</button>

      </header>

      <div class="ui-panel__body refraction-booth__body" data-hud-fit-root>

        ${failNote}

        <dl class="refraction-booth__stats refraction-booth__stats--result" data-hud-fit-item>

          <div><dt>Hits</dt><dd>${result.hits}</dd></div>

          <div><dt>Caídos</dt><dd>${result.misses}</dd></div>

          <div><dt>Prêmio</dt><dd>${formatVolts(result.prizeVolts)}</dd></div>

          <div><dt>Prêmio hoje</dt><dd>${formatVolts(result.dailyPrizeTotalVolts)} / ${formatVolts(REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts)}</dd></div>

        </dl>

        <button type="button" class="refraction-booth__start" data-action="back">Voltar</button>

        ${this.renderLeaderboardBlock()}

      </div>

    `;

  }



  private renderLeaderboardBlock(): string {

    if (this.leaderboard.length === 0) {

      return '<p class="refraction-booth__footnote" data-hud-fit-secondary>Placar vazio — seja o primeiro.</p>';

    }



    const rows = this.leaderboard

      .map((entry, index) => `

        <div class="refraction-booth__row" data-hud-fit-item data-hud-priority="${index + 1}">

          <span class="refraction-booth__rank">${index + 1}</span>

          <span class="refraction-booth__name">${entry.displayName}</span>

          <span class="refraction-booth__score">${entry.score}</span>

        </div>

      `)

      .join('');



    return `

      <section class="refraction-booth__board" aria-label="Top 10 do estande">

        <div class="refraction-booth__table-head" data-hud-fit-secondary>

          <span>#</span><span>Operative</span><span>Score</span>

        </div>

        <div class="refraction-booth__rows">${rows}</div>

      </section>

    `;

  }



  protected override bindEvents(): void {

    this.root?.addEventListener('click', (event) => {

      const target = event.target;

      if (!(target instanceof HTMLElement)) return;



      if (target.dataset.action === 'close') {

        this.close();

        return;

      }



      if (target.dataset.action === 'start') {

        if (!requestRefractionBoothStart()) {

          alertSystem('Conexão indisponível.');

        }

        return;

      }



      if (target.dataset.action === 'back') {

        this.phase = 'idle';

        this.lastResult = null;

        this.requestQuote();

        return;

      }

    });

  }



  private requestQuote(): void {

    this.quoteLoading = true;

    this.render();

    if (!requestRefractionBoothQuote()) {

      this.quoteLoading = false;

      alertSystem('Conexão indisponível.');

      this.render();

    }

  }



  private beginLocalSession(started: RefractionBoothStarted): void {

    this.stopLocalSession();

    this.resetCounters();

    this.failedEarly = false;

    this.phase = 'playing';

    this.session = {

      sessionId: started.sessionId,

      startedAtMs: Date.now(),

      expiresAtMs: started.expiresAt,

    };

    this.render();

    this.mountArenaController();

    this.startTimerLoop();

  }



  private mountArenaController(): void {

    const arena = this.query<HTMLElement>('[data-refraction-arena]');

    if (!arena) return;



    this.arenaController = new RefractionBoothArenaController(arena, {

      onHit: () => this.registerHit(),

      onMiss: () => this.registerEscapeMiss(),

    });

    this.arenaController.start();

  }



  private startTimerLoop(): void {

    const frame = (): void => {

      if (!this.session || this.phase !== 'playing' || this.completing) return;



      if (Date.now() >= this.session.expiresAtMs) {

        void this.finishSession();

        return;

      }



      this.updateTimerHeader();

      this.timerFrameId = requestAnimationFrame(frame);

    };



    this.timerFrameId = requestAnimationFrame(frame);

  }



  private stopLocalSession(): void {

    this.arenaController?.destroy();

    this.arenaController = null;

    if (this.timerFrameId !== null) {

      cancelAnimationFrame(this.timerFrameId);

      this.timerFrameId = null;

    }

  }



  private resetCounters(): void {

    this.hits = 0;

    this.misses = 0;

    this.hitTimings = [];

    this.failedEarly = false;

  }



  private registerEscapeMiss(): void {

    if (!this.session || this.phase !== 'playing') return;

    this.misses += 1;

    this.updatePlayingHudStats();



    if (this.misses >= REFRACTION_BOOTH_CONFIG.maxMisses) {

      this.failedEarly = true;

      void this.finishSession();

    }

  }



  private registerHit(): void {

    if (!this.session || this.phase !== 'playing') return;

    this.hits += 1;

    this.hitTimings.push(Date.now() - this.session.startedAtMs);

    this.updatePlayingHudStats();

  }



  private updatePlayingHudStats(): void {

    if (!this.isOpen() || this.phase !== 'playing') return;

    const hud = this.query<HTMLElement>('.refraction-booth__hud');

    if (!hud) return;



    const missLimit = REFRACTION_BOOTH_CONFIG.maxMisses;

    const missEl = hud.querySelector<HTMLElement>('.refraction-booth__hud-misses');

    if (missEl) {

      missEl.textContent = `Caídos: ${this.misses}/${missLimit}`;

      missEl.classList.toggle(

        'refraction-booth__hud-misses--danger',

        this.misses >= missLimit - 3,

      );

    }



    const spans = hud.querySelectorAll('span');

    if (spans[0]) spans[0].textContent = `Hits: ${this.hits}`;

    if (spans[2]) spans[2].textContent = `Score: ${calculateRefractionBoothScore(this.hits, this.misses)}`;

  }



  private updateTimerHeader(): void {

    if (!this.session) return;

    const title = this.query<HTMLElement>('.refraction-booth__title');

    if (title) {

      title.textContent = this.formatDuration(Math.max(0, this.session.expiresAtMs - Date.now()));

    }

  }



  private async finishSession(): Promise<void> {

    if (!this.session || this.completing) return;

    this.completing = true;

    this.stopLocalSession();

    const elapsedMs = Date.now() - this.session.startedAtMs;

    const minDuration = this.failedEarly

      ? REFRACTION_BOOTH_CONFIG.earlyFailMinDurationMs

      : REFRACTION_BOOTH_CONFIG.minSessionDurationMs;

    const durationMs = Math.max(minDuration, elapsedMs);

    const payload = {

      sessionId: this.session.sessionId,

      hits: this.hits,

      misses: this.misses,

      durationMs,

      hitTimings: [...this.hitTimings],

    };

    if (!requestRefractionBoothComplete(payload)) {

      this.completing = false;

      alertSystem('Conexão indisponível ao enviar resultado.');

      this.phase = 'idle';

      this.session = null;

      this.requestQuote();

    }

  }



  private formatDuration(ms: number): string {

    const totalSec = Math.ceil(ms / 1000);

    const min = Math.floor(totalSec / 60);

    const sec = totalSec % 60;

    return `${min}:${sec.toString().padStart(2, '0')}`;

  }

}


