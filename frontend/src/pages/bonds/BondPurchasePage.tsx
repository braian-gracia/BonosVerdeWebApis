import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bondsAPI } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ArrowLeft, CreditCard, CheckCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const BOND_INFO: Record<string, { name: string; icon: string; color: string; description: string }> = {
  OXYGEN: { name: 'Oxígeno', icon: '🌿', color: '#22C55E', description: 'Bonos de oxígeno para compensar emisiones de carbono.' },
  FAUNA: { name: 'Fauna', icon: '🦁', color: '#F59E0B', description: 'Bonos de fauna para protección de especies.' },
  CARBON24: { name: 'Carbono24', icon: '🌍', color: '#3B82F6', description: 'Bonos de carbono certificados para reducción GEI.' },
  HYDROGEN: { name: 'Hidrógeno Verde', icon: '⚡', color: '#10B981', description: 'Bonos de hidrógeno verde para energía limpia.' },
};

export function BondPurchasePage() {
  const { bondType } = useParams<{ bondType: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [showEpayoutModal, setShowEpaycoModal] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [purchasedBond, setPurchasedBond] = useState<any>(null);

  const bondInfo = BOND_INFO[bondType || 'OXYGEN'] || BOND_INFO.OXYGEN;

  const handleSimulatePayment = async (paymentMethod: string) => {
    setLoading(true);
    try {
      const response = await bondsAPI.purchase({
        bondType: bondType || 'OXYGEN',
        paymentMethod,
      });

      setPurchasedBond(response.data.data.bond);
      setPurchaseComplete(true);

      if (response.data.data.userRole === 'PREMIUM' && user?.role !== 'PREMIUM') {
        updateUser({ ...user!, role: 'PREMIUM' });
        toast.success('¡Felicidades! Ahora eres Inversor Premium');
      }

      toast.success('¡Bono adquirido exitosamente!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setLoading(false);
      setShowPaypalModal(false);
      setShowEpaycoModal(false);
    }
  };

  if (purchaseComplete && purchasedBond) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">¡Compra Exitosa!</h2>
            <p className="text-text-light mb-6">Tu bono ha sido adquirido correctamente</p>

            <div className="bg-bg rounded-xl p-6 mb-6">
              <div className="text-4xl mb-3">{bondInfo.icon}</div>
              <h3 className="text-lg font-bold text-text">{bondInfo.name}</h3>
              <p className="text-sm text-text-light mb-4">Código del bono</p>
              <div className="bg-white border-2 border-dashed border-primary/30 rounded-lg p-4">
                <p className="text-2xl font-mono font-bold text-primary tracking-wider">
                  {purchasedBond.code}
                </p>
              </div>
              {purchasedBond.qrData && (
                <div className="mt-4">
                  <p className="text-sm text-text-light mb-2">Código QR</p>
                  <img
                    src={purchasedBond.qrData}
                    alt="QR Code"
                    className="mx-auto border rounded-lg"
                    style={{ width: 200, height: 200 }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/my-bonds')} variant="primary">
                Ver Mis Bonos
              </Button>
              <Button onClick={() => navigate('/bonds')} variant="outline">
                Comprar Más
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/bonds')}
        className="flex items-center gap-2 text-text-light hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardContent>
              <div className="text-center py-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4"
                  style={{ backgroundColor: `${bondInfo.color}20` }}
                >
                  {bondInfo.icon}
                </div>
                <h2 className="text-2xl font-bold text-text mb-2">{bondInfo.name}</h2>
                <p className="text-text-light mb-4">{bondInfo.description}</p>
                <div className="text-4xl font-bold text-primary">$100 USD</div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardContent>
              <h3 className="font-semibold text-text mb-3">¿Qué incluye?</h3>
              <ul className="space-y-2 text-sm text-text-light">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Código alfanumérico único
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Código QR para reclamación
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Certificado PDF digital
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Acceso al dashboard de inversiones
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent>
              <h3 className="font-semibold text-text mb-4">Método de Pago</h3>

              <div className="space-y-3">
                <button
                  onClick={() => setShowPaypalModal(true)}
                  className="w-full p-4 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#003087] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">PayPal</span>
                    </div>
                    <div>
                      <p className="font-medium text-text">PayPal</p>
                      <p className="text-sm text-text-light">Pagos internacionales</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-text-muted ml-auto" />
                  </div>
                </button>

                <button
                  onClick={() => setShowEpaycoModal(true)}
                  className="w-full p-4 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#0B4D8B] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">ePayco</span>
                    </div>
                    <div>
                      <p className="font-medium text-text">ePayco</p>
                      <p className="text-sm text-text-light">Pagos nacionales (Colombia)</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-text-muted ml-auto" />
                  </div>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-text-light">o</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleSimulatePayment('SIMULATED')}
                  loading={loading}
                  className="w-full"
                  variant="primary"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Simular Pago ($100 USD)
                </Button>
              </div>

              <p className="text-xs text-text-muted text-center mt-4">
                Al proceder, aceptas nuestros términos y condiciones
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showPaypalModal}
        onClose={() => setShowPaypalModal(false)}
        title="Pago con PayPal"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-12 bg-[#003087] rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">PayPal</span>
          </div>
          <h4 className="font-semibold text-text mb-2">Próximamente Disponible</h4>
          <p className="text-sm text-text-light mb-4">
            La integración con PayPal está en desarrollo. Por ahora utiliza la opción de
            &quot;Simular Pago&quot; para probar la plataforma.
          </p>
          <Button onClick={() => setShowPaypalModal(false)} className="w-full">
            Entendido
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showEpayoutModal}
        onClose={() => setShowEpaycoModal(false)}
        title="Pago con ePayco"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-12 bg-[#0B4D8B] rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xs">ePayco</span>
          </div>
          <h4 className="font-semibold text-text mb-2">Próximamente Disponible</h4>
          <p className="text-sm text-text-light mb-4">
            La integración con ePayco está en desarrollo. Por ahora utiliza la opción de
            &quot;Simular Pago&quot; para probar la plataforma.
          </p>
          <Button onClick={() => setShowEpaycoModal(false)} className="w-full">
            Entendido
          </Button>
        </div>
      </Modal>
    </div>
  );
}
