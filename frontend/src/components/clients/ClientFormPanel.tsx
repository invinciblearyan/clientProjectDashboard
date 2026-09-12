import { useState, type FormEvent } from 'react';
import type { Client } from '../../types/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

type FieldErrors = {
  name?: string;
  company?: string;
  contactEmail?: string;
};

export type ClientFormValues = {
  name: string;
  company: string;
  contactEmail: string;
};

interface ClientFormPanelProps {
  mode: 'create' | 'edit';
  initialClient?: Client;
  loading?: boolean;
  formError?: string | null;
  fieldErrors?: FieldErrors;
  onSubmit: (values: ClientFormValues) => void;
  onCancel: () => void;
}

export function ClientFormPanel({
  mode,
  initialClient,
  loading = false,
  formError = null,
  fieldErrors = {},
  onSubmit,
  onCancel,
}: ClientFormPanelProps) {
  const [name, setName] = useState(initialClient?.name ?? '');
  const [company, setCompany] = useState(initialClient?.company ?? '');
  const [contactEmail, setContactEmail] = useState(initialClient?.contactEmail ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      company: company.trim(),
      contactEmail: contactEmail.trim(),
    });
  }

  return (
    <form
      className="admin-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={mode === 'create' ? 'Create client form' : 'Edit client form'}
    >
      {formError ? (
        <div className="admin-management__banner" role="alert">
          {formError}
        </div>
      ) : null}

      <Input
        name="name"
        label="Client name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
        maxLength={200}
        required
      />

      <Input
        name="company"
        label="Company"
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        error={fieldErrors.company}
        maxLength={200}
      />

      <Input
        name="contactEmail"
        label="Contact email"
        type="email"
        value={contactEmail}
        onChange={(event) => setContactEmail(event.target.value)}
        error={fieldErrors.contactEmail}
      />

      <div className="admin-form__actions">
        <Button type="submit" loading={loading}>
          {mode === 'create' ? 'Create client' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
