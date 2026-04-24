import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Tag, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccountPackage {
  id: string;
  name: string;
  balance: number;
  price: number;
  account_type: 'instant' | '1_step' | '2_step';
  is_active: boolean;
  trading_days: number;
  profit_target: number;
  daily_loss_limit: number;
  overall_loss_limit: number;
  created_at: string;
}

interface AccountRule {
  id: string;
  package_id: string | null;
  account_package_name: string;
  account_type: 'instant' | '1_step' | '2_step';
  profit_target_phase1: number;
  profit_target_phase2: number | null;
  daily_drawdown_percent: number;
  overall_drawdown_percent: number;
  minimum_trading_days: number;
  minimum_withdrawal_amount: number;
  payout_split_percent: number;
  news_trading_allowed: boolean;
  weekend_holding_allowed: boolean;
  rule_version: string;
}

interface PromotionalOffer {
  id: string;
  title: string;
  description: string;
  discount_code: string;
  discount_percent: number;
  account_types: string[];
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export default function PackagesAndOffers() {
  const [packages, setPackages] = useState<AccountPackage[]>([]);
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [offers, setOffers] = useState<PromotionalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AccountPackage | null>(null);
  const [editingOffer, setEditingOffer] = useState<PromotionalOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [packageBuilderStep, setPackageBuilderStep] = useState(1);

  // Package form state
  const [packageForm, setPackageForm] = useState({
    rule_id: '',
    name: '',
    account_type: 'instant' as 'instant' | '1_step' | '2_step',
    balance: '',
    price: '',
    profit_target_phase1: '5',
    profit_target_phase2: '5',
    daily_drawdown_percent: '8',
    overall_drawdown_percent: '12',
    minimum_trading_days: '0',
    minimum_withdrawal_amount: '20',
    payout_split_percent: '80',
    news_trading_allowed: true,
    weekend_holding_allowed: true,
    is_active: true,
  });

  // Offer form state
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    discount_code: '',
    discount_percent: '',
    account_types: [] as string[],
    expires_at: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const modelLabels: Record<AccountPackage['account_type'], string> = {
    instant: 'Instant',
    '1_step': '1-Step',
    '2_step': '2-Step'
  };

  const modelBadgeClasses: Record<AccountPackage['account_type'], string> = {
    instant: 'bg-[#bd4dd6]/15 text-[#d98be8] border border-[#bd4dd6]/30',
    '1_step': 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    '2_step': 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
  };

  const getRuleForPackage = (pkg: AccountPackage) => {
    return (
      rules.find((r) => r.package_id === pkg.id) ||
      rules.find((r) => r.account_package_name === pkg.name)
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesRes, offersRes, rulesRes] = await Promise.all([
        supabase.from('account_packages').select('*').order('balance', { ascending: true }),
        supabase.from('promotional_offers').select('*').order('created_at', { ascending: false }),
        supabase
          .from('account_rules')
          .select(`
            id,
            package_id,
            account_package_name,
            account_type,
            profit_target_phase1,
            profit_target_phase2,
            daily_drawdown_percent,
            overall_drawdown_percent,
            minimum_trading_days,
            minimum_withdrawal_amount,
            payout_split_percent,
            news_trading_allowed,
            weekend_holding_allowed,
            rule_version
          `)
          .neq('rule_version', 'legacy')
      ]);

      if (packagesRes.error) throw packagesRes.error;
      if (offersRes.error) throw offersRes.error;
      if (rulesRes.error) throw rulesRes.error;

      setPackages(packagesRes.data || []);
      setOffers(offersRes.data || []);
      setRules((rulesRes.data || []) as AccountRule[]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Package CRUD operations
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const balance = parseFloat(packageForm.balance);
      const price = parseFloat(packageForm.price);
      const phase1Target = parseFloat(packageForm.profit_target_phase1);
      const phase2Target = parseFloat(packageForm.profit_target_phase2);
      const dailyDrawdownPercent = parseFloat(packageForm.daily_drawdown_percent);
      const overallDrawdownPercent = parseFloat(packageForm.overall_drawdown_percent);
      const minimumTradingDays = parseInt(packageForm.minimum_trading_days || '0', 10);
      const minimumWithdrawalAmount = parseFloat(packageForm.minimum_withdrawal_amount || '20');
      const payoutSplitPercent = parseFloat(packageForm.payout_split_percent || '80');

      if (!Number.isFinite(balance) || balance <= 0) {
        throw new Error('Balance must be a positive number');
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('Price must be a positive number');
      }
      if (!Number.isFinite(phase1Target) || phase1Target < 0) {
        throw new Error('Phase 1 target must be 0 or greater');
      }
      if (packageForm.account_type === '2_step' && (!Number.isFinite(phase2Target) || phase2Target <= 0)) {
        throw new Error('Phase 2 target is required for 2-step accounts');
      }

      const dailyLossLimit = (balance * dailyDrawdownPercent) / 100;
      const overallLossLimit = (balance * overallDrawdownPercent) / 100;

      const packageData = {
        name: packageForm.name.trim(),
        balance,
        price,
        account_type: packageForm.account_type,
        is_active: packageForm.is_active,
        trading_days: minimumTradingDays,
        profit_target: packageForm.account_type === '2_step' ? phase2Target : phase1Target,
        daily_loss_limit: dailyLossLimit,
        overall_loss_limit: overallLossLimit
      };

      if (!packageData.name) {
        throw new Error('Package name is required');
      }

      let packageId = editingPackage?.id || '';

      if (editingPackage) {
        const { error } = await supabase
          .from('account_packages')
          .update(packageData)
          .eq('id', editingPackage.id);
        if (error) throw error;
      } else {
        const { data: insertedPackage, error } = await supabase
          .from('account_packages')
          .insert([packageData])
          .select('id')
          .single();
        if (error) throw error;
        packageId = insertedPackage.id;
      }

      const phase1Target = parseFloat(packageForm.profit_target_phase1);
      const phase2Target = parseFloat(packageForm.profit_target_phase2);
      const withdrawalTarget = parseFloat(packageForm.withdrawal_target_percent);
      const payoutSplitPercent = parseFloat(packageForm.payout_split_percent);

      const accountRuleData = {
        package_id: packageId,
        account_package_name: packageData.name,
        account_type: packageForm.account_type,
        withdrawal_target_percent: withdrawalTarget,
        has_profit_target: packageForm.account_type !== 'instant',
        profit_target_percent: phase1Target,
        profit_target_phase1: phase1Target,
        profit_target_phase2: packageForm.account_type === '2_step' ? phase2Target : null,
        minimum_trading_days: minimumTradingDays,
        has_minimum_trading_days: minimumTradingDays > 0,
        daily_payout_enabled: packageForm.account_type === 'instant',
        weekly_payout_enabled: true,
        minimum_withdrawal_amount: minimumWithdrawalAmount,
        single_trade_limit_percent: 25,
        daily_drawdown_percent: dailyDrawdownPercent,
        overall_drawdown_percent: overallDrawdownPercent,
        news_trading_allowed: packageForm.news_trading_allowed,
        weekend_holding_allowed: packageForm.weekend_holding_allowed,
        payout_split_percent: payoutSplitPercent,
        rule_description: `${modelLabels[packageForm.account_type]} model | DD ${dailyDrawdownPercent}% / ${overallDrawdownPercent}% | Min days ${minimumTradingDays}`,
        rule_version: 'v2',
        updated_at: new Date().toISOString()
      };

      if (packageForm.rule_id) {
        const { error: updateRuleError } = await supabase
          .from('account_rules')
          .update(accountRuleData)
          .eq('id', packageForm.rule_id);

        if (updateRuleError) throw updateRuleError;
      } else {
        const { error: upsertRuleError } = await supabase
          .from('account_rules')
          .upsert([accountRuleData], { onConflict: 'account_package_name' });

        if (upsertRuleError) throw upsertRuleError;
      }

      setSuccess(editingPackage ? 'Package and rules updated successfully' : 'Package and rules created successfully');

      setShowPackageModal(false);
      setEditingPackage(null);
      setPackageBuilderStep(1);
      resetPackageForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save package');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const { error } = await supabase
        .from('account_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Package deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete package');
    }
  };

  const openEditPackage = (pkg: AccountPackage) => {
    const matchedRule = getRuleForPackage(pkg);
    const fallbackDailyPercent = pkg.balance > 0 ? ((pkg.daily_loss_limit / pkg.balance) * 100).toFixed(2) : '8';
    const fallbackOverallPercent = pkg.balance > 0 ? ((pkg.overall_loss_limit / pkg.balance) * 100).toFixed(2) : '12';

    setEditingPackage(pkg);
    setPackageForm({
      rule_id: matchedRule?.id || '',
      name: pkg.name,
      account_type: pkg.account_type || 'instant',
      balance: pkg.balance.toString(),
      price: pkg.price.toString(),
      profit_target_phase1: (matchedRule?.profit_target_phase1 ?? pkg.profit_target ?? 5).toString(),
      profit_target_phase2: (matchedRule?.profit_target_phase2 ?? '').toString(),
      daily_drawdown_percent: (matchedRule?.daily_drawdown_percent ?? fallbackDailyPercent).toString(),
      overall_drawdown_percent: (matchedRule?.overall_drawdown_percent ?? fallbackOverallPercent).toString(),
      minimum_trading_days: (matchedRule?.minimum_trading_days ?? pkg.trading_days ?? 0).toString(),
      minimum_withdrawal_amount: (matchedRule?.minimum_withdrawal_amount ?? 20).toString(),
      payout_split_percent: (matchedRule?.payout_split_percent ?? 80).toString(),
      news_trading_allowed: matchedRule?.news_trading_allowed ?? true,
      weekend_holding_allowed: matchedRule?.weekend_holding_allowed ?? true,
      is_active: pkg.is_active,
    });
    setPackageBuilderStep(1);
    setShowPackageModal(true);
  };

  const resetPackageForm = () => {
    setPackageForm({
      rule_id: '',
      name: '',
      account_type: 'instant',
      balance: '',
      price: '',
      profit_target_phase1: '5',
      profit_target_phase2: '5',
      daily_drawdown_percent: '8',
      overall_drawdown_percent: '12',
      minimum_trading_days: '0',
      minimum_withdrawal_amount: '20',
      payout_split_percent: '80',
      news_trading_allowed: true,
      weekend_holding_allowed: true,
      is_active: true,
    });
  };

  // Offer CRUD operations
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const offerData = {
        title: offerForm.title,
        description: offerForm.description,
        discount_code: offerForm.discount_code.toUpperCase(),
        discount_percent: parseFloat(offerForm.discount_percent),
        account_types: offerForm.account_types,
        expires_at: offerForm.expires_at,
        is_active: offerForm.is_active
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('promotional_offers')
          .update(offerData)
          .eq('id', editingOffer.id);
        if (error) throw error;
        setSuccess('Offer updated successfully');
      } else {
        const { error } = await supabase
          .from('promotional_offers')
          .insert([offerData]);
        if (error) throw error;
        setSuccess('Offer created successfully');
      }

      setShowOfferModal(false);
      setEditingOffer(null);
      resetOfferForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save offer');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('promotional_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Offer deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete offer');
    }
  };

  const openEditOffer = (offer: PromotionalOffer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description,
      discount_code: offer.discount_code,
      discount_percent: offer.discount_percent.toString(),
      account_types: offer.account_types,
      expires_at: offer.expires_at.split('T')[0],
      is_active: offer.is_active
    });
    setShowOfferModal(true);
  };

  const resetOfferForm = () => {
    setOfferForm({
      title: '',
      description: '',
      discount_code: '',
      discount_percent: '',
      account_types: [],
      expires_at: '',
      is_active: true
    });
  };

  const toggleAccountType = (type: string) => {
    setOfferForm(prev => ({
      ...prev,
      account_types: prev.account_types.includes(type)
        ? prev.account_types.filter(t => t !== type)
        : [...prev.account_types, type]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Packages & Offers Management</h1>
        <p className="text-gray-400 mt-1">Manage account packages, prices, and promotional offers</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          {success}
        </div>
      )}

      {/* Account Packages Section */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Package className="w-5 h-5 mr-2 text-primary-400" />
            Account Packages
          </h2>
          <button
            onClick={() => {
              setEditingPackage(null);
              resetPackageForm();
              setPackageBuilderStep(1);
              setShowPackageModal(true);
            }}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Package</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="pb-3 text-left text-gray-400 font-medium">Package Name</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Model</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Balance</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Price</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-gray-700/50 hover:bg-white/5">
                  <td className="py-4 text-white font-medium">{pkg.name}</td>
                  <td className="py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${modelBadgeClasses[pkg.account_type || 'instant']}`}>
                      {modelLabels[pkg.account_type || 'instant']}
                    </span>
                  </td>
                  <td className="py-4 text-white">${pkg.balance.toLocaleString()}</td>
                  <td className="py-4 text-green-400 font-semibold">${pkg.price.toLocaleString()}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                      }`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditPackage(pkg)}
                        className="p-2 rounded-lg hover:bg-primary-500/10 text-primary-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promotional Offers Section */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Tag className="w-5 h-5 mr-2 text-purple-400" />
            Promotional Offers
          </h2>
          <button
            onClick={() => {
              setEditingOffer(null);
              resetOfferForm();
              setShowOfferModal(true);
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Offer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{offer.title}</h3>
                    <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-400/30 text-white font-bold">
                      {offer.discount_percent}% OFF
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${offer.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                      }`}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{offer.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-primary-400" />
                      <code className="text-primary-400 font-mono font-bold">{offer.discount_code}</code>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-400">
                        Expires: {new Date(offer.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offer.account_types.map(type => (
                      <span key={type} className="px-2 py-1 rounded bg-slate-700 text-xs text-gray-300">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openEditOffer(offer)}
                    className="p-2 rounded-lg hover:bg-primary-500/10 text-primary-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="card-gradient rounded-2xl border border-white/10 p-6 max-w-2xl w-full my-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingPackage ? 'Edit Account Model Package' : 'Create Account Model Package'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Build package details, evaluation phases, and trading permissions in three steps.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {['Core Setup', 'Evaluation Rules', 'Permissions & Payout'].map((label, index) => {
                const step = index + 1;
                const active = packageBuilderStep === step;
                const completed = packageBuilderStep > step;
                return (
                  <div
                    key={label}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold text-center transition-colors ${
                      active
                        ? 'border-primary-400/50 bg-primary-500/15 text-primary-300'
                        : completed
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-gray-400'
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSavePackage} className="space-y-5">
              {packageBuilderStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Account Model</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(['instant', '1_step', '2_step'] as const).map((model) => (
                        <button
                          type="button"
                          key={model}
                          onClick={() => setPackageForm({ ...packageForm, account_type: model })}
                          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                            packageForm.account_type === model
                              ? modelBadgeClasses[model]
                              : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'
                          }`}
                        >
                          <div className="font-semibold">{modelLabels[model]}</div>
                          <div className="text-xs opacity-80 mt-0.5">
                            {model === 'instant' && 'Direct funded model'}
                            {model === '1_step' && 'Single evaluation phase'}
                            {model === '2_step' && 'Two evaluation phases'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Package Name</label>
                      <input
                        type="text"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                        placeholder="e.g., $25,000 1-Step"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Package Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                        placeholder="299"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Account Size / Balance ($)</label>
                    <input
                      type="number"
                      value={packageForm.balance}
                      onChange={(e) => setPackageForm({ ...packageForm, balance: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                      placeholder="25000"
                      required
                    />
                  </div>
                </div>
              )}

              {packageBuilderStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {packageForm.account_type === 'instant' ? 'Withdrawal Target %' : 'Profit Target Phase 1 %'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={packageForm.profit_target_phase1}
                        onChange={(e) => setPackageForm({ ...packageForm, profit_target_phase1: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                        required
                      />
                    </div>

                    {packageForm.account_type === '2_step' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Profit Target Phase 2 %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={packageForm.profit_target_phase2}
                          onChange={(e) => setPackageForm({ ...packageForm, profit_target_phase2: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                          required
                        />
                      </div>
                    )}

                    {packageForm.account_type !== 'instant' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Funded Withdrawal Target %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={packageForm.withdrawal_target_percent}
                          onChange={(e) => setPackageForm({ ...packageForm, withdrawal_target_percent: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Daily Drawdown %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={packageForm.daily_drawdown_percent}
                        onChange={(e) => setPackageForm({ ...packageForm, daily_drawdown_percent: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Overall Drawdown %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={packageForm.overall_drawdown_percent}
                        onChange={(e) => setPackageForm({ ...packageForm, overall_drawdown_percent: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Trading Days</label>
                      <input
                        type="number"
                        min="0"
                        value={packageForm.minimum_trading_days}
                        onChange={(e) => setPackageForm({ ...packageForm, minimum_trading_days: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Withdrawal ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={packageForm.minimum_withdrawal_amount}
                        onChange={(e) => setPackageForm({ ...packageForm, minimum_withdrawal_amount: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {packageBuilderStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Payout Split %</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={packageForm.payout_split_percent}
                      onChange={(e) => setPackageForm({ ...packageForm, payout_split_percent: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                      <span className="text-sm text-gray-200">News Trading Allowed</span>
                      <input
                        type="checkbox"
                        checked={packageForm.news_trading_allowed}
                        onChange={(e) => setPackageForm({ ...packageForm, news_trading_allowed: e.target.checked })}
                        className="rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                      <span className="text-sm text-gray-200">Weekend Holding Allowed</span>
                      <input
                        type="checkbox"
                        checked={packageForm.weekend_holding_allowed}
                        onChange={(e) => setPackageForm({ ...packageForm, weekend_holding_allowed: e.target.checked })}
                        className="rounded"
                      />
                    </label>
                  </div>

                  <label className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                    <span className="text-sm text-gray-200">Package Active</span>
                    <input
                      type="checkbox"
                      checked={packageForm.is_active}
                      onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked })}
                      className="rounded"
                    />
                  </label>

                  <div className="rounded-lg bg-black/25 border border-white/10 px-4 py-3 text-sm">
                    <div className="text-gray-400">Model Summary</div>
                    <div className="text-white mt-1 font-medium">
                      {packageForm.name || 'Unnamed package'} • {modelLabels[packageForm.account_type]}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {packageForm.account_type === 'instant' ? `Withdrawal: ${packageForm.profit_target_phase1}%` : `Phase 1: ${packageForm.profit_target_phase1}% | Phase 2: ${packageForm.profit_target_phase2}%`} • {packageForm.payout_split_percent}% Split
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowPackageModal(false);
                    setEditingPackage(null);
                    setPackageBuilderStep(1);
                    resetPackageForm();
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  {packageBuilderStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setPackageBuilderStep((prev) => Math.max(1, prev - 1))}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}

                  {packageBuilderStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setPackageBuilderStep((prev) => Math.min(3, prev + 1))}
                      className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                    >
                      {editingPackage ? 'Update Package' : 'Create Package'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 overflow-y-auto">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingOffer ? 'Edit Offer' : 'Create New Offer'}
            </h3>
            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Offer Title
                </label>
                <input
                  type="text"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="We’re Growing Sale"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Massive discount on all standard accounts!"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Discount Code
                  </label>
                  <input
                    type="text"
                    value={offerForm.discount_code}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50 font-mono"
                    placeholder="GROWING50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={offerForm.discount_percent}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_percent: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                    placeholder="50"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Expires At
                </label>
                <input
                  type="date"
                  value={offerForm.expires_at}
                  onChange={(e) => setOfferForm({ ...offerForm, expires_at: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Applicable Account Types
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {packages.map(pkg => (
                    <label
                      key={pkg.id}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={offerForm.account_types.includes(pkg.name)}
                        onChange={() => toggleAccountType(pkg.name)}
                        className="rounded"
                      />
                      <span className="text-sm text-white">{pkg.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="offerActive"
                  checked={offerForm.is_active}
                  onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="offerActive" className="text-sm text-gray-400">
                  Active
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferModal(false);
                    setEditingOffer(null);
                    resetOfferForm();
                  }}
                  className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                >
                  {editingOffer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
