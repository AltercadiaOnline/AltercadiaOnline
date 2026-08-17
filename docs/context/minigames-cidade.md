# Minigames e terminais (cidade / zona)

Lazer urbano e POIs de terminal. **Não** escrevem `combatStats`, marcos de luta nem dash.

## O que existe agora

| POI | Papel | Status |
|-----|--------|--------|
| Cabine de Refração (VORTEX) | Minigame solo, VOLTS + placar local | Ativo |
| `computador_zona1` | Bypass memória + HUD de domínio | Ativo (HUD no `App`) |
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

## Arquivos âncora — Terminal zona 1

| Peça | Path |
|------|------|
| IDs | `src/shared/world/worldTerminalCatalog.ts` (`ZONE_1` = `computador_zona1`) |
| NPC | `npcRegistry.ts` (mapa `farm_zone_01`) |
| Abrir | `NPCManager.executeAction` → `SHOW_MEMORY_TERMINAL` |
| Overlay | `MemoryTerminalReactBridge.tsx` — **irmã** de `SprayInspectHud` no `App` |
| ESC close | `memoryTerminalHudBridge.ts` — `.ts` puro; teclado não importa o `.tsx` |
| Minigame | `MemoryTerminalModal.tsx` — código **2s embaralhado**, depois teclado shuffled |
| HUD domínio | `ZoneDomainHud.tsx` — após bypass, **E** abre (quem está dominando + travas) |
| Sessão | `src/shared/world/zoneBypassStore.ts` |

Fluxo: primeiro E = minigame. Bypass ok → próximo E = HUD auto-informativa. Próximas travas (Z1A→Z1B…) saem do botão na HUD.

Não montar esse overlay dentro de `WorldPanelsLayer` (a camada some sem painel aberto e **trava** o movimento). Fechar = `releaseWorldHudInteractionIfIdle`. ESC fecha o terminal, não o pause.

## Proibido

Minigame alterar HP/dano/XP de combate no cliente. Confirmar prêmio VOLTS sem intent.
