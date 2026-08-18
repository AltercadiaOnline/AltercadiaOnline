# Identidade do personagem

`characterId` liga para sempre à classe e ao nome. Não se “advinha” IMPETUS no enter-world.

```text
login → escolhe slot → CharacterIdentity na sessão
enter-world / combate / HUD leem a identidade
full-state-sync = ESTADO (itens, XP, pos, pets, skin…)
```

## Imutável (hub)

characterId, classId, displayName, serverId, slotIndex  
(rename = intent dedicado)

Online: `profiles.class_id` (migration 018) é a cópia durável da classe no hub. Enter-world lê o slot, não inventa IMPETUS.

## Delete / create (ficha morta)

Apagar = some inventário, carteira, pets (`character_pets`), save file, RAM e loot pendente. O `characterId` **não recicla**. Slot novo = ID novo + pets/itens/volts vazios. `ensureServerPlayerBootstrap(..., { newCharacter: true })` não cola leftover. Classe grava em `profiles.class_id`.

skin, level, XP, wallet, inventário, equip, posição, vitals, pets, marcos, mastery, legado

## Arquivos

| Peça | Path |
|------|------|
| Contrato | `src/shared/character/characterIdentity.ts` |
| Sessão cliente | `src/client/character/activeCharacterIdentity.ts` |
| Hub | `src/server/net/characterHubService.ts` |
| Purge | `src/client/player/purgeClientGameSession.ts` |

**Não existe** `identity.playerId`. Player id = `getLocalSession()?.id` (ou Mock `boundPlayerId`).

## Proibido

`classId || 'IMPETUS'` em personagem novo. Re-inferir classe só por mastery. Tratar skin como identidade.
