import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Send, User, Zap, ChevronDown, ChevronUp, TrendingUp, TrendingDown, BarChart3, Eye, Activity, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Review {
  id: string;
  account_id: string;
  user_id: string;
  current_phase: number;
  target_profit: number;
  actual_profit: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  account?: {
    mt5_login: string;
    model_type: string;
    current_phase: number;
    balance: number;
    starting_balance: number;
    equity: number;
    package_name: string;
    daily_loss_limit: number;
    overall_loss_limit: number;
  };
  profile?: {
    name: string;
    email: string;
  };
  stats?: {
    total_trades: number;
    win_rate: number;
    profit_factor: number;
    average_win: number;
    average_loss: number;
    current_profit: number;
  } | null;
}

interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  profit: number;
  open_time: string;
  close_time: string;
}

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

export default function EvaluationReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trades, setTrades] = useState<Record<string, Trade[]>>({});
  const [stats, setStats] = useState<Record<string, Review['stats']>>({});
  const [loadingTrades, setLoadingTrades] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evaluation_reviews')
        .select(`
          *,
          account:trading_accounts!account_id(mt5_login, model_type, current_phase, balance, starting_balance, equity, package_name, daily_loss_limit, overall_loss_limit),
          profile:profiles!user_id(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrades = async (mt5Login: string, reviewId: string) => {
    if (trades[reviewId]) {
      setExpandedId(expandedId === reviewId ? null : reviewId);
      return;
    }
    setLoadingTrades(reviewId);
    try {
      // Load trades
      const { data: tradeData, error: tradeError } = await supabase
        .from('trade_history')
        .select('id, ticket, symbol, type, volume, open_price, close_price, profit, open_time, close_time')
        .eq('mt5_id', mt5Login)
        .order('close_time', { ascending: false })
        .limit(50);

      if (tradeError) throw tradeError;
      setTrades(prev => ({ ...prev, [reviewId]: tradeData || [] }));

      // Load stats for this account
      const review = reviews.find(r => r.id === reviewId);
      if (review?.account_id) {
        const { data: statData } = await supabase
          .from('trading_stats')
          .select('total_trades, win_rate, profit_factor, average_win, average_loss, current_profit')
          .eq('account_id', review.account_id)
          .single();
        setStats(prev => ({ ...prev, [reviewId]: statData || null }));
      }

      setExpandedId(reviewId);
    } catch (err) {
      console.error('Error loading trades:', err);
    } finally {
      setLoadingTrades(null);
    }
  };

  const handleAction = async (reviewId: string, action: 'approve' | 'reject', notes?: string) => {
    setProcessingId(reviewId);
    try {
      if (action === 'approve') {
        const { error } = await supabase.rpc('promote_account_phase', {
          p_review_id: reviewId,
          p_admin_notes: notes || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('reject_evaluation_review', {
          p_review_id: reviewId,
          p_admin_notes: notes || null,
        });
        if (error) throw error;
      }
      await loadReviews();
      setNotesModal(null);
      setAdminNotes('');
    } catch (err: any) {
      console.error('Error processing review:', err);
      alert(`Error: ${err.message || 'Failed to process review'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReviews = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);
  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const rejectedCount = reviews.filter(r => r.status === 'rejected').length;

  const modelLabel = (type: string) => type === '1_step' ? '1-Step' : type === '2_step' ? '2-Step' : 'Instant';

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Phase Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">Review evaluation requests and promote traders</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: pendingCount, color: 'yellow', icon: Clock },
          { label: 'Approved', count: approvedCount, color: 'emerald', icon: CheckCircle },
          { label: 'Rejected', count: rejectedCount, color: 'red', icon: XCircle },
          { label: 'Total', count: reviews.length, color: 'blue', icon: BarChart3 },
        ].map(s => (
          <div key={s.label} className="card-gradient rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</span>
              <s.icon className={`w-4 h-4 text-${s.color}-400`} />
            </div>
            <div className="text-2xl font-bold text-white">{s.count}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs & Content */}
      <div className="card-gradient rounded-2xl border border-white/5">
        <div className="p-6 border-b border-white/5">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'pending' as FilterTab, label: 'Pending', count: pendingCount },
              { key: 'approved' as FilterTab, label: 'Approved', count: approvedCount },
              { key: 'rejected' as FilterTab, label: 'Rejected', count: rejectedCount },
              { key: 'all' as FilterTab, label: 'All', count: reviews.length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="divide-y divide-white/5">
          {filteredReviews.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500">No {filter === 'all' ? '' : filter + ' '}reviews found</p>
            </div>
          ) : (
            filteredReviews.map(review => {
              const mt = review.account?.model_type || '1_step';
              const isExpanded = expandedId === review.id;
              const reviewTrades = trades[review.id] || [];
              const stat = stats[review.id] || null;
              const profitPct = review.actual_profit;
              const passedTarget = profitPct >= review.target_profit;

              return (
                <div key={review.id}>
                  {/* Main Row */}
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Trader Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{review.profile?.name || 'Unknown'}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              review.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              review.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {review.status === 'pending' ? <Clock className="w-3 h-3" /> : review.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {review.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>{review.account?.mt5_login}</span>
                            <span>•</span>
                            <span className="text-primary-400 font-medium">{review.account?.package_name || modelLabel(mt)}</span>
                            <span>•</span>
                            <span>Phase {review.current_phase}</span>
                            <span>•</span>
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="flex items-center gap-5 lg:gap-6">
                        <div className="text-center">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Target</div>
                          <div className="text-sm font-bold text-white">{review.target_profit}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Actual</div>
                          <div className={`text-sm font-bold ${passedTarget ? 'text-emerald-400' : 'text-red-400'}`}>
                            {profitPct.toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Balance</div>
                          <div className="text-sm font-bold text-white">${(review.account?.balance || 0).toLocaleString()}</div>
                        </div>
                        {stat && (
                          <>
                            <div className="text-center hidden md:block">
                              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Trades</div>
                              <div className="text-sm font-bold text-white">{stat.total_trades || 0}</div>
                            </div>
                            <div className="text-center hidden md:block">
                              <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Win Rate</div>
                              <div className="text-sm font-bold text-white">{(stat.win_rate || 0).toFixed(1)}%</div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => loadTrades(review.account?.mt5_login || '', review.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          {loadingTrades === review.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                          ) : isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          {isExpanded ? 'Hide' : 'View'} Trades
                        </button>

                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setNotesModal({ id: review.id, action: 'approve' }); setAdminNotes(''); }}
                              disabled={processingId === review.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => { setNotesModal({ id: review.id, action: 'reject' }); setAdminNotes(''); }}
                              disabled={processingId === review.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {review.admin_notes && review.status !== 'pending' && (
                      <div className="mt-3 ml-14 text-xs text-gray-400 italic bg-white/5 rounded-lg px-3 py-2">
                        Admin: {review.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Expanded Trades Panel */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/20">
                      {/* Account Overview Cards */}
                      <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[
                          { label: 'Starting Balance', value: `$${(review.account?.starting_balance || 0).toLocaleString()}`, icon: DollarSign },
                          { label: 'Current Balance', value: `$${(review.account?.balance || 0).toLocaleString()}`, icon: DollarSign },
                          { label: 'Equity', value: `$${(review.account?.equity || 0).toLocaleString()}`, icon: Activity },
                          { label: 'Win Rate', value: `${(stat?.win_rate || 0).toFixed(1)}%`, icon: TrendingUp },
                          { label: 'Profit Factor', value: `${(stat?.profit_factor || 0).toFixed(2)}`, icon: BarChart3 },
                          { label: 'Total Trades', value: `${stat?.total_trades || 0}`, icon: Activity },
                        ].map(c => (
                          <div key={c.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <c.icon className="w-3 h-3 text-gray-500" />
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{c.label}</span>
                            </div>
                            <div className="text-sm font-bold text-white">{c.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Trades Table */}
                      <div className="px-5 pb-5">
                        <div className="text-xs font-medium text-gray-400 mb-3">
                          Recent Trades ({reviewTrades.length}{reviewTrades.length === 50 ? '+' : ''})
                        </div>
                        {reviewTrades.length === 0 ? (
                          <div className="text-center py-8 text-gray-600 text-sm">No trade history found for this account</div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-white/5">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white/5">
                                  <th className="px-3 py-2.5 text-left text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Ticket</th>
                                  <th className="px-3 py-2.5 text-left text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Symbol</th>
                                  <th className="px-3 py-2.5 text-left text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Type</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Volume</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Open</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Close</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Profit</th>
                                  <th className="px-3 py-2.5 text-right text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {reviewTrades.map(trade => (
                                  <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-3 py-2 text-gray-300 font-mono text-xs">{trade.ticket}</td>
                                    <td className="px-3 py-2 text-white font-medium">{trade.symbol}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                        trade.type?.toLowerCase().includes('buy') ? 'text-emerald-400' : 'text-red-400'
                                      }`}>
                                        {trade.type?.toLowerCase().includes('buy') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {trade.type}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-300">{Number(trade.volume).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right text-gray-400 font-mono text-xs">{Number(trade.open_price).toFixed(5)}</td>
                                    <td className="px-3 py-2 text-right text-gray-400 font-mono text-xs">{Number(trade.close_price).toFixed(5)}</td>
                                    <td className={`px-3 py-2 text-right font-semibold ${Number(trade.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {Number(trade.profit) >= 0 ? '+' : ''}${Number(trade.profit).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-500 text-xs whitespace-nowrap">
                                      {trade.close_time ? new Date(trade.close_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card-gradient border border-white/5 rounded-2xl overflow-hidden">
            <div className={`p-5 border-b border-white/5 ${notesModal.action === 'approve' ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {notesModal.action === 'approve' ? <><CheckCircle className="w-5 h-5 text-emerald-400" /> Approve & Promote</> : <><XCircle className="w-5 h-5 text-red-400" /> Reject Review</>}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {notesModal.action === 'approve'
                  ? 'This will advance the trader to their next phase.'
                  : 'The trader will be notified and can resubmit when ready.'}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder={notesModal.action === 'approve' ? 'Congratulations, well done!' : 'Reason for rejection...'}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500/50 resize-none placeholder-gray-600"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setNotesModal(null)}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(notesModal.id, notesModal.action, adminNotes)}
                  disabled={processingId === notesModal.id}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors text-white disabled:opacity-50 ${
                    notesModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {processingId === notesModal.id ? 'Processing...' : notesModal.action === 'approve' ? 'Approve & Promote' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
