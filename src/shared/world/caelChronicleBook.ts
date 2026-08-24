/** Livro I das Crônicas de Altercadia — catálogo estático. O servidor autoriza o desbloqueio. */

export type CaelChronicleChapter = {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly body: string;
  /** Gancho de quest/arco — só desbloqueia depois do capítulo. Não é missão ainda. */
  readonly questHookId?: string;
  readonly questHookNote?: string;
};

export type CaelChronicleProgress = {
  readonly unlockedChapterIds: readonly string[];
  readonly unlockedQuestHookIds: readonly string[];
};

export type HearCaelChronicleResult =
  | {
      readonly ok: true;
      readonly progress: CaelChronicleProgress;
      readonly chapter: CaelChronicleChapter;
    }
  | {
      readonly ok: false;
      readonly code: 'TOME_COMPLETE';
      readonly progress: CaelChronicleProgress;
      readonly message: string;
    };

export const EMPTY_CAEL_CHRONICLE_PROGRESS: CaelChronicleProgress = {
  unlockedChapterIds: [],
  unlockedQuestHookIds: [],
};

export const CAEL_CHRONICLE_BOOK_TITLE = 'Crônicas de Altercadia';

export const CAEL_CHRONICLE_CHAPTERS: readonly CaelChronicleChapter[] = [
  {
    id: 'livro1_prologo',
    order: 1,
    title: 'Prólogo — Duas ruas, uma fissura',
    body:
      'Houve um tempo em que o nosso mundo e Altercadia conviviam na mesma esquina do cosmos. A barreira não era muralha. Era silêncio.\n\n'
      + 'Silêncio sob pressão racha. O que atravessou primeiro não foram exércitos: foram minerais. Cristais que pulsam com uma carga que este lado não sabe metabolizar. Os arquivos os chamam de Fragmentos.\n\n'
      + 'A partir daí, viajante, a história deixa de ser geologia. Vira contrato, sangue e ranking.',
  },
  {
    id: 'livro1_vortex',
    order: 2,
    title: 'I — A VORTEX CORP',
    body:
      'Para o mundo visível, a VORTEX CORP vende energia limpa. Nos arquivos, foi a primeira a entender os Fragmentos — e a decidir que Altercadia seria drenada em silêncio.\n\n'
      + 'Dentro da cidade, o chão responde à NexGrid: mapas, contratos, telemetria de duelo. Os dois nomes nunca aparecem fundidos num documento fundador. O efeito, para quem vive aqui, é o mesmo. Corporação. Grid. Taxa.\n\n'
      + 'A marca anda nas ruas. No Beco, o Agente Vórtex deixa cair o Fragmento de Alma. Extração com botas.',
    questHookId: 'tese_vortex_nexgrid',
    questHookNote: 'Cael não funde os dois nomes. O silêncio, neste capítulo, é proposital.',
  },
  {
    id: 'livro1_escolhidos',
    order: 3,
    title: 'II — Escolhidos, Sonho, Alternado',
    body:
      'O fragmento não reage em todos. Na maioria, nada. Numa parcela rara, pulsa — como se lesse uma frequência.\n\n'
      + 'A corporação poderia ter jaulas. Escolheu franquia. O procedimento é voluntário. Sempre foi. Acontece no que os sobreviventes chamam de Sonho: o fragmento não cria nada. Escaneia. Amplifica o que tu já eras.\n\n'
      + 'Quem acorda, acorda fundido. Em combate — o Alternado — a essência toma forma. A classe não é destino. É espelho.',
  },
  {
    id: 'livro1_extintos',
    order: 4,
    title: 'III — Os Extintos',
    body:
      'Quatro frequências, catalogadas em latim: Impetus, Cogitor, Tutator, Dissolutus. Os arquivos os chamam de Extintos — não porque tenham morrido. Porque o que eram antes do Sonho já não volta.\n\n'
      + 'Instinto. Cálculo. Proteção. Desafio. A rua, o laboratório, o muro, a fenda no meio da calçada. O fragmento só aumentou o volume.',
  },
  {
    id: 'livro1_ecosistema',
    order: 5,
    title: 'IV — Liberdade com dono',
    body:
      'Os escolhidos competem, faturam, sobem ranking — e pagam taxa pela infraestrutura. Não são prisioneiros. São clientes.\n\n'
      + 'VOLTS é fluxo: quem não tem, não age. ALTER COINS é prestígio. A taxa canônica no mercado é uma Alter por duzentos e cinquenta VOLTS. A energia extraída de Altercadia volta para Altercadia como ficha de cassino.',
  },
  {
    id: 'livro1_barreira',
    order: 6,
    title: 'V — O que ninguém sabe (ainda)',
    body:
      'A barreira está cedendo. Não à vista. Cada fragmento extraído é mais pressão. Cada escolhido amplificado acelera o processo.\n\n'
      + 'O conselho tem teorias. Nenhuma é tranquilizadora. Por enquanto, vocês duelam. A corporação lucra. Altercadia existe do outro lado de uma costura cada vez mais fina.',
    questHookId: 'tese_barreira',
    questHookNote: 'O apêndice sobre o dia em que a barreira ceder não está neste tomo.',
  },
  {
    id: 'livro1_cidade',
    order: 7,
    title: 'VI — Cidade 01',
    body:
      'A Cidade 01 não nasceu vila. Nasceu infraestrutura. A arena é equipamento. Eu exigi o anel de espectadores: quem só luta esquece; quem observa lembra.\n\n'
      + 'Arena, distrito sul, bloco do mercado, laboratório, praça da Zena, casa do Mercenário, estande do Kael, norte industrial, portal para o Beco. O ciclo de dia e noite é o mesmo para todos. Ninguém tem fuso próprio aqui.',
  },
  {
    id: 'livro1_cael',
    order: 8,
    title: 'VII — O Registrador',
    body:
      'Vim do Vértice Zero — se ainda é lugar, não confirmo. Fui o primeiro Curador de Logs no contrato fundador. Aprendi que narrativa bem contada evita pânico melhor que mural de aviso.\n\n'
      + 'Fiquei porque a cidade concentra o que jurei proteger: novatos, retornos, pets instáveis. Cada crônica que te leio é um pedaço do log que a corporação preferia manter técnico. Palavra que uso: passagem. Vitória, eu não prometo.',
    questHookId: 'tese_cael_log',
    questHookNote: 'Há quem diga que este corpo já foi restaurado do registro. Cael não confirma.',
  },
  {
    id: 'livro1_zena',
    order: 9,
    title: 'VIII — Refugiados, não recurso',
    body:
      'Zena veio do Rift Kennel — zona que o catálogo oficial apagou. Ela não domestica. Estabiliza. Os companheiros que te seguem são refugiados de fendas, não mercadoria.\n\n'
      + 'A ração que o Vendedor oferece não é mimo: pausa o envelhecimento cruel desta cidade por um ciclo. Quando um parte, entra no Livro de Memórias. A NexGrid ainda não conseguiu recategorizá-los como recurso. Ainda.',
    questHookId: 'tese_zena_rift',
    questHookNote: 'O colapso do Kennel não foi neutro. Zena nega o vínculo. Os arquivos não fecham.',
  },
  {
    id: 'livro1_kael',
    order: 10,
    title: 'IX — Mira sem sangue civil',
    body:
      'Kael foi instrutor das torres NexGrid. Medalha por precisão. Demissão por recusar alvo civil. O estande de Refração é a prova dele: reflexo também é autoridade.\n\n'
      + 'Nas crônicas-semente há um Kael Voss no topo do ranking urbano. Homônimo, parente, ou o tipo de coincidência que a corporação adora não esclarecer.',
    questHookId: 'tese_kael_voss',
    questHookNote: 'Dois nomes. Uma mira. O arquivo recusa o veredito.',
  },
  {
    id: 'livro1_arquiteto',
    order: 11,
    title: 'X — A Sombra do Arquiteto',
    body:
      'No ápice do Quadro do Mercenário, uma IA anônima oferece reiniciar a cidade: apagar dívidas — ou salvar o sistema. Os arquivos a chamam de Sombra do Arquiteto.\n\n'
      + 'Em Altercadia, “o servidor falando de si mesmo” não é metáfora barata. É teologia urbana. Este tomo para aqui. O resto, se existir, ainda não me foi dado a ler.',
    questHookId: 'tese_arquiteto',
    questHookNote: 'O gancho está selado. Quando o submundo chegar lá, o contrato muda de dono.',
  },
];

export function createEmptyCaelChronicleProgress(): CaelChronicleProgress {
  return EMPTY_CAEL_CHRONICLE_PROGRESS;
}

export function getCaelChronicleChapter(id: string): CaelChronicleChapter | undefined {
  return CAEL_CHRONICLE_CHAPTERS.find((chapter) => chapter.id === id);
}

export function listUnlockedCaelChapters(
  progress: CaelChronicleProgress,
): readonly CaelChronicleChapter[] {
  const ids = new Set(sanitizeCaelChronicleProgress(progress).unlockedChapterIds);
  return CAEL_CHRONICLE_CHAPTERS.filter((chapter) => ids.has(chapter.id));
}

export function getNextLockedCaelChapter(
  progress: CaelChronicleProgress,
): CaelChronicleChapter | null {
  const ids = new Set(sanitizeCaelChronicleProgress(progress).unlockedChapterIds);
  return CAEL_CHRONICLE_CHAPTERS.find((chapter) => !ids.has(chapter.id)) ?? null;
}

export function sanitizeCaelChronicleProgress(raw: unknown): CaelChronicleProgress {
  const record = raw && typeof raw === 'object' ? raw as Partial<CaelChronicleProgress> : {};
  const knownIds = new Set(CAEL_CHRONICLE_CHAPTERS.map((chapter) => chapter.id));
  const incoming = Array.isArray(record.unlockedChapterIds)
    ? record.unlockedChapterIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
    : [];
  const incomingSet = new Set(incoming);

  const sequential: string[] = [];
  for (const chapter of CAEL_CHRONICLE_CHAPTERS) {
    if (!incomingSet.has(chapter.id)) break;
    sequential.push(chapter.id);
  }

  const sequentialSet = new Set(sequential);
  const hooksFromChapters = CAEL_CHRONICLE_CHAPTERS
    .filter((chapter) => sequentialSet.has(chapter.id) && chapter.questHookId)
    .map((chapter) => chapter.questHookId as string);

  const extraHooks = Array.isArray(record.unlockedQuestHookIds)
    ? record.unlockedQuestHookIds.filter(
      (id): id is string => typeof id === 'string' && hooksFromChapters.includes(id),
    )
    : [];

  return {
    unlockedChapterIds: sequential,
    unlockedQuestHookIds: [...new Set([...hooksFromChapters, ...extraHooks])],
  };
}

export function hearNextCaelChronicle(progress: CaelChronicleProgress): HearCaelChronicleResult {
  const sanitized = sanitizeCaelChronicleProgress(progress);
  const next = getNextLockedCaelChapter(sanitized);
  if (!next) {
    return {
      ok: false,
      code: 'TOME_COMPLETE',
      progress: sanitized,
      message: 'O tomo que o Cael guarda, por ora, já foi lido.',
    };
  }

  const unlockedChapterIds = [...sanitized.unlockedChapterIds, next.id];
  const unlockedQuestHookIds = next.questHookId
    ? [...new Set([...sanitized.unlockedQuestHookIds, next.questHookId])]
    : sanitized.unlockedQuestHookIds;

  return {
    ok: true,
    chapter: next,
    progress: { unlockedChapterIds, unlockedQuestHookIds },
  };
}
