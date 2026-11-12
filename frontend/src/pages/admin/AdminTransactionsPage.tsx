import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { DollarSign } from 'lucide-react';

interface AdminTransaction {
  id: number;
  userName: string;
  userEmail: string;
  bondCode: string | null;
  bondType: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paymentId: string | null;
  createdAt: string;
}

const BOND_NAMES: Record<string, string> = {
  OXYGEN: 'Oxígeno',
  FAUNA: 'Fauna',
  CARBON24: 'Carbono24',
  HYDROGEN: 'Hidrógeno Verde',
};

export function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/api/admin/transactions');
      setTransactions(response.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Transacciones</h1>
        <p className="text-text-light mt-1">Historial completo de transacciones del sistema</p>
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
            <h3 className="font-semibold text-text">Todas las Transacciones ({transactions.length})</h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-text-light">ID</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Usuario</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Bono</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Monto</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Método</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-2 font-medium text-text-light">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-bg/50">
                      <td className="py-3 px-2 font-mono text-xs text-text-light">#{tx.id}</td>
                      <td className="py-3 px-2">
                        <p className="text-text">{tx.userName}</p>
                        <p className="text-xs text-text-light">{tx.userEmail}</p>
                      </td>
                      <td className="py-3 px-2">
                        {tx.bondCode ? (
                          <div>
                            <p className="font-mono text-xs text-primary">{tx.bondCode}</p>
                            <p className="text-xs text-text-light">
                              {tx.bondType ? BOND_NAMES[tx.bondType] || tx.bondType : '-'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-text-light">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-success" />
                          <span className="font-semibold text-text">{tx.amount}</span>
                          <span className="text-xs text-text-light">{tx.currency}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.paymentMethod === 'SIMULATED'
                              ? 'bg-warning/10 text-warning'
                              : tx.paymentMethod === 'PAYPAL'
                              ? 'bg-[#003087]/10 text-[#003087]'
                              : 'bg-[#0B4D8B]/10 text-[#0B4D8B]'
                          }`}
                        >
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === 'COMPLETED'
                              ? 'bg-success/10 text-success'
                              : tx.status === 'PENDING'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {tx.status === 'COMPLETED' && 'Completado'}
                          {tx.status === 'PENDING' && 'Pendiente'}
                          {tx.status === 'FAILED' && 'Fallido'}
                          {tx.status === 'REFUNDED' && 'Reembolsado'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-text-light">
                        {new Date(tx.createdAt).toLocaleDateString('es-CO')}{' '}
                        {new Date(tx.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
