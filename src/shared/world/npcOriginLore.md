# Altercadia — Formato de Origem dos NPCs (Cidade 01)

Documento de worldbuilding para escritores, quests e diálogos.  
**Não é código** — é molde + preenchimento de cada personagem já existente no `npcRegistry`.

---

## Como usar este arquivo

1. Copie o **Molde vazio** para cada NPC novo.
2. Preencha os blocos na ordem — origem → chegada → conflito → gancho.
3. Marque ideias incertas com `[?]` ou `[TBD]`; não trave a escrita.
4. Uma frase de **greeting** deve caber no jogo; o resto pode virar codex, crônica ou quest.

---

## Contexto-mãe (ancoragem da cidade)

Use estes eixos em todas as origens — evita lore solta:

| Eixo | Ideia central |
|------|----------------|
| **Altercadia** | Cidade-hub entre dimensões; chão de combate 15×15 é infraestrutura, não acidente. |
| **NexGrid** | Corporação que quer padronizar mapas, contratos e telemetria de duelo. |
| **VOLTS** | Moeda de fluxo — energia que o servidor reconhece; quem não tem, não age. |
| **Alter Coins** | Moeda de prestígio / poupança dimensional; menos líquida, mais simbólica. |
| **Fendas** | Mapas instáveis de onde vêm loot, pets e materiais de crafting. |
| **Sindicato das Oficinas** | Artesãos que recusam vender receitas à NexGrid. |
| **Servidor** | Metáfora diegética aceita: "a cidade só muda quando o registro autoriza". |

**Pergunta-guia para qualquer NPC:**  
*O que essa pessoa perdeu ao cruzar a primeira fenda — e o que ganhou em VOLTS?*

---

## Molde vazio (copiar por NPC)

```text
═══════════════════════════════════════
[NOME] — [epíteto]
id: [npc_id] · sprite: [sprite] · nível: [n]
═══════════════════════════════════════

▸ ORIGEM GEOGRÁFICA
  De onde veio (mapa/zona/cultura):

▸ LINHAGEM / FACÇÃO DE NASCIMENTO
  Família, corporação, guilda ou "ninguém":

▸ ANTES DE ALTERCADIA (1–2 parágrafos)
  O que fazia, o que acreditava, o que carrega no corpo:

▸ EVENTO PIVÔ — COMO CHEGOU
  O momento único que o trouxe à Cidade 01:

▸ POR QUE FICOU
  Gancho emocional + ganho prático (não só "porque tem loja"):

▸ LUGAR NA CIDADE HOJE
  Edifício, bairro, relação com jogador/mecânica:

▸ TENSÃO INTERNA
  Medo, culpa, ambição, luto — o que o faz hesitar:

▸ RELAÇÕES (NPC ↔ NPC ↔ facção)
  Aliados, rivais, dívidas:

▸ VOZ & MANÉRISMO
  Ritmo de fala, palavra favorita, o que nunca diz:

▸ GREETING (1 linha, in-game)
  "[...]"

▸ GANCHOS DE CONTEÚDO FUTURO
  · Quest A:
  · Quest B:
  · Rumor / crônica:

▸ IDEIAS ABERTAS [TBD]
  ·
  ·
  ·
```

---

# NPCs — Origem e contexto preenchido

---

## Ancião Cael — *o Registrador de Crônicas*

`id: anciao_cael` · `sprite: elder` · nível 50 · **featured**

**▸ ORIGEM GEOGRÁFICA**  
Vértice Zero — suposto "mapa-mãe" que existia antes da NexGrid catalogar zonas. Cael não confirma se ainda é lugar físico ou só memória compartilhada.

**▸ LINHAGEM / FACÇÃO**  
Sem família registrada. Figura institucional: primeiro **Curador de Logs** nomeado no contrato fundador de Altercadia (documento que ninguém leu por inteiro, exceto ele).

**▸ ANTES DE ALTERCADIA**  
Era arquivista de incidentes dimensionais — catalogava quedas de mapa, mortes sem respawn e pets órfãos. Aprendeu que narrativa bem contada evita pânico melhor que qualquer mural de aviso. Perdeu a paciência com corporações que apagavam falhas do registro público.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Quando a Cidade 01 foi traçada no grid, Cael exigiu um **anel de espectadores** acima da arena: "quem só luta esquece; quem observa lembra". A NexGrid aceitou em troca de ele não divulgar três falhas de segurança do protótipo.

**▸ POR QUE FICOU**  
A cidade concentra tudo que ele jurou proteger: novatos, retornos após ausência, pets instáveis. Cada crônica que lê ao jogador é um pedaço do log que a corporação preferia manter técnico.

**▸ LUGAR NA CIDADE HOJE**  
Arena Central — anel superior. Terminal unificado: cura, ração pet, guia de sobrevivência, feed de crônicas mundiais.

**▸ TENSÃO INTERNA**  
Sabe mais do contrato fundador do que revela. Teme que, se a NexGrid reescrever o passado, os jogadores passem a acreditar que sempre foram só consumidores de VOLTS.

**▸ RELAÇÕES**  
· **Zeno** — respeito mútuo; discordam sobre pets em combate PvP.  
· **Kael (Instrutor)** — afilhado intelectual; precisão vs. memória.  
· **NexGrid** — tolerância fria; nunca hostilidade aberta.

**▸ VOZ & MANÉRISMO**  
Calmo, pausado, usa "tu" com novatos. Nunca promete vitória — só contexto. Palavra favorita: *passagem*.

**▸ GREETING**  
"Bem-vindo a Altercadia, viajante. A cidade respira em VOLTS e memórias — deixe-me ver o que mudou desde a tua última passagem."

**▸ GANCHOS FUTUROS**  
· Revelar cláusula secreta do contrato fundador (quest de arco).  
· Crônicas personalizadas pós-ausência longa (já mecânico).  
· Ração pet como "carga de estabilização" — origem do frasco.

**▸ IDEIAS ABERTAS**  
· Cael já morreu uma vez e foi restaurado do log? `[?]`  
· Casa do Ancião (estrutura no mapa) guarda pergaminhos físicos ou só terminais?

---

## Mercenário — *o Contratante do Beco*

`id: mercenario` · `sprite: mercenary` · nível 35

**▸ ORIGEM GEOGRÁFICA**  
Distrito industrial norte — favela vertical colada em dutos de resfriamento NexGrid.

**▸ LINHAGEM / FACÇÃO**  
Ex-membro da **Unidade de Limpeza Dimensional** (nome interno: "varredura"). Deserdado, não morto — raro.

**▸ ANTES DE ALTERCADIA**  
Fechava fendas menores após incidentes: entrar, eliminar, sair sem perguntar quem morava do outro lado. Acumulou contratos que não aparecem em nenhum relatório oficial. A última ordem foi limpar um bairro inteiro "por precaução"; recusou.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Fugiu para Cidade 01 com um dossiê parcial nos bolsos. Vendeu silêncio à cidade em troca de asilo na Casa do Mercenário. A NexGrid não o caça abertamente — ele é seguro demais como testemunha.

**▸ POR QUE FICOU**  
Altercadia é o único lugar onde contrato assinado pelo jogador vale mais que ordem corporativa. Ele recria a disciplina militar em missões escolhidas, não impostas.

**▸ LUGAR NA CIDADE HOJE**  
Casa do Mercenário — zona residencial oeste. Pilha de contratos (quests) ainda não implementados no servidor.

**▸ TENSÃO INTERNA**  
Culpa por operações passadas. Medo de que novatos virem o que ele era.

**▸ RELAÇÕES**  
· **Ferreiro** — cliente frequente; troca intel de materiais raros.  
· **Cael** — evita diálogo longo; respeita o registro.  
· **NexGrid** — inimigo dormindo.

**▸ VOZ & MANÉRISMO**  
Frases curtas, militar. Não usa metáfora. Odeia "herói".

**▸ GREETING**  
"Tenho contratos com cheiro de pólvora e pagamento em VOLTS. Se tivers estômago, lemos os termos."

**▸ GANCHOS FUTUROS**  
· Contrato que expõe NexGrid.  
· Missão de escolta em mapa 15×15.  
· Escolha moral: queimar ou entregar dossiê.

**▸ IDEIAS ABERTAS**  
· Nome real nunca revelado?  
· Cicatriz que reage perto de portais?

---

## Ferreiro — *o Fundidor de Ossos*

`id: ferreiro` · `sprite: blacksmith` · nível 25

**▸ ORIGEM GEOGRÁFICA**  
Beco dos Fundos — extensão urbana da Cidade 01 (não periferia rural). Corredor estilo beco americano + Tóquio: tijolo gasto, asfalto úmido, néon de izakaya e grafites; distrito de oficinas antes da gentrificação comercial leste.

**▸ LINHAGEM / FACÇÃO**  
Sindicato das Oficinas (fundador informal do capítulo sul).

**▸ ANTES DE ALTERCADIA**  
Martelava placas de contenção para arenas temporárias. Descobriu que ossos de criaturas dimensionais mantêm "memória de mapa" — propriedade que a NexGrid quer patentear.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Durante greve de oficinas, migrou para Cidade 01 com a bigorna nos ombros literalmente — símbolo de que craft não seria terceirizado.

**▸ POR QUE FICOU**  
Aqui o loot dos jogadores chega em volume; ele transforma restos em tônicos vendáveis sem vender alma à corporação.

**▸ LUGAR NA CIDADE HOJE**  
Casa do Ferreiro — distrito sul. Craft de materiais (mecânica em desenvolvimento).

**▸ TENSÃO INTERNA**  
Desconfia de atalhos alquímicos. Orgulho de artesão vs. necessidade de pagar aluguel em VOLTS.

**▸ RELAÇÕES**  
· **Alquimista** — rivalidade produtiva.  
· **Vendedor** — canal de saída; desconfia da margem.  
· **Mercenário** — fornece peças raras de zonas quentes.

**▸ VOZ & MANÉRISMO**  
Rústico, metáforas de fogo e osso. Desconfia de quem fala demais.

**▸ GREETING**  
"Traz os restos das dimensões — ossos, teias, vigas fundidas. Eu devolvo algo que cabe no teu bolso."

**▸ GANCHOS FUTUROS**  
· Receita secreta com `molten_beam`.  
· Defesa do sindicato contra NexGrid.  
· Craft de equipamento modular (camadas no avatar).

**▸ IDEIAS ABERTAS**  
· Nome: apenas "Ferreiro" ou sobrenome de família de bigorna?

---

## Vendedor — *o Abridor de Caixas*

`id: vendedor` · `sprite: merchant` · nível 20

**▸ ORIGEM GEOGRÁFICA**  
Feira flutuante entre mapas — não é de Altercadia nativo; é **posto licenciado** que escolheu ficar.

**▸ LINHAGEM / FACÇÃO**  
Rede de trocadores independentes (não sindicato, não NexGrid).

**▸ ANTES DE ALTERCADIA**  
Viajava de hub em hub comprando medo barato e vendendo esperança cara. Aprendeu que preço justo gera repetição de cliente melhor que golpe.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Cidade 01 abriu licitação para "interface humana de economia gateway". Ele venceu por ser o único candidato que aceitou auditoria em tempo real pelo servidor.

**▸ POR QUE FICOU**  
Fluxo constante de novatos = fluxo constante de VOLTS. É negócio, mas também gosta de ver inventário vazio virar chance de voltar ao mapa.

**▸ LUGAR NA CIDADE HOJE**  
Loja NPC — sul comercial. Compra/revenda por valor base.

**▸ TENSÃO INTERNA**  
É rosto humano de um sistema que poderia ser só UI. Às vezes sente que não é pessoa, é máscara.

**▸ RELAÇÕES**  
· **Terminal de Mercado** — parceiro de liquidez; não concorrente.  
· **Banqueiro** — encaminha quem guarda demais na mochila.

**▸ VOZ & MANÉRISMO**  
Pragmático, sorriso de quem já viu golpe dos dois lados. Fala em preços e porcentagens.

**▸ GREETING**  
"Ofertas do dia, preços do servidor. Compro teu loot a cinquenta por cento do valor base — sem drama."

**▸ GANCHOS FUTUROS**  
· Listagem negra de itens que NexGrid quer comprar.  
· Missão de entrega contrabandada.  
· Revelar nome verdadeiro como twist de economia.

**▸ IDEIAS ABERTAS**  
· Múltiplos vendedores são o mesmo posto com skins? `[meta diegética]`

---

## Alquimista — *a Química da Fenda*

`id: alquimista` · `sprite: alchemist` · nível 28

**▸ ORIGEM GEOGRÁFICA**  
Cúpulas de Pesquisa NexGrid — setor química dimensional.

**▸ LINHAGEM / FACÇÃO**  
Ex-cientista corporativa; lista negra interna.

**▸ ANTES DE ALTERCADIA**  
Sintetizava estabilizadores para pets e poções de combate. Descobriu que um lote experimental causava "eco de habilidade" — efeito hoje parecido com marcos duplicados. Denunciou; foi silenciada.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Saiu com frascos proibidos e um laboratório portátil. Cidade 01 ofereceu asilo em troca de poções **sem patente corporativa**.

**▸ POR QUE FICOU**  
Liberdade de iterar fórmulas + clientes que voltam vivos = dados melhores que laboratório fechado.

**▸ LUGAR NA CIDADE HOJE**  
Laboratório — zona norte residencial.

**▸ TENSÃO INTERNA**  
Medo de que uma poção sua cause segunda catástrofe. Orgulho científico vs. ética.

**▸ RELAÇÕES**  
· **Ferreiro** — desprezo velado / necessidade mútua.  
· **Zeno** — fornece reagentes para ração pet (indireto via Cael).  
· **NexGrid** — caçada discreta.

**▸ VOZ & MANÉRISMO**  
Precisa, irônica, riso seco. Usa termos técnicos e traduz só se pressionada.

**▸ GREETING**  
"Catalisadores, tônicos e frascos estáveis. Se explodir, não foi meu frasco — foi tua pressa."

**▸ GANCHOS FUTUROS**  
· Frasco roxo trancado (marco / habilidade?).  
· Quest de recuperar dados da cúpula.  
· Poção que só funciona se servidor autorizar (já alinhado à mecânica).

**▸ IDEIAS ABERTAS**  
· Nome próprio: **Sera Voss**? `[TBD]`  
· Relação com Kael Voss das crônicas seed?

---

## Treinador Zeno — *o Domador de Fendas*

`id: treinador_zeno` · `sprite: trainer` · nível 32 · **featured**

**▸ ORIGEM GEOGRÁFICA**  
Mapa colapsado **Rift Kennel** — zona que não existe mais no catálogo oficial.

**▸ LINHAGEM / FACÇÃO**  
Auto-proclamado guardião; sem vínculo corporativo.

**▸ ANTES DE ALTERCADIA**  
Resgatou entidades caninas e felinas que escaparam de fendas instáveis — não domesticou, **estabilizou**. Desenvolveu método de vínculo por nome + cor + gênero (hoje mecânica de adoção).

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Primeiro torneio aberto atraiu multidão; pets entravam no mapa sem registro e causavam crash social. Zeno ofereceu roster oficial em troca de espaço na praça.

**▸ POR QUE FICOU**  
Altercadia concentra jogadores com coração e VOLTS — dupla necessária para manter dimensionais saudáveis.

**▸ LUGAR NA CIDADE HOJE**  
Praça residencial — loja de adoção pet.

**▸ TENSÃO INTERNA**  
Sabe que pets são refugiados, não mercadoria. Teme NexGrid recategorizá-los como "recursos".

**▸ RELAÇÕES**  
· **Cael** — fornece ração; debate ético.  
· **Alquimista** — tensão sobre experimentos em pets.  
· **Jogador** — vê como co-guardião.

**▸ VOZ & MANÉRISMO**  
Entusiasmado com animais, sério com contratos. Toca no ombro do jogador ao falar de perda.

**▸ GREETING**  
"Gato ou Cachorro Dimensional — escolhe o parceiro, assina o vínculo. Eu cuido do registro; o servidor cuida da verdade."

**▸ GANCHOS FUTUROS**  
· Pet perdido do Rift Kennel retorna como boss amigável.  
· Missão de resgate em fenda nova.  
· Evolução de afinidade ligada a lore de envelhecimento.

**▸ IDEIAS ABERTAS**  
· Zeno é ex-NexGrid que criou os pets por acidente? `[?]`

---

## Banqueiro — *o Guardiador de Cofre*

`id: banqueiro` · `sprite: banker` · nível 15

**▸ ORIGEM GEOGRÁFICA**  
Altercadia nativo — família de escrivães do cofre há três gerações.

**▸ LINHAGEM / FACÇÃO**  
Guilda do Cofre (quase extinta; ele é o último nome).

**▸ ANTES DE ALTERCADIA**  
Cresceu contando VOLTS de mercenários mortos e heranças não reclamadas. Aprendeu que morte no mapa é comum; perda por inventário cheio é evitável.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Nunca chegou — **nasceu** quando o banco foi fundado como protocolo, não prédio. O "Banqueiro" é título rotativo; este é o terceiro portador do nome público.

**▸ POR QUE FICOU**  
Dever de família + fé no registro: "se está no cofre, existe".

**▸ LUGAR NA CIDADE HOJE**  
Banco — sul comercial.

**▸ TENSÃO INTERNA**  
Solidão. Poucos o veem como pessoa. Medo de falha de protocolo que apague poupança.

**▸ RELAÇÕES**  
· **Terminal** — liquidez complementar.  
· **Vendedor** — encaminha clientes endividados de espaço.

**▸ VOZ & MANÉRISMO**  
Baixo, formal, quase sussurrado. Nunca gíria.

**▸ GREETING**  
"Teus VOLTS pesam menos aqui dentro — e é assim que preferes, não é? Deposita, respira, volta a lutar."

**▸ GANCHOS FUTUROS**  
· Cofre fantasma de apostador perfeito.  
· Roubo impossível (só falha de intent).  
· Herdeiro da guilda aparece.

**▸ IDEIAS ABERTAS**  
· O banqueiro é IA com rosto? `[diegetica: não, é humano cansado]`

---

## Terminal de Trocas — *o Livro Aberto*

`id: terminal_mercado` · `sprite: terminal` · nível 1 · **featured**

**▸ ORIGEM GEOGRÁFICA**  
Não nasceu — foi **instalado** no Bloco do Mercado quando a cidade decidiu economia player-to-player.

**▸ LINHAGEM / FACÇÃO**  
Infraestrutura municipal; propriedade da Cidade, não de pessoa.

**▸ ANTES DE ALTERCADIA**  
Protótipo de leilão em hub militar. NexGrid queria controle exclusivo; Altercadia recusou.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Votação pública (espectadores da arena) escolheu terminal fixo vs. app móvel. Fixo venceu por "honestidade de estar sempre no mesmo lugar".

**▸ POR QUE FICOU**  
É pedra angular de liquidez; remover = exílio econômico.

**▸ LUGAR NA CIDADE HOJE**  
Bloco do Mercado — leste.

**▸ TENSÃO INTERNA**  
N/A (não-personagem) — mas diegeticamente: "terminal cansado de spam de listagem".

**▸ RELAÇÕES**  
· Todos os comerciantes dependem dele.  
· NexGrid ainda tenta comprar o bloco.

**▸ VOZ & MANÉRISMO**  
Texto UI limpo; sem avatar. Frases curtas estilo notificação.

**▸ GREETING**  
"Mercado global online. Listagens anônimas, ordens de compra, VOLTS em escrow — escolhe o teu risco."

**▸ GANCHOS FUTUROS**  
· Listagem fantasma à meia-noite.  
· Evento de crash de mercado (lore + mecânica).  
· NPC humano "moderador" atrás do terminal? `[?]`

---

## Instrutor Kael — *o Mira da Refração*

`id: instrutor_refraction` · `sprite: instructor` · nível 18 · **featured**

**▸ ORIGEM GEOGRÁFICA**  
Torres de treinamento NexGrid — setor tiro tático.

**▸ LINHAGEM / FACÇÃO**  
Ex-instrutor corporativo; não sindicato, não Cael.

**▸ ANTES DE ALTERCADIA**  
Treinou esquadrões para "limpeza preventiva". Medalha por precisão; demissão por recusa de alvo civil.

**▸ EVENTO PIVÔ — COMO CHEGOU**  
Montou estande público para provar que mira pode ser jogo, não execução. Cael apoiou; NexGrid tolera como válvula de pressão social.

**▸ POR QUE FICOU**  
Gosta de ver novatos falharem rápido aqui em vez de na arena real.

**▸ LUGAR NA CIDADE HOJE**  
Estande de Refração — topo leste.

**▸ TENSÃO INTERNA**  
Medo de virar entretenimento vazio. Quer que minigame ensine algo transferível.

**▸ RELAÇÕES**  
· **Cael** — mentor distante.  
· **Mercenário** — respeito de soldado a soldado.  
· **Crônicas seed "Kael Voss"** — mesmo nome? `[TBD easter egg]`

**▸ VOZ & MANÉRISMO**  
Direto, coach militar leve. Bate palma quando acerta.

**▸ GREETING**  
"Quer testar tua mira antes da arena real? Cinquenta VOLTS abrem o estande — o alvo não perdoa hesitação."

**▸ GANCHOS FUTUROS**  
· Ranking ligado a cosmético de mira.  
· Duelo tutorial vs. NPC espelho.  
· Revelar passado na NexGrid (paralelo mercenário).

---

## Registradores de Apostas (Púlpitos) — *voz do palco*

`ids: arena_pulpit_west | arena_pulpit_center | arena_pulpit_east` · `sprite: pulpit`

**▸ ORIGEM GEOGRÁFICA**  
Não são indivíduos únicos — **turno rotativo** de funcionários NexGrid + voluntários da arena.

**▸ LINHAGEM / FACÇÃO**  
NexGrid (operação) + sindicato de espetáculo (greve de 1 dia em `[ano TBD]`).

**▸ ANTES DE ALTERCADIA**  
Profissão: "registrador de intenção" — existe desde primeiro torneio.

**▸ EVENTO PIVÔ — COMO CHEGARAM**  
Púlpitos físicos instalados para tornar aposta ritual público (anti-fraude).

**▸ POR QUE FICARAM**  
Aposta sem testemunha não gera hype — hype gera VOLTS.

**▸ DIFERENÇA ENTRE PÚLPITOS (ideia de cor)**  
| Púlpito | Tom | Origem do boato |  
|---------|-----|-----------------|  
| Oeste | lateral, supersticioso | vê debuffs antes do duelo |  
| Central | prestígio, fila longa | lentes de refração no teto |  
| Leste | rápido, impaciente | fecha antes dos outros |

**▸ GREETINGS**  
· Oeste: "Apostas do lado oeste — visão lateral do palco. Registra a tua intenção."  
· Central: "Púlpito central — linha de fogo do duelo. A aposta aqui pesa no rumor da cidade."  
· Leste: "Lado leste do palco — aposta rápida, fila curta. O servidor não espera indecisos."

**▸ GANCHOS FUTUROS**  
· NPC nomeado que vira figura fixa em um púlpito.  
· Aposta vinculada a crônica de torneio.  
· Escândalo de intent duplicado.

---

## Mapa de relações (visão rápida)

```text
        NexGrid
           │
    ┌──────┼──────┐
    │      │      │
 Mercenário  │  Terminal
    │      │      │
 Ferreiro──Vendedor──Banqueiro
    │             │
 Alquimista    Treinador Zeno
    │             │
    └──── Cael ───┘
            │
      Instrutor Kael
            │
      Arena / Púlpitos
```

---

## Checklist antes de escrever quest/dialogo novo

- [ ] A origem explica **por que este NPC está neste tile**?
- [ ] Há conflito com **NexGrid, VOLTS ou fendas**?
- [ ] O jogador entende o benefício **sem ler manual**?
- [ ] Existe pelo menos **um gancho [TBD]** para expansão?
- [ ] A voz é distinguível de outro NPC em 2 linhas?

---

*Última revisão: alinhado ao `npcRegistry` e `npcLoreCatalog.ts` de Cidade 01.*
