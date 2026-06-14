/** Categoria exibida no tooltip oficial (Ação e Reação). */
export const MoveTooltipCategory = {
  Preparation: 'Preparação',
  Execution: 'Execução',
  Support: 'Suporte',
} as const;

export type MoveTooltipCategoryId =
  (typeof MoveTooltipCategory)[keyof typeof MoveTooltipCategory];

export type ClassMoveNarrativeTooltip = {
  readonly category: MoveTooltipCategoryId;
  readonly narrative: string;
  readonly technical: string;
  readonly finale: string;
};

/**
 * Tooltip oficial — 4 linhas na UI:
 * - Título: `{Nome} | {Preparação|Execução|Suporte}`
 * - Narrativa: identidade + efeito em linguagem de jogo (sem números)
 * - Técnico: `{base} | {efeitos…} | PP N | Cooldown M.`
 * - Finalização: timing de uso + sinergia do kit (2 frases curtas)
 */
export function buildOfficialTechnicalLine(
  base: string,
  pp: number,
  cooldown: number,
  ...effects: readonly string[]
): string {
  if (effects.length === 0) {
    return `${base} | PP ${pp} | Cooldown ${cooldown}.`;
  }
  return `${base} | ${effects.join(' | ')} | PP ${pp} | Cooldown ${cooldown}.`;
}

/** Regex do sufixo técnico canônico — usado em testes de conformidade. */
export const OFFICIAL_TECHNICAL_SUFFIX_PATTERN = /\| PP \d+ \| Cooldown \d+\.$/;

const IMPETUS_NARRATIVE_TOOLTIPS: Readonly<
  Partial<Record<string, ClassMoveNarrativeTooltip>>
> = {
  IMP_1: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Golpe direto e confiável. Referência de pressão da classe — sem setup.',
    technical: buildOfficialTechnicalLine('Dano base 15', 8, 1),
    finale:
      'Use para manter ritmo entre bursts. Encadeie com Impulso Crescente antes de Lâmina ou Fúria.',
  },
  IMP_2: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Prepara o impulso ofensivo. Eco nos próximos golpes e precisão elevada — sem dano imediato.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      12,
      1,
      'Eco +15% do golpe escolhido (2 turnos; não renova se reusar)',
      '+5% crítico',
    ),
    finale:
      'Ative antes de Golpe Direto ou Lâmina. Cura no turno do eco não gasta carga; reusar Impulso não renova o eco.',
  },
  IMP_3: {
    category: MoveTooltipCategory.Support,
    narrative:
      'Recuperação rápida em si. Sustenta a pressão sem quebrar o ritmo ofensivo.',
    technical: buildOfficialTechnicalLine('Cura base 10', 8, 2),
    finale:
      'Use com HP baixo entre golpes. Poção reativa no mesmo turno combina; cure antes do finisher se ainda for agredir.',
  },
  IMP_4: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Golpe incendiário. Dano imediato e queimadura nos turnos seguintes.',
    technical: buildOfficialTechnicalLine(
      'Dano base 16',
      5,
      2,
      'Queimadura 5% HP/turno (3 turnos)',
    ),
    finale:
      'Aplique cedo para maximizar o DoT. Alterne com Golpe Direto e Impulso entre os ticks de burn.',
  },
  IMP_5: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Impacto em área. Atinge todos os inimigos e deixa impulso ofensivo residual.',
    technical: buildOfficialTechnicalLine(
      'Dano base 14',
      8,
      2,
      'AOE ×0,85 por alvo',
      '+5% ATK (2 turnos)',
    ),
    finale:
      'Priorize em PvE multi-alvo. O buff modesto prepara Golpe Direto ou burst nos turnos seguintes.',
  },
  IMP_6: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Finisher de altíssimo impacto. O recuo atravessa você na mesma hora.',
    technical: buildOfficialTechnicalLine(
      'Dano base 30',
      6,
      3,
      'Autodano 35% do dano causado',
    ),
    finale:
      'Use só quando sobreviver ao recuo. Combina com Fôlego Impulsivo se o HP apertar depois.',
  },
};

const COGITOR_NARRATIVE_TOOLTIPS: Readonly<
  Partial<Record<string, ClassMoveNarrativeTooltip>>
> = {
  COG_1: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Golpe de precisão que explora fraquezas. Quanto mais debuffs no alvo, maior o dano.',
    technical: buildOfficialTechnicalLine(
      'Dano base 18',
      12,
      1,
      '+12% por debuff ativo (máx. 3)',
    ),
    finale:
      'Solte após as Preparações. Cada debuff amplia este finalizador.',
  },
  COG_2: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Sobrecarga mental no alvo. Paralisa o turno dele e enfraquece os buffs inimigos.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      10,
      2,
      'Paralisia 60% (1 turno)',
      'Buffs inimigos −20% (3 turnos)',
    ),
    finale:
      'Aplique antes da Execução Geométrica. Conta como debuff no finalizador.',
  },
  COG_3: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Golpe fraco agora, detonação forte depois. Marca o alvo com ameaça por 2 turnos.',
    technical: buildOfficialTechnicalLine(
      'Dano base 12',
      8,
      3,
      'Detonação ×3 após 2 turnos',
    ),
    finale:
      'Use cedo no combate. Planeje o turno da detonação — não depende dos debuffs da Execução Geométrica.',
  },
  COG_4: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Drena o alvo e debilita o kit dele. Marca permanente que conta como debuff.',
    technical: buildOfficialTechnicalLine(
      'Dano base 8',
      10,
      2,
      '−15% dano e cura inimiga (3 turnos)',
      'Marca debilitamento (permanente; conta como debuff)',
    ),
    finale:
      'Aplique cedo, antes da Execução Geométrica. Enfraquece o kit agora e expõe o alvo ao finalizador.',
  },
  COG_5: {
    category: MoveTooltipCategory.Support,
    narrative:
      'Recalibração causal. Cura imediata e eco de cura nos turnos seguintes.',
    technical: buildOfficialTechnicalLine(
      'Cura base 18',
      8,
      2,
      'Eco +10% da cura base (2 turnos)',
    ),
    finale:
      'Use quando o HP apertar. Cure entre Preparações — não gaste o turno da Execução Geométrica recuperando vida.',
  },
  COG_6: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Trava a lógica inimiga. Bloqueia moves no próximo turno dele e aplica debilitamento.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      6,
      3,
      'Bloqueia 2 moves (1 turno)',
      '−15% dano e cura inimiga (2 turnos)',
      'Conta como debuff',
    ),
    finale:
      'Use antes da Execução Geométrica. Quebra combo e empilha debuff com Dreno Temporal e Sobrecarga Mental.',
  },
};

const TUTATOR_NARRATIVE_TOOLTIPS: Readonly<
  Partial<Record<string, ClassMoveNarrativeTooltip>>
> = {
  TUT_1: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Golpe de retaliação acumulada. Quanto mais dano você levou, mais forte ao soltar.',
    technical: buildOfficialTechnicalLine(
      'Dano base 16',
      12,
      1,
      '+1% ATK a cada 10 de dano recebido (máx. +30%)',
    ),
    finale:
      'Tank hits nos turnos do inimigo e solte no seu turno — zera o acúmulo. Planeje Égide ou Espinhos antes de Retribuição.',
  },
  TUT_2: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Camada elétrica absorvente. Protege o HP e compra tempo para acumular fúria.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      10,
      2,
      'Escudo 20% HP máx. (2 turnos)',
    ),
    finale:
      'Use antes de sequências inimigas. Combina com Casca de Espinhos — dano que passar alimenta Retribuição.',
  },
  TUT_3: {
    category: MoveTooltipCategory.Support,
    narrative:
      'Pulso de cura defensiva. Sustenta si ou aliado em combates prolongados.',
    technical: buildOfficialTechnicalLine(
      'Cura base 18',
      10,
      2,
      'Alvo: Si ou aliado',
    ),
    finale:
      'Fora do loadout padrão — troque quando precisar de sustain. Poção reativa no mesmo turno combina com outro move.',
  },
  TUT_4: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Isola o corpo de debuffs e endurece a pele. Protege o setup enquanto o inimigo pressiona.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      8,
      3,
      'Bloqueia debuffs (2 turnos)',
      '−50% dano recebido (1 turno)',
    ),
    finale:
      'Use contra kits de controle. Combine com Égide antes de janelas perigosas — não substitui escudo de absorção.',
  },
  TUT_5: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Espinhos voltados ao agressor. Devolve metade do dano e converte impacto em pressão ofensiva.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      8,
      2,
      'Prioridade 3',
      'Reflete 50% dano (2 turnos)',
      '+15% ATK (2 turnos) por reflect',
    ),
    finale:
      'Ative antes do inimigo bater. Cada hit devolvido buffa ATK — encadeie com Retribuição ou Surto Tectônico.',
  },
  TUT_6: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Golpe tectônico fissurante. Impacto imediato e desgaste de HP nos turnos seguintes.',
    technical: buildOfficialTechnicalLine(
      'Dano base 20',
      8,
      2,
      'Queimadura 4% HP/turno (3 turnos)',
    ),
    finale:
      'Pressão ofensiva da classe. Use cedo e alterne com Retribuição quando a fúria estiver carregada.',
  },
};

const DISSOLUTUS_NARRATIVE_TOOLTIPS: Readonly<
  Partial<Record<string, ClassMoveNarrativeTooltip>>
> = {
  DIS_1: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Corte dimensional contra defesas. Ignora barreiras e golpeia o HP por trás do escudo.',
    technical: buildOfficialTechnicalLine(
      'Dano base 20',
      8,
      2,
      'Ignora 100% escudo/barreira',
    ),
    finale:
      'Use contra tanques e setups defensivos. Referência de burst — combina com Distorção antes do finisher.',
  },
  DIS_2: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Paradoxo defensivo no alvo. Corta a força dos próximos ataques inimigos.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      8,
      2,
      'Debuff −30% dano inimigo (3 turnos)',
    ),
    finale:
      'Aplique antes da sequência ofensiva dele. Conta como debuff — combina com Dobra Temporal e Distorção Cognitiva.',
  },
  DIS_3: {
    category: MoveTooltipCategory.Execution,
    narrative:
      'Dobra o tempo por um instante. Golpe reativo que tende a agir antes de moves lentos.',
    technical: buildOfficialTechnicalLine(
      'Dano base 14',
      12,
      3,
      'Prioridade 3',
    ),
    finale:
      'No loadout padrão como interruptor. Use quando precisar bater antes do move prio 1 do inimigo.',
  },
  DIS_4: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Copia a última skill do alvo. Devolve o golpe enfraquecido e desestabiliza o kit dele.',
    technical: buildOfficialTechnicalLine(
      'Dano base 0',
      8,
      2,
      'Copia último move inimigo (90% poder)',
      '−15% eficácia inimiga (2 turnos)',
    ),
    finale:
      'Use depois que o inimigo revelar o golpe. Sem último move registrado, só aplica o debilitamento.',
  },
  DIS_5: {
    category: MoveTooltipCategory.Preparation,
    narrative:
      'Distorce a percepção do alvo. Chip imediato, chance de falhar e desgaste enquanto confuso.',
    technical: buildOfficialTechnicalLine(
      'Dano base 10',
      8,
      2,
      'Confusão 45% falha de turno',
      'Dano residual 10% HP máx./turno (2 turnos)',
    ),
    finale:
      'Aplique cedo em alvos agressivos. Encadeie com Ruptura Dimensional enquanto ele erra movimentos.',
  },
  DIS_6: {
    category: MoveTooltipCategory.Support,
    narrative:
      'Cura instável em si. Recuperação modesta com chance de surto quântico extra.',
    technical: buildOfficialTechnicalLine(
      'Cura base 16',
      10,
      2,
      '30% chance de +40% cura extra',
    ),
    finale:
      'Cura canônica fora do loadout padrão. Use quando o HP apertar entre distorções e rupturas.',
  },
};

const NARRATIVE_BY_MOVE_ID: Readonly<
  Partial<Record<string, ClassMoveNarrativeTooltip>>
> = {
  ...IMPETUS_NARRATIVE_TOOLTIPS,
  ...COGITOR_NARRATIVE_TOOLTIPS,
  ...TUTATOR_NARRATIVE_TOOLTIPS,
  ...DISSOLUTUS_NARRATIVE_TOOLTIPS,
};

export const OFFICIAL_CLASS_MOVE_NARRATIVE_IDS = Object.freeze(
  Object.keys(NARRATIVE_BY_MOVE_ID).sort(),
);

export function resolveClassMoveNarrativeTooltip(
  moveId: string,
): ClassMoveNarrativeTooltip | null {
  return NARRATIVE_BY_MOVE_ID[moveId] ?? null;
}

export function formatClassMoveNarrativeTitle(
  moveName: string,
  tooltip: ClassMoveNarrativeTooltip,
): string {
  return `${moveName} | ${tooltip.category}`;
}

export function buildClassMoveNarrativeTooltipLines(
  tooltip: ClassMoveNarrativeTooltip,
): readonly string[] {
  return [
    `Narrativa: ${tooltip.narrative}`,
    `Técnico: ${tooltip.technical}`,
    `Finalização: ${tooltip.finale}`,
  ];
}

export function isOfficialClassMoveNarrativeTooltip(
  tooltip: ClassMoveNarrativeTooltip,
): boolean {
  if (!OFFICIAL_TECHNICAL_SUFFIX_PATTERN.test(tooltip.technical)) {
    return false;
  }
  const lines = buildClassMoveNarrativeTooltipLines(tooltip);
  return (
    lines.length === 3
    && lines.every((line) => line.length > 12)
    && lines[0]!.startsWith('Narrativa: ')
    && lines[1]!.startsWith('Técnico: ')
    && lines[2]!.startsWith('Finalização: ')
  );
}
