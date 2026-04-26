import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, ChevronRight, Copy, Upload, CreditCard, Zap, Lock, CheckCircle } from 'lucide-react';
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
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<AccountModelType>('instant');
  const [rulesByPackageName, setRulesByPackageName] = useState<Record<string, AccountRuleConfig>>({});
  const [categoryRules, setCategoryRules] = useState<Record<string, AccountRuleConfig>>({});
  const [isIndianUser, setIsIndianUser] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);

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
    const couponDiscount = appliedCoupon?.discount || 0;
    // Additive: combine all discounts, cap at 100%
    const totalDiscount = Math.min(categoryDiscount + couponDiscount, 100);
    return price * (1 - totalDiscount / 100);
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

  if (loading) return <div className="flex items-center justify-center text-white uppercase tracking-widest py-40" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Initialising Terminal...</div>;

  return (
    <>
    <div className="pb-20 lg:pb-20 text-white" style={{ paddingBottom: selectedPackage ? '80px' : undefined, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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

      {/* PAGE HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#484f58] mb-4">
          <span>Trader</span><span>/</span><span className="text-white font-medium">Get Funded</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Start Your FundedCobra Challenge</h1>
        <p className="text-sm text-[#8B949E]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Choose your account type, configure your setup, and start trading with our capital.</p>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* ACCOUNT TYPE + PHASE RULES */}
          {(() => {
            const r = categoryRules[selectedModel];
            const modelColor = selectedModel === 'instant' ? '#8A2BE2' : selectedModel === '1_step' ? '#3B82F6' : '#10B981';
            const fmtType = (t: string | undefined | null) => { const v = t || 'static'; return v.charAt(0).toUpperCase() + v.slice(1); };

            // Build phase columns based on model type
            const phases: { label: string; color: string; rules: { label: string; value: string }[] }[] = [];

            if (selectedModel === 'instant') {
              phases.push({
                label: 'Funded Account',
                color: modelColor,
                rules: [
                  { label: 'Withdrawal Target', value: `${r?.withdrawal_target_percent ?? 5}%` },
                  { label: 'Daily Loss Limit', value: `${r?.daily_drawdown_funded ?? r?.daily_drawdown_percent ?? 5}%` },
                  { label: 'Max Drawdown', value: `${r?.overall_drawdown_funded ?? r?.overall_drawdown_percent ?? 12}%` },
                  { label: 'Drawdown Type', value: fmtType(r?.daily_drawdown_type_funded) },
                  { label: 'Min Trading Days', value: `${r?.minimum_trading_days ?? 0} Days` },
                  { label: 'Trading Period', value: 'Unlimited' },
                  { label: 'Profit Split', value: `Up to ${r?.payout_split_percent ?? 80}%` },
                  { label: 'Leverage', value: '1:100' },
                ],
              });
            } else if (selectedModel === '1_step') {
              phases.push(
                {
                  label: 'Phase 1 — Evaluation',
                  color: '#3B82F6',
                  rules: [
                    { label: 'Profit Target', value: `${r?.profit_target_phase1 ?? 10}%` },
                    { label: 'Daily Loss Limit', value: `${r?.daily_drawdown_phase1 ?? r?.daily_drawdown_percent ?? 5}%` },
                    { label: 'Max Drawdown', value: `${r?.overall_drawdown_phase1 ?? r?.overall_drawdown_percent ?? 12}%` },
                    { label: 'Drawdown Type', value: fmtType(r?.daily_drawdown_type_phase1) },
                    { label: 'Min Trading Days', value: `${r?.minimum_trading_days_phase1 ?? 0} Days` },
                    { label: 'Trading Period', value: 'Unlimited' },
                    { label: 'Leverage', value: '1:100' },
                  ],
                },
                {
                  label: 'Funded Account',
                  color: '#10B981',
                  rules: [
                    { label: 'Profit Target', value: 'No Target' },
                    { label: 'Daily Loss Limit', value: `${r?.daily_drawdown_funded ?? r?.daily_drawdown_percent ?? 5}%` },
                    { label: 'Max Drawdown', value: `${r?.overall_drawdown_funded ?? r?.overall_drawdown_percent ?? 12}%` },
                    { label: 'Drawdown Type', value: fmtType(r?.daily_drawdown_type_funded) },
                    { label: 'Withdrawal Target', value: `${r?.withdrawal_target_percent ?? 5}%` },
                    { label: 'Profit Split', value: `Up to ${r?.payout_split_percent ?? 80}%` },
                    { label: 'Refundable Fee', value: '100%' },
                  ],
                }
              );
            } else {
              phases.push(
                {
                  label: 'Phase 1',
                  color: '#3B82F6',
                  rules: [
                    { label: 'Profit Target', value: `${r?.profit_target_phase1 ?? 10}%` },
                    { label: 'Daily Loss Limit', value: `${r?.daily_drawdown_phase1 ?? r?.daily_drawdown_percent ?? 5}%` },
                    { label: 'Max Drawdown', value: `${r?.overall_drawdown_phase1 ?? r?.overall_drawdown_percent ?? 12}%` },
                    { label: 'Drawdown Type', value: fmtType(r?.daily_drawdown_type_phase1) },
                    { label: 'Min Trading Days', value: `${r?.minimum_trading_days_phase1 ?? 0} Days` },
                    { label: 'Trading Period', value: 'Unlimited' },
                  ],
                },
                {
                  label: 'Phase 2',
                  color: '#F59E0B',
                  rules: [
                    { label: 'Profit Target', value: `${r?.profit_target_phase2 ?? 5}%` },
                    { label: 'Daily Loss Limit', value: `${r?.daily_drawdown_phase2 ?? r?.daily_drawdown_percent ?? 5}%` },
                    { label: 'Max Drawdown', value: `${r?.overall_drawdown_phase2 ?? r?.overall_drawdown_percent ?? 12}%` },
                    { label: 'Drawdown Type', value: fmtType(r?.daily_drawdown_type_phase2) },
                    { label: 'Min Trading Days', value: `${r?.minimum_trading_days_phase2 ?? 0} Days` },
                    { label: 'Trading Period', value: 'Unlimited' },
                  ],
                },
                {
                  label: 'Funded',
                  color: '#10B981',
                  rules: [
                    { label: 'Profit Target', value: 'No Target' },
                    { label: 'Daily Loss Limit', value: `${r?.daily_drawdown_funded ?? r?.daily_drawdown_percent ?? 5}%` },
                    { label: 'Max Drawdown', value: `${r?.overall_drawdown_funded ?? r?.overall_drawdown_percent ?? 12}%` },
                    { label: 'Withdrawal Target', value: `${r?.withdrawal_target_percent ?? 5}%` },
                    { label: 'Profit Split', value: `Up to ${r?.payout_split_percent ?? 80}%` },
                    { label: 'Refundable Fee', value: '100%' },
                  ],
                }
              );
            }

            return (
              <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(180deg, #161B22 0%, #0D1117 100%)' }}>
                {/* Type Tabs */}
                <div className="flex border-b border-white/[0.06]">
                  {['instant', '1_step', '2_step'].map((type) => {
                    const model = type as AccountModelType;
                    const active = selectedModel === model;
                    const color = model === 'instant' ? '#8A2BE2' : model === '1_step' ? '#3B82F6' : '#10B981';
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedModel(model);
                          const modelPkgs = packages.filter(p => (p.account_type || 'instant') === model);
                          setSelectedPackage(modelPkgs.length > 0 ? modelPkgs[0] : null);
                        }}
                        className={`flex-1 px-3 py-3 transition-all border-b-2 ${
                          active ? 'text-white' : 'text-[#484f58] hover:text-[#8B949E] border-transparent'
                        }`}
                        style={active ? { borderBottomColor: color, background: `${color}08` } : {}}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold uppercase tracking-wider">{MODEL_META[model].label}</span>
                          {(() => {
                            const cr = categoryRules[model];
                            const payoutLabel = cr?.daily_payout_enabled ? 'Daily Payouts' : cr?.weekly_payout_enabled ? 'Weekly Payouts' : null;
                            if (!payoutLabel) return null;
                            return (
                              <span className="text-[11px] font-extrabold uppercase tracking-widest animate-pulse" style={{ color }}>{payoutLabel} ⚡</span>
                            );
                          })()}
                          <span className="text-[10px] text-[#484f58] font-medium hidden md:block">{MODEL_META[model].subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Phase Progression — desktop only */}
                {selectedModel !== 'instant' && (
                  <div className="hidden md:block px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      {phases.map((phase, i) => (
                        <React.Fragment key={i}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phase.color }} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{phase.label}</span>
                          </div>
                          {i < phases.length - 1 && (
                            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${phases[i].color}40, ${phases[i + 1].color}40)` }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile: Phase Tabs (show one phase at a time) */}
                {phases.length > 1 && (() => {
                  const activePhaseIdx = rulePhaseTab === 'p1' ? 0 : rulePhaseTab === 'p2' ? 1 : phases.length - 1;
                  const safeIdx = Math.min(activePhaseIdx, phases.length - 1);
                  return (
                    <div className="md:hidden">
                      <div className="flex border-b border-white/[0.04]">
                        {phases.map((phase, i) => (
                          <button
                            key={i}
                            onClick={() => setRulePhaseTab(i === 0 ? 'p1' : i === 1 && phases.length === 3 ? 'p2' : 'funded')}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                              i === safeIdx ? 'text-white' : 'text-[#484f58] border-transparent'
                            }`}
                            style={i === safeIdx ? { borderBottomColor: phase.color } : {}}
                          >
                            {phase.label}
                          </button>
                        ))}
                      </div>
                      <div className="p-5">
                        <div className="space-y-0">
                          {phases[safeIdx].rules.map((rule, ruleIdx) => (
                            <div key={ruleIdx} className="flex justify-between items-center py-3 border-b border-white/[0.03] last:border-0">
                              <span className="text-sm text-[#8B949E]">{rule.label}</span>
                              <span className="text-[15px] text-white font-bold">{rule.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Desktop: All Phase Columns side by side */}
                <div className={`hidden md:grid gap-0 ${phases.length === 1 ? 'grid-cols-1' : phases.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {phases.map((phase, phaseIdx) => (
                    <div key={phaseIdx} className={`px-5 py-4 ${phaseIdx > 0 ? 'border-l border-white/[0.04]' : ''}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: phase.color }} />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">{phase.label}</h4>
                      </div>
                      <div className="space-y-0">
                        {phase.rules.map((rule, ruleIdx) => (
                          <div key={ruleIdx} className="flex justify-between items-center py-2.5 border-b border-white/[0.03] last:border-0">
                            <span className="text-sm text-[#8B949E]">{rule.label}</span>
                            <span className="text-[15px] text-white font-bold">{rule.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Single phase (Instant) — shown on both mobile and desktop */}
                {phases.length === 1 && (
                  <div className="md:hidden p-5">
                    <div className="space-y-0">
                      {phases[0].rules.map((rule, ruleIdx) => (
                        <div key={ruleIdx} className="flex justify-between items-center py-3 border-b border-white/[0.03] last:border-0">
                          <span className="text-sm text-[#8B949E]">{rule.label}</span>
                          <span className="text-[15px] text-white font-bold">{rule.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-[#484f58]">
                    <span>EAs: <span className="text-[#8B949E] font-semibold">Yes</span></span>
                    <span>News: <span className="text-[#8B949E] font-semibold">{r?.news_trading_allowed !== false ? 'Yes' : 'No'}</span></span>
                    <span>Leverage: <span className="text-[#8B949E] font-semibold">1:100</span></span>
                  </div>
                  <button onClick={() => setShowRules(true)} className="text-xs font-bold uppercase tracking-wider hover:text-white transition-colors" style={{ color: modelColor }}>
                    Full rules →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ACCOUNT BALANCE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Account Balance</h3>
                <p className="text-[10px] text-[#484f58] font-medium mt-0.5">Trading Account Currency: <span className="text-[#8B949E]">USD</span></p>
              </div>
              {/* Inline type switcher */}
              <div className="flex gap-1 p-0.5 rounded-lg border border-white/[0.06]" style={{ background: '#0D1117' }}>
                {['instant', '1_step', '2_step'].map((type) => {
                  const model = type as AccountModelType;
                  const active = selectedModel === model;
                  const color = model === 'instant' ? '#8A2BE2' : model === '1_step' ? '#3B82F6' : '#10B981';
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedModel(model);
                        const modelPkgs = packages.filter(p => (p.account_type || 'instant') === model);
                        setSelectedPackage(modelPkgs.length > 0 ? modelPkgs[0] : null);
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                        active ? 'text-white' : 'text-[#484f58] hover:text-[#8B949E]'
                      }`}
                      style={active ? { background: color } : {}}
                    >
                      {MODEL_META[model].label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const modelColor = selectedModel === 'instant' ? '#8A2BE2' : selectedModel === '1_step' ? '#3B82F6' : '#10B981';
              const categoryDiscount = categoryRules[selectedModel]?.discount_percent || 0;
              const allPkgs = selectedModelPackages;

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                  {allPkgs.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const model = getPackageModel(pkg);
                    const defaultCoupon = model === 'instant' && pkg.balance >= 10000 ? 50 : 10;
                    const fullDiscount = Math.min(categoryDiscount + defaultCoupon, 100);
                    const finalPrice = pkg.price * (1 - fullDiscount / 100);
                    const balanceLabel = pkg.balance >= 1000 ? `$ ${(pkg.balance).toLocaleString()}` : `$${pkg.balance}`;
                    const isPremium = model === 'instant' && pkg.balance >= 10000;

                    return (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 group flex flex-col ${
                          isSelected
                            ? 'border-current shadow-lg scale-[1.02]'
                            : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02]'
                        }`}
                        style={{
                          background: isSelected ? `${modelColor}10` : '#0D1117',
                          color: isSelected ? modelColor : 'inherit',
                          borderColor: isSelected ? modelColor : undefined,
                        }}
                      >
                        {isPremium && (
                          <span className="absolute -top-2 left-3 px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500/90 text-white shadow-sm shadow-red-500/20">SALE</span>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-4 h-4" style={{ color: modelColor }} />
                          </div>
                        )}
                        <div className="text-lg md:text-xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{balanceLabel}</div>
                        <div className="space-y-0.5 mt-auto">
                          <div className="text-lg font-bold flex items-center justify-between" style={{ color: modelColor, fontFamily: 'Outfit, sans-serif' }}>
                            ${finalPrice.toFixed(0)}
                            {!isSelected && (
                              <span className="text-[10px] font-semibold text-[#8B949E] opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                            )}
                          </div>
                          {fullDiscount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#484f58] line-through">${pkg.price}</span>
                              <span className="text-[9px] font-bold text-emerald-400">-{fullDiscount}%</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[9px] text-[#484f58] mt-1.5 font-medium">One-time payment</div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* PLATFORM & SERVER */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Platform</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: '#161B22' }}>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-3">Trading Platform</p>
                <button
                  onClick={() => setSelectedPlatform('MT5')}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    selectedPlatform === 'MT5' ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#333] hover:border-white/20'
                  }`}
                >
                  <img src="/mt5-logo.png" alt="MetaTrader 5" className="w-9 h-9 rounded object-contain flex-shrink-0 bg-white/5" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-white">MetaTrader 5</p>
                    <p className="text-[10px] text-gray-500">Industry standard</p>
                  </div>
                  {selectedPlatform === 'MT5' ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />}
                </button>
              </div>

              {/* Server */}
              <div className="bg-[#161616] rounded-lg border border-[#2A2A2A] p-4">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-3">Broker / Server</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedServer('Exness')}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                      selectedServer === 'Exness' ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#333] hover:border-white/20'
                    }`}
                  >
                    <img src="/exness-logo.jpeg" alt="Exness" className="w-9 h-9 rounded object-cover flex-shrink-0" />
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-white">Exness</p>
                      <p className="text-[10px] text-emerald-400 font-bold">● Available</p>
                    </div>
                    {selectedServer === 'Exness' ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />}
                  </button>
                  <div className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[#222] opacity-40 cursor-not-allowed">
                    <div className="w-9 h-9 rounded bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[8px] font-black">FC</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-white">FundedCobra</p>
                      <p className="text-[10px] text-red-400 font-bold">● Server Full</p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN — Summary */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
           <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#161B22' }}>
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Summary</h3>
              </div>
              
              <div className="p-5 space-y-5">
                {selectedPackage ? (
                  <>
                    <div>
                      <div className="text-xs text-[#8B949E] font-medium">FundedCobra Challenge</div>
                      <div className="text-lg font-bold text-white mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>${selectedPackage.balance.toLocaleString()} account</div>
                    </div>

                    <div className="space-y-2.5 py-3 border-y border-white/[0.04]">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8B949E]">Type</span>
                        <span className="text-white font-semibold">{MODEL_META[selectedModel].label}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8B949E]">Platform</span>
                        <span className="text-white font-semibold">{selectedPlatform || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8B949E]">Server</span>
                        <span className="text-white font-semibold">{selectedServer || '—'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="text-[#8B949E]">Price</span>
                          <span className="text-white font-semibold">${selectedPackage.price}</span>
                       </div>
                       {(() => {
                         const catDiscount = categoryRules[selectedModel]?.discount_percent || 0;
                         const couponDiscount = appliedCoupon?.discount || 0;
                         const totalDiscount = Math.min(catDiscount + couponDiscount, 100);
                         if (totalDiscount <= 0) return null;
                         return (
                           <div className="flex justify-between text-xs">
                              <span className="text-emerald-400">Discount ({totalDiscount}%)</span>
                              <span className="text-emerald-400 font-semibold">-${(selectedPackage.price * totalDiscount / 100).toFixed(0)}</span>
                           </div>
                         );
                       })()}
                       <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center">
                          <span className="text-sm font-bold text-white">Total</span>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>${calculateFinalPrice(selectedPackage.price).toFixed(0)}</span>
                            <div className="text-[9px] text-[#484f58]">Incl. VAT</div>
                          </div>
                       </div>
                    </div>

                    {(!selectedPlatform || !selectedServer) && (
                      <div className="text-[10px] text-yellow-500/80 font-medium bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10 text-center">
                        Select platform and server to continue
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={!selectedPlatform || !selectedServer}
                      className={`w-full py-3.5 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                        (!selectedPlatform || !selectedServer) ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'
                      }`}
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        background: selectedModel === 'instant' ? '#8A2BE2' : selectedModel === '1_step' ? '#3B82F6' : '#10B981',
                      }}
                    >
                      Continue to Payment
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Shield className="w-3.5 h-3.5 text-[#484f58]" />
                      <span className="text-[10px] text-[#484f58] font-medium">Trusted by 2,000+ traders worldwide</span>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                     <Shield className="w-8 h-8 mx-auto mb-2 text-[#484f58]" />
                     <p className="text-[11px] font-medium text-[#484f58]">Select an account size to continue</p>
                  </div>
                )}
              </div>
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
               {/* Not Allowed */}
               <div className="p-8 rounded-[2rem] bg-red-500/5 border border-red-500/20 space-y-4">
                  <h4 className="text-red-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Not Allowed
                  </h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Automated Bots / Expert Advisors (EAs)', note: 'All trading must be done manually by you.' },
                      { label: 'High-Frequency Trading (HFT)', note: 'No rapid-fire orders placed by scripts.' },
                      { label: 'Trades Held Under 60 Seconds', note: 'Every trade must stay open for at least 1 minute.' },
                      { label: '3+ Consecutive Same-Direction Trades', note: "Don't keep placing the same buy or sell over and over." },
                      { label: 'Hedging On The Same Pair', note: 'No simultaneous buy and sell on the same instrument.' },
                    ].map((p, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1 h-1 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-white text-xs font-bold">{p.label}</p>
                          <p className="text-[10px] text-gray-500">{p.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* You Can */}
               <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                  <h4 className="text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> You Can
                  </h4>
                  <div className="space-y-2.5">
                    {[
                      'News trading — trade around economic events',
                      'Weekend position holding — leave trades open over the weekend',
                      'Trading multiple pairs simultaneously',
                      'Both long (buy) and short (sell) positions',
                      'Partial position closing',
                      'Modifying stop loss after entry',
                    ].map((p, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                        <p className="text-xs text-gray-300">{p}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* STICKY MOBILE BAR */}
    {selectedPackage && (
      <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden border-t border-white/[0.06] px-4 py-3 safe-area-bottom" style={{ background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>${calculateFinalPrice(selectedPackage.price).toFixed(0)}</div>
            <div className="text-[11px] text-[#8B949E] truncate">${selectedPackage.balance.toLocaleString()} {MODEL_META[selectedModel].label}</div>
          </div>
          <button
            onClick={handlePurchase}
            disabled={!selectedPlatform || !selectedServer}
            className={`px-6 py-3 text-white font-bold text-sm rounded-xl transition-all ${
              (!selectedPlatform || !selectedServer) ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
            }`}
            style={{
              fontFamily: 'Outfit, sans-serif',
              background: selectedModel === 'instant' ? '#8A2BE2' : selectedModel === '1_step' ? '#3B82F6' : '#10B981',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )}
  </>
  );
}