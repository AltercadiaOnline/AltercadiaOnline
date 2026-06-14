/**
 * Lore canônica dos NPCs de Cidade 01 — Altercadia.
 * Diálogos curtos (greeting) alimentam o registry; biography/motivation para crônicas e UI futura.
 */

export type NpcLoreProfile = {
  readonly npcId: string;
  readonly displayName: string;
  /** Título ou apelido urbano — ex.: "o Registrador de Crônicas". */
  readonly epithet: string;
  /** Função mecânica resumida em linguagem diegética. */
  readonly role: string;
  /** Bairro ou edifício onde o personagem atua. */
  readonly district: string;
  /** Linha exibida no card de interação e no painel de diálogo. */
  readonly greeting: string;
  /** Parágrafos de biografia — terminal do Cael, codex, crônicas. */
  readonly biography: readonly string[];
  /** O que o NPC quer do jogador / da cidade. */
  readonly motivation: string;
  /** Boato local opcional — feed de lore dinâmico. */
  readonly rumor?: string;
};

const ARENA_PULPIT_LORE_BASE: Omit<NpcLoreProfile, 'npcId' | 'greeting'> = {
  displayName: 'Registrador de Apostas',
  epithet: 'voz do palco',
  role: 'Recebe apostas nos torneios da arena e valida registros de duelo.',
  district: 'Arena Central — Púlpitos frontais',
  biography: [
    'Funcionários da NexGrid operam os púlpitos como terminais vivos: cada aposta gera um hash de intenção enviado ao servidor da arena antes do combate começar.',
    'Dizem que quem aposta no púlpito central enxerga o futuro do duelo por uma fração de segundo — efeito colateral das lentes de refração instaladas no telhado.',
    'Ninguém sabe o nome deles. Só importa o lado do palco em que você está.',
  ],
  motivation: 'Manter o fluxo de VOLTS circulando e a arena sempre cheia de espectadores.',
  rumor: 'Apostas feitas no púlpito oeste pagam melhor quando chove — ninguém explica por quê.',
};

const NPC_LORE_PROFILES: readonly NpcLoreProfile[] = [
  {
    npcId: 'anciao_cael',
    displayName: 'Ancião Cael',
    epithet: 'o Registrador de Crônicas',
    role: 'Curador da cidade, cura de expedientes e fornecedor de ração dimensional para pets.',
    district: 'Arena Central — anel de espectadores',
    greeting:
      'Bem-vindo a Altercadia, viajante. A cidade respira em VOLTS e memórias — deixe-me ver o que mudou desde a tua última passagem.',
    biography: [
      'Cael chegou antes da primeira torre NexGrid ser erguida. Dizem que ele leu o contrato original da cidade — o documento que define quem pode alterar o chão de combate e quem apenas o atravessa.',
      'Hoje observa a arena do anel superior, registrando feitos, ausências e retornos. Suas crônicas não são poesia: são logs narrados do que o servidor autorizou acontecer enquanto você estava offline.',
      'Vende ração especial para companheiros dimensionais — não é comida comum, mas carga de estabilização comprimida, forjada para pausar o envelhecimento biológico dos pets por um ciclo.',
    ],
    motivation:
      'Evitar que novatos morram na primeira expedição e que a memória coletiva de Altercadia se perca entre patches e reinícios.',
    rumor: 'Quem ouve suas crônicas na primeira volta do dia recebe cura com desconto — superstição, ou política não documentada?',
  },
  {
    npcId: 'mercenario',
    displayName: 'Mercenário',
    epithet: 'o Contratante do Beco',
    role: 'Distribui contratos de expedição e missões de risco.',
    district: 'Casa do Mercenário — zona residencial oeste',
    greeting:
      'Tenho contratos com cheiro de pólvora e pagamento em VOLTS. Se tivers estômago, lemos os termos.',
    biography: [
      'Ex-operativo de limpeza dimensional que recusou a última ordem da NexGrid. Agora vende trabalho sujo para quem prefere assinar um contrato a invadir zonas sem autorização.',
      'Sua casa é pequena, mas o arquivo de missões é grande: cada papel é uma intenção que o servidor ainda não implementou — ou que implementará quando você estiver pronto.',
      'Não confia em heroísmo gratuito. Confia em assinatura, prazo e taxa de sobrevivência.',
    ],
    motivation: 'Encontrar operadores que fechem contratos sem derrubar o bairro inteiro.',
    rumor: 'O contrato mais lucrativo nunca aparece na pilha de cima — só depois da terceira derrota seguida.',
  },
  {
    npcId: 'ferreiro',
    displayName: 'Ferreiro',
    epithet: 'o Fundidor de Ossos',
    role: 'Transforma materiais de loot em suprimentos de combate na oficina.',
    district: 'Casa do Ferreiro — distrito sul comercial',
    greeting:
      'Traz os restos das dimensões — ossos, teias, vigas fundidas. Eu devolvo algo que cabe no teu bolso.',
    biography: [
      'Membro fundador do Sindicato das Oficinas, o ferreiro aprendeu a ler a densidade do loot antes de martelar. Para ele, cada osso de criatura carrega a memória do mapa onde caiu.',
      'Não forja armas lendárias — ainda. Funde catalisadores táticos: tônicos de suporte destilados de restos comuns, o suficiente para manter uma escaramuça 15×15 viva.',
      'Desconfia de alquimistas que prometem atalhos. "Química sem martelo é só fumaça bonita", costuma dizer.',
    ],
    motivation: 'Manter o fluxo de materiais de crafting longe do mercado negro de NexGrid.',
    rumor: 'Dizem que ele guarda um molten_beam intacto debaixo da bigorna — peça de um protótipo que nunca entrou no catálogo.',
  },
  {
    npcId: 'vendedor',
    displayName: 'Vendedor',
    epithet: 'o Abridor de Caixas',
    role: 'Compra e revende suprimentos; converte loot em VOLTS pelo valor base.',
    district: 'Loja NPC — distrito sul comercial',
    greeting:
      'Ofertas do dia, preços do servidor. Compro teu loot a cinquenta por cento do valor base — sem drama.',
    biography: [
      'O vendedor não tem nome público. É um posto de troca licenciado pela cidade: interface humana para transações que o gateway já validaria sozinho.',
      'Mantém estoque de poções e consumíveis para novatos, mas seu lucro real está na revenda de materiais dimensionais — o que você não quer carregar, ele transforma em VOLTS na hora.',
      'Trata raridade como política, não como emoção. Itens de crafting vão para o ferreiro; itens de valor direto ficam na prateleira até alguém precisar.',
    ],
    motivation: 'Girar estoque rápido e impedir que inventários travem por ganância de loot.',
    rumor: 'Às vezes paga um VOLTS a mais para quem vende logo após uma vitória PVE — como se o servidor gostasse de celebrar.',
  },
  {
    npcId: 'alquimista',
    displayName: 'Alquimista',
    epithet: 'a Química da Fenda',
    role: 'Vende poções, tônicos e reagentes do laboratório dimensional.',
    district: 'Laboratório — zona residencial norte',
    greeting:
      'Catalisadores, tônicos e frascos estáveis. Se explodir, não foi meu frasco — foi tua pressa.',
    biography: [
      'Formada nas cúpulas de pesquisa da NexGrid antes de pedir demissão por "diferença ética de procedimento". Montou o laboratório com equipamento contrabandeado de zonas de farm.',
      'Cada frasco é um contrato químico: efeito declarado, carga limitada, nenhuma promessa de cura milagrosa. Ela respeita o combate autoritativo — poções curam o que o servidor permite.',
      'Colabora com o ferreiro apenas quando necessário. Prefere comprar matéria-prima no mercado a negociar com o sindicato.',
    ],
    motivation: 'Financiar a próxima síntese de estabilizador dimensional sem vender a patente à corporação.',
    rumor: 'Há um frasco roxo trancado na prateleira de trás — etiqueta apagada, pulsa quando a arena está cheia.',
  },
  {
    npcId: 'treinador_zeno',
    displayName: 'Treinador Zeno',
    epithet: 'o Domador de Fendas',
    role: 'Adota e registra companheiros dimensionais (gato ou cachorro tático).',
    district: 'Praça residencial — próximo ao laboratório',
    greeting:
      'Gato ou Cachorro Dimensional — escolhe o parceiro, assina o vínculo. Eu cuido do registro; o servidor cuida da verdade.',
    biography: [
      'Zeno não domestica animais — estabiliza entidades que escaparam de mapas colapsados. Cada pet é um contrato de convivência: nome, cor, gênero, slot no roster.',
      'Acredita que afinidade se constrói em combate e cuidado, não em comandos. Por isso insiste em ração especial do Ancião Cael para quem leva o vínculo a sério.',
      'Marcou presença na cidade após o primeiro torneio aberto. Desde então, ninguém entra na arena sem perguntar se o companheiro pode seguir.',
    ],
    motivation: 'Garantir que nenhum dimensional órfão seja vendido à NexGrid como matéria-prima.',
    rumor: 'Dizem que o gato dele pisca em sincronia com o cooldown de alimentação — coincidência ou telemetria emocional?',
  },
  {
    npcId: 'banqueiro',
    displayName: 'Banqueiro',
    epithet: 'o Guardião de Cofre',
    role: 'Depósito seguro de VOLTS, Alter Coins e itens fora da mochila.',
    district: 'Banco — distrito sul comercial',
    greeting:
      'Teus VOLTS pesam menos aqui dentro — e é assim que preferes, não é? Deposita, respira, volta a lutar.',
    biography: [
      'O banco de Altercadia não é um prédio: é um protocolo de cofre com rosto humano. Cada transação passa por intent validado; nenhum saque acontece sem confirmação do servidor.',
      'O banqueiro fala baixo porque já viu jogadores perderem tudo por confiar na mochila durante um portal instável.',
      'Alter Coins entram no cofre com taxa zero — política da cidade para incentivar poupança dimensional entre temporadas.',
    ],
    motivation: 'Manter riqueza líquida fora do alcance de mortes, timeouts e inventário cheio.',
    rumor: 'Conta-se que há um cofre fantasma só para quem nunca perdeu uma aposta na arena — ninguém provou que existe.',
  },
  {
    npcId: 'terminal_mercado',
    displayName: 'Terminal de Trocas',
    epithet: 'o Livro Aberto',
    role: 'Interface do mercado global — listagens, ordens e coleta de VOLTS.',
    district: 'Bloco do Mercado — distrito comercial leste',
    greeting:
      'Mercado global online. Listagens anônimas, ordens de compra, VOLTS em escrow — escolhe o teu risco.',
    biography: [
      'Não é uma pessoa: é um terminal fixo ligado ao gateway econômico da cidade. A voz sintética foi substituída por uma interface minimalista porque jogadores confiavam mais em texto do que em avatar.',
      'Cada listagem é um intent público; cada coleta de VOLTS espera confirmação antes de celebrar. O terminal nunca mente sobre taxas — o servidor é a única fonte de preço justo.',
      'Operadores da NexGrid tentaram comprar o bloco inteiro. A cidade recusou. O mercado é infraestrutura, não propriedade corporativa.',
    ],
    motivation: 'Manter liquidez entre jogadores sem intermediários que calculem loot no cliente.',
    rumor: 'À meia-noite, uma listagem fantasma aparece por três segundos — item raro, preço absurdo, dono desconhecido.',
  },
  {
    npcId: 'instrutor_refraction',
    displayName: 'Instrutor Kael',
    epithet: 'o Mira da Refração',
    role: 'Opera o estande de mira ao alvo — desafio de refração e prêmios em VOLTS.',
    district: 'Estande de Refração — topo leste da cidade',
    greeting:
      'Quer testar tua mira antes da arena real? Cinquenta VOLTS abrem o estande — o alvo não perdoa hesitação.',
    biography: [
      'Kael treinou atiradores de torre NexGrid até recusar um contrato de "limpeza preventiva" em civis. Instalou o estande como prova pública de que precisão pode ser divertida sem sangue real.',
      'Os alvos são projeções de refração — patos de luz que caem em padrões pseudo-aleatórios. O servidor mede cada acerto; o prêmio nunca ultrapassa o teto diário autorizado.',
      'Respeita o Ancião Cael, mas discorda da ideia de que só combate PvP valida habilidade. "Reflexo também é autoridade", repete para novatos impacientes.',
    ],
    motivation: 'Filtrar operadores impulsivos antes que entrem em zonas 15×15 sem noção de foco.',
    rumor: 'Quem bate recorde no estande ganha um frame de mira fantasma na arena — efeito puramente cosmético, dizem.',
  },
  {
    npcId: 'arena_pulpit_west',
    displayName: 'Registrador Oeste',
    epithet: ARENA_PULPIT_LORE_BASE.epithet,
    role: ARENA_PULPIT_LORE_BASE.role,
    district: 'Arena Central — Púlpito Oeste',
    greeting: 'Apostas do lado oeste — visão lateral do palco. Registra a tua intenção.',
    biography: ARENA_PULPIT_LORE_BASE.biography,
    motivation: ARENA_PULPIT_LORE_BASE.motivation,
    rumor: 'Apostadores do oeste juram que enxergam debuffs antes do combate começar.',
  },
  {
    npcId: 'arena_pulpit_center',
    displayName: 'Registrador Central',
    epithet: ARENA_PULPIT_LORE_BASE.epithet,
    role: ARENA_PULPIT_LORE_BASE.role,
    district: 'Arena Central — Púlpito Central',
    greeting: 'Púlpito central — linha de fogo do duelo. A aposta aqui pesa no rumor da cidade.',
    biography: ARENA_PULPIT_LORE_BASE.biography,
    motivation: ARENA_PULPIT_LORE_BASE.motivation,
    rumor: 'Apostas feitas no púlpito oeste pagam melhor quando chove — ninguém explica por quê.',
  },
  {
    npcId: 'arena_pulpit_east',
    displayName: 'Registrador Leste',
    epithet: ARENA_PULPIT_LORE_BASE.epithet,
    role: ARENA_PULPIT_LORE_BASE.role,
    district: 'Arena Central — Púlpito Leste',
    greeting: 'Lado leste do palco — aposta rápida, fila curta. O servidor não espera indecisos.',
    biography: ARENA_PULPIT_LORE_BASE.biography,
    motivation: ARENA_PULPIT_LORE_BASE.motivation,
    rumor: 'Dizem que o púlpito leste fecha dez segundos antes dos outros — superstição de torneio.',
  },
] as const;

const loreById = new Map<string, NpcLoreProfile>(
  NPC_LORE_PROFILES.map((profile) => [profile.npcId, profile]),
);

export const NPC_LORE_CATALOG: readonly NpcLoreProfile[] = NPC_LORE_PROFILES;

export function getNpcLore(npcId: string): NpcLoreProfile | null {
  return loreById.get(npcId) ?? null;
}

export function resolveNpcGreeting(npcId: string, fallback = ''): string {
  return loreById.get(npcId)?.greeting ?? fallback;
}

/** Biografia em bloco único — codex, diário, tooltips estendidos. */
export function formatNpcBiography(npcId: string): string | null {
  const lore = loreById.get(npcId);
  if (!lore) return null;
  return lore.biography.join('\n\n');
}

/** Linha de crônica para feed de lore mundial (ex.: terminal do Cael). */
export function formatNpcLoreChronicleLine(npcId: string): string | null {
  const lore = loreById.get(npcId);
  if (!lore) return null;
  const hook = lore.rumor ?? lore.motivation;
  return `${lore.displayName}, ${lore.epithet} de ${lore.district}: ${hook}`;
}

export function listNpcLoreIds(): readonly string[] {
  return NPC_LORE_PROFILES.map((profile) => profile.npcId);
}
