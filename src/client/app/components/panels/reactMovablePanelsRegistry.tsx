// @ts-nocheck
import { BankPanelHud } from './BankPanelHud.js';
import { CharactersPanelHud } from './CharactersPanelHud.js';
import { CraftPanelHud } from './CraftPanelHud.js';
import { DiaryPanelHud } from './DiaryPanelHud.js';
import { DialoguePanelHud } from './DialoguePanelHud.js';
import { InventoryPanelHud } from './InventoryPanelHud.js';
import { LaboratoryShopPanelHud } from './LaboratoryShopPanelHud.js';
import { MarketHubPanelHud } from './MarketHubPanelHud.js';
import { MarketPanelHud } from './MarketPanelHud.js';
import { MarcosPanelHud } from './MarcosPanelHud.js';
import { MovesetPanelHud } from './MovesetPanelHud.js';
import { PetLovePanelHud } from './PetLovePanelHud.js';
import { PetMemorialPanelHud } from './PetMemorialPanelHud.js';
import { PetTrainerShopPanelHud } from './PetTrainerShopPanelHud.js';
import { QuestPanelHud } from './QuestPanelHud.js';
import { RankingMonitorPanelHud } from './RankingMonitorPanelHud.js';
import { RefractionBoothPanelHud } from './RefractionBoothPanelHud.js';
import { ShopHudPanelHud } from './ShopHudPanelHud.js';
import { SocialPanelHud } from './SocialPanelHud.js';
import { TournamentBetPanelHud } from './TournamentBetPanelHud.js';
import { VendorShopPanelHud } from './VendorShopPanelHud.js';
const REACT_MOVABLE_PANELS = [
    { id: 'inventory', render: (focused) => <InventoryPanelHud focused={focused}/> },
    { id: 'characters', render: (focused) => <CharactersPanelHud focused={focused}/> },
    { id: 'moveset', render: (focused) => <MovesetPanelHud focused={focused}/> },
    { id: 'marcos', render: (focused) => <MarcosPanelHud focused={focused}/> },
    { id: 'marketHub', render: (focused) => <MarketHubPanelHud focused={focused}/> },
    { id: 'market', render: (focused) => <MarketPanelHud focused={focused}/> },
    { id: 'petLove', render: (focused) => <PetLovePanelHud focused={focused}/> },
    { id: 'petMemorial', render: (focused) => <PetMemorialPanelHud focused={focused}/> },
    { id: 'quest', render: (focused) => <QuestPanelHud focused={focused}/> },
    { id: 'rankingMonitor', render: (focused) => <RankingMonitorPanelHud focused={focused}/> },
    { id: 'social', render: (focused) => <SocialPanelHud focused={focused}/> },
    { id: 'shop', render: (focused) => <ShopHudPanelHud focused={focused}/> },
    { id: 'tournamentBet', render: (focused) => <TournamentBetPanelHud focused={focused}/> },
    { id: 'craft', render: (focused) => <CraftPanelHud focused={focused}/> },
    { id: 'dialogue', render: (focused) => <DialoguePanelHud focused={focused}/> },
    { id: 'diary', render: (focused) => <DiaryPanelHud focused={focused}/> },
    { id: 'vendorShop', render: (focused) => <VendorShopPanelHud focused={focused}/> },
    { id: 'laboratoryShop', render: (focused) => <LaboratoryShopPanelHud focused={focused}/> },
    { id: 'petTrainerShop', render: (focused) => <PetTrainerShopPanelHud focused={focused}/> },
    { id: 'bank', render: (focused) => <BankPanelHud focused={focused}/> },
    { id: 'refractionBooth', render: (focused) => <RefractionBoothPanelHud focused={focused}/> },
];
export function renderReactMovablePanels(panels) {
    return REACT_MOVABLE_PANELS.map(({ id, render }) => (panels.openWindows.includes(id) ? render(panels.focusedWindow === id) : null));
}
