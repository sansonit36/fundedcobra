import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, ChevronLeft, ChevronRight, Zap, Target, ShieldAlert, Package } from 'lucide-react';
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
  withdrawal_target_percent: number;
  daily_drawdown_phase1: number;
  daily_drawdown_phase2: number | null;
  daily_drawdown_funded: number;
  overall_drawdown_phase1: number;
  overall_drawdown_phase2: number | null;
  overall_drawdown_funded: number;
  daily_drawdown_type_phase1: 'static' | 'trailing';
  daily_drawdown_type_phase2: 'static' | 'trailing' | null;
  daily_drawdown_type_funded: 'static' | 'trailing';
  overall_drawdown_type_phase1: 'static' | 'trailing';
  overall_drawdown_type_phase2: 'static' | 'trailing' | null;
  overall_drawdown_type_funded: 'static' | 'trailing';
  minimum_trading_days_phase1: number;
  minimum_trading_days_phase2: number | null;
  minimum_withdrawal_amount: number;
  payout_split_percent: number;
  news_trading_allowed: boolean;
  weekend_holding_allowed: boolean;
  drawdown_basis: string;
  rule_version: string;
  is_template: boolean;
  discount_percent: number;
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
  const [editingCategoryType, setEditingCategoryType] = useState<'instant' | '1_step' | '2_step' | null>(null);
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
    profit_target_phase1: '10',
    profit_target_phase2: '5',
    withdrawal_target_percent: '5',
    daily_drawdown_phase1: '5',
    daily_drawdown_phase2: '5',
    daily_drawdown_funded: '5',
    overall_drawdown_phase1: '12',
    overall_drawdown_phase2: '12',
    overall_drawdown_funded: '12',
    daily_drawdown_type_phase1: 'static',
    daily_drawdown_type_phase2: 'static',
    daily_drawdown_type_funded: 'static',
    overall_drawdown_type_phase1: 'static',
    overall_drawdown_type_phase2: 'static',
    overall_drawdown_type_funded: 'static',
    minimum_trading_days_phase1: '0',
    minimum_trading_days_phase2: '0',
    minimum_withdrawal_amount: '20',
    payout_split_percent: '80',
    discount_percent: '0',
    news_trading_allowed: true,
    weekend_holding_allowed: true,
    is_active: true,
    drawdown_basis: 'balance'
  });

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesRes, offersRes, rulesRes] = await Promise.all([
        supabase.from('account_packages').select('*').order('balance', { ascending: true }),
        supabase.from('promotional_offers').select('*').order('created_at', { ascending: false }),
        supabase.from('account_rules').select('*').neq('rule_version', 'legacy')
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

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // 1. UPDATING MASTER CATEGORY RULES (Robust approach: Fetch then Update/Insert)
      if (editingCategoryType) {
        const masterRuleData: any = {
          account_type: editingCategoryType,
          account_package_name: `${modelLabels[editingCategoryType]} Master`,
          profit_target_phase1: parseFloat(packageForm.profit_target_phase1),
          profit_target_phase2: parseFloat(packageForm.profit_target_phase2 || '0'),
          withdrawal_target_percent: parseFloat(packageForm.withdrawal_target_percent),
          daily_drawdown_phase1: parseFloat(packageForm.daily_drawdown_phase1),
          daily_drawdown_phase2: parseFloat(packageForm.daily_drawdown_phase2 || '0'),
          daily_drawdown_funded: parseFloat(packageForm.daily_drawdown_funded),
          daily_drawdown_percent: parseFloat(packageForm.daily_drawdown_funded),
          overall_drawdown_phase1: parseFloat(packageForm.overall_drawdown_phase1),
          overall_drawdown_phase2: parseFloat(packageForm.overall_drawdown_phase2 || '0'),
          overall_drawdown_funded: parseFloat(packageForm.overall_drawdown_funded),
          overall_drawdown_percent: parseFloat(packageForm.overall_drawdown_funded),
          daily_drawdown_type_phase1: packageForm.daily_drawdown_type_phase1,
          daily_drawdown_type_funded: packageForm.daily_drawdown_type_funded,
          overall_drawdown_type_phase1: packageForm.overall_drawdown_type_phase1,
          overall_drawdown_type_funded: packageForm.overall_drawdown_type_funded,
          minimum_trading_days_phase1: parseInt(packageForm.minimum_trading_days_phase1),
          payout_split_percent: parseFloat(packageForm.payout_split_percent),
          minimum_withdrawal_amount: parseFloat(packageForm.minimum_withdrawal_amount),
          discount_percent: parseFloat(packageForm.discount_percent),
          news_trading_allowed: packageForm.news_trading_allowed,
          weekend_holding_allowed: packageForm.weekend_holding_allowed,
          is_template: true,
          rule_version: 'v2'
        };

        // Check if template exists first
        const { data: existingTemplate } = await supabase
          .from('account_rules')
          .select('id')
          .eq('account_type', editingCategoryType)
          .eq('is_template', true)
          .maybeSingle();

        if (existingTemplate) {
          const { error: updateError } = await supabase
            .from('account_rules')
            .update(masterRuleData)
            .eq('id', existingTemplate.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('account_rules')
            .insert([masterRuleData]);
          if (insertError) throw insertError;
        }
        
        if (error) throw error;
        setSuccess(`${modelLabels[editingCategoryType]} Master Rules Updated!`);
        setShowPackageModal(false);
        setEditingCategoryType(null);
        loadData();
        return;
      }

      // 2. SAVING INDIVIDUAL PACKAGE
      const balance = parseFloat(packageForm.balance);
      const price = parseFloat(packageForm.price);
      if (!balance || !price) throw new Error('Balance and Price are required');

      const packageData = {
        name: packageForm.name,
        balance,
        price,
        account_type: packageForm.account_type,
        is_active: packageForm.is_active,
        trading_days: parseInt(packageForm.minimum_trading_days_phase1),
        profit_target: (balance * parseFloat(packageForm.profit_target_phase1)) / 100,
        daily_loss_limit: (balance * parseFloat(packageForm.daily_drawdown_funded)) / 100,
        overall_loss_limit: (balance * parseFloat(packageForm.overall_drawdown_funded)) / 100,
      };

      let pkgId = editingPackage?.id || '';
      if (editingPackage) {
        const { error } = await supabase.from('account_packages').update(packageData).eq('id', editingPackage.id);
        if (error) throw error;
      } else {
        const { data: newPkg, error } = await supabase.from('account_packages').insert([packageData]).select().single();
        if (error) throw error;
        pkgId = newPkg.id;
      }

      // Inherit rules for this package (Robust approach)
      const ruleData: any = {
        package_id: pkgId,
        account_package_name: packageForm.name,
        account_type: packageForm.account_type,
        profit_target_phase1: parseFloat(packageForm.profit_target_phase1),
        profit_target_phase2: parseFloat(packageForm.profit_target_phase2),
        withdrawal_target_percent: parseFloat(packageForm.withdrawal_target_percent),
        daily_drawdown_phase1: parseFloat(packageForm.daily_drawdown_phase1),
        daily_drawdown_phase2: parseFloat(packageForm.daily_drawdown_phase2),
        daily_drawdown_funded: parseFloat(packageForm.daily_drawdown_funded),
        daily_drawdown_percent: parseFloat(packageForm.daily_drawdown_funded),
        overall_drawdown_phase1: parseFloat(packageForm.overall_drawdown_phase1),
        overall_drawdown_phase2: parseFloat(packageForm.overall_drawdown_phase2),
        overall_drawdown_funded: parseFloat(packageForm.overall_drawdown_funded),
        overall_drawdown_percent: parseFloat(packageForm.overall_drawdown_funded),
        daily_drawdown_type_phase1: packageForm.daily_drawdown_type_phase1,
        daily_drawdown_type_funded: packageForm.daily_drawdown_type_funded,
        overall_drawdown_type_phase1: packageForm.overall_drawdown_type_phase1,
        overall_drawdown_type_funded: packageForm.overall_drawdown_type_funded,
        payout_split_percent: parseFloat(packageForm.payout_split_percent),
        rule_version: 'v2'
      };

      // Check for existing rule by package_id
      const { data: existingRule } = await supabase
        .from('account_rules')
        .select('id')
        .eq('package_id', pkgId)
        .maybeSingle();

      if (existingRule) {
        await supabase.from('account_rules').update(ruleData).eq('id', existingRule.id);
      } else {
        await supabase.from('account_rules').insert([ruleData]);
      }

      setSuccess('Package saved successfully!');
      setShowPackageModal(false);
      resetPackageForm();
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetPackageForm = () => {
    setPackageForm({
      rule_id: '',
      name: '',
      account_type: 'instant',
      balance: '',
      price: '',
      profit_target_phase1: '10',
      profit_target_phase2: '5',
      withdrawal_target_percent: '5',
      daily_drawdown_phase1: '5',
      daily_drawdown_phase2: '5',
      daily_drawdown_funded: '5',
      overall_drawdown_phase1: '12',
      overall_drawdown_phase2: '12',
      overall_drawdown_funded: '12',
      daily_drawdown_type_phase1: 'static',
      daily_drawdown_type_phase2: 'static',
      daily_drawdown_type_funded: 'static',
      overall_drawdown_type_phase1: 'static',
      overall_drawdown_type_phase2: 'static',
      overall_drawdown_type_funded: 'static',
      minimum_trading_days_phase1: '0',
      minimum_trading_days_phase2: '0',
      minimum_withdrawal_amount: '20',
      payout_split_percent: '80',
      news_trading_allowed: true,
      weekend_holding_allowed: true,
      is_active: true,
      drawdown_basis: 'balance'
    });
  };

  const openMasterRuleEditor = (type: 'instant' | '1_step' | '2_step') => {
    const master = rules.find(r => r.account_type === type && r.is_template);
    setEditingCategoryType(type);
    if (master) {
      setPackageForm({
        ...packageForm,
        account_type: type,
        profit_target_phase1: master.profit_target_phase1.toString(),
        profit_target_phase2: (master.profit_target_phase2 ?? 5).toString(),
        withdrawal_target_percent: (master.withdrawal_target_percent ?? 5).toString(),
        daily_drawdown_phase1: (master.daily_drawdown_phase1 ?? 5).toString(),
        daily_drawdown_funded: (master.daily_drawdown_funded ?? 5).toString(),
        overall_drawdown_phase1: (master.overall_drawdown_phase1 ?? 12).toString(),
        overall_drawdown_funded: (master.overall_drawdown_funded ?? 12).toString(),
        daily_drawdown_type_phase1: master.daily_drawdown_type_phase1,
        daily_drawdown_type_funded: master.daily_drawdown_type_funded,
        overall_drawdown_type_phase1: master.overall_drawdown_type_phase1,
        overall_drawdown_type_funded: master.overall_drawdown_type_funded,
        payout_split_percent: (master.payout_split_percent ?? 80).toString(),
        minimum_withdrawal_amount: (master.minimum_withdrawal_amount ?? 20).toString(),
        discount_percent: (master.discount_percent ?? 0).toString(),
      } as any);
    } else {
      resetPackageForm();
      setPackageForm(prev => ({ ...prev, account_type: type }));
    }
    setPackageBuilderStep(2);
    setShowPackageModal(true);
  };

  const [activeRuleTab, setActiveRuleTab] = useState<'p1' | 'p2' | 'funded'>('p1');

  // Helper to determine which tabs to show
  const getAvailableTabs = (type: string) => {
    if (type === 'instant') return ['funded'];
    if (type === '1_step') return ['p1', 'funded'];
    return ['p1', 'p2', 'funded'];
  };

  return (
    <div className="space-y-8 p-4">
      {/* Messages */}
      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">{success}</div>}

      {/* 1. MASTER ACCOUNT TYPES (CATEGORIES) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-xl font-bold text-white flex items-center tracking-tight">
            <Package className="w-6 h-6 mr-3 text-primary-500" />
            Product Categories & Master Rule Engine
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['instant', '1_step', '2_step'] as const).map(type => {
            const master = rules.find(r => r.account_type === type && r.is_template);
            const typePackages = packages.filter(p => p.account_type === type);
            
            return (
              <div key={type} className="card-gradient rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-white/10 group">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                   <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                       type === 'instant' ? 'bg-purple-500/20 text-purple-400' : type === '1_step' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                     }`}>
                       <Zap className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-lg font-bold text-white tracking-tight">{modelLabels[type]} Model</h3>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{typePackages.length} Active Sizes</p>
                     </div>
                   </div>
                   <button 
                     onClick={() => {
                        setActiveRuleTab(type === 'instant' ? 'funded' : 'p1');
                        openMasterRuleEditor(type);
                     }}
                     className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 shadow-lg"
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Category Summary Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/[0.03]">
                       <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                         <Target className="w-3 h-3 mr-1.5 text-blue-400" /> Target
                       </div>
                       <div className="text-xl font-bold text-white leading-none">
                         {type === 'instant' ? master?.withdrawal_target_percent : master?.profit_target_phase1}%
                       </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/[0.03]">
                       <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                         <ShieldAlert className="w-3 h-3 mr-1.5 text-red-500" /> Drawdown
                       </div>
                       <div className="text-xl font-bold text-white leading-none">
                         {master?.daily_drawdown_funded}% <span className="text-[10px] text-gray-600">Daily</span>
                       </div>
                    </div>
                  </div>

                  {/* Size Management Area */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Inventory</h4>
                       <button 
                         onClick={() => {
                           setEditingPackage(null);
                           resetPackageForm();
                           setPackageForm(prev => ({ 
                             ...prev, 
                             account_type: type, 
                             name: `${modelLabels[type]} $${(10000).toLocaleString()}`,
                             balance: '10000',
                             price: '99'
                           }));
                           setPackageBuilderStep(1);
                           setShowPackageModal(true);
                         }}
                         className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-all text-[10px] font-bold uppercase tracking-widest border border-primary-500/20"
                       >
                         <Plus className="w-3 h-3" /> Add Size
                       </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {typePackages.map(pkg => (
                        <div key={pkg.id} className="group/item flex justify-between items-center p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-500/40" />
                              <div>
                                <div className="text-sm font-bold text-white">${pkg.balance.toLocaleString()}</div>
                                <div className="text-[10px] text-gray-500 font-medium tracking-tight uppercase">${pkg.price} USD • Status: Active</div>
                              </div>
                           </div>
                           <button 
                             onClick={() => {
                               setEditingPackage(pkg);
                               const master = rules.find(r => r.account_type === pkg.account_type && r.is_template);
                               setPackageForm({
                                 ...packageForm,
                                 name: pkg.name,
                                 balance: pkg.balance.toString(),
                                 price: pkg.price.toString(),
                                 account_type: pkg.account_type,
                                 profit_target_phase1: (master?.profit_target_phase1 ?? 10).toString(),
                                 daily_drawdown_funded: (master?.daily_drawdown_funded ?? 5).toString(),
                                 payout_split_percent: (master?.payout_split_percent ?? 80).toString(),
                                 minimum_withdrawal_amount: (master?.minimum_withdrawal_amount ?? 20).toString(),
                                 discount_percent: (master?.discount_percent ?? 0).toString(),
                               } as any);
                               setPackageBuilderStep(1);
                               setShowPackageModal(true);
                             }}
                             className="p-2 opacity-0 group-hover/item:opacity-100 text-gray-500 hover:text-white transition-all bg-white/5 rounded-lg border border-white/5"
                           >
                              <Edit2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      ))}
                      {typePackages.length === 0 && (
                        <div className="text-center py-10 rounded-xl border-2 border-dashed border-white/5 bg-black/20">
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Inventory empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. UNIVERSAL EXPERT MODAL (MULTI-PHASE EDITOR) */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/5">
            <div className="flex flex-col h-full max-h-[90vh]">
               {/* Modal Header */}
               <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
                        {editingCategoryType ? `Master Rule Engine: ${modelLabels[editingCategoryType]}` : (editingPackage ? 'Refine Account Size' : 'Engineer New Size')}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium font-mono uppercase tracking-widest">
                        {editingCategoryType ? 'Global Category Overrides' : 'Inventory Management'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                       {[1, 2].map(s => (
                         <div key={s} className={`w-12 h-1.5 rounded-full transition-all duration-500 ${packageBuilderStep >= s ? 'bg-primary-500 shadow-[0_0_15px_rgba(189,77,214,0.4)]' : 'bg-white/10'}`} />
                       ))}
                    </div>
                  </div>
               </div>

               {/* Modal Body */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">
                  <form onSubmit={handleSavePackage} className="space-y-10">
                    {/* STEP 1: BASIC SPECS (Only for individual sizes) */}
                    {packageBuilderStep === 1 && !editingCategoryType && (
                      <div className="grid grid-cols-6 gap-6">
                        <div className="col-span-6 lg:col-span-4">
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em] px-1">Descriptor Name</label>
                          <input 
                            type="text" 
                            required
                            value={packageForm.name} 
                            onChange={e => setPackageForm({...packageForm, name: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-primary-500/50 transition-all outline-none text-lg font-bold placeholder:text-gray-700 shadow-inner"
                            placeholder="e.g. 100K ELITE PRO"
                          />
                        </div>
                        <div className="col-span-3 lg:col-span-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em] px-1">Lqd Capital ($)</label>
                          <input 
                            type="number" 
                            required
                            value={packageForm.balance} 
                            onChange={e => setPackageForm({...packageForm, balance: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-primary-500/50 transition-all outline-none text-lg font-bold shadow-inner"
                          />
                        </div>
                        <div className="col-span-3 lg:col-span-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em] px-1">Entry Fee ($)</label>
                          <input 
                            type="number" 
                            required
                            value={packageForm.price} 
                            onChange={e => setPackageForm({...packageForm, price: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-primary-500/50 transition-all outline-none text-lg font-bold shadow-inner"
                          />
                        </div>
                      </div>
                    )}

                    {/* STEP 2: MASTER RULE DEFINITION (Tabbed Phase Interface) */}
                    {(packageBuilderStep === 2 || editingCategoryType) && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* PHASE TABS */}
                        <div className="flex gap-2 p-1.5 bg-black/60 rounded-[20px] border border-white/5 w-fit">
                          {getAvailableTabs(editingCategoryType || packageForm.account_type).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setActiveRuleTab(tab as any)}
                              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeRuleTab === tab 
                                ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/20' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                              }`}
                            >
                              {tab === 'p1' ? 'Phase 1' : tab === 'p2' ? 'Phase 2' : 'Funded Stage'}
                            </button>
                          ))}
                        </div>

                        {/* PHASE CONTENT */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           {/* PRIMARY METRICS */}
                           <div className="space-y-6 bg-white/[0.02] p-8 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden group/phase">
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-4 -translate-y-4 group-hover/phase:scale-110 transition-transform duration-700">
                                <Target className="w-32 h-32 text-white" />
                              </div>
                              
                              <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center mb-8 border-b border-white/5 pb-4">
                                <span className="w-2 h-2 rounded-full bg-primary-500 mr-3 animate-pulse" />
                                {activeRuleTab.toUpperCase()} Performance Targets
                              </h4>

                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">
                                    {editingCategoryType === 'instant' ? 'Withdrawal Target (%)' : 'Profit Target (%)'}
                                  </label>
                                  {activeRuleTab === 'p1' ? (
                                    <input type="number" step="0.1" value={packageForm.profit_target_phase1} onChange={e => setPackageForm({...packageForm, profit_target_phase1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" />
                                  ) : activeRuleTab === 'p2' ? (
                                    <input type="number" step="0.1" value={packageForm.profit_target_phase2} onChange={e => setPackageForm({...packageForm, profit_target_phase2: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" />
                                  ) : (
                                    <input type="number" step="0.1" value={packageForm.withdrawal_target_percent} onChange={e => setPackageForm({...packageForm, withdrawal_target_percent: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" />
                                  )}
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">Min. Trading Days</label>
                                  {activeRuleTab === 'p1' ? (
                                    <input type="number" value={packageForm.minimum_trading_days_phase1} onChange={e => setPackageForm({...packageForm, minimum_trading_days_phase1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" />
                                  ) : activeRuleTab === 'p2' ? (
                                    <input type="number" value={packageForm.minimum_trading_days_phase2} onChange={e => setPackageForm({...packageForm, minimum_trading_days_phase2: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" />
                                  ) : (
                                    <div className="p-5 rounded-2xl bg-black/20 border border-white/[0.02] text-gray-600 text-center font-black uppercase text-[10px] tracking-widest">N/A for Funded</div>
                                  )}
                                </div>
                              </div>
                           </div>

                           {/* DRAWDOWN ARCHITECTURE */}
                           <div className="space-y-6 bg-white/[0.02] p-8 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden group/drawdown">
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-4 -translate-y-4 group-hover/drawdown:scale-110 transition-transform duration-700">
                                <ShieldAlert className="w-32 h-32 text-white" />
                              </div>

                              <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center mb-8 border-b border-white/5 pb-4">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-3 animate-pulse" />
                                {activeRuleTab.toUpperCase()} Risk Guardrails
                              </h4>

                              <div className="grid grid-cols-2 gap-6">
                                {/* DAILY DD */}
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-gray-500 uppercase block tracking-widest flex justify-between">
                                    Daily DD (%) 
                                    <span className="text-[9px] text-primary-400 capitalize">{activeRuleTab === 'p1' ? packageForm.daily_drawdown_type_phase1 : activeRuleTab === 'p2' ? packageForm.daily_drawdown_type_phase2 : packageForm.daily_drawdown_type_funded}</span>
                                  </label>
                                  <input 
                                    type="number" step="0.1" 
                                    value={activeRuleTab === 'p1' ? packageForm.daily_drawdown_phase1 : activeRuleTab === 'p2' ? packageForm.daily_drawdown_phase2 : packageForm.daily_drawdown_funded} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (activeRuleTab === 'p1') setPackageForm({...packageForm, daily_drawdown_phase1: val});
                                      else if (activeRuleTab === 'p2') setPackageForm({...packageForm, daily_drawdown_phase2: val});
                                      else setPackageForm({...packageForm, daily_drawdown_funded: val});
                                    }} 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" 
                                  />
                                  <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                    {['static', 'trailing'].map(t => (
                                      <button 
                                        key={t} type="button"
                                        onClick={() => {
                                          if (activeRuleTab === 'p1') setPackageForm({...packageForm, daily_drawdown_type_phase1: t as any});
                                          else if (activeRuleTab === 'p2') setPackageForm({...packageForm, daily_drawdown_type_phase2: t as any});
                                          else setPackageForm({...packageForm, daily_drawdown_type_funded: t as any});
                                        }}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                          (activeRuleTab === 'p1' ? packageForm.daily_drawdown_type_phase1 : activeRuleTab === 'p2' ? packageForm.daily_drawdown_type_phase2 : packageForm.daily_drawdown_type_funded) === t 
                                          ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'
                                        }`}
                                      >
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* OVERALL DD */}
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-gray-500 uppercase block tracking-widest flex justify-between">
                                    Overall DD (%)
                                    <span className="text-[9px] text-blue-400 capitalize">{activeRuleTab === 'p1' ? packageForm.overall_drawdown_type_phase1 : activeRuleTab === 'p2' ? packageForm.overall_drawdown_type_phase2 : packageForm.overall_drawdown_type_funded}</span>
                                  </label>
                                  <input 
                                    type="number" step="0.1" 
                                    value={activeRuleTab === 'p1' ? packageForm.overall_drawdown_phase1 : activeRuleTab === 'p2' ? packageForm.overall_drawdown_phase2 : packageForm.overall_drawdown_funded} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (activeRuleTab === 'p1') setPackageForm({...packageForm, overall_drawdown_phase1: val});
                                      else if (activeRuleTab === 'p2') setPackageForm({...packageForm, overall_drawdown_phase2: val});
                                      else setPackageForm({...packageForm, overall_drawdown_funded: val});
                                    }} 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold" 
                                  />
                                  <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                    {['static', 'trailing'].map(t => (
                                      <button 
                                        key={t} type="button"
                                        onClick={() => {
                                          if (activeRuleTab === 'p1') setPackageForm({...packageForm, overall_drawdown_type_phase1: t as any});
                                          else if (activeRuleTab === 'p2') setPackageForm({...packageForm, overall_drawdown_type_phase2: t as any});
                                          else setPackageForm({...packageForm, overall_drawdown_type_funded: t as any});
                                        }}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                          (activeRuleTab === 'p1' ? packageForm.overall_drawdown_type_phase1 : activeRuleTab === 'p2' ? packageForm.overall_drawdown_type_phase2 : packageForm.overall_drawdown_type_funded) === t 
                                          ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'
                                        }`}
                                      >
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                           </div>

                           {/* GLOBAL CATEGORY SPECS (Payout/Split) */}
                           <div className="col-span-full grid grid-cols-1 md:grid-cols-4 gap-6 p-8 rounded-[24px] bg-white/[0.01] border border-white/5 shadow-inner">
                              <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest px-1">Profit Split (%)</label>
                                <input type="number" value={packageForm.payout_split_percent} onChange={e => setPackageForm({...packageForm, payout_split_percent: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest px-1">Global Discount (%)</label>
                                <input type="number" value={packageForm.discount_percent} onChange={e => setPackageForm({...packageForm, discount_percent: e.target.value})} className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 text-emerald-400 font-bold" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest px-1">Withdrawal Floor ($)</label>
                                <input type="number" value={packageForm.minimum_withdrawal_amount} onChange={e => setPackageForm({...packageForm, minimum_withdrawal_amount: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest px-1">Payout Cycle</label>
                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold appearance-none outline-none focus:border-primary-500 transition-all text-sm">
                                  <option value="bi_weekly">Bi-Weekly</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="on_demand">On-Demand</option>
                                </select>
                              </div>
                           </div>
                        </div>
                      </div>
                    )}

                    {/* MODAL ACTION BAR */}
                    <div className="flex justify-between items-center pt-10 border-t border-white/5">
                       <button 
                         type="button" 
                         onClick={() => { setShowPackageModal(false); setEditingCategoryType(null); }}
                         className="px-8 py-4 text-[11px] font-black uppercase text-gray-600 hover:text-white transition-all tracking-[0.3em] font-mono"
                       >
                         Discard Changes
                       </button>
                       <div className="flex gap-4">
                          {packageBuilderStep === 2 && !editingCategoryType && (
                            <button 
                              type="button" 
                              onClick={() => setPackageBuilderStep(1)} 
                              className="px-10 py-4 bg-white/5 text-white font-black rounded-2xl uppercase text-[11px] border border-white/10 tracking-widest hover:bg-white/10 transition-all"
                            >
                              Previous Step
                            </button>
                          )}
                          <button 
                            type="submit" 
                            className="px-12 py-4 bg-primary-500 text-white font-black rounded-2xl uppercase text-[11px] shadow-[0_0_30px_rgba(189,77,214,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all tracking-[0.2em] relative overflow-hidden group/btn"
                          >
                            <span className="relative z-10">
                              {editingCategoryType ? `Deploy ${modelLabels[editingCategoryType]} Master Config` : (packageBuilderStep === 1 ? 'Configure Phase Rules' : (editingPackage ? 'Finalize Updates' : 'Initialize Account'))}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                          </button>
                       </div>
                    </div>
                  </form>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
