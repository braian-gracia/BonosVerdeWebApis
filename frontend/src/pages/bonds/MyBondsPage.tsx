import { useEffect, useState } from 'react';
import { bondsAPI } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Bond } from '../../utils/types';
import { QRCodeSVG } from 'qrcode.react';
import { Eye, Download, RefreshCw, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const BOND_NAMES: Record<string, { name: string; icon: string; color: string }> = {
  OXYGEN: { name: 'Oxígeno', icon: '🌿', color: '#22C55E' },
  FAUNA: { name: 'Fauna', icon: '🦁', color: '#F59E0B' },
  CARBON24: { name: 'Carbono24', icon: '🌍', color: '#3B82F6' },
  HYDROGEN: { name: 'Hidrógeno Verde', icon: '⚡', color: '#10B981' },
};

export function MyBondsPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadBonds();
  }, []);

  const loadBonds = async () => {
    try {
      const response = await bondsAPI.getMyBonds();
      setBonds(response.data.data);
    } catch {
      // Manejar error
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (bondId: number) => {
    try {
      await bondsAPI.redeemBond(bondId);
      toast.success('Bono reclamado exitosamente');
      loadBonds();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al reclamar el bono');
    }
  };

  const getQRValue = (bond: Bond) => {
    return JSON.stringify({
      code: bond.code,
      type: bond.type,
      id: bond.id,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Mis Bonos</h1>
        <p className="text-text-light mt-1">
          Gestiona y reclama tus bonos adquiridos
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-xl shadow-md h-64" />
            </div>
          ))}
        </div>
      ) : bonds.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">No tienes bonos aún</h3>
            <p className="text-text-light mb-4">
              Comienza a invertir en bonos intangibles para el medio ambiente
            </p>
            <a href="/bonds">
              <Button>Explorar Catálogo</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bonds.map((bond) => {
            const bondInfo = BOND_NAMES[bond.type] || BOND_NAMES.OXYGEN;
            return (
              <Card key={bond.id} hover>
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${bondInfo.color}20` }}
                      >
                        {bondInfo.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-text">{bondInfo.name}</h3>
                        <p className="text-xs text-text-light font-mono">{bond.code}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bond.status === 'ACTIVE'
                          ? 'bg-success/10 text-success'
                          : bond.status === 'REDEEMED'
                          ? 'bg-info/10 text-info'
                          : 'bg-text-muted/10 text-text-muted'
                      }`}
                    >
                      {bond.status === 'ACTIVE' && 'Activo'}
                      {bond.status === 'REDEEMED' && 'Reclamado'}
                      {bond.status === 'EXPIRED' && 'Expirado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-light">
                      {new Date(bond.purchaseDate).toLocaleDateString('es-CO')}
                    </span>
                    <span className="font-semibold text-primary">${bond.amount} USD</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedBond(bond);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    {bond.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRedeem(bond.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reclamar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detalle del Bono"
        size="lg"
      >
        {selectedBond && (
          <div className="py-4">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                style={{
                  backgroundColor: `${BOND_NAMES[selectedBond.type]?.color || '#22C55E'}20`,
                }}
              >
                {BOND_NAMES[selectedBond.type]?.icon || '🌿'}
              </div>
              <h3 className="text-xl font-bold text-text">
                {BOND_NAMES[selectedBond.type]?.name || 'Bono'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Código</p>
                <p className="font-mono font-bold text-primary text-lg">{selectedBond.code}</p>
              </div>
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Estado</p>
                <p className="font-semibold text-text">{selectedBond.status}</p>
              </div>
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Fecha de compra</p>
                <p className="font-semibold text-text">
                  {new Date(selectedBond.purchaseDate).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs text-text-light">Valor</p>
                <p className="font-semibold text-primary">${selectedBond.amount} USD</p>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-text-light mb-3">Código QR</p>
              <div className="inline-block p-4 bg-white border-2 border-border rounded-xl">
                {selectedBond.qrData ? (
                  <img
                    src={selectedBond.qrData}
                    alt="QR Code"
                    width={180}
                    height={180}
                  />
                ) : (
                  <QRCodeSVG
                    value={getQRValue(selectedBond)}
                    size={180}
                    level="H"
                    fgColor="#1A1A2E"
                    bgColor="#FFFFFF"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {selectedBond.status === 'ACTIVE' && (
                <Button
                  onClick={() => handleRedeem(selectedBond.id)}
                  variant="secondary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reclamar Bono
                </Button>
              )}
              <Button
                onClick={() => setShowDetailModal(false)}
                variant="outline"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
