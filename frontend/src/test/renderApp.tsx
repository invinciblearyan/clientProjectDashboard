import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { AppRoutes } from '../routes/AppRouter';

interface RenderAppOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

export function renderApp({ initialRoute = '/', ...options }: RenderAppOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <AppRoutes />
          </MemoryRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>,
    options,
  );
}
