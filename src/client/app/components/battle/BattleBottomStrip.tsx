// @ts-nocheck
import { useBattleHudStore } from '../../battle/battleHudStore.js';
import { BattleChatPanel } from './BattleChatPanel.js';
import { BattleCommandBarHud } from './BattleCommandBarHud.js';
import { BattleItemsPalette } from './BattleItemsPalette.js';
import { BattleLogPanel } from './BattleLogPanel.js';
import { BattleMovesetPalette } from './BattleMovesetPalette.js';
function BattleMovesetConnected({ onSelectMove, }) {
    const moves = useBattleHudStore((state) => state.movesetMoves);
    const enabled = useBattleHudStore((state) => state.movesetEnabled);
    const turnBlocked = useBattleHudStore((state) => state.paletteTurnBlocked);
    return (<BattleMovesetPalette moves={moves} enabled={enabled} turnBlocked={turnBlocked} onSelectMove={onSelectMove}/>);
}
function BattleItemsDrawer({ onUseItem, }) {
    const open = useBattleHudStore((state) => state.itemsDrawerOpen);
    const items = useBattleHudStore((state) => state.itemRows);
    const enabled = useBattleHudStore((state) => state.itemsEnabled);
    const turnBlocked = useBattleHudStore((state) => state.paletteTurnBlocked);
    if (!open)
        return null;
    return (<BattleItemsPalette items={items} enabled={enabled} turnBlocked={turnBlocked} onUseItem={onUseItem}/>);
}
function BattleCommandBarConnected() {
    const locked = useBattleHudStore((state) => state.commandBarLocked);
    return <BattleCommandBarHud locked={locked}/>;
}
function BattleLogConnected() {
    const lines = useBattleHudStore((state) => state.logLines);
    return <BattleLogPanel lines={lines}/>;
}
function BattleChatConnected() {
    const lines = useBattleHudStore((state) => state.chatLines);
    return <BattleChatPanel lines={lines}/>;
}
/**
 * Faixa inferior de combate (linha de baixo):
 * esquerda — MOVESETS + BOTÕES DE AÇÃO
 * direita — CHAT LOG + CHAT DA BATALHA
 */
export function BattleBottomStrip({ requestMove, requestItem, }) {
    return (<div className="battle-hud-bottom-strip pointer-events-auto" data-ui-surface="battle-bottom-strip">
      <section className="battle-hud-bottom-strip__actions" aria-label="Movesets e botões de ação">
        <BattleMovesetConnected onSelectMove={requestMove}/>
        <BattleItemsDrawer onUseItem={requestItem}/>
        <BattleCommandBarConnected />
      </section>

      <section className="battle-hud-bottom-strip__comms" aria-label="Log e chat da batalha">
        <BattleLogConnected />
        <BattleChatConnected />
      </section>
    </div>);
}
