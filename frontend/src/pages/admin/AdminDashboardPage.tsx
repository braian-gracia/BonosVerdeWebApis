import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Users, Package, DollarSign, TrendingUp, Star, Activity } from 'lucide-react';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalBonds: number;
    activeBonds: number;
    totalTransactions: number;
    completedTransactions: number;
    totalRevenue: number;
    totalCommissions: number;
    premiumUsers: number;
    investors: number;
  };
  bondsByType: Array<{ type: string; count: number; totalAmount: number }>;
  recentTransactions: Array<{
    id: number;
    userName: string;
    userEmail: string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
  }>;
}

const BOND_NAMES: Record<string, string> = {
  OXYGEN: 'Oxígeno',
  FAUNA: 'Fauna',
  CARBON24: 'Carbono24',
  HYDROGEN: 'Hidrógeno Verde',
};

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-32 shadow-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Panel de Administración</h1>
        <p className="text-text-light mt-1">Vista general del sistema BonosVerde</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Usuarios</p>
              <p className="text-2xl font-bold text-text">{stats.overview.totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-xl">
              <Package className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Bonos</p>
              <p className="text-2xl font-bold text-text">{stats.overview.totalBonds}</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-light">Ingresos Totales</p>
              <p className="text-2xl font-bold text-text">${stats.overview.totalRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-info/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-text-light">Comisiones Pagadas</p>
              <p className="text-2xl font-bold text-text">${stats.overview.totalCommissions.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-xl">
              <Star className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Usuarios Premium</p>
              <p className="text-2xl font-bold text-text">{stats.overview.premiumUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-bg rounded-xl">
              <Users className="h-6 w-6 text-text-light" />
            </div>
            <div>
              <p className="text-sm text-text-light">Inversores Estándar</p>
              <p className="text-2xl font-bold text-text">{stats.overview.investors}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <Activity className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-light">Transacciones Completadas</p>
              <p className="text-2xl font-bold text-text">{stats.overview.completedTransactions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Bonos por Tipo</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.bondsByType.map((b) => (
                <div key={b.type} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                  <div>
                    <p className="font-medium text-text">{BOND_NAMES[b.type] || b.type}</p>
                    <p className="text-xs text-text-light">{b.count} bonos emitidos</p>
                  </div>
                  <span className="font-semibold text-primary">${b.totalAmount.toLocaleString()}</span>
                </div>
              ))}
              {stats.bondsByType.length === 0 && (
                <p className="text-text-light text-center py-4">No hay bonos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text">Transacciones Recientes</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                  <div>
                    <p className="font-medium text-text">{t.userName}</p>
                    <p className="text-xs text-text-light">
                      {t.paymentMethod} • {new Date(t.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">${t.amount}</p>
                    <span
                      className={`text-xs ${
                        t.status === 'COMPLETED' ? 'text-success' : 'text-text-light'
                      }`}
                    >
                      {t.status === 'COMPLETED' ? 'Completado' : t.status}
                    </span>
                  </div>
                </div>
              ))}
              {stats.recentTransactions.length === 0 && (
                <p className="text-text-light text-center py-4">No hay transacciones</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
