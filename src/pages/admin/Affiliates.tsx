import { useState, useEffect } from 'react';
import { Search, User, Ban, TrendingUp, Users, DollarSign, Eye, X, ArrowUpDown, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingPayouts: number;
  currentTier: string;
  commission: number;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  joinedAt: string;
  joinedAtRaw: string;
  lastActive: string;
  referralCode: string;
  stats: AffiliateStats;
}

interface ReferralDetail {
  id: string;
  referredName: string;
  referredEmail: string;
  status: string;
  joinedAt: string;
  purchaseAmount: number;
  commissionEarned: number;
}

// Data loaded from database

const statusStyles = {
  active: 'bg-green-500/10 text-green-400 border-green-400/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-400/20'
};

export default function Affiliates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'referrals' | 'earnings' | 'recent'>('referrals');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewModalAffiliate, setViewModalAffiliate] = useState<Affiliate | null>(null);
  const [affiliateReferrals, setAffiliateReferrals] = useState<ReferralDetail[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalCommissions: 0,
    pendingPayouts: 0
  });

  useEffect(() => {
    loadAffiliates();
    loadStats();
  }, []);

  const loadAffiliates = async () => {
    try {
      // Get all users with referral codes (affiliates)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .not('referral_code', 'is', null)
        .order('created_at', { ascending: false });

      if (!profiles) return;

      // Load data for each affiliate
      const affiliatesData = await Promise.all(
        profiles.map(async (profile) => {
          // Get referral count
          const { count: totalReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', profile.id);

          const { count: activeReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', profile.id)
            .eq('status', 'active');

          // Get earnings
          const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', {
            p_user_id: profile.id
          });

          // Get tier
          const { data: tierData } = await supabase.rpc('get_affiliate_tier', {
            p_user_id: profile.id
          });

          const tier = tierData?.[0] || { tier_name: 'Bronze', commission_rate: 10 };
          const earnings = earningsData?.[0] || { total_earnings: 0, pending_earnings: 0 };

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            status: profile.status === 'active' ? 'active' as const : 'suspended' as const,
            joinedAt: new Date(profile.created_at).toLocaleDateString(),
            joinedAtRaw: profile.created_at,
            lastActive: new Date(profile.updated_at || profile.created_at).toLocaleDateString(),
            referralCode: profile.referral_code,
            stats: {
              totalReferrals: totalReferrals || 0,
              activeReferrals: activeReferrals || 0,
              totalEarnings: Number(earnings.total_earnings || 0),
              pendingPayouts: Number(earnings.pending_earnings || 0),
              currentTier: tier.tier_name,
              commission: Number(tier.commission_rate)
            }
          };
        })
      );

      // Sort by referrals count (highest first) by default
      affiliatesData.sort((a, b) => b.stats.totalReferrals - a.stats.totalReferrals);
      setAffiliates(affiliatesData);
    } catch (error) {
      console.error('Error loading affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total affiliates count
      const { count: totalAffiliates } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .not('referral_code', 'is', null);

      // Get active affiliates
      const { count: activeAffiliates } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .not('referral_code', 'is', null)
        .eq('status', 'active');

      // Get total commissions
      const { data: commissionsData } = await supabase
        .from('affiliate_earnings')
        .select('amount');

      const totalCommissions = commissionsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Get pending payouts
      const { data: pendingData } = await supabase
        .from('affiliate_earnings')
        .select('amount')
        .eq('status', 'pending');

      const pendingPayouts = pendingData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        totalAffiliates: totalAffiliates || 0,
        activeAffiliates: activeAffiliates || 0,
        totalCommissions,
        pendingPayouts
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAffiliateReferrals = async (affiliateId: string) => {
    setLoadingReferrals(true);
    try {
      // Get all referrals for this affiliate
      const { data: referrals } = await supabase
        .from('affiliate_referrals')
        .select(`
          id,
          status,
          created_at,
          referred_id
        `)
        .eq('referrer_id', affiliateId)
        .order('created_at', { ascending: false });

      if (!referrals) {
        setAffiliateReferrals([]);
        return;
      }

      // Get profile and earnings data for each referral
      const referralDetails = await Promise.all(
        referrals.map(async (ref) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email, created_at')
            .eq('id', ref.referred_id)
            .single();

          // Get earnings from this referral with source transaction details
          const { data: earnings } = await supabase
            .from('affiliate_earnings')
            .select('amount, source_transaction')
            .eq('affiliate_id', affiliateId)
            .eq('referral_id', ref.referred_id);

          const totalCommission = earnings?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

          // Get purchase amounts from account_requests
          let purchaseAmount = 0;
          if (earnings && earnings.length > 0) {
            const transactionIds = earnings
              .filter(e => e.source_transaction)
              .map(e => e.source_transaction);
            
            if (transactionIds.length > 0) {
              const { data: transactions } = await supabase
                .from('account_requests')
                .select('price')
                .in('id', transactionIds);
              
              purchaseAmount = transactions?.reduce((sum, t) => sum + Number(t.price || 0), 0) || 0;
            }
          }

          return {
            id: ref.id,
            referredName: profile?.name || 'Unknown',
            referredEmail: profile?.email || '',
            status: ref.status,
            joinedAt: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A',
            purchaseAmount,
            commissionEarned: totalCommission
          };
        })
      );

      setAffiliateReferrals(referralDetails);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const openViewModal = (affiliate: Affiliate) => {
    setViewModalAffiliate(affiliate);
    loadAffiliateReferrals(affiliate.id);
  };

  const closeViewModal = () => {
    setViewModalAffiliate(null);
    setAffiliateReferrals([]);
  };

  // Filter affiliates
  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = 
      affiliate.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.referralCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
    const matchesTier = tierFilter === 'all' || affiliate.stats.currentTier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Sort affiliates
  const sortedAffiliates = [...filteredAffiliates].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'referrals':
        comparison = a.stats.totalReferrals - b.stats.totalReferrals;
        break;
      case 'earnings':
        comparison = a.stats.totalEarnings - b.stats.totalEarnings;
        break;
      case 'recent':
        comparison = new Date(a.joinedAtRaw).getTime() - new Date(b.joinedAtRaw).getTime();
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleAction = async (action: string, affiliate: Affiliate) => {
    try {
      if (action === 'suspend') {
        await supabase
          .from('profiles')
          .update({ status: 'suspended' })
          .eq('id', affiliate.id);
      } else if (action === 'activate') {
        await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', affiliate.id);
      }
      await loadAffiliates();
    } catch (error) {
      console.error('Error updating affiliate:', error);
    }
  };

  const toggleSort = (field: 'referrals' | 'earnings' | 'recent') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Affiliate Management</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Affiliates</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.totalAffiliates}</h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Active Affiliates</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.activeAffiliates}</h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Commissions</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.totalCommissions.toLocaleString()}</h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Pending Payouts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.pendingPayouts.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search affiliates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Tier Filter */}
            <div className="relative">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Tiers</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Diamond">Diamond</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort Options */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'referrals' | 'earnings' | 'recent')}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="referrals">Sort by Referrals</option>
                <option value="earnings">Sort by Earnings</option>
                <option value="recent">Sort by Recent</option>
              </select>
              <ArrowUpDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-colors"
              title={sortOrder === 'desc' ? 'Highest first' : 'Lowest first'}
            >
              {sortOrder === 'desc' ? '↓ High' : '↑ Low'}
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 mb-4">
          Showing {sortedAffiliates.length} of {affiliates.length} affiliates
        </div>

        {/* Affiliates Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Affiliate</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th 
                  className="pb-3 text-left text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort('referrals')}
                >
                  <span className="flex items-center">
                    Referrals
                    {sortBy === 'referrals' && <ArrowUpDown className="w-3 h-3 ml-1" />}
                  </span>
                </th>
                <th 
                  className="pb-3 text-left text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort('earnings')}
                >
                  <span className="flex items-center">
                    Earnings
                    {sortBy === 'earnings' && <ArrowUpDown className="w-3 h-3 ml-1" />}
                  </span>
                </th>
                <th className="pb-3 text-left text-gray-400 font-medium">Tier</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAffiliates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No affiliates found</p>
                  </td>
                </tr>
              ) : (
                sortedAffiliates.map((affiliate) => (
                  <tr key={affiliate.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{affiliate.name}</div>
                          <div className="text-sm text-gray-400">{affiliate.email}</div>
                          <div className="text-xs text-blue-400 font-mono">{affiliate.referralCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[affiliate.status]}`}>
                        <span className="text-sm font-medium capitalize">{affiliate.status}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">{affiliate.stats.totalReferrals}</div>
                      <div className="text-sm text-gray-400">{affiliate.stats.activeReferrals} active</div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">${affiliate.stats.totalEarnings.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">
                        ${affiliate.stats.pendingPayouts.toLocaleString()} pending
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">{affiliate.stats.currentTier}</div>
                      <div className="text-sm text-gray-400">{affiliate.stats.commission}% commission</div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* View Details Button */}
                        <button
                          onClick={() => openViewModal(affiliate)}
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        
                        {/* Suspend/Activate Button */}
                        {affiliate.status !== 'suspended' ? (
                          <button
                            onClick={() => handleAction('suspend', affiliate)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Suspend Affiliate"
                          >
                            <Ban className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('activate', affiliate)}
                            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                            title="Activate Affiliate"
                          >
                            <User className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Affiliate Details Modal */}
      {viewModalAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 overflow-y-auto py-8">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Affiliate Details</h3>
              <button
                onClick={closeViewModal}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Affiliate Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Name</p>
                <p className="text-white font-medium">{viewModalAffiliate.name}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Email</p>
                <p className="text-white font-medium text-sm">{viewModalAffiliate.email}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Referral Code</p>
                <p className="text-blue-400 font-mono font-medium">{viewModalAffiliate.referralCode}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Joined</p>
                <p className="text-white font-medium">{viewModalAffiliate.joinedAt}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <p className="text-blue-400 text-sm mb-1">Total Referrals</p>
                <p className="text-2xl font-bold text-white">{viewModalAffiliate.stats.totalReferrals}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                <p className="text-green-400 text-sm mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-white">${viewModalAffiliate.stats.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                <p className="text-purple-400 text-sm mb-1">Tier</p>
                <p className="text-2xl font-bold text-white">{viewModalAffiliate.stats.currentTier}</p>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm mb-1">Commission Rate</p>
                <p className="text-2xl font-bold text-white">{viewModalAffiliate.stats.commission}%</p>
              </div>
            </div>

            {/* Referrals List */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-400" />
                Referrals ({affiliateReferrals.length})
              </h4>

              {loadingReferrals ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : affiliateReferrals.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No referrals yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="pb-3 text-left text-gray-400 font-medium">Referred User</th>
                        <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                        <th className="pb-3 text-left text-gray-400 font-medium">Joined</th>
                        <th className="pb-3 text-right text-gray-400 font-medium">Purchase Amount</th>
                        <th className="pb-3 text-right text-gray-400 font-medium">Commission Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliateReferrals.map((referral) => (
                        <tr key={referral.id} className="border-b border-gray-700/50">
                          <td className="py-3">
                            <div className="font-medium text-white">{referral.referredName}</div>
                            <div className="text-sm text-gray-400">{referral.referredEmail}</div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              referral.status === 'active' 
                                ? 'bg-green-500/10 text-green-400' 
                                : 'bg-yellow-500/10 text-yellow-400'
                            }`}>
                              {referral.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-300">
                            {referral.joinedAt}
                          </td>
                          <td className="py-3 text-right text-white">
                            ${referral.purchaseAmount.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-green-400 font-medium">
                            ${referral.commissionEarned.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeViewModal}
                className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}