import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Package } from 'lucide-react';

interface AdminBond {
  id: number;
  type: string;
  amount: number;
  code: string;
  status: string;
  userName: string;
  userEmail: string;
  purchaseDate: string;
  redeemDate: string | null;
}

const BOND_NAMES: Record<string, { name: string; icon: string }> = {
  OXYGEN: { name: 'Oxígeno', icon: '🌿' },
  FAUNA: { name: 'Fauna', icon: '🦁' },
  CARBON24: { name: 'Carbono24', icon: '🌍' },
  HYDROGEN: { name: 'Hidrógeno Verde', icon: '⚡' },
};

export function AdminBondsPage() {
  const [bonds, setBonds] = useState<AdminBond[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBonds();
  }, []);

  const loadBonds = async () => {
    try {
      const response = await api.get('/api/admin/bonds');
      setBonds(response.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Gestión de Bonos</h1>
        <p className="text-text-light mt-1">Todos los bonos emitidos en el sistema</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-20 shadow-md" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Todos los Bonos ({bonds.length})</h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-text-light">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Código</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Propietario</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Valor</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Fecha Compra</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Fecha Reclamo</th>
                  </tr>
                </thead>
                <tbody>
                  {bonds.map((bond) => {
                    const bondInfo = BOND_NAMES[bond.type] || BOND_NAMES.OXYGEN;
                    return (
                      <tr key={bond.id} className="border-b border-border/50 hover:bg-bg/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{bondInfo.icon}</span>
                            <span className="font-medium text-text">{bondInfo.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-primary">{bond.code}</td>
                        <td className="py-3 px-2">
                          <p className="text-text">{bond.userName}</p>
                          <p className="text-xs text-text-light">{bond.userEmail}</p>
                        </td>
                        <td className="py-3 px-2 font-medium text-text">${bond.amount}</td>
                        <td className="py-3 px-2">
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
                        </td>
                        <td className="py-3 px-2 text-text-light text-xs">
                          {new Date(bond.purchaseDate).toLocaleDateString('es-CO')}
                        </td>
                        <td className="py-3 px-2 text-text-light text-xs">
                          {bond.redeemDate
                            ? new Date(bond.redeemDate).toLocaleDateString('es-CO')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
