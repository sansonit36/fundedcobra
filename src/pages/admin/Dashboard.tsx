import React, { useState, useEffect } from 'react';
import { Users, DollarSign, AlertTriangle, TrendingUp, ChevronRight, ShieldAlert, ShoppingCart, CheckCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  total_users: number;
  active_accounts: number;
  pending_approvals: number;
  monthly_revenue: number;
  total_revenue: number;
  total_payouts: number;
  breached_accounts: number;
  accounts_purchased: number;
  kyc_verified: number;
}

type TimeFrame = 'today' | 'week' | 'month' | 'all';

interface ActivityLog {
  id: string;
  status: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('today');

  useEffect(() => {
    loadDashboardData();
  }, [retryCount, timeFrame]);

  const getTimeFrameDate = () => {
    const now = new Date();
    switch (timeFrame) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString();
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo.toISOString();
      case 'all':
      default:
        return null;
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const timeFrameDate = getTimeFrameDate();

      // Add error handling and retry logic for each request
      const [usersResult, accountsResult, approvalsResult] = await Promise.allSettled([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('trading_accounts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('account_requests').select('*', { count: 'exact', head: true }).eq('status', 'payment_submitted')
      ]);

      // Handle potential failures
      const results = [usersResult, accountsResult, approvalsResult].map(result => {
        if (result.status === 'rejected') throw result.reason;
        if ('error' in result.value && result.value.error) throw result.value.error;
        return result.value;
      });

      const [{ count: totalUsers }, { count: activeAccounts }, { count: pendingApprovals }] = results;

      // Get breached accounts (with time frame)
      let breachedQuery = supabase
        .from('trading_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'breached');
      
      if (timeFrameDate) {
        breachedQuery = breachedQuery.gte('updated_at', timeFrameDate);
      }
      
      const { count: breachedAccounts } = await breachedQuery;

      // Get accounts purchased (approved requests with time frame)
      let purchasedQuery = supabase
        .from('account_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      if (timeFrameDate) {
        purchasedQuery = purchasedQuery.gte('created_at', timeFrameDate);
      }
      
      const { count: accountsPurchased } = await purchasedQuery;

      // Get KYC verified (with time frame)
      let kycQuery = supabase
        .from('kyc_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      if (timeFrameDate) {
        kycQuery = kycQuery.gte('updated_at', timeFrameDate);
      }
      
      const { count: kycVerified } = await kycQuery;

      // Get monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyPurchases, error: revenueError } = await supabase
        .from('account_requests')
        .select('amount')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth.toISOString());

      if (revenueError) throw revenueError;

      const monthlyRevenue = monthlyPurchases?.reduce((sum, req) => sum + req.amount, 0) || 0;

      // Get recent activity
      const { data: recentActivity, error: activityError } = await supabase
        .from('account_requests')
        .select(`
          id,
          status,
          created_at,
          profiles!account_requests_user_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) throw activityError;

      // Transform the data to match our interface
      const formattedActivity = (recentActivity || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        user: {
          name: item.profiles?.name || 'Unknown',
          email: item.profiles?.email || 'N/A'
        }
      }));

      setStats({
        total_users: totalUsers || 0,
        active_accounts: activeAccounts || 0,
        pending_approvals: pendingApprovals || 0,
        monthly_revenue: monthlyRevenue,
        total_revenue: 0,
        total_payouts: 0,
        breached_accounts: breachedAccounts || 0,
        accounts_purchased: accountsPurchased || 0,
        kyc_verified: kycVerified || 0
      });

      setActivityLogs(formattedActivity);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      
      // Retry logic with exponential backoff
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000 * Math.pow(2, retryCount));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5">
              <div className="animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-white/10 mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-24 mb-1"></div>
                <div className="h-6 bg-white/10 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="text-red-400">{error}</div>
          <button
            onClick={() => setRetryCount(prev => prev + 1)}
            className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        
        {/* Time Frame Selector */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Total Users</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.total_users}</h3>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Active Accounts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.active_accounts}</h3>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Pending Approvals</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.pending_approvals}</h3>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Monthly Revenue</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">${stats.monthly_revenue.toLocaleString()}</h3>
          </div>
        </div>

        {/* Breached Accounts */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Breached Accounts</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.breached_accounts}</h3>
          </div>
        </div>

        {/* Accounts Purchased */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">Accounts Purchased</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.accounts_purchased}</h3>
          </div>
        </div>

        {/* KYC Verified */}
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">KYC Verified</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-white">{stats.kyc_verified}</h3>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        {activityLogs.length === 0 ? (
          <p className="text-gray-400">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="text-white font-medium">{log.user.name}</p>
                  <p className="text-sm text-gray-400">{log.user.email}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    log.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    log.status === 'payment_submitted' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {log.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}