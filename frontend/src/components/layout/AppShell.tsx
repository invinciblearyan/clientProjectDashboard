import { Outlet } from 'react-router-dom';
import { useGlobalRealtime } from '../../hooks/useGlobalRealtime';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './AppShell.css';

export function AppShell() {
  useGlobalRealtime();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Header />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
