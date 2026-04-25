import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, User, Users, Copy, Eye, EyeOff, Clock, Calendar } from 'lucide-react';
import { PendingAccountRequest, getAllAccountRequests, approveAccountRequest, rejectAccountRequest } from '../../lib/database';
import { notifyAffiliatePurchase } from "../../affiliateApi";
import { sendEmail, logEmailSent } from '../../lib/emailService';
import { supabase } from '../../lib/supabase';


type StatusFilter = 'all' | 'payment_submitted' | 'suspicious' | 'approved' | 'rejected';
type TimeFilter = 'today' | 'week' | 'month' | 'all';

const commonRejectionReasons = [
  'Invalid payment proof',
  'Incorrect payment amount',
  'Suspicious transaction',
  'Payment not received',
  'Duplicate request',
  'AI Verification Failed'
];

export default function AccountApprovals() {
  const [requests, setRequests] = useState<PendingAccountRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('payment_submitted');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [selectedRequest, setSelectedRequest] = useState<PendingAccountRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [mt5Credentials, setMT5Credentials] = useState({
    login: '',
    password: '',
    server: 'FundedCobra-Live'
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getAllAccountRequests(
        statusFilter === 'all' ? undefined : statusFilter
      );
      setRequests(data);
    } catch (err) {
      console.error('Error loading requests:', err);
      setError('Failed to load account requests');
    } finally {
      setLoading(false);
    }
  };

const handleApprove = async () => {
  if (!selectedRequest || !mt5Credentials.login || !mt5Credentials.password) return;

  setProcessing(true);
  setError(null);

  try {
    // 1) Approve in your system first
    await approveAccountRequest(
      selectedRequest.id,
      mt5Credentials.login,
      mt5Credentials.password,
      mt5Credentials.server
    );

    // 2) Credit affiliate commission if user was referred
    try {
      // Check if user has a referrer
      const { data: referralData } = await supabase
        .from('affiliate_referrals')
        .select('referrer_id, status')
        .eq('referred_id', selectedRequest.user_id)
        .eq('status', 'active')
        .maybeSingle();

      if (referralData) {
        // Get referrer's current tier and commission rate
        const { data: tierData } = await supabase.rpc('get_affiliate_tier', {
          p_user_id: referralData.referrer_id
        });

        const commissionRate = tierData?.[0]?.commission_rate || 10; // Default 10%
        const commissionAmount = (Number(selectedRequest.amount) * commissionRate) / 100;

        // Credit the commission
        await supabase
          .from('affiliate_earnings')
          .insert({
            affiliate_id: referralData.referrer_id,
            referral_id: selectedRequest.user_id,
            amount: commissionAmount,
            source_transaction: selectedRequest.id,
            status: 'approved'
          });

        console.log(`Credited $${commissionAmount.toFixed(2)} commission to affiliate ${referralData.referrer_id}`);
      }
    } catch (e) {
      console.warn("Affiliate commission credit failed", e);
      // don't block the admin UX
    }

    // Also call external PHP API for compatibility (optional)
    try {
      await notifyAffiliatePurchase(
        selectedRequest.user_id,
        Number(selectedRequest.amount)
      );
    } catch (e) {
      console.warn("External affiliate API notify failed", e);
    }

    // 3) Track approval (not purchase - that was tracked on thank you page)
    try {
      if (window.fbq) {
        window.fbq("track", "Lead", {
          value: Number(selectedRequest.amount),
          currency: "USD",
          content_name: selectedRequest.package_name,
          content_category: "Account Approved",
        });
      }

      // Track with TikTok pixel
      if (window.ttq) {
        window.ttq.track('SubmitForm', {
          content_name: `Account Approved - ${selectedRequest.package_name}`,
          content_category: 'Trading Account',
        });
      }
    } catch (trackingError) {
      console.error("Tracking error:", trackingError);
    }

    // 4) Send approval email
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', selectedRequest.user_id)
        .single();

      if (userProfile) {
        await sendEmail({ to: userProfile.email,
          template: 'account_approved',
          data: {
            name: userProfile.name,
            accountBalance: selectedRequest.package_balance,
            mt5Login: mt5Credentials.login,
            mt5Password: mt5Credentials.password,
            mt5Server: mt5Credentials.server
          },
          userId: selectedRequest.user_id
        });
        // Don't call logEmailSent separately - the edge function handles it now
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
    }

    // 5) Refresh + reset UI
    await loadRequests();
    setShowApprovalModal(false);
    setSelectedRequest(null);
    setMT5Credentials({ login: "", password: "", server: "FundedCobra-Live" });
  } catch (err) {
    console.error("Error approving request:", err);
    setError(err instanceof Error ? err.message : "Failed to approve account request");
  } finally {
    setProcessing(false);
  }
};


  const handleReject = async () => {
    if (!selectedRequest) return;
    const reason = rejectionReason === 'custom' ? customRejectionReason : rejectionReason;
    if (!reason) return;

    setProcessing(true);
    setError(null);

    try {
      await rejectAccountRequest(selectedRequest.id, reason);

      // Track the rejection
      try {
        if (window.fbq) {
          window.fbq('track', 'PurchaseRejected', {
            value: selectedRequest.amount,
            currency: 'USD',
            content_name: selectedRequest.package_name,
            content_category: 'Trading Account',
            transaction_id: selectedRequest.id,
            status: 'rejected',
            rejection_reason: reason
          });
        }

        // Track with TikTok pixel
        if (window.ttq) {
          window.ttq.track('SubmitForm', {
            content_name: `Purchase Rejected - ${selectedRequest.package_name}`,
            content_category: 'Trading Account',
            content_id: selectedRequest.id,
            description: reason,
          });
        }
      } catch (trackingError) {
        console.error('Tracking error:', trackingError);
      }

      await loadRequests();
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setCustomRejectionReason('');
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject account request');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      payment_submitted: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        icon: <Clock className="w-4 h-4" />
      },
      suspicious: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        icon: <AlertTriangle className="w-4 h-4" />
      },
      approved: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        icon: <CheckCircle className="w-4 h-4" />
      },
      rejected: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        icon: <XCircle className="w-4 h-4" />
      }
    };

    const config = statusConfig[status] || statusConfig.payment_submitted;
    let displayStatus = status === 'payment_submitted' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1);
    
    if (status === 'suspicious') displayStatus = 'Suspicious';

    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${config.bg} ${config.text}`}>
        {config.icon}
        <span className="text-sm font-medium">{displayStatus}</span>
      </div>
    );
  };

  const filterByTime = (requestDate: string): boolean => {
    const now = new Date();
    const requestDateTime = new Date(requestDate);
    
    switch (timeFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const requestDay = new Date(requestDateTime.getFullYear(), requestDateTime.getMonth(), requestDateTime.getDate());
        return requestDay.getTime() === today.getTime();
      
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return requestDateTime >= weekAgo;
      
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return requestDateTime >= monthAgo;
      
      case 'all':
      default:
        return true;
    }
  };

  const filteredRequests = requests
    .filter(request =>
      request.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(request => filterByTime(request.created_at));

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        {/* Filter Tabs */}
        <div className="space-y-4 mb-6">
          {/* Status Filters */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'payment_submitted' as StatusFilter, label: 'Pending', count: requests.filter(r => r.status === 'payment_submitted').length },
                { value: 'suspicious' as StatusFilter, label: 'Suspicious', count: requests.filter(r => r.status === 'suspicious').length },
                { value: 'approved' as StatusFilter, label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
                { value: 'rejected' as StatusFilter, label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length },
                { value: 'all' as StatusFilter, label: 'All', count: requests.length }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Time Filters */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Time Period</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'today' as TimeFilter, label: 'Today' },
                { value: 'week' as TimeFilter, label: 'Last 7 Days' },
                { value: 'month' as TimeFilter, label: 'Last 30 Days' },
                { value: 'all' as TimeFilter, label: 'All Time' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setTimeFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    timeFilter === tab.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">User</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Package</th>
                <th className="pb-3 text-left text-gray-400 font-medium whitespace-nowrap">Security Score</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Amount</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Transaction</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Date</th>
                <th className="pb-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-700/50 hover:bg-white/5">
                    <td className="py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{request.user_name}</div>
                          <div className="text-sm text-gray-400">{request.user_email}</div>
                          {request.referrer_name && (
                            <div className="flex items-center space-x-1 text-[10px] text-primary-400 font-bold uppercase mt-0.5">
                              <Users className="w-3 h-3" />
                              <span>Ref: {request.referrer_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-white">{request.package_name}</div>
                      <div className="text-sm text-gray-400">Balance: ${request.package_balance.toLocaleString()}</div>
                      {request.status === 'suspicious' && request.ai_reason && (
                        <div className="mt-1 text-xs text-red-400/80 italic line-clamp-1 max-w-[200px]" title={request.ai_reason}>
                          "{request.ai_reason}"
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      {request.ai_confidence !== undefined ? (
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            request.ai_confidence >= 80 ? 'bg-green-500' :
                            request.ai_confidence >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className={`text-sm font-bold ${
                            request.ai_confidence >= 80 ? 'text-green-400' :
                            request.ai_confidence >= 40 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {request.ai_confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4">
                      {request.amount < request.package_fee ? (
                        <div>
                          <div className="text-sm text-gray-400 line-through">${request.package_fee.toLocaleString()}</div>
                          <div className="font-medium text-white">${request.amount.toLocaleString()}</div>
                        </div>
                      ) : (
                        <div className="font-medium text-white">${request.amount.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="py-4">
                      {request.payment_screenshot_url && (
                        <a
                          href={request.payment_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-400 hover:text-primary-300"
                        >
                          View Payment Proof
                        </a>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="text-gray-300">
                        {new Date(request.created_at).toLocaleString()}
                      </div>
                      {request.processed_at && (
                        <div className="text-xs text-gray-500">
                          Processed: {new Date(request.processed_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {request.status === 'payment_submitted' || request.status === 'suspicious' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApprovalModal(true);
                            }}
                            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectionModal(true);
                            }}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : request.status === 'rejected' && request.rejection_reason ? (
                        <div className="text-sm text-red-400">
                          Reason: {request.rejection_reason}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Approval Modal */}
        {showApprovalModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Approve Account Request</h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setMT5Credentials({
                      login: '',
                      password: '',
                      server: 'FundedCobra-Live'
                    });
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 mb-4">Account Details</p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-sm text-gray-400">User</p>
                      <p className="text-white font-medium">{selectedRequest.user_name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-sm text-gray-400">Package</p>
                      <p className="text-white font-medium">{selectedRequest.package_name}</p>
                    </div>
                    {selectedRequest.referrer_name && (
                      <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 col-span-2">
                        <p className="text-sm text-primary-400">Referred By (Affiliate)</p>
                        <p className="text-white font-medium">{selectedRequest.referrer_name}</p>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleApprove(); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    MT5 Login ID
                  </label>
                  <input
                    type="text"
                    value={mt5Credentials.login}
                    onChange={(e) => setMT5Credentials(prev => ({ ...prev, login: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                    placeholder="Enter MT5 login ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    MT5 Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={mt5Credentials.password}
                      onChange={(e) => setMT5Credentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                      placeholder="Enter MT5 password"
                      autoComplete="off"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    MT5 Server
                  </label>
                  <input
                    type="text"
                    value={mt5Credentials.server}
                    onChange={(e) => setMT5Credentials(prev => ({ ...prev, server: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                    placeholder="Enter MT5 server"
                    required
                  />
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={processing || !mt5Credentials.login || !mt5Credentials.password}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Reject Account Request</h3>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                    setCustomRejectionReason('');
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Select Rejection Reason
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50"
                  >
                    <option value="">Select a reason</option>
                    {commonRejectionReasons.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                    <option value="custom">Custom Reason</option>
                  </select>
                </div>

                {rejectionReason === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Custom Reason
                    </label>
                    <textarea
                      value={customRejectionReason}
                      onChange={(e) => setCustomRejectionReason(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                      placeholder="Enter custom rejection reason"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    onClick={handleReject}
                    disabled={processing || !rejectionReason || (rejectionReason === 'custom' && !customRejectionReason)}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 overflow-y-auto pt-20 pb-20">
            <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full my-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Payment Verification Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* User & Package Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-sm text-gray-400 mb-1">Trader</p>
                    <p className="text-white font-medium">{selectedRequest.user_name}</p>
                    <p className="text-sm text-gray-500">{selectedRequest.user_email}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-sm text-gray-400 mb-1">Package</p>
                    <p className="text-white font-medium">{selectedRequest.package_name}</p>
                    <p className="text-sm text-gray-500">
                      Amount: ${selectedRequest.amount.toLocaleString()} 
                      {selectedRequest.amount < selectedRequest.package_fee && (
                        <span className="ml-2 line-through text-gray-600">${selectedRequest.package_fee.toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* AI Verification Section */}
                <div className="p-5 rounded-xl bg-primary-500/5 border border-primary-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-primary-500/20 text-primary-400">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white uppercase tracking-wider text-sm">AI Analysis Report</h4>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (selectedRequest.ai_confidence || 0) >= 80 ? 'bg-green-500/20 text-green-400' :
                      (selectedRequest.ai_confidence || 0) >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedRequest.ai_confidence || 0}% Confidence
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-primary-400 mb-1 font-bold uppercase">AI Conclusion</p>
                      <p className="text-white text-sm bg-black/20 p-3 rounded-lg border border-white/5 italic">
                        "{selectedRequest.ai_reason || 'No specific reasoning provided by AI.'}"
                      </p>
                    </div>

                    {selectedRequest.ai_red_flags && Array.isArray(selectedRequest.ai_red_flags) && selectedRequest.ai_red_flags.length > 0 && (
                      <div>
                        <p className="text-xs text-red-400 mb-1 font-bold uppercase">Red Flags Detected</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.ai_red_flags.map((flag: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Screenshot Preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-400">Payment Screenshot</p>
                  <div className="aspect-video rounded-xl bg-black/40 border border-white/5 overflow-hidden group relative">
                    {selectedRequest.payment_screenshot_url ? (
                      <>
                        <img 
                          src={selectedRequest.payment_screenshot_url} 
                          alt="Payment Proof" 
                          className="w-full h-full object-contain"
                        />
                        <a 
                          href={selectedRequest.payment_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white space-x-2"
                        >
                          <Eye className="w-5 h-5" />
                          <span>View Full Size</span>
                        </a>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 italic">
                        No screenshot available
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setShowApprovalModal(true);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Override & Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectionModal(true);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-all border border-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Reject Payment
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