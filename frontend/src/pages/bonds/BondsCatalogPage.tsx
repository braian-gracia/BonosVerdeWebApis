import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bondsAPI } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BondCatalogItem } from '../../utils/types';
import { ShoppingCart } from 'lucide-react';

export function BondsCatalogPage() {
  const [catalog, setCatalog] = useState<BondCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const response = await bondsAPI.getCatalog();
      setCatalog(response.data.data);
    } catch {
      setCatalog([
        {
          type: 'OXYGEN',
          name: 'Oxígeno',
          description: 'Bonos de oxígeno para compensar emisiones de carbono y apoyar proyectos de reforestación.',
          price: 100,
          icon: '🌿',
          color: '#22C55E',
        },
        {
          type: 'FAUNA',
          name: 'Fauna',
          description: 'Bonos de fauna para financiar la protección y conservación de especies en peligro.',
          price: 100,
          icon: '🦁',
          color: '#F59E0B',
        },
        {
          type: 'CARBON24',
          name: 'Carbono24',
          description: 'Bonos de carbono certificados para la reducción de emisiones GEI.',
          price: 100,
          icon: '🌍',
          color: '#3B82F6',
        },
        {
          type: 'HYDROGEN',
          name: 'Hidrógeno Verde',
          description: 'Bonos de hidrógeno verde para proyectos de energía limpia y sostenible.',
          price: 100,
          icon: '⚡',
          color: '#10B981',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (bondType: string) => {
    navigate(`/bonds/purchase/${bondType}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Catálogo de Bonos</h1>
        <p className="text-text-light mt-1">
          Selecciona el tipo de bono que deseas adquirir
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-xl shadow-md h-80" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {catalog.map((bond) => (
            <Card key={bond.type} hover className="flex flex-col">
              <CardContent className="flex-1 flex flex-col">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                  style={{ backgroundColor: `${bond.color}20` }}
                >
                  {bond.icon}
                </div>

                <h3 className="text-xl font-bold text-text mb-2">{bond.name}</h3>

                <p className="text-text-light text-sm flex-1 mb-4">{bond.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-text-light">Precio</p>
                    <p className="text-2xl font-bold text-primary">${bond.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-light">Tipo</p>
                    <p className="text-sm font-medium text-text">USD</p>
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchase(bond.type)}
                  className="w-full"
                  variant="secondary"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Comprar Ahora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-bg rounded-xl">
        <h3 className="font-semibold text-text mb-2">¿Por qué invertir en bonos intangibles?</h3>
        <ul className="text-sm text-text-light space-y-1">
          <li>• Cada bono genera un código único alfanumérico y código QR</li>
          <li>• Certificado digital PDF con todos los datos de tu inversión</li>
          <li>• Sistema de referidos con comisiones del 8% al 10%</li>
          <li>• Al invertir más de $1,000 USD obtienes estatus Premium</li>
        </ul>
      </div>
    </div>
  );
}
