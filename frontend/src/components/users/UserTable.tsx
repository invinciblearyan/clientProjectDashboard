import type { PublicUser } from '../../types/api';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatUserRole } from '../../utils/user-roles';

interface UserTableProps {
  users: PublicUser[];
  currentUserId?: string;
  onEdit: (user: PublicUser) => void;
  onDeactivate: (user: PublicUser) => void;
  deactivatingUserId?: string | null;
}

export function UserTable({
  users,
  currentUserId,
  onEdit,
  onDeactivate,
  deactivatingUserId,
}: UserTableProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table" aria-label="Users">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{formatUserRole(user.role)}</td>
              <td>
                <Badge variant={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td>
                <div className="admin-table__actions">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(user)}>
                    Edit
                  </Button>
                  {user.isActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={deactivatingUserId === user.id}
                      disabled={user.id === currentUserId}
                      onClick={() => onDeactivate(user)}
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
