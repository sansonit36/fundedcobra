import React, { useState, useEffect } from 'react';
import { Menu, BarChart2, Wallet, DollarSign, Settings, Book, X, User, LogOut, Shield, Users, MessageCircle, Trophy } from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NavItem {
  icon: React.ElementType;
  text: string;
  path: string;
}

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        });
    }
  }, [user?.id]);

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
    <div className="min-h-screen bg-[#161616] text-[#e0e0e0] font-sans">
      {/* Structural Header */}
      <header className="fixed w-full z-50 bg-[#1e1e1e] border-b border-[#2A2A2A] shadow-sm">
        <div className="relative z-10">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded hover:bg-[#30363D] transition-colors"
                title="Toggle Sidebar"
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
                className="flex items-center space-x-3 p-1.5 rounded hover:bg-[#30363D] border border-transparent hover:border-[#30363D] transition-colors"
              >
                <div className="w-7 h-7 rounded-sm bg-[#0E1117] border border-[#30363D] flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[#8B949E]" />
                  )}
                </div>
                <span className="text-[#E6EDF3] text-sm font-semibold tracking-wide hidden sm:block">
                  {user?.name || user?.email}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div
                  id="profile-menu"
                  className="absolute right-0 mt-2 w-48 rounded bg-[#161B22] border border-[#30363D] shadow-xl overflow-hidden z-50"
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
        className={`fixed left-0 top-0 h-full w-full md:w-64 transition-transform duration-300 ease-out transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobile ? 'z-40 bg-[#1e1e1e]' : ''}`}
        style={{ paddingTop: '64px' }}
      >
        <div className="h-full bg-[#1e1e1e] border-r border-[#2A2A2A] flex flex-col">
          <div className="p-4 pt-6">
            <button className="w-full bg-[#bd4dd6] hover:bg-[#a63aba] text-white font-bold py-2.5 rounded text-sm mb-4 transition-colors">
              New Evaluation
            </button>
          </div>
          
          <nav className="px-3 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[#808080] px-3 mb-2 mt-4">Main menu</p>
              {navItems.map((item, index) => {
                const isActive = location.pathname.includes(item.path.split('/')[1]);
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors font-medium ${
                      isActive
                        ? 'bg-[#2A2A2A] text-[#bd4dd6]'
                        : 'text-[#a0a0a0] hover:text-white hover:bg-[#2A2A2A]/50'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-[#bd4dd6]' : ''}`} />
                    <span className="text-sm">{item.text}</span>
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
        className={`relative z-10 transition-all duration-300 ease-out ${isSidebarOpen && !isMobile ? 'md:ml-64' : 'ml-0'}`}
        style={{ paddingTop: '64px' }}
      >
        <div className="p-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}