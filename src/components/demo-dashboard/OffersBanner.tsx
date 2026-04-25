import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Zap, Clock, TrendingUp, Shield, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PackageInfo {
  id: string;
  name: string;
  balance: number;
  price: number;
  account_type: string;
}

export default function OffersBanner({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [premiumPackages, setPremiumPackages] = useState<PackageInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPremiumPackages();
  }, []);

  const loadPremiumPackages = async () => {
    try {
      // Only load Premium Instant packages (balance >= 10000)
      const { data, error } = await supabase
        .from('account_packages')
        .select('id, name, balance, price, account_type')
        .eq('is_active', true)
        .eq('account_type', 'instant')
        .gte('balance', 10000)
        .order('balance', { ascending: true });

      if (error) throw error;
      setPremiumPackages(data || []);
    } catch (err) {
      console.error('Error loading premium packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = premiumPackages[selectedIndex] || premiumPackages[0];
  const discountedPrice = selectedPkg ? Math.round(selectedPkg.price * 0.5) : 0;

  if (loading || premiumPackages.length === 0) return null;

  // Compact mode for returning users who already have accounts
  if (compact) {
    return (
      <div className="mb-6">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #12161f 0%, #1a1025 50%, #161B22 100%)' }}
          onClick={() => navigate('/buy-account')}
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-[#8A2BE2]/8 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A2BE2]/20 to-[#8A2BE2]/5 border border-white/[0.04] flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-[#c084fc]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-bold text-white">Premium Instant Funding</p>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[9px] font-black tracking-wider border border-emerald-500/20">50% OFF</span>
                </div>
                <p className="text-xs text-[#8B949E] mt-0.5">Up to $200K in firm capital · No evaluations · Instant provisioning</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white text-sm font-bold rounded-xl transition-all duration-200 whitespace-nowrap shadow-lg shadow-[#8A2BE2]/20 group-hover:shadow-[#8A2BE2]/30 hover:-translate-y-0.5">
              Get Funded <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-6">
      {/* Hero Section */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden shadow-lg shadow-black/20"
           style={{ background: 'linear-gradient(135deg, #12161f 0%, #1a1025 40%, #161B22 100%)' }}>
        <div className="relative flex flex-col md:flex-row items-center justify-between text-left overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#8A2BE2]/8 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="p-8 lg:p-12 relative z-10 flex-1">
            <div className="inline-flex items-center bg-[#8A2BE2]/15 border border-[#8A2BE2]/25 text-[#c084fc] text-xs font-bold px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <Zap className="w-3 h-3 mr-1.5" />
              Premium Instant Funding — 50% OFF
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              Scale Your Capital Instantly.
            </h2>
            <p className="text-[#8B949E] mb-8 max-w-lg leading-relaxed">
              No evaluation phases. No subjective rules. Get up to $200,000 in firm capital with instant provisioning. 
              All Premium Instant accounts are <span className="text-[#c084fc] font-bold">50% OFF</span> right now.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/buy-account')}
                className="px-8 py-3 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8A2BE2]/25 hover:shadow-[#8A2BE2]/40 hover:-translate-y-0.5"
              >
                Get Funded Now
              </button>
            </div>
          </div>

          <div className="w-full md:w-[400px] h-64 md:h-full relative z-0 flex items-end justify-center md:justify-end pr-0 md:pr-12 pt-8 md:pt-0">
             <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#161B22] md:from-transparent to-transparent z-10 pointer-events-none"></div>
             <img src="/guy-holding-phone.png" alt="Trader" className="w-[80%] max-w-[300px] h-auto relative z-0 object-contain object-bottom drop-shadow-2xl translate-y-[20%]" />
          </div>
        </div>

        {/* Feature Strip */}
        <div className="bg-black/30 backdrop-blur-sm p-6 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {[
              { icon: Shield, label: 'RISK MANAGEMENT' },
              { icon: TrendingUp, label: 'UP TO 80% SPLIT' },
              { icon: Zap, label: 'MT5 PLATFORM' },
              { icon: Clock, label: 'NO TIME LIMITS' }
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 text-xs font-bold text-white/90 px-3 py-2.5 border border-white/[0.06] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <Icon className="w-4 h-4 text-[#c084fc]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Premium Accounts Selector */}
      <h3 className="text-sm font-bold text-white uppercase tracking-widest px-1 flex items-center gap-3">
        <span className="bg-gradient-to-r from-[#c084fc] to-[#8A2BE2] bg-clip-text text-transparent">Premium Instant Accounts</span>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[9px] font-black tracking-widest border border-emerald-500/20">50% OFF</span>
      </h3>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden shadow-lg shadow-black/10"
           style={{ background: 'linear-gradient(180deg, #161B22 0%, #131820 100%)' }}>
        <div className="p-5 md:p-6">
          {/* Size Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <span className="text-sm text-[#8B949E] font-medium w-full sm:w-auto">Select Account Size:</span>
            <div className="flex flex-wrap items-center gap-2">
              {premiumPackages.map((pkg, index) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    selectedIndex === index
                      ? 'bg-[#8A2BE2] text-white border border-[#8A2BE2] shadow-[0_0_20px_rgba(138,43,226,0.3)]'
                      : 'bg-transparent text-[#8B949E] border border-white/[0.08] hover:border-[#8A2BE2]/50 hover:text-white'
                  }`}
                >
                  ${(pkg.balance / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* Price & Action Row */}
          {selectedPkg && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 md:p-6 rounded-xl border border-white/[0.06] relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, #0f1318 0%, #161B22 100%)' }}>
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#8A2BE2] to-[#c084fc]"></div>
              <div className="pl-3">
                <h3 className="text-xl font-bold text-white mb-2">
                  ${(selectedPkg.balance / 1000).toFixed(0)}K Instant Allocation
                </h3>
                <div className="flex items-center gap-3">
                   <span className="text-sm text-[#484f58] line-through font-mono font-bold mt-1">
                     ${selectedPkg.price}
                   </span>
                   <span className="text-3xl font-black text-[#c084fc] font-mono leading-none tracking-tight">
                     ${discountedPrice}
                   </span>
                   <span className="text-[10px] uppercase bg-[#8A2BE2]/10 text-[#c084fc] px-2 py-1 rounded-lg font-bold border border-[#8A2BE2]/20 mt-1">
                     Save 50%
                   </span>
                </div>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <button 
                  onClick={() => navigate('/buy-account')}
                  className="w-full md:w-auto px-8 py-3.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8A2BE2]/25 hover:shadow-[#8A2BE2]/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  Claim ${(selectedPkg.balance / 1000).toFixed(0)}K Allocation <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Features Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 mt-6 pt-5 border-t border-white/[0.04]">
            {['Direct Allocation', 'No Evaluation Phases', 'Keep up to 80% Profits', 'Bi-Weekly Payouts'].map(feat => (
              <div key={feat} className="flex items-start md:items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-emerald-400 mt-0.5 md:mt-0 flex-shrink-0" />
                <span className="text-[11px] md:text-xs text-[#8B949E] font-medium leading-tight">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
