import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Shield, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export function TwoFactorPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const codeString = code.join('');
    if (codeString.length !== 6) {
      toast.error('Ingresa el código completo de 6 dígitos');
      return;
    }

    setLoading(true);
    // Simulación de verificación - en producción esto iría al backend
    setTimeout(() => {
      toast.success('Código verificado correctamente (simulado)');
      navigate('/dashboard');
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-4">
            <Shield className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Verificación 2FA</h1>
          <p className="text-white/70">Ingresa el código enviado a tu correo</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-bg rounded-lg">
            <Mail className="h-5 w-5 text-primary" />
            <p className="text-sm text-text-light">
              Código enviado a tu correo electrónico
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            ))}
          </div>

          <Button
            onClick={handleVerify}
            loading={loading}
            className="w-full"
            size="lg"
          >
            Verificar Código
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-light">
              ¿No recibiste el código?{' '}
              <button
                onClick={() => toast.success('Código reenviado (simulado)')}
                className="text-primary font-semibold hover:underline"
              >
                Reenviar
              </button>
            </p>
          </div>

          <div className="mt-4 p-3 bg-bg rounded-lg">
            <p className="text-xs text-text-light text-center">
              <strong>Nota:</strong> Esta es una versión visual del 2FA.
              La funcionalidad completa se implementará con SendGrid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
