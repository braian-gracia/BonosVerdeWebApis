import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { referralsAPI } from '../../api/client';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Copy, Check, Gift, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  pendingCommission: number;
  curvCode: string;
  referrals: any[];
}

export function ReferralsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await referralsAPI.getStats();
      setStats(response.data.data);
    } catch {
      setStats({
        totalReferrals: 0,
        totalEarned: 0,
        pendingCommission: 0,
        curvCode: user?.curvCode || 'CURV-XXXX-XXXX',
        referrals: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (stats?.curvCode) {
      navigator.clipboard.writeText(stats.curvCode);
      setCopied(true);
      toast.success('Código copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) return;
    setApplying(true);
    try {
      await referralsAPI.applyCode(applyCode);
      toast.success('Código de referido aplicado correctamente');
      setApplyCode('');
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al aplicar el código');
    } finally {
      setApplying(false);
    }
  };

  const commissionRate = user?.role === 'PREMIUM' ? 10 : 8;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Programa de Referidos</h1>
        <p className="text-text-light mt-1">
          Comparte tu código y gana comisiones por cada referido
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Referidos</p>
              <p className="text-2xl font-bold text-text">{stats?.totalReferrals || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Ganado</p>
              <p className="text-2xl font-bold text-text">
                ${(stats?.totalEarned || 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Comisión por Referido</p>
              <p className="text-2xl font-bold text-text">{commissionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Tu Código de Referido</h3>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-bg rounded-xl mb-4">
                <QRCodeSVG
                  value={stats?.curvCode || 'CURV-XXXX-XXXX'}
                  size={150}
                  level="H"
                  fgColor="#0F4C3A"
                  bgColor="#F8F9FA"
                />
              </div>
              <p className="text-xs text-text-light mb-2">Comparte este QR o usa el código</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-xl font-mono font-bold text-primary bg-primary/5 px-4 py-2 rounded-lg">
                  {stats?.curvCode}
                </code>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <Copy className="h-5 w-5 text-primary" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-bg rounded-lg">
              <p className="text-sm text-text-light">
                <strong>Cómo funciona:</strong> Comparte tu código con amigos. Por cada compra
                que realicen, ganarás un <strong>{commissionRate}%</strong> de comisión sobre
                el monto total.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Tus Referidos</h3>
          </CardHeader>
          <CardContent>
            {stats?.referrals && stats.referrals.length > 0 ? (
              <div className="space-y-3">
                {stats.referrals.map((referral: any) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 bg-bg rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text">{referral.referredName}</p>
                        <p className="text-xs text-text-light">
                          Comisión: {referral.commissionRate}%
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-success">
                      +${referral.totalEarned.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-light">Aún no tienes referidos</p>
                <p className="text-xs text-text-muted mt-1">
                  Comparte tu código para comenzar a ganar
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-text">¿Tienes un código de referido?</h3>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Ingresa el código CURV-XXXX-XXXX"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value)}
              />
              <Button
                onClick={handleApplyCode}
                loading={applying}
                variant="secondary"
              >
                Aplicar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
