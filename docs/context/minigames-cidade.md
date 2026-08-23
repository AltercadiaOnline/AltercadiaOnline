# Minigames e terminais (cidade / zona)

Lazer urbano e POIs de terminal. **Não** escrevem `combatStats`, marcos de luta nem dash.

## O que existe agora

| POI | Papel | Status |
|-----|--------|--------|
| Cabine de Refração (VORTEX) | Minigame solo, VOLTS + placar local | Ativo |
| Cadeia zona 1 (`computador_zona1` → `1a` → `1b` → `1c`) | Um terminal por gate; libera só a subzona seguinte | Ativo |
| `computador_zona2` | Domínio zona 2 | Planejado |
| Arena social / apostas / telão | `cityActivities` | Desenho / pós-MVP |

Docs de produto antigos: `docs/historico/README.md`. Phaser nos textos = sucata.

## Arquivos âncora — Refração

| Peça | Path |
|------|------|
| Tipos / score | `src/shared/cityMinigames/` |
| Handlers | `src/server/handlers/city/RefractionBoothHandlers.ts` |
| Painel | `WorldRefractionBoothPanel.tsx` |
| Config cidade | `src/shared/cityActivities/` |

VOLTS de prêmio = `economyGateway` no handler. Quote de entrada vem do servidor.

## Arquivos âncora — Terminais zona 1 (cadeia)

| Peça | Path |
|------|------|
| Gates | `src/shared/world/zoneDomainTerminals.ts` |
| Posição no mapa | Só marker Construct → `constructNpcPlacements.generated.ts` (hoje: `computador_zona1` na entrada) |
| IDs hub | `worldTerminalCatalog.ts` (`ZONE_1` = entrada) |
| NPC | `npcRegistry.ts` (mapa `farm_zone_01`) |
| Abrir | `NPCManager.executeAction` → `SHOW_MEMORY_TERMINAL` |
| Overlay | `MemoryTerminalReactBridge.tsx` — **irmã** de `SprayInspectHud` no `App` |
| ESC close | `memoryTerminalHudBridge.ts` — `.ts` puro; teclado não importa o `.tsx` |
| Minigame | `MemoryTerminalModal.tsx` — código **2s embaralhado**, depois teclado shuffled |
| HUD domínio | `ZoneDomainHud.tsx` — após bypass deste POI, **E** abre info; hack **só** a trava deste terminal |
| Sessão | `src/shared/world/zoneBypassStore.ts` |

### Regra de produto (fechada)

```text
terminal entrada (Z1)     → libera Z1A
terminal dentro de Z1A    → libera Z1B
terminal dentro de Z1B    → libera Z1C
terminal dentro de Z1C    → libera Z1D
```

- **Não** hackar Z1B a partir do terminal da entrada — só no POI de Z1A.
- Pré-requisito: gate seguinte exige a subzona anterior liberada.
- HUD lista todas as travas (domínio), mas o botão Hackear é só da máquina atual.
- Após liberar: mensagem aponta o **próximo terminal** (onde está).

Spawn no overlay: só IDs com marker no generate. `1a/1b/1c` não aparecem até o Construct exportar. `computador_zona1` fica na entrada da zona 1 (teste); depois vai para o fim.

Não montar esse overlay dentro de `WorldPanelsLayer` (a camada some sem painel aberto e **trava** o movimento). Fechar = `releaseWorldHudInteractionIfIdle`. ESC fecha o terminal, não o pause.

## Proibido

Minigame alterar HP/dano/XP de combate no cliente. Confirmar prêmio VOLTS sem intent.
Liberar várias travas a partir de um único terminal / botão “próxima” global.
