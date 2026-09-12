import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';
import { getRoleHomePath } from '../utils/roles';

export function NotFoundPage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="status-page">
      <Card title="Page not found" subtitle="The requested route does not exist">
        <p className="status-page__message">
          Check the URL or return to your workspace.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href =
              isAuthenticated && user ? getRoleHomePath(user.role) : '/login';
          }}
        >
          {isAuthenticated ? 'Go to workspace' : 'Go to login'}
        </Button>
        <p className="status-page__secondary">
          <Link to="/">Home</Link>
        </p>
      </Card>
    </div>
  );
}
