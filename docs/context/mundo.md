# Mundo (exploração)

Visual = **Construct 3**. Lógica = servidor + `src/shared/world`. Overlay canvas desenha player/NPC/criatura/spray.

## Grid

- Tile 32×32 (`DESIGN_CONFIG.TILE.SIZE`)
- Cidade `city_01` → layout `cidade_01` 1280×1280 (40×40)
- Farm `farm_zone_01` → `zonabeco1` 860×2400
- Viewport 640×360, câmera zoom 1
- Player sprite 35×54 ancorado na **base** do tile

## Arquivos âncora

| Peça | Path |
|------|------|
| Runtime | `src/client/worldRender/construct/ConstructWorldRuntime.ts` |
| Overlay | `ConstructEntityOverlay.ts` (player local + remotos + NPC + criatura + spray + pet remoto) |
| Colisão shared | `src/shared/world/movement.ts` (`moveByDelta` / STOP, não MTV) |
| GameLoop | `src/server/world/GameLoop.ts` |
| NPCs | `src/shared/world/npcRegistry.ts` + placements `*.generated.ts` |
| Tempo | servidor `TimeManager`; cliente só interpola `gameTime` |
| Sync | `src/shared/sync/syncProtocol.ts` (tick: position, creatures, nearbyPlayers, sprays). Remotos: interpolador no relógio do servidor (`remoteEntitySyncBridge`). |

## Peers (`nearbyPlayers`)

Tick leva identidade **do peer**, não do observador: pose + `skinBundleId` + `level` + `companion` (pet convocado). Contrato: `remotePlayerSync.ts`. Servidor preenche em `nearbyPlayerAppearance.ts` (progressão + roster). Overlay: sprite **por** `skinBundleId`; pet ancora atrás do dono (`remoteCompanionPose.ts`). Nametag: `Nome (Nível: N)` via `formatRemotePlayerNametag`. Campo omitido → não inventar no cliente (sem copiar skin/pet local).

## Colisão

- Props Solid Construct → polígonos bake
- NPCs AABB Altercadia
- Criaturas **não** bloqueiam
- Esbarrar = **parar** na última pose válida (não empurrar de volta)
- `moveSeq` no tick **só** se o passo foi aceito

## Workflow mapa

Editar Construct → export → `npm run sync:construct` → `prepare:construct` / `audit:construct` (WebGL only, 640×360).

## Terminais / minigames no mapa

IDs em `worldTerminalCatalog.ts`. Refração e `computador_zona1`: [minigames-cidade.md](minigames-cidade.md). Não acoplar a HUD do terminal ao `WorldPanelsLayer`.

## Proibido

Phaser, parser Tiled, segundo motor de cena, relógio de dia/noite no cliente.
