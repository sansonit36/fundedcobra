import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, AlertTriangle, HelpCircle, ChevronRight, Tag, Copy, Upload, Info, CreditCard, Zap, Sparkles, Clock, Lock, Star, Calendar, Trophy, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AccountPackage } from '../types';
import { AccountRuleConfig, createAccountPurchase, submitPaymentProof, getAccountPackages, getAccountRulesForPackages } from '../lib/database';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/emailService';
import { trackPurchaseSubmission } from '../utils/FacebookTracking';
import confetti from 'canvas-confetti';

type AccountModelType = 'instant' | '1_step' | '2_step';

const MODEL_META: Record<AccountModelType, { label: string; subtitle: string; accent: string; accentBorder: string }> = {
  instant: {
    label: 'Instant Funding',
    subtitle: 'Start immediately without evaluation',
    accent: 'text-[#bd4dd6]',
    accentBorder: 'border-[#bd4dd6]/40 bg-[#bd4dd6]/10'
  },
  '1_step': {
    label: '1-Step Evaluation',
    subtitle: 'Single objective phase to pass',
    accent: 'text-blue-300',
    accentBorder: 'border-blue-500/40 bg-blue-500/10'
  },
  '2_step': {
    label: '2-Step Evaluation',
    subtitle: 'Two milestones before funding',
    accent: 'text-emerald-300',
    accentBorder: 'border-emerald-500/40 bg-emerald-500/10'
  }
};

const LEGACY_SMALL_INSTANT_NAMES = ['$1,250 Account', '$3,500 Account', '$5,000 Account'];

const normalizeModelType = (value?: string): AccountModelType => {
  if (value === '1_step' || value === '2_step' || value === 'instant') {
    return value;
  }
  return 'instant';
};

interface PaymentMethod {
  id: string;
  name: string;
  account_name: string;
  account_number: string;
  enabled: boolean;
}
    
export default function BuyAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState<AccountPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<AccountPackage | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [usdToPkr, setUsdToPkr] = useState(288);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'usdt' | 'pkr' | null>(null);
  const [selectedPkrMethod, setSelectedPkrMethod] = useState<PaymentMethod | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('MT5');
  const [selectedServer, setSelectedServer] = useState('Exness');
  const [selectedModel, setSelectedModel] = useState<AccountModelType>('instant');
  const [rulesByPackageName, setRulesByPackageName] = useState<Record<string, AccountRuleConfig>>({});
  const [categoryRules, setCategoryRules] = useState<Record<string, AccountRuleConfig>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [discountExpired, setDiscountExpired] = useState(false);
  const [isIndianUser, setIsIndianUser] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [rulePhaseTab, setRulePhaseTab] = useState<'p1' | 'p2' | 'funded'>('p1');

  const getPackageModel = (pkg?: AccountPackage | null): AccountModelType => {
    return normalizeModelType(pkg?.account_type);
  };

  const getRulesForPackage = (pkg?: AccountPackage | null) => {
    if (!pkg) return null;
    // Master template is the source of truth — individual package rules are legacy fallback
    const model = getPackageModel(pkg);
    return categoryRules[model] || rulesByPackageName[pkg.name] || null;
  };

  const getModelPackages = (model: AccountModelType) => {
    return packages.filter((pkg) => getPackageModel(pkg) === model);
  };

  const getDefaultCouponForPackage = (pkg: AccountPackage) => {
    const model = getPackageModel(pkg);
    if (model === 'instant' && pkg.balance >= 10000) {
      return { code: 'GROWING50', discount: 50 };
    }
    return { code: 'WELCOME10', discount: 10 };
  };

  const payoutTicker = [
    { trader: 'Ahmad R.', amount: '$380', time: '4 mins ago', pkg: '$5K account' },
    { trader: 'Sara M.', amount: '$210', time: '11 mins ago', pkg: '$2.5K account' },
    { trader: 'James K.', amount: '$650', time: '23 mins ago', pkg: '$10K account' },
    { trader: 'Hira F.', amount: '$125', time: '31 mins ago', pkg: '$1.25K account' },
    { trader: 'Carlos D.', amount: '$940', time: '47 mins ago', pkg: '$15K account' },
  ];

  useEffect(() => {
    const t = setInterval(() => setTickerIndex(i => (i + 1) % payoutTicker.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function loadPackages() {
      try {
        const [dbPackages, dbRules] = await Promise.all([
          getAccountPackages(),
          getAccountRulesForPackages()
        ]);
        const nextPackages = (dbPackages as AccountPackage[]).filter(pkg => pkg.is_active !== false);
        const nextRulesByPackageName: Record<string, AccountRuleConfig> = {};
        const nextCategoryRules: Record<string, AccountRuleConfig> = {};
        
        dbRules.forEach((rule) => { 
          if (rule.is_template) {
            nextCategoryRules[rule.account_type] = rule;
          } else {
            nextRulesByPackageName[rule.account_package_name] = rule;
          }
        });

        setPackages(nextPackages);
        setRulesByPackageName(nextRulesByPackageName);
        setCategoryRules(nextCategoryRules);
      } catch (err) {
        setError('Failed to load account packages');
      } finally {
        setLoading(false);
      }
    }
    async function loadPaymentMethods() {
      const { data } = await supabase.from('payment_methods').select('*').eq('enabled', true);
      setPaymentMethods(data || []);
    }
    async function loadExchangeRate() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'usd_to_pkr_rate').single();
      if (data?.value) setUsdToPkr(Number(data.value));
    }
    async function detectUserCountry() {
       try {
         const response = await fetch('https://ipapi.co/json/');
         if (response.ok) {
           const data = await response.json();
           setIsIndianUser(data.country_code === 'IN');
         }
       } catch (err) { console.warn('Geo detection skip'); }
    }
    loadPackages();
    loadPaymentMethods();
    loadExchangeRate();
    detectUserCountry();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      const suggestedCoupon = getDefaultCouponForPackage(selectedPackage);
      setAppliedCoupon(suggestedCoupon);
      setCouponCode(suggestedCoupon.code);
    }
  }, [selectedPackage]);

  const calculateFinalPrice = (price: number) => {
    const categoryDiscount = categoryRules[selectedModel]?.discount_percent || 0;
    const baseDiscountedPrice = price * (1 - categoryDiscount / 100);
    if (!appliedCoupon) return baseDiscountedPrice;
    return baseDiscountedPrice * (1 - appliedCoupon.discount / 100);
  };

  const handlePurchase = () => {
    if (!selectedPackage) return;
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !user || !paymentScreenshot) return;

    setSubmitting(true);
    setAiVerifying(true);
    setVerificationStep(0);

    const stepTimer = setInterval(() => {
      setVerificationStep(prev => prev >= 3 ? 3 : prev + 1);
    }, 1500);

    try {
      const requestId = await createAccountPurchase(selectedPackage.id, appliedCoupon?.code);
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${requestId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, paymentScreenshot);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);

      const { data: verificationResult, error: verifyError } = await supabase.functions.invoke('verify-screenshot', {
        body: { imageUrl: publicUrl, amount: calculateFinalPrice(selectedPackage.price), paymentMethod: selectedPaymentMethod === 'usdt' ? 'USDT (TRC20)' : selectedPkrMethod?.name || 'PKR', userId: user.id }
      });

      clearInterval(stepTimer);

      if (verifyError || !verificationResult.success || !verificationResult.verification.isValid) {
        await submitPaymentProof(requestId, publicUrl, { confidence: 0, reason: 'AI Red Flag / Safety Check Needed', red_flags: ['AI_FAIL'], isValid: false });
        navigate('/suspicious-payment');
        return;
      }

      await submitPaymentProof(requestId, publicUrl, { confidence: verificationResult.verification.confidence, reason: verificationResult.verification.reason, red_flags: verificationResult.verification.redFlags, isValid: true });
      
      trackPurchaseSubmission({ amount: calculateFinalPrice(selectedPackage.price), packageName: selectedPackage.name, requestId });
      
      setAiVerifying(false);
      navigate('/thank-you', { state: { amount: calculateFinalPrice(selectedPackage.price), packageName: selectedPackage.name } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
      setAiVerifying(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const selectedModelPackages = packages.filter(pkg => getPackageModel(pkg) === selectedModel);
  const selectedPackageRules = getRulesForPackage(selectedPackage);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white font-black uppercase tracking-widest">Initialising Terminal...</div>;

  return (
    <div className="min-h-screen pb-20 bg-[#0B0B0C] text-white">
      {/* 🟢 TOASTS */}
      <div className="fixed top-8 right-8 z-[110] space-y-4 max-w-sm w-full">
        {success && <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold uppercase tracking-tight animate-in slide-in-from-right">{success}</div>}
        {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold uppercase tracking-tight animate-in slide-in-from-right">{error}</div>}
      </div>

      {/* 🟢 AI OVERLAY */}
      {aiVerifying && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[200] p-4 overflow-hidden">
          <div className="max-w-md w-full bg-[#1a1a1a] rounded-[3rem] p-10 border border-[#bd4dd6]/30 shadow-2xl text-center">
            <Zap className="w-12 h-12 text-[#bd4dd6] mx-auto mb-6 animate-pulse" />
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">AI VISION <span className="text-[#bd4dd6]">VALIDATING</span></h3>
            <div className="space-y-6 mb-10">
               {['Scanning Metadata', 'Neural OCR Parse', 'Ledger Sync', 'Final Verification'].map((step, i) => (
                 <div key={i} className={`flex items-center gap-4 transition-all duration-500 ${verificationStep >= i ? 'opacity-100' : 'opacity-20'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${verificationStep > i ? 'bg-green-500' : 'bg-[#bd4dd6]'}`}>
                       <Check className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">{step}</span>
                 </div>
               ))}
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#bd4dd6] transition-all duration-1000" style={{ width: `${(verificationStep + 1) * 25}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 HEADER */}
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-16 text-center">
        <h1 className="text-5xl lg:text-8xl font-black tracking-tighter mb-8 leading-none">ELITE <span className="text-[#bd4dd6]">FUNDING</span></h1>
        
        <div className="inline-flex p-2 bg-[#161616] rounded-[2.5rem] border border-[#2A2A2A]">
           {['instant', '1_step', '2_step'].map((type) => {
             const model = type as AccountModelType;
             const active = selectedModel === model;
             return (
               <button
                 key={type}
                 onClick={() => setSelectedModel(model)}
                 className={`px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                   active ? 'bg-white text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white'
                 }`}
               >
                 {MODEL_META[model].label}
               </button>
             );
           })}
        </div>
      </div>

      {/* 🔴 MAIN 70/30 GRID */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT COLLUMN (8) */}
        <div className="lg:col-span-8 space-y-16">
          
          {/* 1. Account Balance Grid (Enhanced Tiers) */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-8 h-[1px] bg-white/20"></span>
              {selectedModel === 'instant' ? 'Capital Injection Tiers' : 'Evaluation Account Sizes'}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedModelPackages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const isPremium = pkg.balance >= 10000 || selectedModel !== 'instant';
                const modelColor = selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981';
                
                const categoryDiscount = categoryRules[selectedModel]?.discount_percent || 0;
                const discountedPrice = pkg.price * (1 - categoryDiscount / 100);
                
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 text-left group overflow-hidden ${
                      isSelected 
                        ? `border-[${modelColor}] bg-white/5 shadow-[0_0_50px_rgba(189,77,214,0.15)]`
                        : 'border-[#2A2A2A] bg-[#111] hover:border-white/20'
                    }`}
                    style={isSelected ? { borderColor: modelColor, backgroundColor: `${modelColor}08` } : {}}
                  >
                    {/* Discount Badge (top-left, only if discount exists) */}
                    {categoryDiscount > 0 && (
                      <div className="absolute top-0 left-0 px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-br-xl bg-emerald-500 text-white">
                        {categoryDiscount}% OFF
                      </div>
                    )}
                    {/* Tier Badge (top-right, model-colored) */}
                    <div 
                      className="absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl"
                      style={isPremium ? { backgroundColor: modelColor, color: 'white' } : { backgroundColor: '#1f1f1f', color: '#666' }}
                    >
                      {isPremium ? 'Premium' : 'Standard'}
                    </div>

                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-white transition-colors">Balance</div>
                    <div className="text-4xl font-black text-white tracking-tighter mb-6">${pkg.balance.toLocaleString()}</div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                       <div className="flex flex-col">
                          {categoryDiscount > 0 && (
                            <span className="text-[10px] text-gray-500 line-through tracking-tighter">${pkg.price.toFixed(0)}</span>
                          )}
                          <span className="text-sm font-black underline underline-offset-4">${discountedPrice.toFixed(0)}</span>
                       </div>
                       {isSelected && <CheckCircle className="w-6 h-6" style={{ color: modelColor }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Phase-Tabbed Rule Card (Inspired by FundedSquad) */}
          {selectedPackage && (() => {
            const r = selectedPackageRules;
            const modelColor = selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981';
            const availableTabs = selectedModel === 'instant' ? ['funded'] as const 
              : selectedModel === '1_step' ? ['p1', 'funded'] as const 
              : ['p1', 'p2', 'funded'] as const;
            const activeTab = availableTabs.includes(rulePhaseTab as any) ? rulePhaseTab : availableTabs[0];

            // Phase-specific values
            const phaseRules = activeTab === 'p1' ? {
              profitTarget: `${r?.profit_target_phase1 ?? 10}%`,
              dailyDD: `${r?.daily_drawdown_phase1 ?? r?.daily_drawdown_percent ?? 5}%`,
              overallDD: `${r?.overall_drawdown_phase1 ?? r?.overall_drawdown_percent ?? 12}%`,
              minDays: `${r?.minimum_trading_days_phase1 ?? r?.minimum_trading_days ?? 0} Days`,
            } : activeTab === 'p2' ? {
              profitTarget: `${r?.profit_target_phase2 ?? 5}%`,
              dailyDD: `${r?.daily_drawdown_phase2 ?? r?.daily_drawdown_percent ?? 5}%`,
              overallDD: `${r?.overall_drawdown_phase2 ?? r?.overall_drawdown_percent ?? 12}%`,
              minDays: `${r?.minimum_trading_days_phase2 ?? 0} Days`,
            } : {
              profitTarget: null,
              dailyDD: `${r?.daily_drawdown_funded ?? r?.daily_drawdown_percent ?? 5}%`,
              overallDD: `${r?.overall_drawdown_funded ?? r?.overall_drawdown_percent ?? 12}%`,
              minDays: 'Unlimited',
            };

            return (
              <div className="bg-[#161616] rounded-[2.5rem] border border-[#2A2A2A] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8">
                <div className="grid grid-cols-1 lg:grid-cols-2">

                  {/* LEFT: Phase Rules */}
                  <div className="p-10 border-b lg:border-b-0 lg:border-r border-white/5">
                    <h4 className="text-lg font-black text-white tracking-tight mb-1">
                      ${selectedPackage.balance.toLocaleString()} {MODEL_META[selectedModel].label}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-8">Account Includes</p>

                    {/* Phase Tabs */}
                    <div className="flex gap-2 mb-10">
                      {availableTabs.map(tab => (
                        <button
                          key={tab}
                          onClick={() => setRulePhaseTab(tab as any)}
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                            activeTab === tab
                              ? 'text-white shadow-lg'
                              : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                          }`}
                          style={activeTab === tab ? { backgroundColor: modelColor, borderColor: modelColor } : {}}
                        >
                          {tab === 'p1' ? 'Phase 1' : tab === 'p2' ? 'Phase 2' : 'Funded'}
                        </button>
                      ))}
                    </div>

                    {/* Rules List */}
                    <div className="space-y-0">
                      {(() => {
                        const fmtType = (t: string | undefined | null) => { const v = t || 'static'; return v.charAt(0).toUpperCase() + v.slice(1); };
                        const dailyType = fmtType(activeTab === 'p1' ? r?.daily_drawdown_type_phase1 : activeTab === 'p2' ? r?.daily_drawdown_type_phase2 : r?.daily_drawdown_type_funded);
                        const overallType = fmtType(activeTab === 'p1' ? r?.overall_drawdown_type_phase1 : activeTab === 'p2' ? r?.overall_drawdown_type_phase2 : r?.overall_drawdown_type_funded);
                        return [
                          ...(phaseRules.profitTarget ? [{ label: 'Profit Target', value: phaseRules.profitTarget }] : []),
                          { label: `Daily Loss Limit (${dailyType})`, value: phaseRules.dailyDD },
                          { label: `Max Overall Drawdown (${overallType})`, value: phaseRules.overallDD },
                          { label: 'Minimum Trading Days', value: phaseRules.minDays },
                          ...(activeTab === 'funded' ? [
                            { label: 'Withdrawal Target', value: `${r?.withdrawal_target_percent ?? 5}%` },
                          ] : []),
                          { label: 'Refundable Fee', value: '100%' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center py-5 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: modelColor, opacity: 0.7 }} />
                              <span className="text-sm text-gray-300 font-medium">{item.label}</span>
                            </div>
                            <span className="text-sm font-black text-white">{item.value}</span>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="mt-8 p-5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                      <button onClick={() => setShowRules(true)} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-colors">
                        For more detailed rules, <span className="underline" style={{ color: modelColor }}>review our FAQs</span>
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: General Account Specs */}
                  <div className="p-10">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-8">This Evaluation Includes:</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                      {[
                        { label: 'Trading Period', value: 'Unlimited' },
                        { label: 'Reward Split', value: `Up to ${r?.payout_split_percent ?? 80}%` },
                        { label: 'Leverage', value: '1:100' },
                        { label: 'Drawdown Type', value: (() => {
                          const t = activeTab === 'p1' ? r?.daily_drawdown_type_phase1 
                            : activeTab === 'p2' ? r?.daily_drawdown_type_phase2 
                            : r?.daily_drawdown_type_funded;
                          return (t || 'static').charAt(0).toUpperCase() + (t || 'static').slice(1);
                        })() },
                        { label: 'EAs Allowed', value: 'Yes' },
                        { label: 'News Trading', value: r?.news_trading_allowed !== false ? 'Yes' : 'No' },
                        { label: 'Reward Cycle', value: r?.daily_payout_enabled ? 'Daily' : r?.bi_weekly_payout_enabled ? 'Bi-Weekly' : 'Weekly' },
                        { label: 'Platform', value: 'MetaTrader 5' },
                      ].map((spec, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: modelColor }} />
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{spec.label}</span>
                          </div>
                          <p className="text-sm font-black text-white pl-3.5">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT COLUMN (4) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
           <div className="bg-[#161616] rounded-[3rem] p-10 border border-[#2A2A2A] shadow-2xl space-y-12">
              <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] text-center">Receipt Summary</h3>
              
              {selectedPackage ? (
                <>
                  <div className="bg-black/40 rounded-3xl p-8 border border-white/5 text-center">
                     <div className="text-5xl font-black tracking-tighter mb-2">${selectedPackage.balance.toLocaleString()}</div>
                     <p className="text-[10px] font-black text-[#bd4dd6] uppercase tracking-[0.2em]">{MODEL_META[selectedModel].label}</p>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <span>Terminal Fee</span>
                        <span className="text-white font-mono">${selectedPackage.price.toFixed(0)}</span>
                     </div>
                     {categoryRules[selectedModel]?.discount_percent > 0 && (
                       <div className="flex justify-between items-center text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                          <span>Model Discount</span>
                          <span className="font-mono">-{categoryRules[selectedModel].discount_percent}%</span>
                       </div>
                     )}
                     {appliedCoupon && (
                       <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{appliedCoupon.code} ACTIVE</span>
                          <span className="text-white font-mono font-bold">-{appliedCoupon.discount}%</span>
                       </div>
                     )}
                     <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                        <span className="text-sm font-black text-gray-400 uppercase tracking-tighter">Total Due</span>
                        <div className="text-right">
                           <div className="text-5xl font-black text-white tracking-tighter mb-2">${calculateFinalPrice(selectedPackage.price).toFixed(0)}</div>
                           <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">All Taxes Incl.</div>
                        </div>
                     </div>
                  </div>

                  <button
                    onClick={handlePurchase}
                    className="w-full py-6 bg-white text-black hover:bg-gray-200 transition-all rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Lock className="w-5 h-5" /> Buy Challenge
                  </button>
                  <p className="text-center text-[9px] font-black text-gray-600 uppercase tracking-widest">Secure AES-256 Deployment Active</p>
                </>
              ) : (
                <div className="py-20 text-center opacity-20">
                   <Trophy className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Initialize Selection</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 🔴 PAYMENT MODAL */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-xl bg-[#161616] border border-[#2A2A2A] rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-xl font-black uppercase tracking-tight">Injection <span className="text-[#bd4dd6]">Console</span></h3>
               <button onClick={() => { setShowPaymentModal(false); setSelectedPaymentMethod(null); }} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto p-10 space-y-10 custom-scrollbar">
               {!selectedPaymentMethod ? (
                 <div className="space-y-4">
                   <button onClick={() => setSelectedPaymentMethod('usdt')} className="w-full p-8 rounded-[2rem] bg-white/5 border-2 border-transparent hover:border-[#bd4dd6] transition-all text-left flex items-center gap-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-[#bd4dd6]/10 flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard className="w-7 h-7 text-[#bd4dd6]" /></div>
                      <div className="flex-1"><p className="font-black text-lg">USDT (TRC20)</p><p className="text-[10px] text-gray-500 uppercase font-black">Crypto Gateway</p></div>
                      <ChevronRight className="w-6 h-6 text-gray-700" />
                   </button>
                   {!isIndianUser && (
                     <button onClick={() => setSelectedPaymentMethod('pkr')} className="w-full p-8 rounded-[2rem] bg-white/5 border-2 border-transparent hover:border-emerald-500 transition-all text-left flex items-center gap-6 group">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard className="w-7 h-7 text-emerald-400" /></div>
                        <div className="flex-1"><p className="font-black text-lg">Local PKR</p><p className="text-[10px] text-gray-500 uppercase font-black">JazzCash / Bank</p></div>
                        <ChevronRight className="w-6 h-6 text-gray-700" />
                     </button>
                   )}
                 </div>
               ) : (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5 relative">
                       <button onClick={() => setSelectedPaymentMethod(null)} className="absolute top-8 right-8 text-[9px] font-black text-[#bd4dd6] uppercase tracking-widest">Change</button>
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">Verification Address</p>
                       
                       {selectedPaymentMethod === 'usdt' ? (
                         <div className="space-y-6">
                            <div className="bg-black p-4 rounded-xl border border-white/5 flex items-center gap-4">
                               <code className="flex-1 text-[10px] text-[#bd4dd6] font-mono break-all text-center">TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5</code>
                               <button onClick={() => copyToClipboard('TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5', 'usdt')} className="p-3 rounded-xl bg-[#bd4dd6] text-white">
                                  {copiedAccount === 'usdt' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                               </button>
                            </div>
                         </div>
                       ) : (
                         <div className="space-y-4">
                            {paymentMethods.map(m => (
                              <div key={m.id} className="p-4 rounded-xl bg-black border border-white/5 flex justify-between items-center">
                                 <div><p className="font-black text-sm">{m.name}</p><p className="text-[9px] text-gray-500 uppercase">{m.account_name}</p></div>
                                 <div className="flex items-center gap-4"><span className="text-white font-mono text-sm">{m.account_number}</span>
                                 <button onClick={() => copyToClipboard(m.account_number, m.id)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">{copiedAccount === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>

                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                       <label className="block p-12 rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/5 text-center cursor-pointer hover:border-[#bd4dd6]/50 transition-all">
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)} />
                          <Upload className={`w-10 h-10 mx-auto mb-4 ${paymentScreenshot ? 'text-green-400' : 'text-gray-600'}`} />
                          <p className="font-black text-xs uppercase tracking-widest">{paymentScreenshot ? paymentScreenshot.name : 'Inject Proof Screenshot'}</p>
                       </label>
                       <button type="submit" disabled={!paymentScreenshot || submitting} className="w-full py-6 bg-gradient-to-r from-[#bd4dd6] to-purple-600 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl disabled:opacity-20 active:scale-95 transition-all">
                          {submitting ? 'ENGAGING AI...' : 'VALIDATE & DEPLOY'}
                       </button>
                    </form>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* 🔴 RULES MODAL */}
      {showRules && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="w-full max-w-3xl bg-[#161616] border border-[#2A2A2A] rounded-[3rem] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-10 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-2xl font-black tracking-tighter">TECHNICAL <span className="text-[#bd4dd6]">WHITEPAPER</span></h3>
               <button onClick={() => setShowRules(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto p-10 space-y-12 custom-scrollbar">
               {['instant', '1_step', '2_step'].map((m) => {
                 const model = m as AccountModelType;
                 const pkg = packages.find(p => getPackageModel(p) === model);
                 if (!pkg) return null;
                 const rules = getRulesForPackage(pkg);
                 return (
                   <div key={m} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 space-y-6">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-[#bd4dd6]"></div> {MODEL_META[model].label} Protocol
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                         <div className="space-y-1"><p className="text-[9px] text-gray-600 font-black uppercase">Trailing Loss</p><p className="font-black text-sm">{rules?.daily_drawdown_funded ?? rules?.daily_drawdown_percent ?? 5}% Daily</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-gray-600 font-black uppercase">Static Loss</p><p className="font-black text-sm">{rules?.overall_drawdown_funded ?? rules?.overall_drawdown_percent ?? 12}% Overall</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-gray-600 font-black uppercase">Profit Share</p><p className="text-emerald-400 font-black text-sm">{rules?.payout_split_percent}%</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-gray-600 font-black uppercase">Cycle</p><p className="font-black text-sm uppercase">{rules?.daily_payout_enabled ? 'Daily' : 'Weekly'}</p></div>
                      </div>
                   </div>
                 );
               })}
               <div className="p-8 rounded-[2rem] bg-red-500/5 border border-red-500/20 text-center uppercase tracking-widest">
                  <p className="text-red-400 font-black text-xs">High-Frequency Trading & Arbitrage are Strictly Forbidden</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}