import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Referral {
  id: string;
  name: string;
  email: string;
  created_at: string;
  status: string;
  hasPurchased: boolean;
  totalSpent: number;
  commissionEarned: number;
}

export default function AffiliateReferrals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommissions: 0,
    thisMonthCommissions: 0
  });

  useEffect(() => {
    if (user) {
      loadReferrals();
    }
  }, [user]);

  const loadReferrals = async () => {
    try {
      // Get all referrals
      const { data: referralData } = await supabase
        .from('affiliate_referrals')
        .select(`
          id,
          created_at,
          status,
          referred_id,
          profiles!affiliate_referrals_referred_id_fkey (id, name, email, created_at)
        `)
        .eq('referrer_id', user?.id)
        .order('created_at', { ascending: false });

      if (!referralData) return;

      // Load purchase data for each referral
      const referralsWithStats = await Promise.all(
        referralData.map(async (ref: any) => {
          const profile = ref.profiles;

          // Get total spent by this referral
          const { data: purchases } = await supabase
            .from('account_requests')
            .select('amount, status')
            .eq('user_id', ref.referred_id)
            .eq('status', 'approved');

          const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

          // Get commissions earned from this referral
          const { data: earnings } = await supabase
            .from('affiliate_earnings')
            .select('amount')
            .eq('affiliate_id', user?.id)
            .eq('referral_id', ref.referred_id);

          const commissionEarned = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

          return {
            id: ref.id,
            name: profile?.name || 'Unknown',
            email: profile?.email || 'N/A',
            created_at: ref.created_at,
            status: ref.status,
            hasPurchased: (purchases?.length || 0) > 0,
            totalSpent,
            commissionEarned
          };
        })
      );

      setReferrals(referralsWithStats);

      // Calculate stats
      const activeCount = referralsWithStats.filter(r => r.status === 'active').length;
      const totalComm = referralsWithStats.reduce((sum, r) => sum + r.commissionEarned, 0);

      // Get this month's commissions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: thisMonthEarnings } = await supabase
        .from('affiliate_earnings')
        .select('amount')
        .eq('affiliate_id', user?.id)
        .gte('created_at', startOfMonth.toISOString());

      const thisMonthTotal = thisMonthEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        totalReferrals: referralsWithStats.length,
        activeReferrals: activeCount,
        totalCommissions: totalComm,
        thisMonthCommissions: thisMonthTotal
      });
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
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
      <h1 className="text-2xl font-bold text-white">My Referrals</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Referrals</p>
          <h3 className="text-2xl font-bold text-white">{stats.totalReferrals}</h3>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Active Referrals</p>
          <h3 className="text-2xl font-bold text-white">{stats.activeReferrals}</h3>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Commissions</p>
          <h3 className="text-2xl font-bold text-white">${stats.totalCommissions.toFixed(2)}</h3>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">This Month</p>
          <h3 className="text-2xl font-bold text-white">${stats.thisMonthCommissions.toFixed(2)}</h3>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Referral List</h3>

        {referrals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No referrals yet</p>
            <p className="text-sm">Share your affiliate link to start earning commissions!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Joined Date</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Total Spent</th>
                  <th className="pb-3 text-left text-gray-400 font-medium">Your Commission</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      <div>
                        <p className="text-white font-medium">{referral.name}</p>
                        <p className="text-sm text-gray-400">{referral.email}</p>
                      </div>
                    </td>
                    <td className="py-4 text-gray-300">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          referral.status === 'active'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {referral.status}
                      </span>
                    </td>
                    <td className="py-4 text-white font-semibold">
                      ${referral.totalSpent.toFixed(2)}
                      {referral.hasPurchased && (
                        <span className="ml-2 text-xs text-green-400">✓ Purchased</span>
                      )}
                    </td>
                    <td className="py-4 text-purple-400 font-bold">
                      ${referral.commissionEarned.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
