import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, X, Zap, Clock, TrendingUp, Users, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ActiveOffer {
  id: string;
  title: string;
  description: string;
  discount_code: string;
  discount_percent: number;
  account_types: string[];
  expires_at: string;
  is_active: boolean;
}

export default function OffersBanner() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [premiumAccounts, setPremiumAccounts] = useState<Array<{ size: string, original: number, discounted: number }>>([]);
  const [selectedPremiumIndex, setSelectedPremiumIndex] = useState(0);

  useEffect(() => {
    loadOffers();
    loadDismissedOffers();
    loadPremiumAccounts();

    loadOffers();
    loadDismissedOffers();
    loadPremiumAccounts();

    const targetDate = new Date('2026-03-31T23:59:59').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_offers')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (err) {
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPremiumAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('account_packages')
        .select('name, balance, price')
        .gte('balance', 10000)
        .order('balance', { ascending: true });

      if (error) throw error;
      const accounts = (data || []).map(pkg => ({
        size: `$${(pkg.balance / 1000)}K`,
        original: pkg.price,
        discounted: Math.round(pkg.price * 0.5)
      }));
      setPremiumAccounts(accounts);
    } catch (err) {
      console.error('Error loading premium accounts:', err);
    }
  };

  const loadDismissedOffers = () => {
    const dismissed = localStorage.getItem('dismissedOffers');
    if (dismissed) {
      setDismissedOffers(JSON.parse(dismissed));
    }
  };

  if (loading) return null;

  return (
    <div className="mb-6 space-y-6">
      <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md overflow-hidden shadow-sm">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-[#12161f] to-[#1e1e1e] border-b border-[#2A2A2A] relative flex flex-col md:flex-row items-center justify-between text-left overflow-hidden">
          
          <div className="p-8 lg:p-12 relative z-10 flex-1">
            <div className="inline-flex items-center bg-[#bd4dd6] text-white text-xs font-bold px-3 py-1 rounded-sm mb-6">
              <Zap className="w-3 h-3 mr-1.5" />
              Instant Funding Event: {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Scale Your Capital Instantly.
            </h2>
            <p className="text-[#a0a0a0] mb-8 max-w-lg">
              No evaluation phases. No subjective rules. Get up to $200,000 in firm capital with instant provisioning.
              Enjoy 50% Off all Premium Loadouts by using code <code className="bg-[#2A2A2A] text-white px-2 py-1 rounded">GROWING50</code> today.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/buy-account')}
                className="px-8 py-3 bg-[#bd4dd6] hover:bg-[#a63aba] text-white font-bold rounded text-sm transition-colors"
              >
                Execute Allocation
              </button>
            </div>
          </div>

          <div className="w-full md:w-[400px] h-64 md:h-full relative z-0 flex items-end justify-center md:justify-end pr-0 md:pr-12 pt-8 md:pt-0">
             <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1e1e1e] md:from-transparent to-transparent z-10 pointer-events-none"></div>
             <img src="/guy-holding-phone.png" alt="Trader" className="w-[80%] max-w-[300px] h-auto relative z-0 object-contain object-bottom drop-shadow-2xl translate-y-[20%]" />
          </div>
        </div>

        {/* Feature Comparison / Tools Unlock section */}
        <div className="bg-black/20 p-6">
          <p className="text-center text-xs font-bold text-[#a0a0a0] uppercase mb-6 flex items-center justify-center gap-2">
            What you unlock <ChevronRight className="w-3 h-3" />
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <Users className="w-4 h-4 text-[#bd4dd6]" />
              EQUITY SIMULATOR
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <TrendingUp className="w-4 h-4 text-[#bd4dd6]" />
              ENHANCED ANALYSIS
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <Zap className="w-4 h-4 text-[#bd4dd6]" />
              PREMIUM APPS
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <Clock className="w-4 h-4 text-[#bd4dd6]" />
              NO TIME LIMITS
            </div>
          </div>
        </div>
      </div>
      
      {/* Single Compact Variant Selector */}
      <h3 className="text-sm font-bold text-white uppercase tracking-widest px-1 drop-shadow-[0_0_8px_rgba(189,77,214,0.5)] mb-4">
        Premium Instant Loadouts (50% Off)
      </h3>
      {premiumAccounts.length > 0 && (
        <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md overflow-hidden flex flex-col mb-6">
          <div className="p-5 md:p-6">
            {/* Variant Selector Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <span className="text-sm text-gray-400 font-medium w-full sm:w-auto">Select Account Size:</span>
              <div className="flex flex-wrap items-center gap-2">
                {premiumAccounts.map((account, index) => (
                  <button
                    key={account.size}
                    onClick={() => setSelectedPremiumIndex(index)}
                    className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 ${
                      selectedPremiumIndex === index
                        ? 'bg-[#bd4dd6] text-white border border-[#bd4dd6] shadow-[0_0_15px_rgba(189,77,214,0.3)]'
                        : 'bg-transparent text-gray-400 border border-[#404040] hover:border-[#bd4dd6] hover:text-white'
                    }`}
                  >
                    {account.size}
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Action Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161616] p-5 md:p-6 rounded border border-[#2A2A2A] shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#bd4dd6]"></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {premiumAccounts[selectedPremiumIndex].size} Instant Allocation
                </h3>
                <div className="flex items-center gap-3">
                   <span className="text-sm text-gray-500 line-through font-mono font-bold mt-1">
                     ${premiumAccounts[selectedPremiumIndex].original}
                   </span>
                   <span className="text-3xl font-black text-[#bd4dd6] font-mono leading-none tracking-tight">
                     ${premiumAccounts[selectedPremiumIndex].discounted}
                   </span>
                   <span className="text-[10px] uppercase bg-[#bd4dd6]/10 text-[#bd4dd6] px-2 py-1 rounded font-bold border border-[#bd4dd6]/20 mt-1">
                     Save 50%
                   </span>
                </div>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <button 
                  onClick={() => navigate('/buy-account')}
                  className="w-full md:w-auto px-8 py-3.5 bg-[#bd4dd6] hover:bg-[#a63aba] text-white font-bold rounded text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                 >
                  Claim {premiumAccounts[selectedPremiumIndex].size} Allocation <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shared Rules Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 mt-6 pt-5 border-t border-[#2A2A2A]">
              <div className="flex items-start md:items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-[#bd4dd6] mt-0.5 md:mt-0 flex-shrink-0" />
                <span className="text-[11px] md:text-xs text-[#a0a0a0] font-medium leading-tight">Direct Allocation</span>
              </div>
              <div className="flex items-start md:items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-[#bd4dd6] mt-0.5 md:mt-0 flex-shrink-0" />
                <span className="text-[11px] md:text-xs text-[#a0a0a0] font-medium leading-tight">No Evaluation Phases</span>
              </div>
              <div className="flex items-start md:items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-[#bd4dd6] mt-0.5 md:mt-0 flex-shrink-0" />
                <span className="text-[11px] md:text-xs text-[#a0a0a0] font-medium leading-tight">Keep up to 80% Profits</span>
              </div>
              <div className="flex items-start md:items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-[#bd4dd6] mt-0.5 md:mt-0 flex-shrink-0" />
                <span className="text-[11px] md:text-xs text-[#a0a0a0] font-medium leading-tight">Bi-Weekly Payouts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
