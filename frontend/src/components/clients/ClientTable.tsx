import type { Client } from '../../types/api';
import { Button } from '../common/Button';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  deletingClientId?: string | null;
}

export function ClientTable({
  clients,
  onEdit,
  onDelete,
  deletingClientId,
}: ClientTableProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table" aria-label="Clients">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Company</th>
            <th scope="col">Contact email</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.company ?? '—'}</td>
              <td>{client.contactEmail ?? '—'}</td>
              <td>
                <div className="admin-table__actions">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(client)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={deletingClientId === client.id}
                    onClick={() => onDelete(client)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
