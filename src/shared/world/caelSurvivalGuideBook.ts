/** Guia de Sobrevivência — catálogo estático + rotação diária do shard (1 lição por ciclo). */

export type CaelSurvivalLesson = {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly body: string;
};

export const CAEL_SURVIVAL_GUIDE_TITLE = 'Guia de Sobrevivência';

export const CAEL_SURVIVAL_LESSONS: readonly CaelSurvivalLesson[] = [
  {
    id: 'guide_movimento',
    order: 1,
    title: 'I — Movimento',
    body:
      'Utilize as teclas WASD, as setas direcionais tradicionais, o teclado numérico ou o sistema de point and click com o mouse para se deslocar pelo cenário. O personagem para imediatamente ao colidir com qualquer obstáculo do mapa, sem impulso automático de retorno. Se houver um eixo livre, o deslizamento acontece de forma fluida. Explore os cantos do mapa antes de se arriscar nas áreas abertas.',
  },
  {
    id: 'guide_interacao',
    order: 2,
    title: 'II — Interação',
    body:
      'Aproxime-se de NPCs e terminais interativos para exibir o painel de ação na tela. Clique sobre ele ou pressione a tecla E para iniciar diálogos, transações ou acessar serviços do local. Cada ponto de interesse possui uma função específica, como regeneração, comércio, arenas de combate ou fabricação de itens.',
  },
  {
    id: 'guide_inventario',
    order: 3,
    title: 'III — Inventário',
    body:
      'Abra o painel de inventário através do menu principal ou do atalho na barra lateral. Clique para equipar armas, peças de armadura e acessórios nos espaços correspondentes. Espaços vazios não concedem atributos. Passe o cursor do mouse sobre qualquer item para visualizar seus atributos detalhados antes de vesti-lo.',
  },
  {
    id: 'guide_combate',
    order: 4,
    title: 'IV — Combate básico',
    body:
      'Os confrontos contra monstros começam ao colidir diretamente com o alvo no mapa ou ao aceitar um desafio. Em cada turno, selecione uma habilidade ativa na barra inferior. O resultado de dano, aplicação de status e checagem de defesa é processado inteiramente pelo servidor.',
  },
  {
    id: 'guide_moveset',
    order: 5,
    title: 'V — Moveset',
    body:
      'A barra de combate utiliza quatro slots ativos (U1 a U4) para definir as ações disponíveis na batalha. É possível reorganizar e substituir as habilidades no painel de moveset conforme novos golpes forem desbloqueados. Monte uma estratégia equilibrada com opções de finalização, controle de grupo e suporte.',
  },
  {
    id: 'guide_cura',
    order: 6,
    title: 'VI — Cura',
    body:
      'O ponto de atendimento local recupera pontos de vida e de PP. Personagens abaixo do nível cinco utilizam o serviço sem custos, enquanto níveis superiores debitam créditos da conta. Tenha sempre recursos garantidos antes de iniciar jornadas longas longe da base.',
  },
  {
    id: 'guide_laboratorio',
    order: 7,
    title: 'VII — Laboratório',
    body:
      'O laboratório comercializa poções e itens de consumo essenciais para a sobrevivência em campo. Faça o estoque antes de sair em expedições prolongadas, pois o suporte da cidade não alcança áreas distantes. Os valores seguem a cotação oficial do servidor em tempo real.',
  },
  {
    id: 'guide_runas_livros',
    order: 8,
    title: 'VIII — Runas e Livros',
    body:
      'Os espaços de RUNAS e LIVROS aceitam itens de melhorias passivas. Eles alteram os atributos e o comportamento em combate sem ocupar espaço na barra de turnos ativa. Equipar o livro correto pode definir o desempenho nas arenas.',
  },
  {
    id: 'guide_loot',
    order: 9,
    title: 'IX — Coleta de Loot (Itens)',
    body:
      'A vitória em combates concede pontos de experiência de forma automática. Os itens dropados passam por uma interface de resgate e só são transferidos para o inventário mediante clique manual. Encerrar a tela sem coletar descarta o espólio daquela luta.',
  },
  {
    id: 'guide_marketplace',
    order: 10,
    title: 'X — Marketplace',
    body:
      'Itens raros possuem baixa valorização ao serem vendidos diretamente para NPCs comuns. Utilize o Terminal de Trocas para negociar com outros jogadores do servidor. As taxas de transação e os valores de mercado são calculados de forma automatizada.',
  },
  {
    id: 'guide_pets',
    order: 11,
    title: 'XI — Companheiros',
    body:
      'Os mascotes acompanham o deslocamento pelo mapa e possuem um ciclo de vida limitado. Adquira ração comercializada no vendedor local e utilize a interface específica de cuidados para manter o pet ativo. Quando o ciclo de um companheiro se encerra, o registro é arquivado permanentemente.',
  },
  {
    id: 'guide_hub_social',
    order: 12,
    title: 'XII — Hub Social',
    body:
      'O hub centraliza o acesso a marcos de alteração de builds, contratos de mercenário, marcações de spray e gerenciamento de clãs. Os contratos fornecem recompensas em experiência e créditos, enquanto os sprays deixam registros visuais no cenário. Priorize o entendimento de um sistema por vez.',
  },
];

export function getCaelSurvivalLesson(id: string): CaelSurvivalLesson | undefined {
  return CAEL_SURVIVAL_LESSONS.find((lesson) => lesson.id === id);
}

/**
 * Lição do dia no shard — 1 por ciclo dia/noite (30 min reais).
 * Todos veem a mesma; ao fim do guia, volta à primeira.
 */
export function resolveCaelDailySurvivalLesson(gameDayIndex: number): CaelSurvivalLesson {
  const count = CAEL_SURVIVAL_LESSONS.length;
  const safeIndex = Number.isFinite(gameDayIndex) ? Math.floor(gameDayIndex) : 0;
  const rotated = ((safeIndex % count) + count) % count;
  return CAEL_SURVIVAL_LESSONS[rotated]!;
}
