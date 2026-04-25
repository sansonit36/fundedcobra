import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Send, User, Zap, ChevronDown } from 'lucide-react';
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
  updated_at: string;
  // Joined
  account?: {
    mt5_login: string;
    model_type: string;
    current_phase: number;
    balance: number;
    package_name: string;
  };
  profile?: {
    name: string;
    email: string;
  };
}

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

export default function EvaluationReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

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
          account:trading_accounts!account_id(mt5_login, model_type, current_phase, balance, package_name),
          profile:profiles!evaluation_reviews_profile_id_fkey(name, email)
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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${styles[status]}`}>
        {icons[status]} {status}
      </span>
    );
  };

  const modelLabel = (type: string) => type === '1_step' ? '1-Step' : type === '2_step' ? '2-Step' : 'Instant';
  const modelColor = (type: string) => type === '1_step' ? '#3B82F6' : type === '2_step' ? '#10B981' : '#bd4dd6';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            Phase Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-[52px]">
            {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              filter === tab
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[9px]">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A]" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A]">
          <p className="text-gray-500 text-sm">No {filter === 'all' ? '' : filter} reviews found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map(review => {
            const mt = review.account?.model_type || '1_step';
            const mc = modelColor(mt);
            return (
              <div key={review.id} className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] overflow-hidden">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Trader info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${mc}15` }}>
                      <Zap className="w-5 h-5" style={{ color: mc }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-white">{review.profile?.name || 'Unknown Trader'}</span>
                        {statusBadge(review.status)}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        <span>{review.account?.mt5_login || '—'}</span>
                        <span>•</span>
                        <span style={{ color: mc }}>{modelLabel(mt)}</span>
                        <span>•</span>
                        <span>Phase {review.current_phase}</span>
                        <span>•</span>
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Progress */}
                  <div className="flex items-center gap-6 px-4">
                    <div className="text-center">
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">Target</div>
                      <div className="text-sm font-bold text-white">{review.target_profit}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">Actual</div>
                      <div className={`text-sm font-bold ${review.actual_profit >= review.target_profit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {review.actual_profit.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">Balance</div>
                      <div className="text-sm font-bold text-white">${(review.account?.balance || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {review.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setNotesModal({ id: review.id, action: 'approve' }); setAdminNotes(''); }}
                        disabled={processingId === review.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => { setNotesModal({ id: review.id, action: 'reject' }); setAdminNotes(''); }}
                        disabled={processingId === review.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {review.admin_notes && review.status !== 'pending' && (
                    <div className="text-xs text-gray-400 italic max-w-xs truncate">
                      {review.admin_notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div className={`p-5 border-b border-[#2A2A2A] ${notesModal.action === 'approve' ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
              <h3 className="text-lg font-bold text-white">
                {notesModal.action === 'approve' ? '✅ Approve & Promote' : '❌ Reject Review'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {notesModal.action === 'approve' 
                  ? 'This will advance the trader to their next phase.'
                  : 'The trader will be notified and can resubmit when ready.'}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder={notesModal.action === 'approve' ? 'Congratulations, well done!' : 'Reason for rejection...'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setNotesModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(notesModal.id, notesModal.action, adminNotes)}
                  disabled={processingId === notesModal.id}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-white ${
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
