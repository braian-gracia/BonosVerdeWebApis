import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, Star, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  curvCode: string;
  totalSpent: number;
  twoFactorEnabled: boolean;
  bondsCount: number;
  referralsCount: number;
  createdAt: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
      toast.success('Rol actualizado correctamente');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar rol');
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`¿Eliminar al usuario ${user.name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await api.delete(`/api/admin/users/${user.id}`);
      toast.success('Usuario eliminado correctamente');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Gestión de Usuarios</h1>
        <p className="text-text-light mt-1">Administra los usuarios del sistema</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-24 shadow-md" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text">Todos los Usuarios ({users.length})</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-text-light">Usuario</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Rol</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Invertido</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Bonos</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Referidos</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">CURV</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-bg/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-text">{user.name}</p>
                          <p className="text-xs text-text-light">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-danger/10 text-danger'
                              : user.role === 'PREMIUM'
                              ? 'bg-secondary/10 text-secondary'
                              : 'bg-bg text-text-light'
                          }`}
                        >
                          {user.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                          {user.role === 'PREMIUM' && <Star className="h-3 w-3" />}
                          {user.role === 'INVESTOR' && <Users className="h-3 w-3" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium text-text">
                        ${user.totalSpent.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-text">{user.bondsCount}</td>
                      <td className="py-3 px-2 text-text">{user.referralsCount}</td>
                      <td className="py-3 px-2 font-mono text-xs text-primary">{user.curvCode}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          {user.role !== 'ADMIN' && (
                            <>
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className="text-xs border border-border rounded px-2 py-1 bg-white"
                              >
                                <option value="INVESTOR">Inversor</option>
                                <option value="PREMIUM">Premium</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                className="p-1 text-danger hover:bg-danger/10 rounded"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
