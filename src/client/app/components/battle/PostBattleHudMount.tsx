import { useEffect, useState } from 'react';
import { getPostBattleHudBridge, type PostBattleHudSnapshot } from '../../bridge/postBattleHudBridge.js';
import { PostBattleHubPanel } from './PostBattleHubPanel.js';

function readSnapshot(): PostBattleHudSnapshot {
  return getPostBattleHudBridge().snapshot();
}

type PostBattleHudMountProps = {
  hubDimmed?: boolean;
};

export function PostBattleHudMount({ hubDimmed = false }: PostBattleHudMountProps) {
  const [snapshot, setSnapshot] = useState<PostBattleHudSnapshot>(() => readSnapshot());

  useEffect(() => getPostBattleHudBridge().subscribe(setSnapshot), []);

  if (!snapshot.active) {
    return null;
  }

  return (
    <div
      className={[
        'post-battle-hud-root pointer-events-auto fixed inset-0 z-[999999]',
        hubDimmed ? 'post-battle-hud-root--dimmed' : '',
      ].filter(Boolean).join(' ')}
    >
      <PostBattleHubPanel snapshot={snapshot} />
    </div>
  );
}
