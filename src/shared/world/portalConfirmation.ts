import type { PortalPosition } from '../../shared/world/portals.js';

export type PortalCollisionPayload = {
  readonly portalId: string;
};

export type PortalConfirmationPayload = {
  readonly portalId: string;
  readonly fromMapId: string;
  readonly zoneName: string;
  readonly targetMapId: string;
  readonly targetPosition: PortalPosition;
};
