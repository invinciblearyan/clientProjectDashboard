import { io, type Socket } from 'socket.io-client';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAccessToken } from '../api/client';
import { getWsBaseUrl } from '../config/env';
import { useAuth } from '../hooks/useAuth';

type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const nextSocket = io(getWsBaseUrl(), {
      auth: { token },
      withCredentials: true,
      autoConnect: true,
    });

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    nextSocket.on('connect', handleConnect);
    nextSocket.on('disconnect', handleDisconnect);

    setSocket(nextSocket);

    return () => {
      nextSocket.off('connect', handleConnect);
      nextSocket.off('disconnect', handleDisconnect);
      nextSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
    }),
    [socket, isConnected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
