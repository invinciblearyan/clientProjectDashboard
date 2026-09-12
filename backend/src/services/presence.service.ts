import { presenceTracker } from '../websocket/presence.tracker';

export function getActiveUsersOnline(): number {
  return presenceTracker.getOnlineUserCount();
}
