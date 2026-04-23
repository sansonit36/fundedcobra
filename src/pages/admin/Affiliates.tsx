import { useState, useEffect } from 'react';
import { Search, User, Ban, TrendingUp, Users, DollarSign, Eye, X, ArrowUpDown, ChevronDown, Settings, Pencil, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingPayouts: number;
  currentTier: string;
  commission: number;
  customCommission: number | null;
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

interface AffiliateTierRow {
  id: string;
  name: string;
  commission_rate: number;
  min_referrals: number;
}

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

  // Custom commission edit state
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [customCommissionInput, setCustomCommissionInput] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);

  // Tier management
  const [showTierEditor, setShowTierEditor] = useState(false);
  const [tierRows, setTierRows] = useState<AffiliateTierRow[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [tierEditValues, setTierEditValues] = useState<Record<string, { commission_rate: string; min_referrals: string }>>({});

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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .not('referral_code', 'is', null)
        .order('created_at', { ascending: false });

      if (!profiles) return;

      const affiliatesData = await Promise.all(
        profiles.map(async (profile) => {
          const { count: totalReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', profile.id);

          const { count: activeReferrals } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact' })
            .eq('referrer_id', profile.id)
            .eq('status', 'active');

          const { data: earningsData } = await supabase.rpc('get_affiliate_earnings', { p_user_id: profile.id });
          const { data: tierData } = await supabase.rpc('get_affiliate_tier', { p_user_id: profile.id });

          const tier = tierData?.[0] || { tier_name: 'Bronze', commission_rate: 5 };
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
              commission: Number(tier.commission_rate),
              customCommission: profile.custom_commission_rate != null ? Number(profile.custom_commission_rate) : null,
            }
          };
        })
      );

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
      const { count: totalAffiliates } = await supabase
        .from('profiles').select('*', { count: 'exact' }).not('referral_code', 'is', null);
      const { count: activeAffiliates } = await supabase
        .from('profiles').select('*', { count: 'exact' }).not('referral_code', 'is', null).eq('status', 'active');
      const { data: commissionsData } = await supabase.from('affiliate_earnings').select('amount');
      const totalCommissions = commissionsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const { data: pendingData } = await supabase.from('affiliate_earnings').select('amount').eq('status', 'pending');
      const pendingPayouts = pendingData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      setStats({ totalAffiliates: totalAffiliates || 0, activeAffiliates: activeAffiliates || 0, totalCommissions, pendingPayouts });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTiers = async () => {
    setLoadingTiers(true);
    try {
      const { data } = await supabase.from('affiliate_tiers').select('*').order('min_referrals');
      if (data) {
        setTierRows(data);
        const initVals: Record<string, { commission_rate: string; min_referrals: string }> = {};
        data.forEach(t => { initVals[t.id] = { commission_rate: String(t.commission_rate), min_referrals: String(t.min_referrals) }; });
        setTierEditValues(initVals);
      }
    } catch (e) {
      console.error('Error loading tiers:', e);
    } finally {
      setLoadingTiers(false);
    }
  };

  const saveTier = async (tierId: string) => {
    const vals = tierEditValues[tierId];
    if (!vals) return;
    setSavingTier(tierId);
    try {
      await supabase.from('affiliate_tiers').update({
        commission_rate: parseFloat(vals.commission_rate),
        min_referrals: parseInt(vals.min_referrals),
      }).eq('id', tierId);
      await loadTiers();
    } catch (e) {
      console.error('Error saving tier:', e);
    } finally {
      setSavingTier(null);
    }
  };

  const loadAffiliateReferrals = async (affiliateId: string) => {
    setLoadingReferrals(true);
    try {
      const { data: referrals } = await supabase
        .from('affiliate_referrals')
        .select('id, status, created_at, referred_id')
        .eq('referrer_id', affiliateId)
        .order('created_at', { ascending: false });

      if (!referrals) { setAffiliateReferrals([]); return; }

      const referralDetails = await Promise.all(referrals.map(async (ref) => {
        const { data: profile } = await supabase.from('profiles').select('name, email, created_at').eq('id', ref.referred_id).single();
        const { data: earnings } = await supabase.from('affiliate_earnings').select('amount, source_transaction').eq('affiliate_id', affiliateId).eq('referral_id', ref.referred_id);
        const totalCommission = earnings?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
        let purchaseAmount = 0;
        if (earnings && earnings.length > 0) {
          const transactionIds = earnings.filter(e => e.source_transaction).map(e => e.source_transaction);
          if (transactionIds.length > 0) {
            const { data: transactions } = await supabase.from('account_requests').select('price').in('id', transactionIds);
            purchaseAmount = transactions?.reduce((sum, t) => sum + Number(t.price || 0), 0) || 0;
          }
        }
        return { id: ref.id, referredName: profile?.name || 'Unknown', referredEmail: profile?.email || '', status: ref.status, joinedAt: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A', purchaseAmount, commissionEarned: totalCommission };
      }));
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

  const closeViewModal = () => { setViewModalAffiliate(null); setAffiliateReferrals([]); setEditingCommissionId(null); };

  const startEditCommission = (affiliateId: string, current: number | null) => {
    setEditingCommissionId(affiliateId);
    setCustomCommissionInput(current != null ? String(current) : '');
  };

  const saveCustomCommission = async (affiliateId: string) => {
    setSavingCommission(true);
    try {
      const val = customCommissionInput.trim() === '' ? null : parseFloat(customCommissionInput);
      await supabase.from('profiles').update({ custom_commission_rate: val }).eq('id', affiliateId);
      setEditingCommissionId(null);
      await loadAffiliates();
      // Refresh modal affiliate data
      if (viewModalAffiliate?.id === affiliateId) {
        const updated = affiliates.find(a => a.id === affiliateId);
        if (updated) setViewModalAffiliate({ ...updated, stats: { ...updated.stats, customCommission: val } });
      }
    } catch (e) {
      console.error('Error saving custom commission:', e);
    } finally {
      setSavingCommission(false);
    }
  };

  const handleAction = async (action: string, affiliate: Affiliate) => {
    try {
      if (action === 'suspend') await supabase.from('profiles').update({ status: 'suspended' }).eq('id', affiliate.id);
      else if (action === 'activate') await supabase.from('profiles').update({ status: 'active' }).eq('id', affiliate.id);
      await loadAffiliates();
    } catch (error) { console.error('Error updating affiliate:', error); }
  };

  const toggleSort = (field: 'referrals' | 'earnings' | 'recent') => {
    if (sortBy === field) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = affiliate.name?.toLowerCase().includes(searchQuery.toLowerCase()) || affiliate.email?.toLowerCase().includes(searchQuery.toLowerCase()) || affiliate.referralCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
    const matchesTier = tierFilter === 'all' || affiliate.stats.currentTier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const sortedAffiliates = [...filteredAffiliates].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'referrals': comparison = a.stats.totalReferrals - b.stats.totalReferrals; break;
      case 'earnings': comparison = a.stats.totalEarnings - b.stats.totalEarnings; break;
      case 'recent': comparison = new Date(a.joinedAtRaw).getTime() - new Date(b.joinedAtRaw).getTime(); break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#bd4dd6]"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Affiliate Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage affiliates, commissions, and tier structures.</p>
        </div>
        <button
          onClick={() => { setShowTierEditor(true); loadTiers(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#bd4dd6]/10 hover:bg-[#bd4dd6]/20 text-[#bd4dd6] border border-[#bd4dd6]/30 text-sm font-bold rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" /> Manage Tiers
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Affiliates', value: stats.totalAffiliates, icon: Users, color: 'text-[#bd4dd6]', bg: 'bg-[#bd4dd6]/10' },
          { label: 'Active Affiliates', value: stats.activeAffiliates, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Total Commissions', value: `$${stats.totalCommissions.toLocaleString()}`, icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Pending Payouts', value: `$${stats.pendingPayouts.toLocaleString()}`, icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#1e1e1e] rounded-xl border border-[#2A2A2A] p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Affiliates Table */}
      <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search affiliates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-lg bg-[#161616] border border-[#2A2A2A] text-white placeholder-gray-500 focus:outline-none focus:border-[#bd4dd6] text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { val: statusFilter, set: setStatusFilter, opts: [['all','All Status'],['active','Active'],['suspended','Suspended']] },
              { val: tierFilter, set: setTierFilter, opts: [['all','All Tiers'],['Bronze','Bronze'],['Silver','Silver'],['Gold','Gold'],['Diamond','Diamond']] },
            ].map(({ val, set, opts }, i) => (
              <div key={i} className="relative">
                <select value={val} onChange={(e) => set(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#161616] border border-[#2A2A2A] text-gray-200 focus:outline-none text-sm">
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            ))}
            <button onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 rounded-lg bg-[#161616] border border-[#2A2A2A] text-gray-200 hover:border-[#404040] transition-colors text-sm">
              {sortOrder === 'desc' ? '↓ High' : '↑ Low'}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4">Showing {sortedAffiliates.length} of {affiliates.length} affiliates</div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="pb-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider">Affiliate</th>
                <th className="pb-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="pb-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => toggleSort('referrals')}>
                  <span className="flex items-center gap-1">Referrals {sortBy === 'referrals' && <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="pb-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => toggleSort('earnings')}>
                  <span className="flex items-center gap-1">Earnings {sortBy === 'earnings' && <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="pb-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider">Tier / Commission</th>
                <th className="pb-3 text-right text-gray-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAffiliates.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center"><Users className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="text-gray-400 text-sm">No affiliates found</p></td></tr>
              ) : sortedAffiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-b border-[#2A2A2A] last:border-0 hover:bg-white/[0.02]">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-gray-400" /></div>
                      <div>
                        <div className="font-medium text-white text-sm">{affiliate.name}</div>
                        <div className="text-xs text-gray-400">{affiliate.email}</div>
                        <div className="text-xs text-[#bd4dd6] font-mono">{affiliate.referralCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${statusStyles[affiliate.status]}`}>{affiliate.status}</div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-white text-sm">{affiliate.stats.totalReferrals}</div>
                    <div className="text-xs text-gray-500">{affiliate.stats.activeReferrals} active</div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-white text-sm">${affiliate.stats.totalEarnings.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">${affiliate.stats.pendingPayouts.toLocaleString()} pending</div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-white text-sm">{affiliate.stats.currentTier}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">{affiliate.stats.commission}%</span>
                      {affiliate.stats.customCommission != null && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">Custom: {affiliate.stats.customCommission}%</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openViewModal(affiliate)} className="p-1.5 rounded-lg bg-[#bd4dd6]/10 hover:bg-[#bd4dd6]/20 text-[#bd4dd6] transition-colors" title="View / Edit"><Eye className="w-4 h-4" /></button>
                      {affiliate.status !== 'suspended' ? (
                        <button onClick={() => handleAction('suspend', affiliate)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Suspend"><Ban className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleAction('activate', affiliate)} className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors" title="Activate"><User className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tier Editor Modal ── */}
      {showTierEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2A2A2A] p-6 max-w-xl w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Affiliate Tier Editor</h3>
                <p className="text-xs text-gray-500 mt-0.5">Changes apply to all affiliates unless they have a custom override.</p>
              </div>
              <button onClick={() => setShowTierEditor(false)} className="w-8 h-8 rounded-full bg-[#2A2A2A] hover:bg-[#404040] flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
            </div>

            {loadingTiers ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bd4dd6]"></div></div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 px-3 pb-2 border-b border-[#2A2A2A]">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Tier</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Commission %</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Min. Active Traders</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider text-right">Save</span>
                </div>
                {tierRows.map((tier) => {
                  const vals = tierEditValues[tier.id] || { commission_rate: String(tier.commission_rate), min_referrals: String(tier.min_referrals) };
                  return (
                    <div key={tier.id} className="grid grid-cols-4 gap-2 items-center bg-[#161616] rounded-xl p-3 border border-[#2A2A2A]">
                      <span className="font-bold text-white text-sm">{tier.name}</span>
                      <input type="number" value={vals.commission_rate} min={0} max={100} step={0.5}
                        onChange={(e) => setTierEditValues(prev => ({ ...prev, [tier.id]: { ...vals, commission_rate: e.target.value } }))}
                        className="bg-[#1e1e1e] border border-[#2A2A2A] focus:border-[#bd4dd6] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none w-full" />
                      <input type="number" value={vals.min_referrals} min={0} step={1}
                        onChange={(e) => setTierEditValues(prev => ({ ...prev, [tier.id]: { ...vals, min_referrals: e.target.value } }))}
                        className="bg-[#1e1e1e] border border-[#2A2A2A] focus:border-[#bd4dd6] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none w-full" />
                      <div className="flex justify-end">
                        <button onClick={() => saveTier(tier.id)} disabled={savingTier === tier.id}
                          className="px-3 py-1.5 bg-[#bd4dd6] hover:bg-[#aa44c0] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                          {savingTier === tier.id ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-400">Changing tiers affects all affiliates without a custom commission override. Affiliates with custom rates are unaffected.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Affiliate Details Modal ── */}
      {viewModalAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2A2A2A] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Affiliate Details</h3>
              <button onClick={closeViewModal} className="w-8 h-8 rounded-full bg-[#2A2A2A] hover:bg-[#404040] flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
            </div>

            {/* Info Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Name', value: viewModalAffiliate.name },
                { label: 'Email', value: viewModalAffiliate.email },
                { label: 'Referral Code', value: viewModalAffiliate.referralCode, mono: true },
                { label: 'Joined', value: viewModalAffiliate.joinedAt },
              ].map(({ label, value, mono }) => (
                <div key={label} className="bg-[#161616] rounded-xl p-3 border border-[#2A2A2A]">
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className={`text-white font-medium text-sm ${mono ? 'font-mono text-[#bd4dd6]' : ''}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Stats + Custom Commission */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-[#bd4dd6]/10 rounded-xl p-3 border border-[#bd4dd6]/20">
                <p className="text-[#bd4dd6] text-xs mb-1">Total Referrals</p>
                <p className="text-2xl font-bold text-white">{viewModalAffiliate.stats.totalReferrals}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                <p className="text-green-400 text-xs mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-white">${viewModalAffiliate.stats.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-3 border border-[#3A3A3A]">
                <p className="text-gray-400 text-xs mb-1">Tier</p>
                <p className="text-2xl font-bold text-white">{viewModalAffiliate.stats.currentTier}</p>
              </div>
              {/* Custom Commission Control */}
              <div className="bg-orange-500/5 rounded-xl p-3 border border-orange-500/20">
                <p className="text-orange-400 text-xs mb-2 flex items-center gap-1"><Pencil className="w-3 h-3" /> Custom Commission</p>
                {editingCommissionId === viewModalAffiliate.id ? (
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={customCommissionInput} onChange={(e) => setCustomCommissionInput(e.target.value)}
                      placeholder="e.g. 15" min={0} max={100} step={0.5}
                      className="w-full bg-[#161616] border border-[#bd4dd6] rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                    <button onClick={() => saveCustomCommission(viewModalAffiliate.id)} disabled={savingCommission}
                      className="p-1.5 bg-[#bd4dd6] hover:bg-[#aa44c0] text-white rounded-lg transition-colors disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingCommissionId(null)} className="p-1.5 bg-[#2A2A2A] hover:bg-[#404040] text-gray-400 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-white">
                      {viewModalAffiliate.stats.customCommission != null ? `${viewModalAffiliate.stats.customCommission}%` : `${viewModalAffiliate.stats.commission}% (tier)`}
                    </p>
                    <button onClick={() => startEditCommission(viewModalAffiliate.id, viewModalAffiliate.stats.customCommission)}
                      className="p-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {viewModalAffiliate.stats.customCommission != null && (
                  <p className="text-[10px] text-orange-400/70 mt-1">Custom override active — tier rate ignored</p>
                )}
              </div>
            </div>

            {/* Referrals Table */}
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#bd4dd6]" /> Referrals ({affiliateReferrals.length})
            </h4>
            {loadingReferrals ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bd4dd6]"></div></div>
            ) : affiliateReferrals.length === 0 ? (
              <div className="text-center py-8 bg-[#161616] rounded-xl border border-[#2A2A2A]">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="text-gray-400 text-sm">No referrals yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#2A2A2A]">
                    {['Referred User','Status','Joined','Purchase Amount','Commission'].map(h => (
                      <th key={h} className={`pb-3 text-gray-400 font-medium text-xs uppercase tracking-wider ${h === 'Purchase Amount' || h === 'Commission' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {affiliateReferrals.map((ref) => (
                      <tr key={ref.id} className="border-b border-[#2A2A2A] last:border-0">
                        <td className="py-3"><div className="font-medium text-white">{ref.referredName}</div><div className="text-xs text-gray-400">{ref.referredEmail}</div></td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ref.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{ref.status}</span></td>
                        <td className="py-3 text-gray-300 text-xs">{ref.joinedAt}</td>
                        <td className="py-3 text-right text-white">${ref.purchaseAmount.toLocaleString()}</td>
                        <td className="py-3 text-right text-green-400 font-medium">${ref.commissionEarned.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={closeViewModal} className="px-5 py-2 rounded-lg bg-[#2A2A2A] hover:bg-[#404040] text-white font-medium transition-colors text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}