# Combate (motor + HUD)

Motor no servidor. Cliente reproduz `CombatDispatchPayload` (events + state + ui).

Vitória vs criatura (XP / loot): [combate-pve.md](combate-pve.md).  
Fila / match ranqueado: [combate-pvp.md](combate-pvp.md).

## Arquivos âncora

| Peça | Path |
|------|------|
| Gateway | `src/server/combat/CombatGateway.ts` |
| Engine | `src/server/engine/CombatEngine.ts` |
| Loadout | `src/shared/combat/combatLoadoutResolver.ts` |
| Dano | `src/shared/combat/calculateDamage.ts` |
| HUD React | `src/client/app/components/battle/` |
| Playback | `src/client/combat/BattleController.ts` |
| Labels | `src/shared/combat/moveDisplayLabels.ts` / `formatMovePrimaryEffect` |

## UI vs mundo

WorldMap e BattleScreen são views **separadas**. Estado (buff, equip, HP) é único. Sem import DOM/canvas de uma tela na outra.

## Nomenclatura de move na HUD

Tooltip: **Poder base: N** / **Cura base: +N HP**. Proibido “+N Dano” no tooltip do golpe. Dano final só no log.

## Proibido

Calcular dano, turno ou HP final no cliente. Abrir esta ficha **e** loot/fila “por garantia”.
