import React, { useState, useEffect } from 'react';
import { Menu, BarChart2, Wallet, DollarSign, Settings, Book, X, User, LogOut, Shield, Users, MessageCircle, Trophy } from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  icon: React.ElementType;
  text: string;
  path: string;
}

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const navItems: NavItem[] = [
    { icon: BarChart2, text: 'Dashboard', path: '/dashboard' },
    { icon: Wallet, text: 'Trading Accounts', path: '/trading-accounts' },
    { icon: DollarSign, text: 'Buy Account', path: '/buy-account' },
    { icon: DollarSign, text: 'Payouts', path: '/payouts' },
    { icon: Shield, text: 'KYC Verification', path: '/kyc' },
    { icon: Users, text: 'Affiliate Program', path: '/affiliate' },
    { icon: Book, text: 'Rules', path: '/rules' },
    { icon: Trophy, text: 'Leaderboard', path: '/leaderboard' },
    { icon: User, text: 'My Profile', path: '/my-profile' },
    { icon: Settings, text: 'Settings', path: '/settings' },
    { icon: MessageCircle, text: 'Live Support', path: '/live-support' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const profileMenu = document.getElementById('profile-menu');
      const profileButton = document.getElementById('profile-button');
      if (
        profileMenu &&
        !profileMenu.contains(event.target as Node) &&
        !profileButton?.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="fixed w-full z-50">
        <div className="glass-effect-dark border-b border-gray-700/50">
          <div className="flex items-center justify-between px-4 sm:px-6 py-1">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="btn p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isSidebarOpen && isMobile ? (
                  <X className="w-6 h-6 text-gray-100" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-100" />
                )}
              </button>
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="FundedCobra Logo" className="h-[80px] object-contain" />
              </div>
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                id="profile-button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-white font-medium hidden sm:block">
                  {user?.name || user?.email}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div
                  id="profile-menu"
                  className="absolute right-0 mt-2 w-48 rounded-lg card-gradient border border-white/10 shadow-lg overflow-hidden"
                >
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/settings');
                      }}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-white/5 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/5 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full w-full md:w-72 transition-transform duration-300 ease-out transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobile ? 'z-40 bg-gray-900' : ''}`}
        style={{ paddingTop: '84px' }}
      >
        <div className="h-full glass-effect-dark border-r border-gray-700/50">
          <nav className="p-4 sm:p-6">
            <div className="space-y-1">
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/20 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : ''}`} />
                    <span className="font-medium">{item.text}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary-400"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main 
        className={`transition-all duration-300 ease-out ${isSidebarOpen && !isMobile ? 'md:ml-72' : 'ml-0'}`}
        style={{ paddingTop: '84px' }}
      >
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}