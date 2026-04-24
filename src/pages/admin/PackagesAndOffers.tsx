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
      // 1. UPDATING MASTER CATEGORY RULES
      if (editingCategoryType) {
        const masterRuleData = {
          account_type: editingCategoryType,
          account_package_name: `${modelLabels[editingCategoryType]} Master`,
          profit_target_phase1: parseFloat(packageForm.profit_target_phase1),
          profit_target_phase2: parseFloat(packageForm.profit_target_phase2 || '0'),
          withdrawal_target_percent: parseFloat(packageForm.withdrawal_target_percent),
          daily_drawdown_phase1: parseFloat(packageForm.daily_drawdown_phase1),
          daily_drawdown_phase2: parseFloat(packageForm.daily_drawdown_phase2 || '0'),
          daily_drawdown_funded: parseFloat(packageForm.daily_drawdown_funded),
          daily_drawdown_percent: parseFloat(packageForm.daily_drawdown_funded), // Classic field sync
          overall_drawdown_phase1: parseFloat(packageForm.overall_drawdown_phase1),
          overall_drawdown_phase2: parseFloat(packageForm.overall_drawdown_phase2 || '0'),
          overall_drawdown_funded: parseFloat(packageForm.overall_drawdown_funded),
          overall_drawdown_percent: parseFloat(packageForm.overall_drawdown_funded), // Classic field sync
          daily_drawdown_type_phase1: packageForm.daily_drawdown_type_phase1,
          daily_drawdown_type_phase2: packageForm.daily_drawdown_type_phase2,
          daily_drawdown_type_funded: packageForm.daily_drawdown_type_funded,
          overall_drawdown_type_phase1: packageForm.overall_drawdown_type_phase1,
          overall_drawdown_type_phase2: packageForm.overall_drawdown_type_phase2,
          overall_drawdown_type_funded: packageForm.overall_drawdown_type_funded,
          minimum_trading_days_phase1: parseInt(packageForm.minimum_trading_days_phase1),
          payout_split_percent: parseFloat(packageForm.payout_split_percent),
          news_trading_allowed: packageForm.news_trading_allowed,
          weekend_holding_allowed: packageForm.weekend_holding_allowed,
          is_template: true,
          rule_version: 'v2'
        };

        const { error } = await supabase
          .from('account_rules')
          .upsert([masterRuleData], { onConflict: 'account_type,is_template' });
        
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

      // Inherit rules for this package
      const ruleData = {
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

      await supabase.from('account_rules').upsert([ruleData], { onConflict: 'package_id' });

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
      } as any);
    } else {
      resetPackageForm();
      setPackageForm(prev => ({ ...prev, account_type: type }));
    }
    setPackageBuilderStep(2);
    setShowPackageModal(true);
  };

  return (
    <div className="space-y-8 p-4">
      {/* Messages */}
      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">{success}</div>}

      {/* 1. MASTER ACCOUNT TYPES (CATEGORIES) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Package className="w-5 h-5 mr-3 text-primary-400" />
            Product Categories (Master Rules)
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['instant', '1_step', '2_step'] as const).map(type => {
            const master = rules.find(r => r.account_type === type && r.is_template);
            const typePackages = packages.filter(p => p.account_type === type);
            
            return (
              <div key={type} className="card-gradient rounded-xl border border-white/5 overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${
                       type === 'instant' ? 'bg-purple-500' : type === '1_step' ? 'bg-blue-500' : 'bg-emerald-500'
                     }`} />
                     <h3 className="text-lg font-bold text-white">{modelLabels[type]} Accounts</h3>
                   </div>
                   <button 
                     onClick={() => openMasterRuleEditor(type)}
                     title="Edit Category Rules"
                     className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Category Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                       <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">P1 Target</div>
                       <div className="text-white font-bold">{master?.profit_target_phase1 ?? '--'}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                       <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Drawdown</div>
                       <div className="text-white font-bold">{master?.daily_drawdown_funded ?? '--'}% / {master?.overall_drawdown_funded ?? '--'}%</div>
                    </div>
                  </div>

                  {/* Sizes List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Sizes</span>
                       <button 
                         onClick={() => {
                           setEditingPackage(null);
                           resetPackageForm();
                           setPackageForm(prev => ({ 
                             ...prev, 
                             account_type: type, 
                             name: `${modelLabels[type]} $${(10000).toLocaleString()}` 
                           }));
                           setPackageBuilderStep(1);
                           setShowPackageModal(true);
                         }}
                         className="flex items-center gap-1 text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-widest"
                       >
                         <Plus className="w-3 h-3" /> Add Size
                       </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {typePackages.map(pkg => (
                        <div key={pkg.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                           <div>
                              <div className="text-sm font-medium text-white">${pkg.balance.toLocaleString()} Account</div>
                              <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">${pkg.price} USD</div>
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
                               } as any);
                               setPackageBuilderStep(1);
                               setShowPackageModal(true);
                             }}
                             className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                           >
                              <Edit2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      ))}
                      {typePackages.length === 0 && (
                        <div className="text-center py-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest border-2 border-dashed border-white/5 rounded-lg">
                          No sizes defined
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

      {/* 2. MODAL FOR CREATION/RULES */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8">
               <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                    {editingCategoryType ? `Manage ${modelLabels[editingCategoryType]} Master Rules` : (editingPackage ? 'Edit Account Size' : 'Add New Account Size')}
                  </h3>
                  <div className="flex gap-2">
                     {[1, 2, 3].map(s => (
                       <div key={s} className={`w-8 h-1 rounded-full ${packageBuilderStep >= s ? 'bg-primary-500' : 'bg-white/10'}`} />
                     ))}
                  </div>
               </div>

               <form onSubmit={handleSavePackage} className="space-y-6">
                  {packageBuilderStep === 1 && !editingCategoryType && (
                    <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Account Name</label>
                         <input 
                           type="text" 
                           value={packageForm.name} 
                           onChange={e => setPackageForm({...packageForm, name: e.target.value})}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary-500/50 transition-all outline-none"
                           placeholder="e.g. 50K Pro Account"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Balance ($)</label>
                         <input 
                           type="number" 
                           value={packageForm.balance} 
                           onChange={e => setPackageForm({...packageForm, balance: e.target.value})}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary-500/50 transition-all outline-none"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Price ($)</label>
                         <input 
                           type="number" 
                           value={packageForm.price} 
                           onChange={e => setPackageForm({...packageForm, price: e.target.value})}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary-500/50 transition-all outline-none"
                         />
                       </div>
                    </div>
                  )}

                  {packageBuilderStep === 2 && (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {/* MASTER RULE EDITOR */}
                       <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                          <h4 className="text-sm font-black text-white uppercase">Phase 1 Rules</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Target %</label>
                                <input type="number" step="0.1" value={packageForm.profit_target_phase1} onChange={e => setPackageForm({...packageForm, profit_target_phase1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Min Days</label>
                                <input type="number" value={packageForm.minimum_trading_days_phase1} onChange={e => setPackageForm({...packageForm, minimum_trading_days_phase1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Daily DD (%)</label>
                                <input type="number" step="0.1" value={packageForm.daily_drawdown_funded} onChange={e => setPackageForm({...packageForm, daily_drawdown_funded: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase">Overall DD (%)</label>
                                <input type="number" step="0.1" value={packageForm.overall_drawdown_funded} onChange={e => setPackageForm({...packageForm, overall_drawdown_funded: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-8 border-t border-white/10">
                     <button 
                       type="button" 
                       onClick={() => { setShowPackageModal(false); setEditingCategoryType(null); }}
                       className="px-6 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all tracking-widest"
                     >
                       Cancel
                     </button>
                      <div className="flex gap-3">
                         {packageBuilderStep > 1 && !editingCategoryType && <button type="button" onClick={() => setPackageBuilderStep(1)} className="px-8 py-3 bg-white/5 text-white font-black rounded-2xl uppercase text-[10px] border border-white/10">Back</button>}
                         <button type="submit" className="px-10 py-3 bg-primary-500 text-white font-black rounded-2xl uppercase text-[10px] shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                           {editingCategoryType ? 'Apply Master Rules' : (packageBuilderStep === 1 ? 'Next Step' : (editingPackage ? 'Update Account' : 'Save Account'))}
                         </button>
                      </div>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
