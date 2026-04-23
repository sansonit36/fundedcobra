import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Gift, Copy, ChevronRight, ExternalLink, List, Wallet, Check, Link2, Star, Crown, Medal, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AffiliateTier {
  name: string;
  commission: number;
  requiredReferrals: number;
  benefits: string[];
  color: string;
  accent: string;
  icon: React.ReactNode;
}

// ⚠️ MUST match affiliate_tiers DB table exactly
const affiliateTiers: AffiliateTier[] = [
  {
    name: 'Bronze',
    commission: 5,
    requiredReferrals: 0,
    benefits: ['Commission on every sale', 'Affiliate dashboard access', 'Monthly payouts'],
    color: 'border-amber-700/40 bg-amber-700/5',
    accent: 'text-amber-500',
    icon: <Shield className="w-5 h-5 text-amber-500" />,
  },
  {
    name: 'Silver',
    commission: 8,
    requiredReferrals: 10,
    benefits: ['Higher commission rate', 'Priority support', 'Weekly payouts', 'Custom tracking links'],
    color: 'border-gray-400/30 bg-gray-400/5',
    accent: 'text-gray-300',
    icon: <Medal className="w-5 h-5 text-gray-300" />,
  },
  {
    name: 'Gold',
    commission: 10,
    requiredReferrals: 25,
    benefits: ['Premium commission rate', 'VIP support', 'Bi-weekly payouts', 'Early feature access'],
    color: 'border-yellow-500/30 bg-yellow-500/5',
    accent: 'text-yellow-400',
    icon: <Star className="w-5 h-5 text-yellow-400" />,
  },
  {
    name: 'Diamond',
    commission: 12,
    requiredReferrals: 50,
    benefits: ['Max commission rate', 'Dedicated account manager', 'Instant payouts', 'Co-branding opportunities'],
    color: 'border-[#bd4dd6]/30 bg-[#bd4dd6]/5',
    accent: 'text-[#bd4dd6]',
    icon: <Crown className="w-5 h-5 text-[#bd4dd6]" />,
  }
];

export default function Affiliate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCopied, setShowCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    referrals: 0,
    activeReferrals: 0,
    earnings: 0,
    currentTier: 'Bronze',
    currentCommission: 5,
    nextTier: 'Silver',
    referralsToNextTier: 10,
    affiliateLink: ''
  });

  useEffect(() => {
    if (user) loadAffiliateData();
  }, [user]);

  const loadAffiliateData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user?.id)
        .single();

      let referralCode = profile?.referral_code;

      if (!referralCode) {
        const { data: newCode } = await supabase.rpc('generate_referral_code');
        referralCode = newCode;
        await supabase.from('profiles').update({ referral_code: referralCode }).eq('id', user?.id);
      }

      const { count } = await supabase
        .from('affiliate_referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', user?.id);

      const totalSignups = count || 0;

      const { data: activeCountData } = await supabase.rpc('get_active_referral_count', { p_user_id: user?.id });
      const activeTraderCount = activeCountData || 0;

      const { data: tierData } = await supabase.rpc('get_affiliate_tier', { p_user_id: user?.id });
      const currentTier = tierData?.[0] || { tier_name: 'Bronze', commission_rate: 5 };

      const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', { p_user_id: user?.id });
      const totalEarnings = earningsData?.[0]?.total_earnings || 0;

      let nextTier = 'Max Tier';
      let referralsToNextTier = 0;
      const currentTierIndex = affiliateTiers.findIndex(t => t.name === currentTier.tier_name);
      if (currentTierIndex < affiliateTiers.length - 1) {
        const nextUserTier = affiliateTiers[currentTierIndex + 1];
        nextTier = nextUserTier.name;
        referralsToNextTier = Math.max(0, nextUserTier.requiredReferrals - activeTraderCount);
      }

      setStats({
        referrals: totalSignups,
        activeReferrals: activeTraderCount,
        earnings: Number(totalEarnings),
        currentTier: currentTier.tier_name,
        currentCommission: Number(currentTier.commission_rate),
        nextTier,
        referralsToNextTier,
        affiliateLink: `${import.meta.env.VITE_SITE_URL}/signup?ref=${referralCode}`
      });
    } catch (error) {
      console.error('Error loading affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(stats.affiliateLink);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const currentTierObj = affiliateTiers.find(t => t.name === stats.currentTier);
  const nextTierObj = affiliateTiers.find(t => t.name === stats.nextTier);
  const progressPct = stats.referralsToNextTier > 0
    ? (stats.activeReferrals / (stats.activeReferrals + stats.referralsToNextTier)) * 100
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#bd4dd6]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Affiliate Program</h1>
          <p className="text-gray-400 text-sm mt-1">Earn commissions by referring traders to FundedCobra.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate('/affiliate/referrals')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border border-[#2A2A2A] hover:border-[#404040] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <List className="w-4 h-4" /> My Referrals
          </button>
          <button
            onClick={() => navigate('/affiliate/withdrawal')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border border-[#2A2A2A] hover:border-[#404040] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Wallet className="w-4 h-4" /> Withdraw
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-[#bd4dd6] hover:bg-[#aa44c0] text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-[#bd4dd6]/20"
          >
            {showCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
          </button>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#bd4dd6]/10 flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5 text-[#bd4dd6]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Your Referral Link</p>
          <p className="text-white text-sm font-mono truncate">{stats.affiliateLink || 'Generating your link...'}</p>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#bd4dd6]/10 hover:bg-[#bd4dd6]/20 text-[#bd4dd6] text-sm font-bold rounded-lg transition-colors border border-[#bd4dd6]/20"
        >
          {showCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {showCopied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Signups', value: stats.referrals, sub: 'via your link', icon: Users, color: 'text-[#bd4dd6]', bg: 'bg-[#bd4dd6]/10' },
          { label: 'Active Traders', value: stats.activeReferrals, sub: 'purchased accounts', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Total Earned', value: `$${stats.earnings.toLocaleString()}`, sub: 'all time', icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Commission Rate', value: `${stats.currentCommission}%`, sub: `${stats.currentTier} tier`, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#1e1e1e] rounded-xl border border-[#2A2A2A] p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
            <p className={`text-xl font-bold ${color} mt-1`}>{value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Progress to Next Tier */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentTierObj?.icon}
            <div>
              <p className="text-white font-bold text-sm">{stats.currentTier} Tier</p>
              <p className="text-xs text-gray-500">{stats.currentCommission}% commission</p>
            </div>
          </div>
          {stats.nextTier !== 'Max Tier' && nextTierObj && (
            <div className="text-right">
              <p className={`font-bold text-sm ${nextTierObj.accent}`}>{stats.nextTier}</p>
              <p className="text-xs text-gray-500">{stats.referralsToNextTier} active traders needed</p>
            </div>
          )}
          {stats.nextTier === 'Max Tier' && (
            <span className="text-xs font-bold text-[#bd4dd6] bg-[#bd4dd6]/10 px-3 py-1 rounded-full border border-[#bd4dd6]/20">Max Tier Reached 🎉</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-[#161616] border border-[#2A2A2A] overflow-hidden">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full rounded-full bg-gradient-to-r from-[#bd4dd6] to-purple-400 transition-all duration-700"
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">{stats.activeReferrals} active traders</span>
          {stats.nextTier !== 'Max Tier' && nextTierObj && (
            <span className="text-xs text-gray-500">{nextTierObj.requiredReferrals} needed for {stats.nextTier}</span>
          )}
        </div>
      </div>

      {/* Commission Tiers */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Commission Tiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {affiliateTiers.map((tier) => {
            const isActive = stats.currentTier === tier.name;
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-5 transition-all ${tier.color} ${isActive ? 'ring-2 ring-[#bd4dd6]/40' : ''}`}
              >
                {isActive && (
                  <div className="absolute -top-2 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#bd4dd6] text-white">
                    Your Tier
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3 mt-1">
                  {tier.icon}
                  <span className={`font-bold text-base ${tier.accent}`}>{tier.name}</span>
                </div>
                <div className={`text-3xl font-black ${tier.accent} mb-1`}>{tier.commission}%</div>
                <p className="text-xs text-gray-500 mb-4">
                  {tier.requiredReferrals === 0 ? 'No minimum' : `${tier.requiredReferrals}+ active traders`}
                </p>
                <div className="space-y-1.5">
                  {tier.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <ChevronRight className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${tier.accent}`} />
                      <span className="text-xs text-gray-300">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] p-5">
        <h3 className="text-base font-bold text-white mb-5">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Share Your Link', desc: 'Copy your unique referral URL and share it with your audience, friends, or trading community.' },
            { step: '2', title: 'They Buy an Account', desc: 'When someone signs up using your link and purchases a funded account, we track it automatically.' },
            { step: '3', title: 'You Get Paid', desc: 'Commissions are credited to your affiliate balance and can be withdrawn at any time.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#bd4dd6]/20 flex items-center justify-center text-[#bd4dd6] font-black flex-shrink-0">
                {step}
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}