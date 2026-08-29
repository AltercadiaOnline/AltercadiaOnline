import {
  EMPTY_MERCENARY_QUEST_PROGRESS,
  type MercenaryQuestBand,
  type MercenaryQuestBoardRow,
  type MercenaryQuestDefinition,
  type MercenaryQuestProgress,
} from './mercenaryQuestTypes.js';

/**
 * 3 faixas × 5 contratos (cronograma de design).
 * Unlock: tier 1 sempre; próximo tier só após completar as 5 do anterior.
 * Texto da HUD já reflete o design; passos no mundo ainda não.
 */
export const MERCENARY_QUEST_BANDS: readonly MercenaryQuestBand[] = [
  {
    tier: 1,
    minLevel: 1,
    maxLevel: 10,
    title: 'Despertar no Submundo',
    brief:
      'Primeiros contratos: terminal, contact, drone, totens e um carreto no subsolo.',
  },
  {
    tier: 2,
    minLevel: 11,
    maxLevel: 20,
    title: 'Operações no Asfalto',
    brief:
      'Recibos Vórtex, nós clandestinos, doca, relógio de ouro e carga viva.',
  },
  {
    tier: 3,
    minLevel: 21,
    maxLevel: 30,
    title: 'Infiltração Profunda',
    brief:
      'Terminais de beco, relay, porto, cofre do gerente e o servidor da fachada.',
  },
];

const QUESTS: readonly MercenaryQuestDefinition[] = [
  {
    id: 'quest_01',
    title: 'Sinal Fantasma na Linha 4',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Operário da Linha 4',
    loreSummary:
      'Operário com implante travado após vazamento da diretoria. Escondido na estação de metrô desativada.',
    lore:
      'Um operário ficou com o implante travado depois de um vazamento da diretoria. Escondeu-se na estação de metrô desativada da Linha 4. O Quadro pede o código de desbloqueio extraído do terminal — o homem é opcional; o sinal é o que importa.',
    interaction:
      'Aceita no Quadro → localiza o terminal da estação → extrai o código de desbloqueio → entrega no Quadro.',
    interactionType: 'SCAN_TERMINAL',
    moralChoice: false,
    rewardExp: 150,
    rewardVolts: 80,
    rewardBonds: { reputation: 10, item: 'codigo_desbloqueio' },
  },
  {
    id: 'quest_02',
    title: 'O Contrabandista de Cripto-Chaves',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Contrabandista de hardware',
    loreSummary:
      'Traficante de hardware pego por capangas. Carrega as chaves-mestre dos distritos.',
    lore:
      'Um traficante de hardware foi pego por capangas num beco. Ele carrega chaves-mestre dos distritos. O contrato é resgate: chegar, tirar o contact e voltar com a chave.',
    interaction:
      'Beco → resgata o contact → chave_mestre no inventário → entrega no Quadro.',
    interactionType: 'RESCUE_CONTACT',
    moralChoice: false,
    rewardExp: 170,
    rewardVolts: 90,
    rewardBonds: { reputation: 8, item: 'chave_mestre' },
  },
  {
    id: 'quest_03',
    title: 'A Varredura no Telhado',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Quadro de Agente',
    loreSummary:
      'Drone corporativo caiu no telhado com o mapa de patrulha ainda no casco.',
    lore:
      'Um drone corporativo caiu no telhado industrial. No destroço fumegante está o mapa de patrulha. Sem NPC: sobe, pega, entrega.',
    interaction:
      'Sobe ao telhado → destroços do drone → mapa_patrulha → entrega no Quadro.',
    interactionType: 'RETRIEVE_DRONE',
    moralChoice: false,
    rewardExp: 190,
    rewardVolts: 100,
    rewardBonds: { reputation: 9, item: 'mapa_patrulha' },
  },
  {
    id: 'quest_04',
    title: 'Limpeza de Cache no Distrito Comercial',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Resistência Static',
    loreSummary:
      'Totens de propaganda na praça espalham lavagem cerebral. A resistência quer o vírus nos três.',
    lore:
      'Totens holográficos no distrito comercial espalham lavagem cerebral. A resistência Static quer um vírus injetado nos três terminais da praça, em sequência, até o cache cair.',
    interaction:
      'Três terminais na praça (sequência) → todos limpos → entrega no Quadro.',
    interactionType: 'INJECT_VIRUS',
    moralChoice: false,
    rewardExp: 210,
    rewardVolts: 110,
    rewardBonds: { reputation: 11 },
  },
  {
    id: 'quest_05',
    title: 'O Último Carreto do Subsolo',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Quadro de Agente',
    loreSummary:
      'Baterias de alta densidade apreendidas na alfândega. Essenciais aos esconderijos.',
    lore:
      'A alfândega apreendeu baterias de alta densidade. Os esconderijos do submundo precisam delas. Zona demarcada, contêiner, carreto — sem combate obrigatório.',
    interaction:
      'Zona da alfândega → contêiner → baterias_alta_densidade → entrega no Quadro.',
    interactionType: 'STEAL_BATTERIES',
    moralChoice: false,
    rewardExp: 240,
    rewardVolts: 120,
    rewardBonds: { reputation: 12, item: 'baterias_alta_densidade' },
  },
  {
    id: 'quest_06',
    title: 'O Recibo Queima-Mão',
    minLevel: 11,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Comerciante extorquido',
    loreSummary:
      'Burocrata Vórtex extorquia um comerciante. O recibo ficou num terminal abandonado na calçada.',
    lore:
      'Um burocrata Vórtex extorquia um comerciante. O recibo de extorsão ainda pinga num quiosque murado, telas quebradas, na calçada. Scan, pega, entrega.',
    interaction:
      'Quiosque na calçada → extrai recibo_extorsao → entrega no Quadro.',
    interactionType: 'SCAN_TERMINAL',
    moralChoice: false,
    rewardExp: 420,
    rewardVolts: 200,
    rewardBonds: { reputation: 16, item: 'recibo_extorsao' },
  },
  {
    id: 'quest_07',
    title: 'O Servidor Fantasma do Distrito 4',
    minLevel: 11,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Rede Static',
    loreSummary:
      'Nó clandestino Vórtex numa fachada abandonada processa dados financeiros.',
    lore:
      'Atrás de uma vitrine empoeirada, um gabinete industrial ainda processa dados financeiros Vórtex. O contrato pede desligar o nó na ordem certa dos cabos e sair com o módulo de memória.',
    interaction:
      'Painel lateral → sequência de cores nos cabos → modulo_memoria → entrega no Quadro.',
    interactionType: 'DISCONNECT_CABLES',
    moralChoice: false,
    rewardExp: 460,
    rewardVolts: 220,
    rewardBonds: { reputation: 18, item: 'modulo_memoria' },
  },
  {
    id: 'quest_08',
    title: 'O Terminal da Docagem Clandestina',
    minLevel: 11,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Rede Static',
    loreSummary:
      'Vórtex desova refugo tóxico na doca. Static quer o manifesto das cargas.',
    lore:
      'Na plataforma da docagem clandestina, guindastes e contêineres, a Vórtex desova refugo tóxico. Static quer o manifesto. Sintoniza a frequência do terminal da doca e extrai o arquivo.',
    interaction:
      'Doca → sintoniza a frequência → manifesto_cargas → entrega no Quadro.',
    interactionType: 'TUNE_FREQUENCY',
    moralChoice: false,
    rewardExp: 500,
    rewardVolts: 240,
    rewardBonds: { reputation: 20, item: 'manifesto_cargas' },
  },
  {
    id: 'quest_09',
    title: 'O Relógio de Ouro de Alguém Importante',
    minLevel: 11,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Receptador',
    loreSummary:
      'Relógio de executivo Vórtex — chaves criptografadas — parado com um receptador.',
    lore:
      'Um receptador segura o relógio de ouro de um executivo Vórtex. Dentro do mecanismo, chaves criptografadas. Mesa improvisada num beco: busca o contact, pega o relógio, volta ao Quadro.',
    interaction:
      'Ponto no mapa → receptador → relogio_ouro → entrega no Quadro.',
    interactionType: 'FETCH_WATCH',
    moralChoice: false,
    rewardExp: 540,
    rewardVolts: 260,
    rewardBonds: { reputation: 22, item: 'relogio_ouro' },
  },
  {
    id: 'quest_10',
    title: 'Carga Jurássica',
    minLevel: 11,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Rede Static',
    loreSummary:
      'Carga viva experimental num caminhão corporativo. Static quer a amostra genética.',
    lore:
      'Um veículo corporativo carrega carga viva experimental — luzes vermelhas, marcas de garras. Static quer a amostra genética. Extração com janela curta de resposta; depois, o Quadro.',
    interaction:
      'Caminhão corporativo → extrai amostra_biologica → entrega no Quadro.',
    interactionType: 'EXTRACT_SAMPLE',
    moralChoice: false,
    rewardExp: 580,
    rewardVolts: 280,
    rewardBonds: { reputation: 24, item: 'amostra_biologica' },
  },
  {
    id: 'quest_11',
    title: 'O Recibo Queima-Mão (Variante de Distrito)',
    minLevel: 21,
    maxLevel: 30,
    tier: 3,
    npcGiver: 'Rede Static',
    loreSummary:
      'Docs ilícitos Vórtex num terminal de autoatendimento em beco movimentado.',
    lore:
      'Variante de distrito do recibo queima-mão: documentos sigilosos Vórtex num terminal blindado na fachada de um beco movimentado. Localiza, extrai, entrega.',
    interaction:
      'Terminal de autoatendimento → documentos_sigilosos → entrega no Quadro.',
    interactionType: 'LOCATE_TERMINAL',
    moralChoice: false,
    rewardExp: 1100,
    rewardVolts: 400,
    rewardBonds: { reputation: 36, item: 'documentos_sigilosos' },
  },
  {
    id: 'quest_12',
    title: 'O Servidor Fantasma (Variante Avançada)',
    minLevel: 21,
    maxLevel: 30,
    tier: 3,
    npcGiver: 'Rede Static',
    loreSummary:
      'Nó secundário transmite vigilância civil de um armazém desativado.',
    lore:
      'Num armazém escuro, servidores azuis ainda transmitem vigilância civil. Variante avançada do servidor fantasma: desliga o nó na ordem dos relés e sai com a unidade transmissora.',
    interaction:
      'Painel do armazém → ordem dos relés → unidade_transmissora → entrega no Quadro.',
    interactionType: 'DISABLE_NODE',
    moralChoice: false,
    rewardExp: 1250,
    rewardVolts: 450,
    rewardBonds: { reputation: 40, item: 'unidade_transmissora' },
  },
  {
    id: 'quest_13',
    title: 'O Terminal da Docagem (Variante de Baía)',
    minLevel: 21,
    maxLevel: 30,
    tier: 3,
    npcGiver: 'Rede Static',
    loreSummary:
      'Rotas das barcaças de lixo tóxico no console portuário da baía.',
    lore:
      'Variante de baía da docagem: no cais úmido, o console portuário guarda as rotas das barcaças de lixo tóxico. Sintoniza o canal e extrai os registros de rota.',
    interaction:
      'Porto → sintoniza o canal → registros_rota → entrega no Quadro.',
    interactionType: 'ACCESS_PORT_TERMINAL',
    moralChoice: false,
    rewardExp: 1400,
    rewardVolts: 500,
    rewardBonds: { reputation: 44, item: 'registros_rota' },
  },
  {
    id: 'quest_14',
    title: 'O Cofre do Gerente Intermediário',
    minLevel: 21,
    maxLevel: 30,
    tier: 3,
    npcGiver: 'Quadro de Agente',
    loreSummary:
      'Gerente fugiu. Cofre analógico com chaves de contas secundárias.',
    lore:
      'O gerente intermediário fugiu e deixou um cofre de parede num escritório revirado. Combinação analógica — pistas no cenário. Dentro, o pendrive com chaves de contas secundárias.',
    interaction:
      'Escritório → quebra a combinação do cofre → pendrive_chaves → entrega no Quadro.',
    interactionType: 'CRACK_SAFE',
    moralChoice: false,
    rewardExp: 1600,
    rewardVolts: 550,
    rewardBonds: { reputation: 60, item: 'pendrive_chaves' },
  },
  {
    id: 'quest_15',
    title: 'O Servidor Central da Fachada',
    minLevel: 21,
    maxLevel: 30,
    tier: 3,
    npcGiver: 'Rede Static',
    loreSummary:
      'Relay central do distrito nos fundos de uma galeria fechada. Static quer o núcleo.',
    lore:
      'Nos fundos de uma galeria fechada, transformadores e um painel de fusíveis alimentam o relay central do distrito. Fecha o circuito, arranca o núcleo de processamento, entrega à Static pelo Quadro.',
    interaction:
      'Painel de fusíveis → fecha o circuito → nucleo_processamento → entrega no Quadro.',
    interactionType: 'RESTORE_POWER',
    moralChoice: false,
    rewardExp: 1800,
    rewardVolts: 600,
    rewardBonds: { reputation: 68, item: 'nucleo_processamento' },
  },
];

const BY_ID = new Map(QUESTS.map((quest) => [quest.id, quest]));

export const MERCENARY_QUEST_COUNT = QUESTS.length;

export function getAllMercenaryQuests(): readonly MercenaryQuestDefinition[] {
  return QUESTS;
}

export function getMercenaryQuestById(questId: string): MercenaryQuestDefinition | null {
  return BY_ID.get(questId) ?? null;
}

export function getMercenaryQuestBand(tier: MercenaryQuestDefinition['tier']): MercenaryQuestBand {
  return MERCENARY_QUEST_BANDS.find((band) => band.tier === tier) ?? MERCENARY_QUEST_BANDS[0]!;
}

export function getMercenaryQuestsByTier(
  tier: MercenaryQuestDefinition['tier'],
  catalog: readonly MercenaryQuestDefinition[] = QUESTS,
): readonly MercenaryQuestDefinition[] {
  return catalog.filter((quest) => quest.tier === tier);
}

export function isMercenaryTierComplete(
  tier: MercenaryQuestDefinition['tier'],
  progress: MercenaryQuestProgress,
  catalog: readonly MercenaryQuestDefinition[] = QUESTS,
): boolean {
  const inTier = getMercenaryQuestsByTier(tier, catalog);
  if (inTier.length === 0) return false;
  const completed = new Set(progress.completedQuestIds);
  return inTier.every((quest) => completed.has(quest.id));
}

/** Maior tier liberado: 1 sempre; N+1 só se as 5 do N estão concluídas. */
export function resolveHighestUnlockedMercenaryTier(
  progress: MercenaryQuestProgress,
  catalog: readonly MercenaryQuestDefinition[] = QUESTS,
): MercenaryQuestDefinition['tier'] {
  let unlocked: MercenaryQuestDefinition['tier'] = 1;
  for (const band of MERCENARY_QUEST_BANDS) {
    if (band.tier === 1) continue;
    const previous = (band.tier - 1) as MercenaryQuestDefinition['tier'];
    if (!isMercenaryTierComplete(previous, progress, catalog)) break;
    unlocked = band.tier;
  }
  return unlocked;
}

export function isMercenaryQuestUnlocked(
  quest: MercenaryQuestDefinition,
  progress: MercenaryQuestProgress,
  catalog: readonly MercenaryQuestDefinition[] = QUESTS,
): boolean {
  return quest.tier <= resolveHighestUnlockedMercenaryTier(progress, catalog);
}

/** Quadro disponível = contratos do maior unlock (e tiers anteriores, se pedido). */
export function getAvailableMercenaryQuests(
  progress: MercenaryQuestProgress = EMPTY_MERCENARY_QUEST_PROGRESS,
  catalog: readonly MercenaryQuestDefinition[] = QUESTS,
): readonly MercenaryQuestDefinition[] {
  const unlocked = resolveHighestUnlockedMercenaryTier(progress, catalog);
  return catalog.filter((quest) => quest.tier <= unlocked);
}

/** Flavor de nível no card — não libera unlock. */
export function isMercenaryQuestInLevelBand(
  quest: MercenaryQuestDefinition,
  playerLevel: number,
): boolean {
  const level = Math.max(1, Math.floor(playerLevel));
  return level >= quest.minLevel && level <= quest.maxLevel;
}

export function buildMercenaryQuestBoard(
  progress: MercenaryQuestProgress = EMPTY_MERCENARY_QUEST_PROGRESS,
  options: { readonly tier?: MercenaryQuestDefinition['tier'] } = {},
): readonly MercenaryQuestBoardRow[] {
  const completed = new Set(progress.completedQuestIds);
  const unlocked = resolveHighestUnlockedMercenaryTier(progress);
  const pool = options.tier != null
    ? getMercenaryQuestsByTier(options.tier)
    : getAvailableMercenaryQuests(progress);
  return pool.map((quest) => {
    let status: MercenaryQuestBoardRow['status'] = 'available';
    if (completed.has(quest.id)) status = 'completed';
    else if (progress.activeQuestId === quest.id) status = 'active';
    else if (quest.tier > unlocked) status = 'available';
    return { ...quest, status };
  });
}

/** Primeiro tier desbloqueado ainda incompleto; se todos ok, o maior unlock. */
export function resolveDefaultMercenaryViewTier(
  progress: MercenaryQuestProgress,
): MercenaryQuestDefinition['tier'] {
  const unlocked = resolveHighestUnlockedMercenaryTier(progress);
  for (const band of MERCENARY_QUEST_BANDS) {
    if (band.tier > unlocked) break;
    if (!isMercenaryTierComplete(band.tier, progress)) return band.tier;
  }
  return unlocked;
}
