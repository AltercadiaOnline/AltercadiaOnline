import { useState, useSyncExternalStore } from 'react';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { SpraySocialPanel } from '../../../../components/social/SpraySocialPanel.js';
import { postSystemNotification } from '../../../../ui/logService.js';
import { getActiveCharacterIdentity } from '../../../../character/activeCharacterIdentity.js';
import { getLocalSession } from '../../../../services/localSessionStore.js';
import {
  getAllMirroredSprays,
  getWorldSprayMirrorRevision,
  subscribeWorldSprayMirror,
} from '../../../../world/worldSpraySyncBridge.js';
import type { SpraySocialFeedItem } from '../../../../../shared/types/tacticalSpray.js';
import { getFriendList, subscribeFriendList } from '../../../../world/friendListStore.js';
import { openWhisperWithFriend } from '../../../../world/whisperChatActions.js';
import { whisperTabId } from '../../../../world/whisperChatStore.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';

type WorldSocialPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldSocialPanel({ zIndex, focused }: WorldSocialPanelProps) {
  const [activeTab, setActiveTab] = useState<'amigos' | 'sprays'>('amigos');
  useSyncExternalStore(subscribeWorldSprayMirror, getWorldSprayMirrorRevision, () => 0);
  const friends = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribeFriendList(listener), onChange),
    getFriendList,
    getFriendList,
  );

  const identity = getActiveCharacterIdentity();
  const playerId = getLocalSession()?.id;
  const playerFeed: SpraySocialFeedItem[] = getAllMirroredSprays()
    .filter((spray) =>
      Boolean(identity && playerId)
      && spray.authorPlayerId === playerId
      && spray.authorCharacterId === identity?.characterId
    )
    .map((spray) => ({
      sprayId: spray.id,
      zoneId: spray.mapId,
      posX: spray.tileX,
      posY: spray.tileY,
      sprayAssetId: spray.sprayAssetId,
      totalUpvotes: spray.upvoteCount,
      interactions: [],
      totalVoltsEarned: spray.upvoteCount * 15,
      totalZoneReputationEarned: spray.upvoteCount * 5,
    }));

  const handleSendFriendRequest = (nickname: string) => {
    postSystemNotification(`Use o pixo no chão ou a ficha do player para adicionar ${nickname} como amigo.`);
  };

  return (
    <MovablePanelFrame
      windowId="social"
      title="Hub Social & Sinalização"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--social"
      panelStyle={{ width: 'min(500px, 94vw)', maxHeight: 'min(580px, 90vh)' }}
      onFocus={() => tryFocusReactWorldPanel('social')}
      onClose={() => tryCloseReactWorldPanel('social')}
    >
      <div className="social-panel__body flex flex-col gap-3">
        <nav className="social-panel__tabs flex gap-2" aria-label="Seções sociais">
          <button
            type="button"
            className={`social-panel__tab ${activeTab === 'amigos' ? 'social-panel__tab--active' : 'opacity-70'}`}
            onClick={() => setActiveTab('amigos')}
          >
            Amigos
          </button>
          <button
            type="button"
            className={`social-panel__tab ${activeTab === 'sprays' ? 'social-panel__tab--active font-bold text-cyan-400' : 'opacity-70'}`}
            onClick={() => setActiveTab('sprays')}
          >
            Marcas & Sprays
          </button>
        </nav>

        {activeTab === 'amigos' ? (
          friends.length === 0 ? (
            <p className="ui-empty social-panel__placeholder">
              Nenhum amigo nesta ficha. Adicione pelo pixo no chão ou pela ficha do player — sem pedido de aceite.
            </p>
          ) : (
            <div className="social-panel__friends-wrap">
              <p className="social-panel__friends-hint">
                Clique no nome para abrir a conversa no chat.
              </p>
              <ul className="social-panel__friends" aria-label="Lista de amigos">
                {friends.map((friend) => (
                  <li key={whisperTabId(friend.playerId, friend.characterId)}>
                    <button
                      type="button"
                      className={`social-panel__friend${friend.online ? ' is-online' : ''}`}
                      onClick={() => {
                        openWhisperWithFriend(friend.playerId, friend.characterId, friend.displayName);
                      }}
                    >
                      <span className="social-panel__friend-name">{friend.displayName}</span>
                      <span className="social-panel__friend-state">
                        {friend.online ? 'No mapa' : 'Offline'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : (
          <SpraySocialPanel
            playerFeed={playerFeed}
            onSendFriendRequest={handleSendFriendRequest}
          />
        )}
      </div>
    </MovablePanelFrame>
  );
}
