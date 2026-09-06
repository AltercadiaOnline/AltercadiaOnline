# Combate (motor + HUD)

Motor no servidor. Cliente reproduz `CombatDispatchPayload` (events + state + ui).

Vitória vs criatura (XP / loot): [combate-pve.md](combate-pve.md).  
Fila / match ranqueado: [combate-pvp.md](combate-pvp.md).  
Ordem / setup / finisher por classe: [combate-moveset-dinamica.md](combate-moveset-dinamica.md).

## Arquivos âncora

| Peça | Path |
|------|------|
| Gateway | `src/server/combat/CombatGateway.ts` |
| Engine | `src/server/engine/CombatEngine.ts` |
| Loadout | `src/shared/combat/combatLoadoutResolver.ts` |
| Defaults ordem | `src/shared/combat/moveGameplayRole.ts` (`CLASS_DEFAULT_ACTIVE_LOADOUT`) |
| Catálogo / roles | `src/shared/combat/classMovesetCatalog.ts` |
| Janela Impetus | `src/shared/combat/finisherWindow.ts` + status `FINISHER_WINDOW` |
| Dano | `src/shared/combat/calculateDamage.ts` |
| HUD React | `src/client/app/components/battle/` |
| Playback | `src/client/combat/BattleController.ts` |
| Labels | `src/shared/combat/moveDisplayLabels.ts` / `formatMovePrimaryEffect` |

## Dinâmica (piloto Impetus)

Loadout default Impetus: `IMP_4 → IMP_2 → IMP_3 → IMP_6` (Lâmina/Preparo abrem janela; Fúria fecha).  
HUD: chip **J** (`FINISHER_WINDOW`) nos portraits. Demais classes: defaults alinhados à ficha; mecânicas próprias ainda por fase.

## UI vs mundo

WorldMap e BattleScreen são views **separadas**. Estado (buff, equip, HP) é único. Sem import DOM/canvas de uma tela na outra.

## Nomenclatura de move na HUD

Tooltip: **Poder base: N** / **Cura base: +N HP**. Proibido “+N Dano” no tooltip do golpe. Dano final só no log.

## Proibido

Calcular dano, turno ou HP final no cliente. Abrir esta ficha **e** loot/fila “por garantia”.
