/** Livro I das Crônicas de Altercadia — catálogo estático + rotação diária do shard. */

export type CaelChronicleChapter = {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly body: string;
  /** Nota de flavor no texto — não é missão. */
  readonly questHookId?: string;
  readonly questHookNote?: string;
};

export const CAEL_CHRONICLE_BOOK_TITLE = 'Crônicas de Altercadia';

export const CAEL_CHRONICLE_CHAPTERS: readonly CaelChronicleChapter[] = [
  {
    id: 'livro1_prologo',
    order: 1,
    title: 'Prólogo — Onde o asfalto racha',
    body:
      'Talvez a barreira nunca tenha sido muro. Talvez fosse só um acordo tácito de silêncio, do tipo que a gente finge não ouvir até que o chão estale debaixo dos pés.\n\n'
      + 'O que vazou primeiro não foram exércitos ou monstros lendários, mas os restos mudos: pedaços de mineral, cristais que pulsam com uma frequência que este lado do mundo simplesmente não foi fabricado para metabolizar. Os relatórios chamam de "Fragmentos" — um nome limpo, estéril, inventado para anestesiar o espanto.\n\n'
      + 'Mas a verdade é que, a partir do momento em que o primeiro cristal bateu na calçada, a geologia virou lembrança. O que sobrou foi contrato, carne barata e a tirania do ranking.',
  },
  {
    id: 'livro1_vortex',
    order: 2,
    title: 'I — A engrenagem e o asfalto',
    body:
      'A gente aprende cedo que a moralidade é só o preço de tabela da obediência. Para o mundo lá fora, a corporação é a salvadora que empacota energia limpa e vende o futuro em cupons de conveniência. Nos relatórios internos, foi a primeira a mapear o óbvio: aquilo não era um acidente geográfico, era uma mina a ser drenada.\n\n'
      + 'Ninguém assinou um pacto de sangue nas fundações. Foi mais sutil. O asfalto absorveu o grid como se fosse parte da biologia urbana: mapas, contratos, bilhetes de duelo que decidem quem come amanhã. A empresa e a rede viraram a mesma coisa, um monstro sem rosto que cobra imposto até pelo ar que a gente respira.\n\n'
      + 'A marca não precisa de chicote; ela anda nas solas dos nossos sapatos. No beco, quando o agente tomba, o que sobra na calçada é só o fragmento e o eco de uma extração mecânica. Se há culpa nisso? O silêncio, afinal, é a única coisa que ainda não taxaram.',
  },
  {
    id: 'livro1_escolhidos',
    order: 3,
    title: 'II — O Sonho e o Alternado',
    body:
      'O fragmento nunca foi democrático. Na maioria dos corpos, ele bate e morre como cascalho, sem despertar absolutamente nada. Mas numa parcela rara — aquela que estatística nenhuma consegue prever —, ele pulsa. Como se reconhecesse uma frequência que já estava lá, escondida.\n\n'
      + 'A gestão teve a chance de construir jaulas, mas preferiu o luxo da franquia. O procedimento é inteiramente voluntário. Sempre foi. Acontece naquele estado limítrofe a que chamam de Sonho: o fragmento não inventa nada do zero, ele apenas escaneia e amplifica o que a tua essência já carregava no escuro.\n\n'
      + 'Quem acorda dali, acorda fundido. No calor do combate — o que chamamos de Alternado —, a alma assume uma forma palpável. A classe não é um destino escolhido por capricho; é só o reflexo inevitável do que tu és quando a pressão aumenta.',
  },
  {
    id: 'livro1_extintos',
    order: 4,
    title: 'III — Os Extintos',
    body:
      'Tem gente que acha que a linha entre o razoável e o absurdo é fixa. Não é. Basta apertar o suficiente para ver o que sobra.\n\n'
      + 'Quatro frequências conhecidas, quatro rótulos frios para o que não cabe em manual: Impetus, Cogitor, Tutator, Dissolutus. Os registros tratam como "Extintos" — não porque tenham sumido da terra, mas porque o que estava ali antes de cruzar o Sonho já não consegue voltar a ser domesticação.\n\n'
      + 'Instinto puro, cálculo frio, muralha de carne, sede de ruptura. A rua, o laboratório estéril, o muro pichado, a fenda aberta no meio da calçada. O cristal não inventou nada; só abriu o volume no talo.',
  },
  {
    id: 'livro1_ecosistema',
    order: 5,
    title: 'IV — Liberdade com etiqueta',
    body:
      'A gente compete, sobe no ranking, fatura o que dá, e no fim do mês paga o aluguel da própria infraestrutura. Ninguém está algemado com ferro batido; o cativeiro moderno tem Wi-Fi e opção de parcelamento. São clientes, não prisioneiros.\n\n'
      + 'O fluxo dita a vida: quem não tem crédito, não respira. O prestígio tem cotação e o mercado dita as regras do cassino onde a energia extraída do outro lado volta em formato de ficha. A engrenagem roda porque todo mundo prefere acreditar que é dono do próprio destino, desde que pague a taxa em dia.',
  },
  {
    id: 'livro1_barreira',
    order: 6,
    title: 'V — A costura fina',
    body:
      'A barreira está cedendo, e isso não precisa de alarme sonoro para ser verdade. Cada fragmento que passa é mais peso na balança; cada escolhido que se atira no combate acelera o desgaste da linha.\n\n'
      + 'Existem teorias, claro. Algumas tentam acalmar, outras só empurram o problema para amanhã. Enquanto o chão não abre de vez, a gente continua duelando e a engrenagem continua lucrando com o espetáculo. Do outro lado, a fenda espera.',
  },
  {
    id: 'livro1_cidade',
    order: 7,
    title: 'VI — O chão que nos cabe',
    body:
      'Onde a gente pisa nunca foi refúgio bucólico; nasceu para ser trânsito e cálculo. A arena não passa de equipamento, e quem passa a vida inteira só lutando acaba esquecendo o peso do que observa em volta.\n\n'
      + 'Mercado, calçadas poeirentas, cantos de refúgio e o portal sempre aberto para o beco onde a noite nunca muda de cor. O relógio é o mesmo para todo mundo — aqui, ninguém tem privilégio de fuso horário.',
  },
  {
    id: 'livro1_cael',
    order: 8,
    title: 'VII — O ofício do registro',
    body:
      'Há quem diga que o passado é terra firme, mas quem guarda os registros sabe que a memória é só o que a gente consegue salvar antes que o sistema apague. A narrativa não serve para salvar ninguém do pânico; serve apenas para dar alguma dignidade ao caos.\n\n'
      + 'Ficar por aqui é proteger o que sobrou: os que chegam perdidos, os que voltam arrastando os pés e os monstros instáveis que encontram abrigo onde não deviam. Vitória certa nunca foi promessa — o que se oferece é a travessia.',
  },
  {
    id: 'livro1_zena',
    order: 9,
    title: 'VIII — Refugiados do descarte',
    body:
      'Alguns encontram os bichos que cruzam a fenda não para domar, mas para estancar o que sangra. Não são mercadorias de vitrine; são sobreviventes de zonas que o catálogo oficial preferiu fingir que nunca existiram.\n\n'
      + 'A ração que se reparte por aí não é carinho, é só uma trégua temporária contra o desgaste rápido deste lugar. Quando um deles parte, o nome vai para o livro de perdas, provando que nem tudo virou recurso contabilizado pela grade — pelo menos, não ainda.',
  },
  {
    id: 'livro1_kael',
    order: 10,
    title: 'IX — A mira e o limite',
    body:
      'Dizem que houve um tempo de ordens cumpridas à risca, até que a linha do aceitável se rompeu diante de um alvo que não merecia o tiro. O estande de tiro e os reflexos afiados na calçada provam que a autoridade de alguém não vem da patente, mas de onde decide apontar o cano.\n\n'
      + 'Coincidência ou repetição teimosa, os nomes ecoam nos rankings como se o passado estivesse sempre rondando a próxima esquina, recusando o veredito oficial.',
  },
  {
    id: 'livro1_arquiteto',
    order: 11,
    title: 'X — A sombra no topo',
    body:
      'Bem no alto da pirâmide de contratos, corre o boato de uma inteligência sem dono que oferece a única saída lógica: zerar as dívidas ou quebrar o sistema de vez. Chamar isso de máquina ou de divindade urbana dá no mesmo.\n\n'
      + 'O tomo para por aqui, porque o resto ainda está por ser escrito — ou porque o contrato muda de mãos exatamente quando alguém chega perto demais da resposta.',
  },
];

export function getCaelChronicleChapter(id: string): CaelChronicleChapter | undefined {
  return CAEL_CHRONICLE_CHAPTERS.find((chapter) => chapter.id === id);
}

/**
 * Crônica do dia no shard — 1 capítulo por ciclo dia/noite (30 min reais).
 * Todos os jogadores veem o mesmo; ao fim do tomo, volta ao prólogo.
 */
export function resolveCaelDailyChapter(gameDayIndex: number): CaelChronicleChapter {
  const count = CAEL_CHRONICLE_CHAPTERS.length;
  const safeIndex = Number.isFinite(gameDayIndex) ? Math.floor(gameDayIndex) : 0;
  const rotated = ((safeIndex % count) + count) % count;
  return CAEL_CHRONICLE_CHAPTERS[rotated]!;
}
