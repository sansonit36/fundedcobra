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
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string>('');
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

  const [rulePhaseTab, setRulePhaseTab] = useState<'p1' | 'p2' | 'funded'>('p1');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

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



  // Countdown timer to midnight
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      setCountdown({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      });
    };
    tick();
    const t = setInterval(tick, 1000);
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

      {/* PROMOTION STRIP */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1025 0%, #161B22 50%, #12161f 100%)' }}>
        <div className="absolute inset-0 bg-[#8A2BE2]/[0.04]" />
        <div className="relative max-w-7xl mx-auto flex items-center justify-center gap-4 text-white text-sm font-semibold py-3 px-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <span className="px-2.5 py-1 rounded-lg bg-[#8A2BE2]/15 text-[#c084fc] text-[10px] font-black tracking-wider border border-[#8A2BE2]/25">50% OFF</span>
          <span className="text-[#8B949E] text-xs">Premium Instant accounts — limited time offer</span>
          <span className="hidden md:inline text-[#484f58]">·</span>
          <span className="hidden md:flex items-center gap-1.5 text-xs text-[#8B949E]">
            <Clock className="w-3.5 h-3.5 text-[#c084fc]" />
            <span className="font-mono font-bold text-white">{String(countdown.hours).padStart(2,'0')}:{String(countdown.minutes).padStart(2,'0')}:{String(countdown.seconds).padStart(2,'0')}</span>
            <span>remaining</span>
          </span>
        </div>
      </div>

      {/* HEADER */}
      <div className="relative max-w-7xl mx-auto px-4 pt-8 md:pt-14 pb-6 md:pb-8">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-10" style={{ backgroundColor: '#bd4dd6' }} />
          <div className="absolute top-10 right-1/4 w-72 h-72 rounded-full blur-[100px] opacity-[0.07]" style={{ backgroundColor: '#3B82F6' }} />
        </div>
        <div className="relative text-center mb-6 md:mb-10">
          <h1 className="text-3xl md:text-5xl lg:text-7xl tracking-tight mb-2 md:mb-4 leading-[1.05]" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Get Funded <span className="bg-gradient-to-r from-[#bd4dd6] to-[#e879f9] bg-clip-text text-transparent">Today</span></h1>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Choose your funding model, select your account size, and start trading with our capital in minutes.</p>
        </div>
        
        {/* ACCOUNT TYPE TABS - Big and prominent */}
        <div className="relative flex justify-center">
          <div className="inline-flex gap-2 p-1.5 rounded-2xl border border-white/10" style={{ background: 'rgba(15,15,15,0.9)', backdropFilter: 'blur(20px)' }}>
            {['instant', '1_step', '2_step'].map((type) => {
              const model = type as AccountModelType;
              const active = selectedModel === model;
              const color = model === 'instant' ? '#bd4dd6' : model === '1_step' ? '#3B82F6' : '#10B981';
              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedModel(model);
                    const modelPkgs = packages.filter(p => (p.account_type || 'instant') === model);
                    setSelectedPackage(modelPkgs.length > 0 ? modelPkgs[0] : null);
                  }}
                  className={`px-4 md:px-8 py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                    active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={active ? { background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 6px 30px ${color}50, 0 0 0 1px ${color}30` } : { fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {MODEL_META[model].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEATURE CALLOUTS */}
      {(() => {
        const r = categoryRules[selectedModel];
        const modelColor = selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981';
        const payoutCycle = r?.daily_payout_enabled === true ? 'Daily' : r?.bi_weekly_payout_enabled === true ? 'Bi-Weekly' : r?.weekly_payout_enabled === true ? 'Weekly' : '—';
        const maxDD = r?.overall_drawdown_percent || r?.overall_drawdown_phase1 || '—';
        const featureItems = [
          { value: `Up to ${r?.payout_split_percent || 80}%`, label: 'Profit Split', color: '#fff', Icon: Trophy },
          { value: payoutCycle, label: 'Payout Cycle', color: modelColor, Icon: Zap },
          { value: `${maxDD}%`, label: 'Max Drawdown', color: '#34d399', Icon: Shield },
          { value: '1:100', label: 'Leverage', color: '#facc15', Icon: Sparkles },
        ];
        return (
          <div className="max-w-7xl mx-auto px-4 mb-6">
            {/* Desktop: 4 cards */}
            <div className="hidden md:grid grid-cols-4 gap-3">
              {featureItems.map((item, idx) => (
                <div key={idx} className="relative group rounded-xl p-[1px] transition-all duration-300" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))` }}>
                  <div className="rounded-xl p-5 text-center h-full" style={{ background: 'linear-gradient(180deg, #151515 0%, #0d0d0d 100%)' }}>
                    <item.Icon className="w-5 h-5 mx-auto mb-2 opacity-40" style={{ color: item.color }} />
                    <div className="text-2xl font-bold" style={{ color: item.color, fontFamily: 'Outfit, sans-serif' }}>{item.value}</div>
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Mobile: compact horizontal strip */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {featureItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.06] whitespace-nowrap flex-shrink-0" style={{ background: '#111' }}>
                  <item.Icon className="w-3.5 h-3.5 opacity-50" style={{ color: item.color }} />
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                  <span className="text-[9px] text-gray-600 font-semibold uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 🔴 MAIN GRID */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* STEP 1: Choose Account Size */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #bd4dd6, #9333ea)' }}>1</div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>Choose Your Account Size</h3>
            </div>
            {(() => {
              const modelColor = selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981';
              const modelLabel = selectedModel === 'instant' ? 'Instant' : selectedModel === '1_step' ? '1-Step' : '2-Step';
              const categoryDiscount = categoryRules[selectedModel]?.discount_percent || 0;
              
              const specialPkgs = selectedModelPackages.filter(p => p.balance < 10000);
              const premiumPkgs = selectedModelPackages.filter(p => p.balance >= 10000);

              const renderCard = (pkg: any) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const catDiscount = categoryDiscount;
                const baseDiscounted = pkg.price * (1 - catDiscount / 100);
                // Also apply default coupon preview for unselected cards
                const model = getPackageModel(pkg);
                const defaultCoupon = model === 'instant' && pkg.balance >= 10000 ? 50 : 10;
                const fullDiscount = Math.min(catDiscount + defaultCoupon, 100);
                const finalPrice = pkg.price * (1 - fullDiscount / 100);
                const savings = pkg.price - finalPrice;
                const balanceLabel = pkg.balance >= 10000 ? `$${(pkg.balance / 1000).toFixed(0)}K` : `$${pkg.balance.toLocaleString()}`;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-3 md:p-4 rounded-xl border transition-all duration-300 text-center group ${
                      isSelected 
                        ? 'border-transparent scale-[1.03]'
                        : 'border-white/[0.06] hover:border-white/15 hover:scale-[1.02]'
                    }`}
                    style={isSelected 
                      ? { background: `linear-gradient(180deg, ${modelColor}12 0%, ${modelColor}05 100%)`, borderColor: `${modelColor}60`, boxShadow: `0 0 30px ${modelColor}20, inset 0 1px 0 ${modelColor}20` } 
                      : { background: 'linear-gradient(180deg, rgba(22,22,22,1) 0%, rgba(13,13,13,1) 100%)' }
                    }
                  >
                    {isSelected && <div className="absolute -top-1.5 -right-1.5 rounded-full shadow-lg" style={{ background: modelColor }}><Check className="w-4 h-4 text-white p-0.5" /></div>}
                    <div className="text-lg md:text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{balanceLabel}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-gray-600 line-through">${pkg.price}</span>
                      <span className="text-sm md:text-base font-bold" style={{ color: modelColor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>${finalPrice.toFixed(0)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="text-[8px] md:text-[9px] font-semibold text-emerald-400 mt-1 bg-emerald-500/10 rounded-md px-1.5 py-0.5 inline-block border border-emerald-500/20">Save ${savings.toFixed(0)}</div>
                    )}
                  </button>
                );
              };

              return (
                <>
                  {selectedModel === 'instant' ? (
                    <div className="space-y-4">
                      {specialPkgs.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Special Accounts</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">10% OFF</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {specialPkgs.map(renderCard)}
                          </div>
                        </div>
                      )}
                      {premiumPkgs.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Premium Accounts</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">🔥 50% OFF</span>
                            <span className="text-[9px] text-orange-400 font-bold">Most Popular</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {premiumPkgs.map(renderCard)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{modelLabel} Evaluation</span>
                        {categoryDiscount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{categoryDiscount}% OFF</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {selectedModelPackages.map(renderCard)}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* STEP 2: Platform & Server */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-lg transition-all" style={{ background: selectedPlatform && selectedServer ? 'linear-gradient(135deg, #10B981, #059669)' : '#2A2A2A' }}>2</div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>Configure Your Setup</h3>
              {!selectedPlatform && <span className="text-[10px] text-red-400 font-bold animate-pulse">← Required</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Platform */}
              <div className="bg-[#161616] rounded-lg border border-[#2A2A2A] p-4">
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

          {/* STEP 3: Account Rules (inline, always visible when package selected) */}
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
                        { label: 'Reward Cycle', value: (() => {
                          if (r?.daily_payout_enabled === true) return 'Daily';
                          if (r?.bi_weekly_payout_enabled === true) return 'Bi-Weekly';
                          if (r?.weekly_payout_enabled === true) return 'Weekly';
                          return '—';
                        })() },
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

        {/* RIGHT COLUMN (4) - Checkout */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-4">
           <div className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(180deg, rgba(22,22,22,0.95) 0%, rgba(12,12,12,0.98) 100%)', backdropFilter: 'blur(20px)' }}>
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>Your Order</h3>
                {selectedPackage && <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ready</span>}
              </div>
              
              <div className="p-5 space-y-4">
                {selectedPackage ? (
                  <>
                    <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.3) 100%)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>${selectedPackage.balance.toLocaleString()}</div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {MODEL_META[selectedModel].label}
                          </p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-[11px] text-gray-400 font-medium">{selectedPlatform || '—'}</div>
                          <div className="text-[11px] text-gray-400 font-medium">{selectedServer || '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Account Fee</span>
                          <span className="text-white font-bold">${selectedPackage.price}</span>
                       </div>
                       {categoryRules[selectedModel]?.discount_percent > 0 && (
                         <div className="flex justify-between text-xs">
                            <span className="text-emerald-400">Discount</span>
                            <span className="text-emerald-400 font-bold">-${(selectedPackage.price * categoryRules[selectedModel].discount_percent / 100).toFixed(0)} ({categoryRules[selectedModel].discount_percent}%)</span>
                         </div>
                       )}
                       {appliedCoupon && (
                         <div className="flex justify-between text-xs bg-emerald-500/5 p-2 rounded border border-emerald-500/20">
                            <span className="text-emerald-400">{appliedCoupon.code}</span>
                            <span className="text-emerald-400 font-bold">-{appliedCoupon.discount}%</span>
                         </div>
                       )}
                       <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                          <span className="text-sm font-bold text-white">Total</span>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>${calculateFinalPrice(selectedPackage.price).toFixed(0)}</span>
                          </div>
                       </div>
                    </div>

                    {(!selectedPlatform || !selectedServer) && (
                      <div className="text-[10px] text-yellow-500 font-semibold bg-yellow-500/5 p-2.5 rounded-xl border border-yellow-500/15 text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        ⚠ Please select platform and server above to continue
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={!selectedPlatform || !selectedServer}
                      className={`w-full py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97] ${
                        (!selectedPlatform || !selectedServer) ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-110'
                      }`}
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        background: `linear-gradient(135deg, ${selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981'}, ${selectedModel === 'instant' ? '#9333ea' : selectedModel === '1_step' ? '#2563eb' : '#059669'})`,
                        boxShadow: (!selectedPlatform || !selectedServer) ? 'none' : `0 4px 25px ${selectedModel === 'instant' ? '#bd4dd640' : selectedModel === '1_step' ? '#3B82F640' : '#10B98140'}`
                      }}
                    >
                      <Lock className="w-4 h-4" /> Get Funded Now
                    </button>
                    
                    {/* Trust signals */}
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <div className="flex items-center gap-1 text-[9px] text-gray-500"><Shield className="w-3 h-3" /> SSL Secured</div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-500"><Zap className="w-3 h-3" /> Instant Setup</div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-500"><Check className="w-3 h-3" /> Verified</div>
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center opacity-30">
                     <Shield className="w-8 h-8 mx-auto mb-2" />
                     <p className="text-[10px] font-bold uppercase tracking-wider">Select an account size</p>
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

    {/* STICKY MOBILE CHECKOUT BAR */}
    {selectedPackage && (
      <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden border-t border-white/10 px-4 py-3 safe-area-bottom" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>${calculateFinalPrice(selectedPackage.price).toFixed(0)}</div>
            <div className="text-[11px] text-gray-400 truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>${selectedPackage.balance.toLocaleString()} {MODEL_META[selectedModel].label}</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {String(countdown.hours).padStart(2,'0')}:{String(countdown.minutes).padStart(2,'0')}:{String(countdown.seconds).padStart(2,'0')}
          </div>
          <button
            onClick={handlePurchase}
            disabled={!selectedPlatform || !selectedServer}
            className={`px-6 py-3 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all ${
              (!selectedPlatform || !selectedServer) ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
            }`}
            style={{
              fontFamily: 'Outfit, sans-serif',
              background: `linear-gradient(135deg, ${selectedModel === 'instant' ? '#bd4dd6' : selectedModel === '1_step' ? '#3B82F6' : '#10B981'}, ${selectedModel === 'instant' ? '#9333ea' : selectedModel === '1_step' ? '#2563eb' : '#059669'})`,
              boxShadow: (!selectedPlatform || !selectedServer) ? 'none' : `0 4px 20px ${selectedModel === 'instant' ? '#bd4dd640' : selectedModel === '1_step' ? '#3B82F640' : '#10B98140'}`
            }}
          >
            Get Funded
          </button>
        </div>
      </div>
    )}
  </>
  );
}