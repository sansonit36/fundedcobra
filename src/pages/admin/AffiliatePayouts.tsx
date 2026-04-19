import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, User, DollarSign, Users, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AffiliatePayout {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  processedAt?: string;
  walletAddress: string;
  rejectionReason?: string;
  referrals: {
    total: number;
    thisMonth: number;
  };
  earnings: {
    total: number;
    thisMonth: number;
  };
}

interface AffiliateWithEarnings {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  totalEarnings: number;
  availableBalance: number;
  totalReferrals: number;
}

interface CommissionRecord {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  referral_name: string;
  amount: number;
  status: string;
  created_at: string;
  source_transaction?: string;
}

// No mock data needed - loading from database

const statusStyles = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
  approved: 'bg-green-500/10 text-green-400 border-green-400/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-400/20'
};

export default function AffiliatePayouts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayout, setSelectedPayout] = useState<AffiliatePayout | null>(null);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingPayouts: 0,
    totalPaidOut: 0,
    thisMonth: 0
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [affiliatesWithEarnings, setAffiliatesWithEarnings] = useState<AffiliateWithEarnings[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'affiliates' | 'commissions'>('requests');

  useEffect(() => {
    loadPayouts();
    loadStats();
    loadAffiliatesWithEarnings();
    loadCommissions();
  }, []);

  const loadPayouts = async () => {
    try {
      // Get all withdrawal requests
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('affiliate_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
        return;
      }

      if (!withdrawals || withdrawals.length === 0) {
        setPayouts([]);
        setLoading(false);
        return;
      }

      // Load additional data for each payout
      const payoutsData = await Promise.all(
        withdrawals.map(async (withdrawal: any) => {
          // Get affiliate profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', withdrawal.affiliate_id)
            .single();

          // Get referral count
          const { count: totalReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', withdrawal.affiliate_id)
            .eq('status', 'active');

          // Get earnings for this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { count: thisMonthReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', withdrawal.affiliate_id)
            .gte('created_at', startOfMonth.toISOString());

          const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', {
            p_user_id: withdrawal.affiliate_id
          });

          const earnings = earningsData?.[0] || { total_earnings: 0 };

          // Get this month's earnings
          const { data: thisMonthEarnings } = await supabase
            .from('affiliate_earnings')
            .select('amount')
            .eq('affiliate_id', withdrawal.affiliate_id)
            .gte('created_at', startOfMonth.toISOString());

          const thisMonthTotal = thisMonthEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

          return {
            id: withdrawal.id,
            affiliateId: withdrawal.affiliate_id,
            affiliateName: profile?.name || 'Unknown',
            affiliateEmail: profile?.email,
            amount: Number(withdrawal.amount),
            status: withdrawal.status,
            submittedAt: withdrawal.created_at,
            processedAt: withdrawal.processed_at,
            walletAddress: withdrawal.wallet_address,
            rejectionReason: withdrawal.rejection_reason,
            referrals: {
              total: totalReferrals || 0,
              thisMonth: thisMonthReferrals || 0
            },
            earnings: {
              total: Number(earnings.total_earnings || 0),
              thisMonth: thisMonthTotal
            }
          };
        })
      );

      setPayouts(payoutsData);
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliatesWithEarnings = async () => {
    try {
      // Get all affiliates (users with referral codes)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, referral_code')
        .not('referral_code', 'is', null);

      if (!profiles) return;

      // Load earnings for each affiliate
      const affiliatesData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', {
            p_user_id: profile.id
          });

          const { count: totalReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', profile.id);

          const earnings = earningsData?.[0] || { total_earnings: 0, available_for_withdrawal: 0 };

          return {
            id: profile.id,
            name: profile.name || 'Unknown',
            email: profile.email || '',
            referralCode: profile.referral_code,
            totalEarnings: Number(earnings.total_earnings || 0),
            availableBalance: Number(earnings.available_for_withdrawal || 0),
            totalReferrals: totalReferrals || 0
          };
        })
      );

      // Filter to only show affiliates with earnings
      const affiliatesWithBalance = affiliatesData.filter(a => a.totalEarnings > 0 || a.totalReferrals > 0);
      setAffiliatesWithEarnings(affiliatesWithBalance);
    } catch (error) {
      console.error('Error loading affiliates with earnings:', error);
    }
  };

  const loadCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_earnings')
        .select(`
          *,
          affiliate:profiles!affiliate_id(name),
          referral:profiles!referral_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((c: any) => ({
        id: c.id,
        affiliate_id: c.affiliate_id,
        affiliate_name: c.affiliate?.name || 'Unknown',
        referral_name: c.referral?.name || 'Unknown',
        amount: Number(c.amount),
        status: c.status,
        created_at: c.created_at,
        source_transaction: c.source_transaction
      }));

      setCommissions(formatted);
    } catch (error) {
      console.error('Error loading commissions:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Get pending payouts total
      const { data: pendingData } = await supabase
        .from('affiliate_withdrawals')
        .select('amount')
        .eq('status', 'pending');

      const pendingTotal = pendingData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // Get total paid out
      const { data: approvedData } = await supabase
        .from('affiliate_withdrawals')
        .select('amount')
        .eq('status', 'approved');

      const totalPaidOut = approvedData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // Get this month's payouts
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: thisMonthData } = await supabase
        .from('affiliate_withdrawals')
        .select('amount')
        .eq('status', 'approved')
        .gte('processed_at', startOfMonth.toISOString());

      const thisMonthTotal = thisMonthData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      setStats({
        pendingPayouts: pendingTotal,
        totalPaidOut,
        thisMonth: thisMonthTotal
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = 
      payout.affiliateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (payout: AffiliatePayout) => {
    try {
      const { error } = await supabase
        .from('affiliate_withdrawals')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', payout.id);

      if (error) throw error;

      await loadPayouts();
      await loadStats();
      setSelectedPayout(null);
    } catch (error) {
      console.error('Error approving payout:', error);
      alert('Failed to approve payout');
    }
  };

  const handleReject = async (payout: AffiliatePayout) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('affiliate_withdrawals')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_at: new Date().toISOString()
        })
        .eq('id', payout.id);

      if (error) throw error;

      await loadPayouts();
      await loadStats();
      setSelectedPayout(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting payout:', error);
      alert('Failed to reject payout');
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
        <h1 className="text-2xl font-bold text-white">Affiliate Payout Requests</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Pending Payouts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.pendingPayouts.toLocaleString()}</h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Paid Out</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.totalPaidOut.toLocaleString()}</h3>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">This Month</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.thisMonth.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search payouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Filter className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Withdrawal Requests ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('affiliates')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'affiliates'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Affiliates with Earnings ({affiliatesWithEarnings.length})
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'commissions'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Commissions Log ({commissions.length})
          </button>
        </div>

        {/* Withdrawal Requests Table */}
        {activeTab === 'requests' && (
          <div className="overflow-x-auto">
            {filteredPayouts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Withdrawal Requests</h3>
                <p className="text-gray-500 text-sm">
                  When affiliates request withdrawals, they will appear here for approval.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Check the "Affiliates with Earnings" tab to see affiliates with available balances.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="pb-3 text-left text-gray-400 font-medium">Request ID</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Affiliate</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Referrals</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                    <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <div className="font-medium text-white">{payout.id.slice(0, 8)}...</div>
                        <div className="text-sm text-gray-400">
                          {new Date(payout.submittedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{payout.affiliateName}</div>
                            <div className="text-sm text-gray-400">{payout.affiliateEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">${payout.amount.toLocaleString()}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">{payout.referrals.total} total</div>
                        <div className="text-sm text-gray-400">{payout.referrals.thisMonth} this month</div>
                      </td>
                      <td className="py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[payout.status]}`}>
                          <span className="text-sm font-medium capitalize">{payout.status}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {payout.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(payout)}
                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setSelectedPayout(payout)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedPayout(selectedPayout?.id === payout.id ? null : payout)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Commissions Log Table */}
        {activeTab === 'commissions' && (
          <div className="overflow-x-auto">
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Commissions Recorded</h3>
                <p className="text-gray-500 text-sm">
                  Earnings will appear here once referrals purchase accounts and requests are approved.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="pb-3 text-left text-gray-400 font-medium">Date</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Affiliate</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Referral (Trader)</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm) => (
                    <tr key={comm.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <div className="text-sm text-gray-400">
                          {new Date(comm.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-white font-medium">{comm.affiliate_name}</td>
                      <td className="py-4 text-gray-300">{comm.referral_name}</td>
                      <td className="py-4 text-green-400 font-bold">${comm.amount.toLocaleString()}</td>
                      <td className="py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[comm.status as keyof typeof statusStyles] || statusStyles.pending}`}>
                          <span className="text-sm font-medium capitalize">{comm.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Affiliates with Earnings Table */}
        {activeTab === 'affiliates' && (
          <div className="overflow-x-auto">
            {affiliatesWithEarnings.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Affiliates with Earnings</h3>
                <p className="text-gray-500 text-sm">
                  When affiliates earn commissions from referrals, they will appear here.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="pb-3 text-left text-gray-400 font-medium">Affiliate</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Referral Code</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Total Referrals</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Total Earnings</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Available Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliatesWithEarnings.map((affiliate) => (
                    <tr key={affiliate.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{affiliate.name}</div>
                            <div className="text-sm text-gray-400">{affiliate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-mono text-blue-400">{affiliate.referralCode}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">{affiliate.totalReferrals}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">${affiliate.totalEarnings.toLocaleString()}</div>
                      </td>
                      <td className="py-4">
                        <div className={`font-medium ${affiliate.availableBalance > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          ${affiliate.availableBalance.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Payout Details Modal */}
        {selectedPayout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Payout Request Details</h3>
                <button
                  onClick={() => setSelectedPayout(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-1">Request ID</p>
                  <p className="text-white font-medium">{selectedPayout.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Submitted At</p>
                  <p className="text-white font-medium">
                    {new Date(selectedPayout.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Affiliate</p>
                  <p className="text-white font-medium">{selectedPayout.affiliateName}</p>
                  <p className="text-sm text-gray-400">ID: {selectedPayout.affiliateId}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Amount</p>
                  <p className="text-white font-medium">${selectedPayout.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Wallet Address</p>
                  <p className="text-white font-medium break-all">{selectedPayout.walletAddress}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Status</p>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[selectedPayout.status]}`}>
                    <span className="text-sm font-medium capitalize">{selectedPayout.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Referral Stats</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Referrals:</span>
                      <span className="text-white font-medium">{selectedPayout.referrals.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Month:</span>
                      <span className="text-white font-medium">{selectedPayout.referrals.thisMonth}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Earnings Stats</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Earnings:</span>
                      <span className="text-white font-medium">${selectedPayout.earnings.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Month:</span>
                      <span className="text-white font-medium">${selectedPayout.earnings.thisMonth.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => handleApprove(selectedPayout)}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                >
                  Approve Payout
                </button>
                <button
                  onClick={() => handleReject(selectedPayout)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  Reject Payout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}