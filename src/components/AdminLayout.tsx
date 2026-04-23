import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, Settings, Shield, DollarSign, Users2, Coins, LogOut, Wallet, Mail, BookOpen, Package, Award, UserCheck } from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, text: 'Dashboard', path: '/admin' },
  { icon: Users, text: 'Users', path: '/admin/users' },
  { icon: Wallet, text: 'Trading Accounts', path: '/admin/trading-accounts' },
  { icon: CheckSquare, text: 'Account Approvals', path: '/admin/account-approvals' },
  { icon: DollarSign, text: 'Payout Approvals', path: '/admin/payout-approvals' },
  { icon: Shield, text: 'KYC Verifications', path: '/admin/kyc-verifications' },
  { icon: Users2, text: 'Affiliates', path: '/admin/affiliates' },
  { icon: Coins, text: 'Affiliate Payouts', path: '/admin/affiliate-payouts' },
  { icon: Mail, text: 'Email Management', path: '/admin/email-management' },
  { icon: BookOpen, text: 'Account Rules', path: '/admin/account-rules' },
  { icon: Package, text: 'Packages & Offers', path: '/admin/packages-offers' },
  { icon: Award, text: 'Certificates', path: '/admin/certificates' },
  { icon: UserCheck, text: 'Trader Profiles', path: '/admin/trader-profiles' },
  { icon: Settings, text: 'Settings', path: '/admin/settings' }
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, signOut } = useAdminAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 glass-effect-dark border-r border-gray-700/50">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-red-400' : ''}`} />
                  <span className="font-medium">{item.text}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-red-400"></div>
                  )}
                </button>
              );
            })}

            {/* Admin Info */}
            <div className="pt-4 mt-4 border-t border-gray-700/50">
              <div className="px-4 py-2">
                <p className="text-sm font-medium text-white">{admin?.email}</p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Logout</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to logout?</p>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}