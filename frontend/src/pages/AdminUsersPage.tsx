import { useState } from 'react';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { UserFormPanel, mapUserApiFieldErrors, type UserFormValues } from '../components/users/UserFormPanel';
import { UserTable } from '../components/users/UserTable';
import {
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useUsers,
} from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import { ApiRequestError, type PublicUser } from '../types/api';
import { getAuthErrorMessage } from '../utils/errors';
import { Button } from '../components/common/Button';
import './admin-management.css';

type PanelMode = 'none' | 'create' | 'edit';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { data, isLoading, isError, error, refetch } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  const [panelMode, setPanelMode] = useState<PanelMode>('none');
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof mapUserApiFieldErrors>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);

  function resetPanel() {
    setPanelMode('none');
    setEditingUser(null);
    setFormError(null);
    setFieldErrors({});
  }

  function openCreatePanel() {
    setSuccessMessage(null);
    setActionError(null);
    setFormError(null);
    setFieldErrors({});
    setEditingUser(null);
    setPanelMode('create');
  }

  function openEditPanel(user: PublicUser) {
    setSuccessMessage(null);
    setActionError(null);
    setFormError(null);
    setFieldErrors({});
    setEditingUser(user);
    setPanelMode('edit');
  }

  function handleCreateSubmit(values: UserFormValues) {
    setFormError(null);
    setFieldErrors({});

    createUser.mutate(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        role: values.role,
      },
      {
        onSuccess: () => {
          resetPanel();
          setSuccessMessage('User created successfully.');
        },
        onError: (mutationError) => {
          if (mutationError instanceof ApiRequestError) {
            setFieldErrors(mapUserApiFieldErrors(mutationError.details));
          }
          setFormError(getAuthErrorMessage(mutationError));
        },
      },
    );
  }

  function handleEditSubmit(values: UserFormValues) {
    if (!editingUser) {
      return;
    }

    setFormError(null);
    setFieldErrors({});

    updateUser.mutate(
      {
        id: editingUser.id,
        input: {
          name: values.name,
          role: values.role,
          isActive: values.isActive,
        },
      },
      {
        onSuccess: () => {
          resetPanel();
          setSuccessMessage('User updated successfully.');
        },
        onError: (mutationError) => {
          if (mutationError instanceof ApiRequestError) {
            setFieldErrors(mapUserApiFieldErrors(mutationError.details));
          }
          setFormError(getAuthErrorMessage(mutationError));
        },
      },
    );
  }

  function handleDeactivate(user: PublicUser) {
    setSuccessMessage(null);
    setActionError(null);
    setDeactivatingUserId(user.id);

    deactivateUser.mutate(user.id, {
      onSuccess: () => {
        setSuccessMessage(`${user.name} was deactivated.`);
      },
      onError: (mutationError) => {
        setActionError(getAuthErrorMessage(mutationError));
      },
      onSettled: () => {
        setDeactivatingUserId(null);
      },
    });
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="admin-management">
      <header className="admin-management__header">
        <div>
          <h1 className="admin-management__title">Users</h1>
          <p className="admin-management__subtitle">
            Manage workspace accounts. Authorization is enforced by the server on every request.
          </p>
        </div>
        {panelMode === 'none' ? (
          <Button type="button" variant="secondary" size="sm" onClick={openCreatePanel}>
            Add user
          </Button>
        ) : null}
      </header>

      {successMessage ? (
        <div className="admin-management__banner admin-management__banner--success" role="status">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="admin-management__banner" role="alert">
          {actionError}
        </div>
      ) : null}

      {panelMode === 'create' ? (
        <div className="admin-management__panel">
          <Card title="Create user" subtitle="New accounts receive the selected role immediately">
            <UserFormPanel
              mode="create"
              loading={createUser.isPending}
              formError={formError}
              fieldErrors={fieldErrors}
              onSubmit={handleCreateSubmit}
              onCancel={resetPanel}
            />
          </Card>
        </div>
      ) : null}

      {panelMode === 'edit' && editingUser ? (
        <div className="admin-management__panel">
          <Card title="Edit user" subtitle={`Updating ${editingUser.email}`}>
            <UserFormPanel
              key={editingUser.id}
              mode="edit"
              initialUser={editingUser}
              loading={updateUser.isPending}
              formError={formError}
              fieldErrors={fieldErrors}
              onSubmit={handleEditSubmit}
              onCancel={resetPanel}
            />
          </Card>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : isError ? (
        <ErrorState
          title="Unable to load users"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        <Card>
          <EmptyState
            title="No users yet"
            description="Create the first workspace account to get started."
          />
        </Card>
      ) : (
        <Card title="User list" subtitle={`${data.pagination.total} user(s)`}>
          <UserTable
            users={data.data}
            currentUserId={currentUser.id}
            onEdit={openEditPanel}
            onDeactivate={handleDeactivate}
            deactivatingUserId={deactivatingUserId}
          />
        </Card>
      )}
    </div>
  );
}
