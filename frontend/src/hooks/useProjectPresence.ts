import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { SOCKET_EVENTS, type PresenceProjectPayload } from '../websocket/socketEvents';

export function useProjectPresence(projectId: string | undefined, enabled: boolean) {
  const { socket } = useSocket();
  const [viewers, setViewers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!socket || !projectId || !enabled) {
      setViewers([]);
      return;
    }

    const handlePresenceProject = (payload: PresenceProjectPayload) => {
      if (payload.projectId !== projectId) {
        return;
      }

      setViewers(payload.users);
    };

    socket.on(SOCKET_EVENTS.PRESENCE_PROJECT, handlePresenceProject);

    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_PROJECT, handlePresenceProject);
      setViewers([]);
    };
  }, [socket, projectId, enabled]);

  return viewers;
}
