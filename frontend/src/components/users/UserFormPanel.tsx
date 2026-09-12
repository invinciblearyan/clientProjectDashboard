import { useState, type FormEvent } from 'react';
import type { PublicUser, UserRole } from '../../types/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { USER_ROLE_OPTIONS } from '../../utils/user-roles';

type FieldErrors = {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
};

export type UserFormValues = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

interface UserFormPanelProps {
  mode: 'create' | 'edit';
  initialUser?: PublicUser;
  loading?: boolean;
  formError?: string | null;
  fieldErrors?: FieldErrors;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

export function UserFormPanel({
  mode,
  initialUser,
  loading = false,
  formError = null,
  fieldErrors = {},
  onSubmit,
  onCancel,
}: UserFormPanelProps) {
  const [email, setEmail] = useState(initialUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(initialUser?.name ?? '');
  const [role, setRole] = useState<UserRole>(initialUser?.role ?? 'DEVELOPER');
  const [isActive, setIsActive] = useState(initialUser?.isActive ?? true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === 'create' && password.length < 8) {
      return;
    }

    if (!name.trim()) {
      return;
    }

    onSubmit({
      email: email.trim(),
      password,
      name: name.trim(),
      role,
      isActive,
    });
  }

  return (
    <form
      className="admin-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={mode === 'create' ? 'Create user form' : 'Edit user form'}
    >
      {formError ? (
        <div className="admin-management__banner" role="alert">
          {formError}
        </div>
      ) : null}

      {mode === 'create' ? (
        <>
          <Input
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
          />
          <Input
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
        </>
      ) : (
        <Input name="email" label="Email" value={email} readOnly disabled />
      )}

      <Input
        name="name"
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
        maxLength={100}
        required
      />

      <Select
        name="role"
        label="Role"
        value={role}
        onChange={(event) => setRole(event.target.value as UserRole)}
        options={USER_ROLE_OPTIONS}
        error={fieldErrors.role}
      />

      {mode === 'edit' ? (
        <label className="admin-form__checkbox">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Active account
        </label>
      ) : null}

      <div className="admin-form__actions">
        <Button type="submit" loading={loading}>
          {mode === 'create' ? 'Create user' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export type UserFieldErrors = FieldErrors;

export function mapUserApiFieldErrors(
  details: Array<{ field: string; message: string }> | undefined,
): FieldErrors {
  const nextFieldErrors: FieldErrors = {};

  if (!details?.length) {
    return nextFieldErrors;
  }

  for (const detail of details) {
    if (detail.field === 'email' || detail.field === 'password' || detail.field === 'name' || detail.field === 'role') {
      nextFieldErrors[detail.field] = detail.message;
    }
  }

  return nextFieldErrors;
}
