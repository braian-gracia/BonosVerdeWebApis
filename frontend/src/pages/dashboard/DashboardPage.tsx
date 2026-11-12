import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bondsAPI } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Package, TrendingUp, Users, Star, ArrowRight, Gift } from 'lucide-react';
import { Bond } from '../../utils/types';

export function DashboardPage() {
  const { user } = useAuth();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBonds();
  }, []);

  const loadBonds = async () => {
    try {
      const response = await bondsAPI.getMyBonds();
      setBonds(response.data.data);
    } catch {
      // En caso de error, mostramos datos vacíos
    } finally {
      setLoading(false);
    }
  };

  const activeBonds = bonds.filter((b) => b.status === 'ACTIVE').length;
  const totalInvested = user?.totalSpent || 0;
  const isPremium = user?.role === 'PREMIUM';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-text-light mt-1">
          Resumen de tu cuenta de inversión
        </p>
      </div>

      {isPremium && (
        <div className="mb-6 p-4 bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-secondary" />
            <div>
              <p className="font-semibold text-text">¡Eres Inversor Premium!</p>
              <p className="text-sm text-text-light">
                Has invertido más de $1,000 USD. Disfruta de comisiones de referidos del 10%.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Bonos Activos</p>
              <p className="text-2xl font-bold text-text">{activeBonds}</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Invertido</p>
              <p className="text-2xl font-bold text-text">${totalInvested.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <Users className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-light">Nivel</p>
              <p className="text-2xl font-bold text-text">
                {isPremium ? 'Premium' : 'Inversor'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-info/10 rounded-xl">
              <Gift className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-text-light">Comisiones</p>
              <p className="text-2xl font-bold text-text">
                {isPremium ? '10%' : '8%'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Bonos Recientes</h2>
              <Link to="/my-bonds">
                <Button variant="ghost" size="sm">
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-bg rounded-lg" />
                ))}
              </div>
            ) : bonds.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-light">Aún no tienes bonos</p>
                <Link to="/bonds">
                  <Button className="mt-3" size="sm">
                    Comprar primer bono
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bonds.slice(0, 3).map((bond) => (
                  <div
                    key={bond.id}
                    className="flex items-center justify-between p-3 bg-bg rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {bond.type === 'OXYGEN' && '🌿'}
                        {bond.type === 'FAUNA' && '🦁'}
                        {bond.type === 'CARBON24' && '🌍'}
                        {bond.type === 'HYDROGEN' && '⚡'}
                      </div>
                      <div>
                        <p className="font-medium text-text">
                          {bond.type === 'OXYGEN' && 'Oxígeno'}
                          {bond.type === 'FAUNA' && 'Fauna'}
                          {bond.type === 'CARBON24' && 'Carbono24'}
                          {bond.type === 'HYDROGEN' && 'Hidrógeno Verde'}
                        </p>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-text mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <Link to="/bonds" className="block">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-text">Comprar Bono</p>
                      <p className="text-sm text-text-light">Explora nuestro catálogo de bonos</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/referrals" className="block">
                <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-xl hover:bg-secondary/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Users className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-text">Invitar Amigos</p>
                      <p className="text-sm text-text-light">Gana comisiones por referidos</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/my-bonds" className="block">
                <div className="p-4 bg-success/5 border border-success/20 rounded-xl hover:bg-success/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Gift className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-text">Mis Bonos</p>
                      <p className="text-sm text-text-light">Gestiona y reclama tus bonos</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
