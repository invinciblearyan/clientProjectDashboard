import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/api';
import { getRoleHomePath, getRoleLabel } from '../../utils/roles';
import './Sidebar.css';

interface NavItem {
  label: string;
  to: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin', roles: ['ADMIN'] },
  { label: 'Projects', to: '/admin/projects', roles: ['ADMIN'] },
  { label: 'Activity', to: '/admin/activity', roles: ['ADMIN'] },
  { label: 'Users', to: '/admin/users', roles: ['ADMIN'] },
  { label: 'Clients', to: '/admin/clients', roles: ['ADMIN'] },
  { label: 'Manager Home', to: '/manager', roles: ['PROJECT_MANAGER'] },
  { label: 'Projects', to: '/manager/projects', roles: ['PROJECT_MANAGER'] },
  { label: 'Developer Home', to: '/developer', roles: ['DEVELOPER'] },
];

export function Sidebar() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true" />
        <div>
          <p className="sidebar__brand-title">Client Dashboard</p>
          <p className="sidebar__brand-subtitle">{getRoleLabel(user.role)}</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/manager' || item.to === '/developer'}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <NavLink to={getRoleHomePath(user.role)} className="sidebar__footer-link">
          Workspace
        </NavLink>
      </div>
    </aside>
  );
}
