import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Package, Gift, User, LogOut, Menu, X, Leaf, Shield } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bonds', label: 'Comprar Bonos', icon: Package },
  { path: '/my-bonds', label: 'Mis Bonos', icon: Gift },
  { path: '/referrals', label: 'Referidos', icon: User },
];

const adminItems = [
  { path: '/admin', label: 'Admin Dashboard', icon: Shield },
  { path: '/admin/users', label: 'Usuarios', icon: User },
  { path: '/admin/bonds', label: 'Bonos', icon: Package },
  { path: '/admin/transactions', label: 'Transacciones', icon: LayoutDashboard },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-primary text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-secondary" />
            <span className="font-bold text-xl">BonosVerde</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.role === 'ADMIN' && (
              <>
                <div className="w-px h-6 bg-white/20 mx-1" />
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className={`text-xs ${user?.role === 'PREMIUM' ? 'text-secondary' : user?.role === 'ADMIN' ? 'text-red-300' : 'text-white/60'}`}>
                {user?.role === 'PREMIUM' ? '⭐ Premium' : user?.role === 'ADMIN' ? '🛡️ Admin' : 'Inversor'}
              </p>
            </div>
            <Link to="/profile" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <User className="h-5 w-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-primary-dark border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.role === 'ADMIN' && (
              <>
                <div className="border-t border-white/20 pt-2 mt-2">
                  <p className="px-3 py-1 text-xs text-white/40 uppercase tracking-wider">Administración</p>
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
            <div className="border-t border-white/10 pt-2 mt-2">
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10"
              >
                <User className="h-4 w-4" />
                Mi Perfil
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 w-full"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
