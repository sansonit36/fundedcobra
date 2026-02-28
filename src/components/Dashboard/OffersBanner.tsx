import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, X, Zap, Clock, TrendingUp, Users } from 'lucide-react';
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

interface AccountPackage {
  id: string;
  name: string;
  balance: number;
  price: number;
}

export default function OffersBanner() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [ramadanDismissed, setBlackFridayDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [premiumAccounts, setPremiumAccounts] = useState<Array<{size: string, original: number, discounted: number}>>([]);

  useEffect(() => {
    loadOffers();
    loadDismissedOffers();
    loadPremiumAccounts();
    
    // Check if Ramadan Kareem banner is dismissed
    const dismissed = localStorage.getItem('ramadanDismissed');
    if (dismissed === 'true') {
      setBlackFridayDismissed(true);
    }

    // Countdown timer to December 18, 2025
    const targetDate = new Date('2025-12-18T23:59:59').getTime();
    
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
      // Fetch only Premium Instant Accounts (balance >= $10,000)
      const { data, error } = await supabase
        .from('account_packages')
        .select('name, balance, price')
        .gte('balance', 10000)
        .order('balance', { ascending: true });

      if (error) throw error;
      
      // Map to the format needed for display
      const accounts = (data || []).map(pkg => ({
        size: `$${(pkg.balance / 1000)}K`,
        original: pkg.price,
        discounted: Math.round(pkg.price * 0.5) // 50% discount
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

  const dismissOffer = (offerId: string) => {
    const updated = [...dismissedOffers, offerId];
    setDismissedOffers(updated);
    localStorage.setItem('dismissedOffers', JSON.stringify(updated));
  };

  const dismissRamadan = () => {
    setBlackFridayDismissed(true);
    localStorage.setItem('ramadanDismissed', 'true');
  };

  const activeOffers = offers.filter(offer => !dismissedOffers.includes(offer.id));

  if (loading) return null;
  if (ramadanDismissed) return null;

  return (
    <div className="space-y-4">
      {/* Comprehensive Ramadan Kareem Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-green-500/40 shadow-2xl">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-emerald-600/10 to-green-600/10 opacity-50 animate-pulse"></div>
          
          {/* Close button */}
          <button
            onClick={dismissRamadan}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 p-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Tag className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
                    🎉 Ramadan Kareem Mega Sale
                  </h2>
                  <p className="text-green-400 font-medium text-lg">
                    50% OFF All Premium Instant Accounts
                  </p>
                </div>
              </div>
              
              {/* Countdown Timer */}
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-bold text-sm uppercase">Offer Ends In</span>
                </div>
                <div className="flex space-x-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
                    <div className="text-xs text-gray-400">Days</div>
                  </div>
                  <div className="text-2xl font-bold text-white">:</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="text-xs text-gray-400">Hours</div>
                  </div>
                  <div className="text-2xl font-bold text-white">:</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
                    <div className="text-xs text-gray-400">Mins</div>
                  </div>
                  <div className="text-2xl font-bold text-white">:</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
                    <div className="text-xs text-gray-400">Secs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* FOMO Elements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Users className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-white font-bold">247 Traders</div>
                  <div className="text-xs text-gray-400">Claimed this offer today</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-white font-bold">Limited Spots</div>
                  <div className="text-xs text-gray-400">Only 53 accounts left</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Zap className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-bold">Instant Activation</div>
                  <div className="text-xs text-gray-400">Start trading immediately</div>
                </div>
              </div>
            </div>

            {/* Account Packages Grid */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Tag className="w-5 h-5 text-green-400 mr-2" />
                Choose Your Account Size
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {premiumAccounts.map((account) => (
                  <div
                    key={account.size}
                    className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-green-500/30 hover:border-green-500/60 transition-all cursor-pointer group"
                  >
                    {/* 50% OFF Badge */}
                    <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                      -50%
                    </div>
                    
                    <div className="text-center">
                      <div className="text-xl font-bold text-white mb-2">{account.size}</div>
                      <div className="space-y-1">
                        <div className="text-sm text-gray-400 line-through font-medium">
                          Was ${account.original}
                        </div>
                        <div className="text-3xl font-bold text-green-400">
                          ${account.discounted}
                        </div>
                      </div>
                      <div className="mt-3 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                        <div className="text-sm text-green-400 font-bold">
                          Save ${account.original - account.discounted}!
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount Code & CTA */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="flex-1 p-4 rounded-xl bg-slate-800/50 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-400 block mb-1">Discount Code (Auto-Applied)</span>
                    <code className="text-xl font-bold text-green-400 font-mono">RAMADAN50</code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('RAMADAN50');
                    }}
                    className="px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/buy-account')}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-green-500/30 flex items-center justify-center space-x-2 group"
              >
                <span>Claim 50% OFF Now</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-400">
              <span>✓ No hidden fees</span>
              <span>✓ Instant activation</span>
              <span>✓ 24/7 support</span>
              <span>✓ Refundable after 5 payouts</span>
            </div>
          </div>
        </div>
    </div>
  );
}
