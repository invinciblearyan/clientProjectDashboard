import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';
import { getRoleHomePath } from '../utils/roles';

export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="status-page">
      <Card title="Access denied" subtitle="You do not have permission to view this page">
        <p className="status-page__message">
          This route is restricted to a different role. Navigation hiding is for convenience only;
          the backend still enforces all permissions.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = user ? getRoleHomePath(user.role) : '/login';
          }}
        >
          Go to your workspace
        </Button>
        {!user ? (
          <p className="status-page__secondary">
            <Link to="/login">Sign in</Link>
          </p>
        ) : null}
      </Card>
    </div>
  );
}
