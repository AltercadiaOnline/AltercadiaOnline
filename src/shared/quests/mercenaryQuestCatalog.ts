import {
  EMPTY_MERCENARY_QUEST_PROGRESS,
  type MercenaryQuestBand,
  type MercenaryQuestBoardRow,
  type MercenaryQuestDefinition,
  type MercenaryQuestProgress,
} from './mercenaryQuestTypes.js';

export const MERCENARY_QUEST_BANDS: readonly MercenaryQuestBand[] = [
  {
    tier: 1,
    minLevel: 1,
    maxLevel: 10,
    title: 'Iniciação no Submundo',
    brief:
      'Missões urbanas de nível de rua, focadas em favores a comerciantes corruptos, pequenas investigações de vizinhança e favores sujos.',
  },
  {
    tier: 2,
    minLevel: 10,
    maxLevel: 20,
    title: 'Investigações e Conspirações Locais',
    brief:
      'Missões que exigem infiltração sutil, manipulação de informações e segredos mais profundos de figuras públicas da cidade.',
  },
  {
    tier: 3,
    minLevel: 20,
    maxLevel: 50,
    title: 'Espionagem Urbana e Dilemas Morais',
    brief:
      'O escopo cresce. Aqui as missões envolvem corporações menores, chantagens industriais e escolhas de impacto permanente.',
  },
  {
    tier: 4,
    minLevel: 50,
    maxLevel: 70,
    title: 'Alta Sobrevivência e Segredos de Estado',
    brief:
      'Missões de alto risco, envolvendo o topo da pirâmide de corrupção da cidade e resgates sob tensão.',
  },
  {
    tier: 5,
    minLevel: 70,
    maxLevel: 100,
    title: 'O Legado do Asfalto',
    brief:
      'O ápice do jogo. Missões de nível máximo que definem o destino de figuras centrais e marcam o nome do player na história do mundo.',
  },
];

const QUESTS: readonly MercenaryQuestDefinition[] = [
  {
    id: 'quest_01',
    title: 'O Café Mais Amargo da Zona Leste',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Dono de cafeteria local',
    loreSummary: 'Inspetores sanitários corruptos extorquem a cafeteria. Recupere os recibos de propina.',
    lore:
      'O comerciante está sendo extorquido por inspetores sanitários corruptos. Ele pede que você investigue o armazém dos inspetores para recuperar recibos de propina.',
    interaction:
      'Em vez de só invadir, você pode subornar um funcionário menor ou invadir furtivamente à noite usando pistas do ambiente para achar o cofre.',
    interactionType: 'investigation_bribe',
    moralChoice: true,
    rewardExp: 150,
    rewardBonds: { reputation: 10, item: 'recibo_propina' },
  },
  {
    id: 'quest_02',
    title: 'Silêncio no Beco',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Uma informante de rua acuada',
    loreSummary: 'Um mendigo ouviu demais sobre uma carga roubada e sumiu. Rastreie os rastros na rua.',
    lore:
      'Um mendigo ouviu segredos demais sobre uma carga roubada e sumiu. Você precisa rastrear os rastros dele pela cidade conversando com outros NPCs de rua (usando itens de troca/comida).',
    interaction:
      'Coleta de pistas conversando com NPCs específicos e entrega de um item de troca para destravar a localização do refúgio.',
    interactionType: 'investigation_npc_trade',
    moralChoice: false,
    rewardExp: 170,
    rewardBonds: { reputation: 8 },
  },
  {
    id: 'quest_03',
    title: 'A Chave Perdida do Contrabandista',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Um receptador de peças antigas',
    loreSummary: 'Chave mestra digital caiu na fuga. O rival deixou marca de spray com o paradeiro.',
    lore:
      'O receptador perdeu uma chave mestra digital na calçada durante uma fuga rápida da polícia local. Ele desconfia que um entregador rival pegou.',
    interaction:
      'Investigação em mini-ponto de pichação (spray) onde o rival deixou uma marca codificada revelando seu paradeiro.',
    interactionType: 'investigation_spray',
    moralChoice: false,
    rewardExp: 190,
    rewardBonds: { reputation: 9 },
  },
  {
    id: 'quest_04',
    title: 'Dívida de Jogo no Subsolo',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Agiota de bar noturno',
    loreSummary: 'Relógio de família dado como garantia pode ser falso. Confira antes da cobrança.',
    lore:
      'Um apostador caloteiro fugiu deixando um relógio de família como garantia. O agiota quer que você descubra se o relógio é falso antes de mandar cobrá-lo na base da violência.',
    interaction:
      'Teste de inspeção de item / diálogo com o avaliador de penhores da cidade para checar a procedência.',
    interactionType: 'item_inspection',
    moralChoice: true,
    rewardExp: 210,
    rewardBonds: { reputation: 11 },
  },
  {
    id: 'quest_05',
    title: 'O Chamado do Asfalto Noturno',
    minLevel: 1,
    maxLevel: 10,
    tier: 1,
    npcGiver: 'Faxineiro municipal corrupto',
    loreSummary: 'Diário com senhas de depósito no lixo corporativo. Escolte o leilão — ou traia o trato.',
    lore:
      'O faxineiro encontrou um diário perdido em uma lixeira corporativa com senhas de acesso a um depósito abandonado. Ele quer leiloar para o melhor ofertante, mas precisa de proteção para o negócio.',
    interaction:
      'Escolta de curta distância com escolha moral: entregar ao faxineiro, roubar o diário para si ou entregar para a polícia local por uma recompensa menor.',
    interactionType: 'escort_moral',
    moralChoice: true,
    rewardExp: 240,
    rewardBonds: { reputation: 12 },
  },
  {
    id: 'quest_06',
    title: 'Contrabando na Drogaria do Bairro',
    minLevel: 10,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Farmacêutico clandestino',
    loreSummary: 'Tarja preta some do estoque. A assistente parece culpada — o dono talvez não.',
    lore:
      'Remédios controlados de tarja preta estão sumindo do estoque. O farmacêutico suspeita de sua própria assistente, mas ela guarda segredos perigosos sobre ele.',
    interaction:
      'Investigação de gavetas e diários trancados; diálogo ramificado onde você descobre que o verdadeiro culpado é o próprio farmacêutico desviando para pagar dívidas.',
    interactionType: 'investigation_branch',
    moralChoice: true,
    rewardExp: 420,
    rewardBonds: { reputation: 16 },
  },
  {
    id: 'quest_07',
    title: 'O Segredo do Político Menor',
    minLevel: 10,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Jornalista independente de fofocas',
    loreSummary: 'Vereador desvia saneamento para um clube. Entre como entregador e tire as fotos.',
    lore:
      'Um vereador local está desviando verbas de saneamento para construir um clube particular. O jornalista quer fotos e provas documentais.',
    interaction:
      'Infiltração em horário comercial fingindo ser entregador para fotografar documentos na mesa do alvo sem disparar alarme.',
    interactionType: 'infiltration',
    moralChoice: false,
    rewardExp: 460,
    rewardBonds: { reputation: 18 },
  },
  {
    id: 'quest_08',
    title: 'A Última Mensagem no Muro',
    minLevel: 10,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Um graffiteiro veterano do submundo',
    loreSummary: 'Parceiro sumiu após pixar símbolo proibido. Decodifique a rota nos sprays.',
    lore:
      'O parceiro do artista sumiu após pixar um símbolo proibido em uma zona restrita da cidade. Ele pede que você descubra o que aconteceu decodificando as mensagens deixadas nos sprays pela cidade.',
    interaction:
      'Uso interativo da mecânica de spray/legado para rastrear a rota que o desaparecido fez pelas paredes do distrito industrial.',
    interactionType: 'spray_trail',
    moralChoice: false,
    rewardExp: 500,
    rewardBonds: { reputation: 20 },
  },
  {
    id: 'quest_09',
    title: 'O Relógio de Ouro de Alguém Importante',
    minLevel: 10,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Agiota de colarinho branco',
    loreSummary: 'Relógio de figurão da prefeitura em motel barato. Pague, ameace ou tome de volta.',
    lore:
      'Recuperar um relógio roubado de um figurão da prefeitura que foi pego em um motel barato por chantagistas locais.',
    interaction:
      'Negociação com os chantagistas: você pode pagar do seu bolso, ameaçá-los ou roubar de volta à força.',
    interactionType: 'negotiation',
    moralChoice: true,
    rewardExp: 540,
    rewardBonds: { reputation: 22 },
  },
  {
    id: 'quest_10',
    title: 'Carga Jurássica',
    minLevel: 10,
    maxLevel: 20,
    tier: 2,
    npcGiver: 'Mecânico de carros velhos da zona sul',
    loreSummary: 'Peças importadas confiscadas na blitz. Suborne o guarda certo no turno certo.',
    lore:
      'Um carregamento de peças automotivas importadas foi confiscado indevidamente em uma blitz corrompida. Ele quer que você suborne o guarda correto na hora certa do turno.',
    interaction:
      'Mecânica de temporizador e suborno em ponto de patrulha policial.',
    interactionType: 'timed_bribe',
    moralChoice: true,
    rewardExp: 580,
    rewardBonds: { reputation: 24 },
  },
  {
    id: 'quest_11',
    title: 'O Dossiê da Água Turva',
    minLevel: 20,
    maxLevel: 50,
    tier: 3,
    npcGiver: 'Engenheiro ambiental demitido',
    loreSummary: 'Estação despeja resíduo por propina. Expor o dossiê ou vender à diretoria.',
    lore:
      'O engenheiro descobriu que a estação de tratamento está despejando resíduos químicos em troca de propina, mas sua família foi ameaçada para ficar em silêncio.',
    interaction:
      'Escolha moral pesada: expor o dossiê publicamente arruinando a vida de inocentes ligados ao esquema ou vender cópia para a diretoria corrupta em troca de uma grana alta.',
    interactionType: 'moral_expose',
    moralChoice: true,
    rewardExp: 1100,
    rewardBonds: { reputation: 36 },
  },
  {
    id: 'quest_12',
    title: 'O Fantasma do Distrito Industrial',
    minLevel: 20,
    maxLevel: 50,
    tier: 3,
    npcGiver: 'Guarda noturno traumatizado',
    loreSummary: 'Fábrica abandonada vazada à noite. Ninguém acredita no guarda. Prove o fantasma.',
    lore:
      'O guarda diz que alguém está invadindo uma fábrica abandonada à noite para extrair dados confidenciais de antigas tecnologias de IA, mas ninguém acredita nele achando que é loucura.',
    interaction:
      'Investigação forense na cena do crime, rastreando pegadas digitais e físicas até descobrir um esconderijo de hackers clandestinos.',
    interactionType: 'forensic_investigation',
    moralChoice: false,
    rewardExp: 1250,
    rewardBonds: { reputation: 40 },
  },
  {
    id: 'quest_13',
    title: 'A Traição do Sócio Invisível',
    minLevel: 20,
    maxLevel: 50,
    tier: 3,
    npcGiver: 'Executivo de uma startup de tecnologia falida',
    loreSummary: 'Sócio fugiu com o código-fonte. Rastreie os bares e decida quem fica com os direitos.',
    lore:
      'O sócio principal fugiu para o submundo com o código-fonte proprietário da empresa antes de declarar falência fraudulenta.',
    interaction:
      'Rastreamento através de contatos de bares noturnos e negociação direta com o fugitivo para decidir quem fica com os direitos da propriedade intelectual.',
    interactionType: 'tracking_negotiate',
    moralChoice: true,
    rewardExp: 1400,
    rewardBonds: { reputation: 44 },
  },
  {
    id: 'quest_14',
    title: 'O Resgate da Testemunha Fantasma',
    minLevel: 50,
    maxLevel: 70,
    tier: 4,
    npcGiver: 'Promotora de justiça secreta',
    loreSummary: 'Testemunha de corrupção será eliminada antes do depoimento. Defenda o cortiço.',
    lore:
      'Uma testemunha-chave em um processo de corrupção sistêmica vai ser eliminada antes de depor na manhã seguinte. Ela está escondida em um cortiço da periferia.',
    interaction:
      'Defesa de base contra ondas de mercenários rivais enquanto gerencia a rota de fuga da testemunha pelos telhados.',
    interactionType: 'base_defense',
    moralChoice: false,
    rewardExp: 2800,
    rewardBonds: { reputation: 60 },
  },
  {
    id: 'quest_15',
    title: 'Arquivos Mortos do Submundo',
    minLevel: 50,
    maxLevel: 70,
    tier: 4,
    npcGiver: 'Líder de um sindicato de informações clandestinas',
    loreSummary: 'Servidor com fichas da elite vai a leilão. Roube o cofre antes de cair em mãos erradas.',
    lore:
      'Um servidor físico contendo fichas criminais de toda a elite intocável da cidade está prestes a ser leiloado. O sindicato quer que você garanta que o servidor seja roubado antes que caia em mãos erradas.',
    interaction:
      'Infiltração tática em um cofre fortemente vigiado com quebra de senhas baseada em pistas coletadas com NPCs anteriores.',
    interactionType: 'vault_infiltrate',
    moralChoice: true,
    rewardExp: 3400,
    rewardBonds: { reputation: 68 },
  },
  {
    id: 'quest_16',
    title: 'A Queda do Comissário',
    minLevel: 50,
    maxLevel: 70,
    tier: 4,
    npcGiver: 'Policial reformado idealista',
    loreSummary: 'O chefe de polícia protege o crime organizado. Áudios nos gabinetes e chantagem no topo.',
    lore:
      'Recolher provas irrefutáveis de que o atual chefe de polícia comanda a maior rede de proteção ao crime organizado da região metropolitana.',
    interaction:
      'Coleta de áudios gravados escondidos em gabinetes de delegacias e chantagem direta ao alto escalão.',
    interactionType: 'evidence_blackmail',
    moralChoice: true,
    rewardExp: 4000,
    rewardBonds: { reputation: 76 },
  },
  {
    id: 'quest_17',
    title: 'O Testamento do Magnata Oculto',
    minLevel: 70,
    maxLevel: 100,
    tier: 5,
    npcGiver: 'O testamenteiro de um bilionário recluso recém-falecido',
    loreSummary: 'Criptoativos em códigos nos monumentos e pixos. Só lê quem decifra o passado do magnata.',
    lore:
      'O magnata deixou uma fortuna em criptoativos espalhada em códigos ocultos por monumentos e pichações icônicas pela cidade inteira, acessível apenas para quem decifrar seu passado sombrio.',
    interaction:
      'Caça ao tesouro urbana de nível máximo cruzando dados de NPCs idosos, túmulos e a rede de sprays de legado espalhados pelo mapa.',
    interactionType: 'urban_treasure',
    moralChoice: false,
    rewardExp: 8500,
    rewardBonds: { reputation: 90 },
  },
  {
    id: 'quest_18',
    title: 'A Sombra do Arquiteto',
    minLevel: 70,
    maxLevel: 100,
    tier: 5,
    npcGiver: 'Uma inteligência artificial anônima que controla nós da cidade',
    loreSummary: 'Reiniciar a cidade apaga dívidas e antecedentes — e derruba o sistema financeiro.',
    lore:
      'Alguém está tentando reiniciar o sistema central da infraestrutura urbana para apagar todos os registros de dívidas e antecedentes da população, causando um colapso financeiro total.',
    interaction:
      'Decisão final de impacto no servidor central: permitir o colapso (libertando os marginalizados) ou salvar o sistema (mantendo o status quo dos ricos).',
    interactionType: 'system_choice',
    moralChoice: true,
    rewardExp: 10000,
    rewardBonds: { reputation: 110 },
  },
  {
    id: 'quest_19',
    title: 'O Legado Eterno de Altercadia',
    minLevel: 70,
    maxLevel: 100,
    tier: 5,
    npcGiver: 'O próprio avatar do jogador do passado (eco narrativo)',
    loreSummary: 'Suas escolhas moldaram o submundo. Acerto de contas com o barão e o legado no asfalto.',
    lore:
      'A missão final do painel de mercenário onde você descobre que todas as suas escolhas anteriores moldaram o estado atual do submundo, culminando em um acerto de contas com o maior barão do crime da cidade.',
    interaction:
      'Confronto narrativo e tático definitivo que consagra o status máximo do player no ranking de agentes e desbloqueia permissões exclusivas de legado no mundo.',
    interactionType: 'narrative_reckoning',
    moralChoice: true,
    rewardExp: 12000,
    rewardBonds: { reputation: 140 },
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

/** Faixa estrita do quadro — o nível do personagem precisa caber em min/max da missão. */
export function getAvailableMercenaryQuests(
  playerLevel: number,
  catalog: readonly MercenaryQuestDefinition[] = QUESTS,
): readonly MercenaryQuestDefinition[] {
  const level = Math.max(1, Math.floor(playerLevel));
  return catalog.filter((quest) => level >= quest.minLevel && level <= quest.maxLevel);
}

export function isMercenaryQuestInLevelBand(
  quest: MercenaryQuestDefinition,
  playerLevel: number,
): boolean {
  const level = Math.max(1, Math.floor(playerLevel));
  return level >= quest.minLevel && level <= quest.maxLevel;
}

export function buildMercenaryQuestBoard(
  playerLevel: number,
  progress: MercenaryQuestProgress = EMPTY_MERCENARY_QUEST_PROGRESS,
): readonly MercenaryQuestBoardRow[] {
  const completed = new Set(progress.completedQuestIds);
  return getAvailableMercenaryQuests(playerLevel).map((quest) => {
    let status: MercenaryQuestBoardRow['status'] = 'available';
    if (completed.has(quest.id)) status = 'completed';
    else if (progress.activeQuestId === quest.id) status = 'active';
    return { ...quest, status };
  });
}
