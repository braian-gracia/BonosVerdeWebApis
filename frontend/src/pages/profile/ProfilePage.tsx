import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/client';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User, Mail, Shield, Lock, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const response = await authAPI.updateProfile({ name });
      updateUser(response.data.data);
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar el perfil');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword({ newPassword });
      toast.success('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Mi Perfil</h1>
        <p className="text-text-light mt-1">
          Gestiona tu información personal y seguridad
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="text-center py-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold text-text">{user?.name}</h3>
            <p className="text-sm text-text-light">{user?.email}</p>
            <div className="mt-3">
              {user?.role === 'PREMIUM' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                  <Star className="h-4 w-4" />
                  Premium
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-bg text-text-light rounded-full text-sm font-medium">
                  <Shield className="h-4 w-4" />
                  Inversor
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-text">Información del Cuenta</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">CURV Code</p>
                <p className="font-mono font-semibold text-primary">{user?.curvCode}</p>
              </div>
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Total Invertido</p>
                <p className="font-semibold text-text">${user?.totalSpent?.toLocaleString() || 0} USD</p>
              </div>
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Miembro desde</p>
                <p className="font-semibold text-text">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO') : '-'}
                </p>
              </div>
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Nivel</p>
                <p className="font-semibold text-text">{user?.role === 'PREMIUM' ? 'Premium' : 'Inversor'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Actualizar Datos</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
                <Input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
                <Input
                  type="email"
                  placeholder="Tu email"
                  value={email}
                  className="pl-10 bg-bg"
                  readOnly
                />
              </div>
              <p className="text-xs text-text-light">
                El email se gestiona en Keycloak y no se puede modificar aquí.
              </p>
              <Button type="submit" loading={updatingProfile} className="w-full">
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Cambiar Contraseña</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
                <Input
                  type="password"
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
                <Input
                  type="password"
                  placeholder="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <Button type="submit" loading={changingPassword} variant="secondary" className="w-full">
                Cambiar Contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
