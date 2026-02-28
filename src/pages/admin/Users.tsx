import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, User, Shield, Ban, Wallet, Copy, Eye, EyeOff, AlertOctagon, XCircle, Calendar, CheckCircle, Clock, XOctagon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { sendEmail, logEmailSent } from '../../lib/emailService';

interface TradingAccount {
  id: string;
  user_id: string;
  mt5_login: string;
  mt5_password: string;
  mt5_server: string;
  balance: number;
  equity: number;
  status: 'active' | 'suspended' | 'breached';
  breach_reason?: string;
  created_at: string;
  updated_at: string;
}

interface AdminUserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  mt5_accounts: TradingAccount[];
  kyc_verified?: boolean;
  has_purchased?: boolean;
  has_approved_purchase?: boolean;
  has_rejected_purchase?: boolean;
  has_active_account?: boolean;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';
type UserStatusFilter = 'all' | 'kyc_not_purchased' | 'rejected_purchase' | 'approved_purchase' | 'active_accounts';

const statusStyles: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-400/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-400/20',
  breached: 'bg-orange-500/10 text-orange-400 border-orange-400/20'
};

export default function Users() {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [selectedMT5Account, setSelectedMT5Account] = useState<TradingAccount | null>(null);
  const [breachReason, setBreachReason] = useState('');
  const [customBreachReason, setCustomBreachReason] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // First, get the total count of all users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setTotalCount(totalUsers || 0);
      console.log('Total users in database:', totalUsers);
      
      // Fetch ALL users with their MT5 accounts using multiple queries if needed
      let allUsers: any[] = [];
      const pageSize = 1000;
      let currentPage = 0;
      let hasMore = true;

      while (hasMore) {
        const start = currentPage * pageSize;
        const end = start + pageSize - 1;

        const { data: pageData, error: pageError } = await supabase
          .from('profiles')
          .select(`
            *,
            mt5_accounts:trading_accounts(*)
          `)
          .order('created_at', { ascending: false })
          .range(start, end);

        if (pageError) {
          console.error('Error fetching users page:', pageError);
          throw pageError;
        }

        if (pageData && pageData.length > 0) {
          allUsers = [...allUsers, ...pageData];
          currentPage++;
          hasMore = pageData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log('Total users fetched:', allUsers.length);

      // Fetch KYC submissions separately
      const { data: kycData } = await supabase
        .from('kyc_submissions')
        .select('user_id, status');

      // Fetch account requests separately
      const { data: requestsData } = await supabase
        .from('account_requests')
        .select('user_id, status');

      // Create lookup maps
      const kycMap = (kycData || []).reduce((acc: any, kyc: any) => {
        if (!acc[kyc.user_id]) acc[kyc.user_id] = [];
        acc[kyc.user_id].push(kyc.status);
        return acc;
      }, {});

      const requestsMap = (requestsData || []).reduce((acc: any, req: any) => {
        if (!acc[req.user_id]) acc[req.user_id] = [];
        acc[req.user_id].push(req.status);
        return acc;
      }, {});

      const transformedUsers = (allUsers || []).map(user => {
        const userKycStatuses = kycMap[user.id] || [];
        const userRequestStatuses = requestsMap[user.id] || [];
        
        const kycVerified = userKycStatuses.includes('approved');
        const hasRejectedPurchase = userRequestStatuses.includes('rejected');
        const hasApprovedPurchase = userRequestStatuses.includes('approved');
        const hasActiveAccount = (user.mt5_accounts || []).some((acc: any) => acc.status === 'active');
        const hasPurchased = userRequestStatuses.length > 0;

        return {
          ...user,
          mt5_accounts: user.mt5_accounts || [],
          kyc_verified: kycVerified,
          has_purchased: hasPurchased,
          has_approved_purchase: hasApprovedPurchase,
          has_rejected_purchase: hasRejectedPurchase,
          has_active_account: hasActiveAccount
        };
      });

      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, user: AdminUserData) => {
    if (processing) return;
    setProcessing(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: action === 'suspend' ? 'suspended' : 'active' })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      await loadUsers();
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status');
    } finally {
      setProcessing(false);
    }
  };

  const handleBreachClick = (account: TradingAccount) => {
    setSelectedMT5Account(account);
    setShowBreachModal(true);
  };

  const handleBreach = async () => {
    if (!selectedMT5Account) return;
    setProcessing(true);
    setError(null);
    
    try {
      const { error: breachError } = await supabase
        .from('trading_accounts')
        .update({
          status: 'breached',
          breach_reason: breachReason === 'custom' ? customBreachReason : breachReason
        })
        .eq('id', selectedMT5Account.id);

      if (breachError) throw breachError;

      // Send breach notification email
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', selectedMT5Account.user_id)
          .single();

        if (userProfile) {
          await sendEmail({
            to: userProfile.email,
            template: 'account_breached',
            data: {
              name: userProfile.name,
              breachReason: breachReason === 'custom' ? customBreachReason : breachReason,
              accountLogin: selectedMT5Account.mt5_login
            }
          });
          await logEmailSent(selectedMT5Account.user_id, 'account_breached');
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }

      await loadUsers();
      setShowBreachModal(false);
      setSelectedMT5Account(null);
      setBreachReason('');
      setCustomBreachReason('');
    } catch (err) {
      console.error('Error breaching account:', err);
      setError('Failed to breach account');
    } finally {
      setProcessing(false);
    }
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filterByTime = (userDate: string): boolean => {
    const now = new Date();
    const userDateTime = new Date(userDate);
    
    switch (timeFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const userDay = new Date(userDateTime.getFullYear(), userDateTime.getMonth(), userDateTime.getDate());
        return userDay.getTime() === today.getTime();
      
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return userDateTime >= weekAgo;
      
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return userDateTime >= monthAgo;
      
      case 'all':
      default:
        return true;
    }
  };

  const filterByUserStatus = (user: AdminUserData): boolean => {
    switch (userStatusFilter) {
      case 'kyc_not_purchased':
        return user.kyc_verified === true && !user.has_purchased;
      
      case 'rejected_purchase':
        return user.has_rejected_purchase === true;
      
      case 'approved_purchase':
        return user.has_approved_purchase === true;
      
      case 'active_accounts':
        return user.has_active_account === true;
      
      case 'all':
      default:
        return true;
    }
  };

  const filteredUsers = users
    .filter(user => {
      const matchesSearch = 
        (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .filter(user => filterByTime(user.created_at))
    .filter(user => filterByUserStatus(user));

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, userStatusFilter, timeFilter, itemsPerPage]);

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/4"></div>
                <div className="h-4 bg-white/10 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
      </div>

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {/* Filters Section */}
        <div className="space-y-4 mb-6">
          {/* User Status Filters */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">User Journey Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { 
                  value: 'all' as UserStatusFilter, 
                  label: 'All Users', 
                  icon: <User className="w-4 h-4" />,
                  count: users.length
                },
                { 
                  value: 'kyc_not_purchased' as UserStatusFilter, 
                  label: 'KYC Done, Not Purchased', 
                  icon: <CheckCircle className="w-4 h-4" />,
                  count: users.filter(u => u.kyc_verified === true && !u.has_purchased).length
                },
                { 
                  value: 'rejected_purchase' as UserStatusFilter, 
                  label: 'Rejected Purchase', 
                  icon: <XOctagon className="w-4 h-4" />,
                  count: users.filter(u => u.has_rejected_purchase === true).length
                },
                { 
                  value: 'approved_purchase' as UserStatusFilter, 
                  label: 'Approved Purchase', 
                  icon: <CheckCircle className="w-4 h-4" />,
                  count: users.filter(u => u.has_approved_purchase === true).length
                },
                { 
                  value: 'active_accounts' as UserStatusFilter, 
                  label: 'Active Accounts', 
                  icon: <Wallet className="w-4 h-4" />,
                  count: users.filter(u => u.has_active_account === true).length
                }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setUserStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    userStatusFilter === filter.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {filter.icon}
                  <span>{filter.label} ({filter.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Filters */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Registration Time</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'today' as TimeFilter, label: 'Today' },
                { value: 'week' as TimeFilter, label: 'Last 7 Days' },
                { value: 'month' as TimeFilter, label: 'Last 30 Days' },
                { value: 'all' as TimeFilter, label: 'All Time' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    timeFilter === filter.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-blue-400 font-medium">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} filtered ({totalCount} total)
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
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
              <Filter className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Role</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Joined</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Last Login</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.name || 'No Name'}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[user.status]}`}>
                          <span className="text-sm font-medium capitalize">{user.status}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-1">
                          {user.role === 'admin' && <Shield className="w-4 h-4 text-blue-400" />}
                          <span className={`capitalize ${user.role === 'admin' ? 'text-blue-400' : 'text-gray-300'}`}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-gray-300">{new Date(user.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-gray-300">
                          {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-400"
                            title="View MT5 Accounts"
                          >
                            <Wallet className="w-5 h-5" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>
                            
                            {selectedUser?.id === user.id && (
                              <div className="absolute right-0 mt-2 w-48 rounded-lg card-gradient border border-white/10 shadow-lg z-10">
                                <div className="py-1">
                                  {user.status !== 'suspended' && (
                                    <button
                                      onClick={() => handleAction('suspend', user)}
                                      disabled={processing}
                                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/5 flex items-center disabled:opacity-50"
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Suspend User
                                    </button>
                                  )}
                                  {user.status === 'suspended' && (
                                    <button
                                      onClick={() => handleAction('activate', user)}
                                      disabled={processing}
                                      className="w-full px-4 py-2 text-left text-green-400 hover:bg-white/5 flex items-center disabled:opacity-50"
                                    >
                                      <User className="w-4 h-4 mr-2" />
                                      Activate User
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {expandedUserId === user.id && (
                      <tr>
                        <td colSpan={6} className="py-4 px-4 bg-white/5">
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-white mb-3">MT5 Accounts</h4>
                            <div className="grid grid-cols-1 gap-4">
                              {user.mt5_accounts?.length > 0 ? (
                                user.mt5_accounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Login ID</p>
                                        <div className="flex items-center space-x-2">
                                          <code className="text-blue-400 font-medium">{account.mt5_login}</code>
                                          <button
                                            onClick={() => copyToClipboard(account.mt5_login)}
                                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Password</p>
                                        <div className="flex items-center space-x-2">
                                          <code className="text-blue-400 font-medium">
                                            {showPasswords[account.id] ? account.mt5_password : '••••••••'}
                                          </code>
                                          <button
                                            onClick={() => togglePasswordVisibility(account.id)}
                                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                                          >
                                            {showPasswords[account.id] ? (
                                              <EyeOff className="w-4 h-4" />
                                            ) : (
                                              <Eye className="w-4 h-4" />
                                            )}
                                          </button>
                                          {showPasswords[account.id] && (
                                            <button
                                              onClick={() => copyToClipboard(account.mt5_password)}
                                              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                                            >
                                              <Copy className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Server</p>
                                        <div className="flex items-center space-x-2">
                                          <code className="text-blue-400 font-medium">{account.mt5_server}</code>
                                          <button
                                            onClick={() => copyToClipboard(account.mt5_server)}
                                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Balance</p>
                                        <p className="text-white font-medium">${account.balance.toLocaleString()}</p>
                                      </div>

                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Equity</p>
                                        <p className="text-white font-medium">${account.equity.toLocaleString()}</p>
                                      </div>

                                      <div>
                                        <p className="text-sm text-gray-400 mb-1">Status</p>
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full border ${statusStyles[account.status]}`}>
                                          <span className="text-sm font-medium capitalize">{account.status}</span>
                                        </div>
                                        {account.status === 'breached' && account.breach_reason && (
                                          <p className="mt-2 text-sm text-red-400">
                                            Reason: {account.breach_reason}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {account.status === 'active' && (
                                      <div className="mt-4 flex justify-end">
                                        <button
                                          onClick={() => handleBreachClick(account)}
                                          className="flex items-center px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
                                        >
                                          <AlertOctagon className="w-4 h-4 mr-2" />
                                          Breach Account
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-gray-400">
                                  No MT5 accounts found
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}

        {showBreachModal && selectedMT5Account && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Breach MT5 Account</h3>
                <button
                  onClick={() => setShowBreachModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-start space-x-3">
                    <AlertOctagon className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-orange-400 font-medium">Warning</p>
                      <p className="text-sm text-gray-300">
                        Breaching an account will immediately terminate all trading access and freeze the account.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 mb-4">MT5 Account Details</p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-sm text-gray-400">Login ID</p>
                      <p className="text-white font-medium">{selectedMT5Account.mt5_login}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-sm text-gray-400">Balance</p>
                      <p className="text-white font-medium">${selectedMT5Account.balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Select Breach Reason
                  </label>
                  <select
                    value={breachReason}
                    onChange={(e) => setBreachReason(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select a reason</option>
                    {[
                      'Excessive risk taking',
                      'Trading rules violation',
                      'Suspicious trading pattern',
                      'Multiple account violation',
                      'Manipulation attempt'
                    ].map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                    <option value="custom">Custom Reason</option>
                  </select>
                </div>

                {breachReason === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Custom Reason
                    </label>
                    <textarea
                      value={customBreachReason}
                      onChange={(e) => setCustomBreachReason(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                      placeholder="Enter custom breach reason"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    onClick={handleBreach}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                    disabled={!breachReason || (breachReason === 'custom' && !customBreachReason)}
                  >
                    Confirm Breach
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}