import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Input } from '../components/common/Input';
import { getAuthErrorMessage } from '../utils/errors';
import { useAuth } from '../hooks/useAuth';
import { getRoleHomePath } from '../utils/roles';
import { ApiRequestError } from '../types/api';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, status, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(getRoleHomePath(user.role), { replace: true });
    }
  }, [status, user, navigate]);

  if (status === 'loading') {
    return null;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  function validateForm(): boolean {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const authenticatedUser = await login(email.trim(), password);
      navigate(getRoleHomePath(authenticatedUser.role), { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.details?.length) {
        const nextFieldErrors: { email?: string; password?: string } = {};
        for (const detail of error.details) {
          if (detail.field === 'email' || detail.field === 'password') {
            nextFieldErrors[detail.field] = detail.message;
          }
        }
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
        }
      }
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__panel">
        <div className="login-page__intro">
          <p className="login-page__eyebrow">Client Project Dashboard</p>
          <h1 className="login-page__title">Sign in to your workspace</h1>
          <p className="login-page__subtitle">
            Use your assigned account credentials. Access is role-based and enforced by the API.
          </p>
        </div>

        <Card title="Login" subtitle="Admin-created accounts only">
          <form className="login-page__form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              disabled={submitting}
            />

            {formError ? (
              <ErrorState title="Sign in failed" message={formError} />
            ) : null}

            <Button type="submit" loading={submitting} className="login-page__submit">
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
