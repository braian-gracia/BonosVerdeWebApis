import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Leaf, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch {
      toast.error('No se pudo iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-4">
            <Leaf className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">BonosVerde</h1>
          <p className="text-white/70">Inversión sostenible en bonos intangibles</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-text mb-4">Iniciar Sesión</h2>

          <div className="flex items-start gap-3 p-3 mb-6 bg-bg rounded-lg">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-text-light">
              Serás redirigido a <strong>Keycloak</strong> para autenticarte con OAuth 2.0 /
              OpenID Connect.
            </p>
          </div>

          <Button onClick={handleLogin} loading={loading} className="w-full" size="lg">
            Iniciar sesión con Keycloak
          </Button>

          <div className="mt-6 text-center">
            <p className="text-text-light text-sm">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-bg rounded-lg">
            <p className="text-xs text-text-light text-center">
              <strong>Usuarios de prueba:</strong><br />
              admin@bonosverde.com / admin123<br />
              inversor@bonosverde.com / inversor123<br />
              premium@bonosverde.com / inversor123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
