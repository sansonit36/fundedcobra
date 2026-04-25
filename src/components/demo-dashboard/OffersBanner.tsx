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

  // ============================================================
  // COMPACT MODE — slim banner for active trader dashboard
  // ============================================================
  if (compact) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] cursor-pointer group"
        style={{ background: 'linear-gradient(135deg, #1a1025 0%, #161B22 60%, #161B22 100%)' }}
        onClick={() => navigate('/buy-account')}
      >
        <div className="absolute top-0 right-0 w-60 h-60 bg-[#8A2BE2]/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#8A2BE2]/15 border border-[#8A2BE2]/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-[#8A2BE2]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Premium Instant Funding — 50% OFF</p>
              <p className="text-xs text-[#8B949E] mt-0.5">Get up to $200K in firm capital. No evaluations, no waiting.</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap shadow-md shadow-[#8A2BE2]/20 group-hover:shadow-[#8A2BE2]/30">
            Get Funded <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // FULL MODE — for new signups (kept from original, restyled)
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Premium Accounts Selector */}
      <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider px-1 flex items-center gap-3">
        Premium Instant Accounts
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider border border-emerald-500/20">50% OFF</span>
      </h3>

      <div className="rounded-2xl bg-[#161B22]/80 border border-white/[0.06] overflow-hidden">
        <div className="p-6">
          {/* Size Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <span className="text-sm text-[#8B949E] font-medium">Select size:</span>
            <div className="flex flex-wrap items-center gap-2">
              {premiumPackages.map((pkg, index) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    selectedIndex === index
                      ? 'bg-[#8A2BE2] text-white border border-[#8A2BE2] shadow-md shadow-[#8A2BE2]/25'
                      : 'bg-transparent text-[#8B949E] border border-white/[0.08] hover:border-[#8A2BE2]/50 hover:text-white'
                  }`}
                >
                  ${(pkg.balance / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* Price & Action */}
          {selectedPkg && (
            <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0D1117]/60 p-6 rounded-xl border border-white/[0.06]">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#8A2BE2] to-emerald-500" />
              <div className="pl-4">
                <h3 className="text-lg font-bold text-white mb-2">
                  ${(selectedPkg.balance / 1000).toFixed(0)}K Instant Allocation
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#484f58] line-through font-mono font-bold">${selectedPkg.price}</span>
                  <span className="text-3xl font-bold text-[#8A2BE2] font-mono tracking-tight">${discountedPrice}</span>
                  <span className="text-[10px] uppercase bg-[#8A2BE2]/10 text-[#8A2BE2] px-2 py-1 rounded-lg font-semibold border border-[#8A2BE2]/20">
                    Save 50%
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/buy-account')}
                className="w-full md:w-auto px-8 py-3.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8A2BE2]/25 hover:shadow-[#8A2BE2]/40 flex items-center justify-center gap-2"
              >
                Claim ${(selectedPkg.balance / 1000).toFixed(0)}K <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.04]">
            {[
              'Direct Allocation',
              'No Evaluation Phases',
              'Keep up to 80% Profits',
              'Bi-Weekly Payouts'
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-[#8B949E] font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
