import type { Socket } from 'socket.io';
import { activityLogRepository } from '../../repositories/activity-log.repository';
import { mapActivityToEvent } from '../../utils/activity-mapper';
import type { ActivityCatchupPayload, SocketUser } from '../types';
import { SOCKET_EVENTS } from '../types';

export async function sendActivityCatchup(socket: Socket, user: SocketUser): Promise<void> {
  let activities;

  if (user.role === 'ADMIN') {
    activities = await activityLogRepository.findLatestForAdmin(20);
  } else if (user.role === 'PROJECT_MANAGER') {
    activities = await activityLogRepository.findLatestForPm(user.id, 20);
  } else {
    activities = await activityLogRepository.findLatestForDeveloper(user.id, 20);
  }

  const events = activities.reverse().map(mapActivityToEvent);
  const payload: ActivityCatchupPayload = {
    events,
    count: events.length,
    serverTimestamp: new Date().toISOString(),
  };

  socket.emit(SOCKET_EVENTS.ACTIVITY_CATCHUP, payload);
}
