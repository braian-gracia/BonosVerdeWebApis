import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Leaf, Mail, Lock, User, Gift } from 'lucide-react';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await register(email, name, password, referralCode || undefined);
      toast.success('¡Cuenta creada! Iniciando sesión...');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-4">
            <Leaf className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">BonosVerde</h1>
          <p className="text-white/70">Crea tu cuenta y comienza a invertir</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-text mb-4">Crear Cuenta</h2>

          <p className="text-sm text-text-light mb-6">
            Tu cuenta se creará de forma segura en Keycloak. Al finalizar serás redirigido para
            iniciar sesión.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
              <Input
                type="text"
                placeholder="Tu nombre completo"
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
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
              <Input
                type="password"
                placeholder="Crea una contraseña (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                minLength={6}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
              <Input
                type="password"
                placeholder="Confirma tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
              <Input
                type="text"
                placeholder="Código de referido (opcional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Crear Cuenta
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-light text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
