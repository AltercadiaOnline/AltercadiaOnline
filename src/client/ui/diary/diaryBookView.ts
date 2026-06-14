import type { DiaryEntry, PlayerDiarySnapshot } from '../../../shared/diary/diaryEntryTypes.js';
import { DiaryEntryType } from '../../../shared/diary/diaryEntryTypes.js';
import { formatDiaryTimestamp } from '../../../shared/diary/diaryEntryBuilders.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveTypeLabel(type: DiaryEntry['type']): string {
  switch (type) {
    case DiaryEntryType.PET_DEATH:
      return 'COMPANHEIRO';
    case DiaryEntryType.BOSS_DEFEAT:
      return 'BOSS';
    case DiaryEntryType.MILESTONE:
      return 'MARCO';
    default:
      return 'MEMÓRIA';
  }
}

function resolveTypeIcon(type: DiaryEntry['type']): string {
  switch (type) {
    case DiaryEntryType.PET_DEATH:
      return '🐾';
    case DiaryEntryType.BOSS_DEFEAT:
      return '☠';
    case DiaryEntryType.MILESTONE:
      return '◆';
    default:
      return '•';
  }
}

function renderDiaryEntry(entry: DiaryEntry): string {
  return `
    <article class="diary-book__entry diary-book__entry--${entry.type.toLowerCase()}" data-diary-entry="${entry.entryId}">
      <header class="diary-book__entry-head">
        <span class="diary-book__entry-icon" aria-hidden="true">${resolveTypeIcon(entry.type)}</span>
        <div class="diary-book__entry-meta">
          <span class="diary-book__entry-tag">${resolveTypeLabel(entry.type)}</span>
          <time class="diary-book__entry-time" datetime="${new Date(entry.timestamp).toISOString()}">
            ${formatDiaryTimestamp(entry.timestamp)}
          </time>
        </div>
      </header>
      <h3 class="diary-book__entry-title">${escapeHtml(entry.title)}</h3>
      <p class="diary-book__entry-content">${escapeHtml(entry.content)}</p>
    </article>
  `;
}

export function renderDiaryBook(snapshot: PlayerDiarySnapshot): string {
  if (snapshot.entries.length === 0) {
    return `
      <section class="diary-book diary-book--empty" aria-label="Diário de Memórias">
        <div class="diary-book__empty">
          <div class="diary-book__empty-icon" aria-hidden="true">📔</div>
          <h3 class="diary-book__title">Diário de Memórias</h3>
          <p>Nenhuma memória registrada ainda.</p>
          <p class="diary-book__hint" data-hud-fit-secondary>
            Vitórias épicas, marcos da trilha e despedidas de companheiros aparecerão aqui.
          </p>
        </div>
      </section>
    `;
  }

  return `
    <section class="diary-book" aria-label="Diário de Memórias">
      <header class="diary-book__header">
        <span class="diary-book__tag">CRÔNICAS // PESSOAIS</span>
        <p class="diary-book__subtitle">${snapshot.entries.length} registro(s)</p>
      </header>
      <div class="diary-book__feed">
        ${snapshot.entries.map(renderDiaryEntry).join('')}
      </div>
    </section>
  `;
}
