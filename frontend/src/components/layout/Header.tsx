import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NotificationBell } from '../notifications/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { getRoleLabel } from '../../utils/roles';
import './Header.css';

export function Header() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <header className="header">
      <div className="header__meta">
        <p className="header__welcome">Signed in as {user.name}</p>
        <Badge variant="accent">{getRoleLabel(user.role)}</Badge>
      </div>

      <div className="header__actions">
        <NotificationBell />
        <span className="header__email">{user.email}</span>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </header>
  );
}
