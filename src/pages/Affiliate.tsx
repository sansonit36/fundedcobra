import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Gift, Copy, ArrowRight, ChevronRight, ExternalLink, List, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AffiliateTier {
  name: string;
  commission: number;
  requiredReferrals: number;
  benefits: string[];
  color: string;
}

const affiliateTiers: AffiliateTier[] = [
  {
    name: 'Bronze',
    commission: 10,
    requiredReferrals: 0,
    benefits: [
      'Basic commission rate',
      'Access to affiliate dashboard',
      'Monthly payouts',
      'Marketing materials'
    ],
    color: 'from-amber-600 to-amber-700'
  },
  {
    name: 'Silver',
    commission: 15,
    requiredReferrals: 5,
    benefits: [
      'Increased commission rate',
      'Priority support',
      'Custom tracking links',
      'Weekly payouts',
      'Exclusive promotions'
    ],
    color: 'from-gray-400 to-gray-500'
  },
  {
    name: 'Gold',
    commission: 20,
    requiredReferrals: 15,
    benefits: [
      'Premium commission rate',
      'VIP support',
      'Custom landing pages',
      'Bi-weekly payouts',
      'Early access to new features',
      'Special event invitations'
    ],
    color: 'from-yellow-500 to-yellow-600'
  },
  {
    name: 'Diamond',
    commission: 25,
    requiredReferrals: 30,
    benefits: [
      'Maximum commission rate',
      'Dedicated account manager',
      'Custom marketing campaigns',
      'Instant payouts',
      'Revenue share bonuses',
      'Exclusive workshops',
      'Co-branded opportunities'
    ],
    color: 'from-blue-400 to-blue-500'
  }
];

const mockStats = {
  referrals: 12,
  earnings: 3450.75,
  currentTier: 'Gold',
  nextTier: 'Diamond',
  referralsToNextTier: 18,
  affiliateLink: 'https://rivertonmarkets.com/ref/USER123'
};

export default function Affiliate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCopied, setShowCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    referrals: 0,
    earnings: 0,
    currentTier: 'Bronze',
    currentCommission: 10,
    nextTier: 'Silver',
    referralsToNextTier: 5,
    affiliateLink: ''
  });

  useEffect(() => {
    if (user) {
      loadAffiliateData();
    }
  }, [user]);

  const loadAffiliateData = async () => {
    try {
      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user?.id)
        .single();

      let referralCode = profile?.referral_code;

      // Generate referral code if doesn't exist
      if (!referralCode) {
        const { data: newCode } = await supabase.rpc('generate_referral_code');
        referralCode = newCode;

        // Update profile with new code
        await supabase
          .from('profiles')
          .update({ referral_code: referralCode })
          .eq('id', user?.id);
      }

      // Get referral count
      const { data: referrals, count } = await supabase
        .from('affiliate_referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', user?.id)
        .eq('status', 'active');

      const referralCount = count || 0;

      // Get current tier
      const { data: tierData } = await supabase.rpc('get_affiliate_tier', {
        p_user_id: user?.id
      });

      const currentTier = tierData?.[0] || { tier_name: 'Bronze', commission_rate: 10 };

      // Get earnings
      const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', {
        p_user_id: user?.id
      });

      const earnings = earningsData?.[0]?.total_earnings || 0;

      // Determine next tier
      const tiers = affiliateTiers;
      const currentTierIndex = tiers.findIndex(t => t.name === currentTier.tier_name);
      const nextTierData = tiers[currentTierIndex + 1];

      setStats({
        referrals: referralCount,
        earnings: Number(earnings),
        currentTier: currentTier.tier_name,
        currentCommission: Number(currentTier.commission_rate),
        nextTier: nextTierData?.name || currentTier.tier_name,
        referralsToNextTier: nextTierData ? nextTierData.requiredReferrals - referralCount : 0,
        affiliateLink: `https://account.rivertonmarkets.com/signup?ref=${referralCode}`
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Affiliate Program</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/affiliate/referrals')}
            className="flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
          >
            <List className="w-4 h-4 mr-2" />
            My Referrals
          </button>
          <button
            onClick={() => navigate('/affiliate/withdrawal')}
            className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Withdraw
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            {showCopied ? (
              'Copied!'
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Referrals</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.referrals}</h3>
            <span className="text-sm text-gray-400">users</span>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Earnings</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.earnings.toLocaleString()}</h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Gift className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Current Tier</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.currentTier}</h3>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4">Progress to {stats.nextTier}</h3>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-blue-500/20 text-blue-400">
                {stats.referrals} / {stats.referrals + stats.referralsToNextTier} Referrals
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-gray-400">
                {stats.referralsToNextTier} more to {stats.nextTier}
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-white/5">
            <div
              style={{ width: `${stats.referralsToNextTier > 0 ? (stats.referrals / (stats.referrals + stats.referralsToNextTier)) * 100 : 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            ></div>
          </div>
        </div>
      </div>

      {/* Affiliate Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {affiliateTiers.map((tier) => (
          <div
            key={tier.name}
            className={`card-gradient rounded-2xl p-6 border border-white/5 relative overflow-hidden`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${tier.color}`}></div>
            
            {/* Content */}
            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="text-3xl font-bold text-white mb-4">
                {tier.commission}%
                <span className="text-sm font-normal text-gray-400 ml-1">commission</span>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Requirements:</div>
                <div className="flex items-center text-white">
                  <Users className="w-4 h-4 mr-2 text-blue-400" />
                  {tier.requiredReferrals}+ referrals
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-2">Benefits:</div>
                {tier.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start text-gray-300">
                    <ChevronRight className="w-4 h-4 mr-1 mt-1 text-blue-400 shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              {stats.currentTier === tier.name && (
                <div className="absolute top-4 right-4">
                  <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                    Current Tier
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-xl font-bold text-white mb-6">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              1
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Share Your Link</h4>
              <p className="text-gray-400">Share your unique affiliate link with potential traders</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              2
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Earn Commissions</h4>
              <p className="text-gray-400">Earn commissions when your referrals purchase accounts</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              3
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Get Paid</h4>
              <p className="text-gray-400">Receive your earnings through your preferred payment method</p>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Resources */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Marketing Resources</h3>
          <a
            href="#"
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all resources
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="#"
            className="flex items-center p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Banners & Logos</h4>
              <p className="text-sm text-gray-400">Download our official marketing materials</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </a>
          <a
            href="#"
            className="flex items-center p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Landing Pages</h4>
              <p className="text-sm text-gray-400">Access our high-converting landing pages</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}