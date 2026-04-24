import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, AlertTriangle, HelpCircle, ChevronRight, Tag, Copy, Upload, Info, CreditCard, Zap, Sparkles, Clock, Lock, Star } from 'lucide-react';
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
  const [showDiscountBanner, setShowDiscountBanner] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [discountExpired, setDiscountExpired] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [isIndianUser, setIsIndianUser] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [viewingCounts, setViewingCounts] = useState<Record<string, number>>({});

  const getPackageModel = (pkg?: AccountPackage | null): AccountModelType => {
    return normalizeModelType(pkg?.account_type);
  };

  const getRulesForPackage = (pkg?: AccountPackage | null) => {
    if (!pkg) return null;
    return rulesByPackageName[pkg.name] || null;
  };

  const getModelPackages = (model: AccountModelType) => {
    return packages.filter((pkg) => getPackageModel(pkg) === model);
  };

  const getDefaultCouponForPackage = (pkg: AccountPackage) => {
    const model = getPackageModel(pkg);
    if (model === 'instant') {
      const isLegacySmallInstant = LEGACY_SMALL_INSTANT_NAMES.includes(pkg.name);
      return isLegacySmallInstant
        ? { code: 'WELCOME10', discount: 10 }
        : { code: 'GROWING50', discount: 50 };
    }

    return { code: 'WELCOME10', discount: 10 };
  };

  // Payout proof ticker data
  const payoutTicker = [
    { trader: 'Ahmad R.', amount: '$380', time: '4 mins ago', pkg: '$5K account' },
    { trader: 'Sara M.', amount: '$210', time: '11 mins ago', pkg: '$2.5K account' },
    { trader: 'James K.', amount: '$650', time: '23 mins ago', pkg: '$10K account' },
    { trader: 'Hira F.', amount: '$125', time: '31 mins ago', pkg: '$1.25K account' },
    { trader: 'Carlos D.', amount: '$940', time: '47 mins ago', pkg: '$15K account' },
    { trader: 'Amna S.', amount: '$290', time: '1 hr ago', pkg: '$5K account' },
    { trader: 'Bilal T.', amount: '$175', time: '2 hrs ago', pkg: '$3.5K account' },
  ];

  // Fake-but-realistic viewing counts per package (seeded from pkg name)
  const getViewingCount = (pkgName: string) => {
    if (viewingCounts[pkgName]) return viewingCounts[pkgName];
    const seed = pkgName.length * 3;
    const count = (seed % 7) + 2; // 2–8
    viewingCounts[pkgName] = count;
    return count;
  };

  // Fluctuate viewing counts ±1 every 8s per package
  useEffect(() => {
    if (packages.length === 0) return;
    const t = setInterval(() => {
      setViewingCounts(prev => {
        const next = { ...prev };
        packages.forEach(pkg => {
          const seed = (pkg.name.length * 3) % 7 + 2;
          const current = next[pkg.name] ?? seed;
          const delta = Math.random() < 0.5 ? 1 : -1;
          next[pkg.name] = Math.max(2, Math.min(9, current + delta));
        });
        return next;
      });
    }, 8000);
    return () => clearInterval(t);
  }, [packages]);

  // Rotate ticker every 3 seconds
  useEffect(() => {
    const t = setInterval(() => setTickerIndex(i => (i + 1) % payoutTicker.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Exit-intent detection (mouse leaves viewport from top)
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && selectedPackage && !exitIntentShown && !showPaymentModal) {
        setShowExitIntent(true);
        setExitIntentShown(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [selectedPackage, exitIntentShown, showPaymentModal]);

  // Abandonment email — fire when user leaves with a package selected but no purchase
  useEffect(() => {
    if (!user || !selectedPackage) return;
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability on page close
      const payload = JSON.stringify({
        to: user.email,
        template: 'cart_abandonment',
        data: {
          name: user.name || user.email,
          packageName: selectedPackage.name,
          packageBalance: selectedPackage.balance,
          amount: calculateFinalPrice(selectedPackage.price),
        },
        userId: user.id,
      });
      // Store in localStorage as fallback; a follow-up email flow can pick this up
      localStorage.setItem('abandonedCart', payload);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, selectedPackage]);

  useEffect(() => {
    async function loadPackages() {
      try {
        const [dbPackages, dbRules] = await Promise.all([
          getAccountPackages(),
          getAccountRulesForPackages()
        ]);

        const nextPackages = (dbPackages as AccountPackage[]).filter(pkg => pkg.is_active !== false);
        const nextRulesByPackageName: Record<string, AccountRuleConfig> = {};
        dbRules.forEach((rule) => {
          nextRulesByPackageName[rule.account_package_name] = rule;
        });

        setPackages(nextPackages);
        setRulesByPackageName(nextRulesByPackageName);

        const availableModels = Array.from(new Set(nextPackages.map(pkg => getPackageModel(pkg))));
        if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
          setSelectedModel(availableModels[0]);
        }
      } catch (err) {
        console.error('Error loading packages:', err);
        setError('Failed to load account packages');
      } finally {
        setLoading(false);
      }
    }
    
    async function loadPaymentMethods() {
      try {
        const { data } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('enabled', true)
          .order('created_at', { ascending: false });
        
        setPaymentMethods(data || []);
      } catch (err) {
        console.error('Error loading payment methods:', err);
      }
    }

    async function loadExchangeRate() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'usd_to_pkr_rate')
          .single();

        if (data?.value) {
          setUsdToPkr(Number(data.value));
        }
      } catch (err) {
        console.error('Error loading exchange rate:', err);
      }
    }

    async function detectUserCountry() {
      try {
        // Use a more reliable service with a shorter timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (data.country_code) {
          setUserCountry(data.country_code);
          setIsIndianUser(data.country_code === 'IN');
          console.log('User country detected:', data.country_code);
        }
      } catch (err) {
        console.warn('⚠️ [GEO] Error detecting user country, using default:', err);
        // Default to PK or international (non-India for now)
        setIsIndianUser(false);
      }
    }
    
    // Check for existing discount timer in localStorage
    const savedTimerEnd = localStorage.getItem('discountTimerEnd');
    const savedCoupon = localStorage.getItem('appliedCoupon');
    
    if (savedTimerEnd) {
      const endTime = parseInt(savedTimerEnd);
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining > 0) {
        setTimeRemaining(Math.floor(remaining / 1000));
        setDiscountExpired(false);
        
        // Restore the saved coupon
        if (savedCoupon) {
          try {
            const coupon = JSON.parse(savedCoupon);
            setAppliedCoupon(coupon);
            setCouponCode(coupon.code);
          } catch (err) {
            console.error('Error parsing saved coupon:', err);
          }
        }
      } else {
        setDiscountExpired(true);
        localStorage.removeItem('discountTimerEnd');
        localStorage.removeItem('appliedCoupon');
      }
    }
    
    loadPackages();
    loadPaymentMethods();
    loadExchangeRate();
    detectUserCountry();
  }, []);

  useEffect(() => {
    if (!selectedPackage) return;
    const packageModel = getPackageModel(selectedPackage);
    if (packageModel !== selectedModel) {
      setSelectedPackage(null);
    }
  }, [selectedModel]);

  // Auto-apply Growing Sale offer for Premium Instant accounts ONLY if no coupon is already set
  // (handleBuyNow already sets the correct coupon synchronously — this is just a fallback)
  useEffect(() => {
    if (selectedPackage && !appliedCoupon) {
      const suggestedCoupon = getDefaultCouponForPackage(selectedPackage);
      setAppliedCoupon(suggestedCoupon);
      setCouponCode(suggestedCoupon.code);
    }
  }, [selectedPackage]); // intentionally NOT in appliedCoupon deps to avoid loop


  // Timer countdown effect (only for special accounts with WELCOME10)
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setDiscountExpired(true);
            localStorage.removeItem('discountTimerEnd');
            localStorage.removeItem('appliedCoupon');
            setAppliedCoupon(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const handlePurchase = () => {
    if (!selectedPackage) return;
    setShowPaymentModal(true);
  };

  // Buy Now — applies coupon synchronously so modal shows correct price immediately
  const handleBuyNow = (pkg: AccountPackage) => {
    setSelectedPackage(pkg);
    const suggestedCoupon = getDefaultCouponForPackage(pkg);
    const discount = suggestedCoupon.discount;
    setAppliedCoupon(suggestedCoupon);
    setCouponCode(suggestedCoupon.code);
    const finalPrice = parseFloat((pkg.price * (1 - discount / 100)).toFixed(2));
    // Facebook AddToCart event
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [pkg.name],
        content_name: pkg.name,
        content_type: 'product',
        value: finalPrice,
        currency: 'USD',
      });
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !user || !paymentScreenshot) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setShowPaymentModal(false); // Close payment modal immediately
    setAiVerifying(true);
    setVerificationStep(0);

    console.log('🚀 [AI VERIFICATION] Starting payment submission');
    console.log('📦 Package:', selectedPackage.name, '- Price:', calculateFinalPrice(selectedPackage.price));
    console.log('👤 User ID:', user.id);
    console.log('📸 Screenshot:', paymentScreenshot.name, '- Size:', (paymentScreenshot.size / 1024).toFixed(2), 'KB');
    console.log('💳 Payment Method:', selectedPaymentMethod === 'usdt' ? 'USDT (TRC20)' : selectedPkrMethod?.name || 'PKR');

    // Animate through verification steps
    const stepTimer = setInterval(() => {
      setVerificationStep(prev => {
        if (prev >= 3) {
          clearInterval(stepTimer);
          return 3;
        }
        console.log(`✅ [AI VERIFICATION] Step ${prev + 1} completed`);
        return prev + 1;
      });
    }, 1500);

    try {
      console.log('📝 [PURCHASE] Creating account purchase...');
      console.log('📦 Package ID:', selectedPackage.id);
      console.log('🏷️ Coupon Code:', appliedCoupon?.code);
      
      // Validate package ID
      if (!selectedPackage.id) {
        throw new Error('Invalid package selection');
      }
      
      // Create the purchase request FIRST to get the request ID
      let accountRequestId;
      try {
        accountRequestId = await createAccountPurchase(
          selectedPackage.id,
          appliedCoupon?.code
        );
        console.log('✅ [PURCHASE] Account request created with ID:', accountRequestId);
      } catch (purchaseError) {
        console.error('❌ [PURCHASE] Failed to create account request');
        console.error('Purchase error:', purchaseError);
        throw purchaseError;
      }

      console.log('⬆️ [UPLOAD] Starting screenshot upload...');
      
      // Now upload the screenshot using the request ID as folder name
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${accountRequestId}/${Date.now()}.${fileExt}`;
      
      console.log('📁 [UPLOAD] File path:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentScreenshot, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ [UPLOAD ERROR]:', uploadError);
        console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      console.log('✅ [UPLOAD] Screenshot uploaded successfully');
      console.log('Upload response:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      console.log('🔗 [UPLOAD] Public URL generated:', publicUrl);

      // Call AI verification edge function
      console.log('🤖 [AI] Calling verification edge function...');
      console.log('📤 [AI] Request payload:', {
        imageUrl: publicUrl,
        amount: calculateFinalPrice(selectedPackage.price),
        paymentMethod: selectedPaymentMethod === 'usdt' ? 'USDT (TRC20)' : selectedPkrMethod?.name || 'PKR',
        userId: user.id
      });

      const { data: verificationResult, error: verifyError } = await supabase.functions.invoke(
        'verify-screenshot',
        {
          body: {
            imageUrl: publicUrl,
            amount: calculateFinalPrice(selectedPackage.price),
            paymentMethod: selectedPaymentMethod === 'usdt' ? 'USDT (TRC20)' : selectedPkrMethod?.name || 'PKR',
            userId: user.id
          }
        }
      );

      clearInterval(stepTimer);
      // Don't close the AI modal yet - keep it open until navigation is complete
      // setAiVerifying(false);

      console.log('📥 [AI] Response received');
      console.log('AI Verification Result:', JSON.stringify(verificationResult, null, 2));
      
      if (verifyError || !verificationResult.success) {
        console.error('❌ [AI ERROR] Verification failed');
        const errorMsg = verifyError?.message || verificationResult?.error || 'Unknown AI error';
        console.error('Error details:', errorMsg);
        
        // CRITICAL FIX: Even if AI fails (safety filter, 500 error, etc.), 
        // we should still save the screenshot to the DB so the admin can see it.
        try {
          console.log('💾 [DB FALLBACK] Saving screenshot even though AI failed...');
          await submitPaymentProof(accountRequestId, publicUrl, {
            confidence: 0,
            reason: `AI Error/Safety Block: ${errorMsg}`,
            red_flags: ['AI_VERIFICATION_FAILED'],
            isValid: false
          });
          console.log('✅ [DB FALLBACK] Screenshot saved for admin review');
        } catch (dbError) {
          console.error('❌ [DB FALLBACK ERROR] Failed to save fallback results:', dbError);
        }

        // Navigate to suspicious page so the user knows it's being reviewed manually
        setSuccess('AI verification was inconclusive, but your payment proof has been saved for manual review.');
        setAiVerifying(false);
        navigate('/suspicious-payment');
        return;
      }

      // Check if verification result has expected structure
      if (!verificationResult.verification) {
        console.error('❌ [AI ERROR] Invalid response structure');
        throw new Error('AI returned invalid response format. Check edge function logs.');
      }

      console.log('🔍 [AI RESULT] Validation:', verificationResult.verification.isValid ? '✅ VALID' : '❌ INVALID');
      console.log('🎯 [AI RESULT] Confidence:', verificationResult.verification.confidence + '%');
      console.log('📝 [AI RESULT] Reason:', verificationResult.verification.reason);
      console.log('💰 [AI RESULT] Payment Type:', verificationResult.verification.paymentType);
      console.log('🚩 [AI RESULT] Red Flags:', verificationResult.verification.redFlags);

      // Check confidence score
      if (verificationResult.verification.confidence < 60) {
        console.warn('⚠️ [LOW CONFIDENCE] Screenshot verification uncertain');
      }

      // 4) ALWAYS save the results and screenshot URL to the database
      // This ensures even suspicious payments are visible to the admin
      try {
        console.log('💾 [DB] Saving verification results to database...');
        await submitPaymentProof(accountRequestId, publicUrl, {
          confidence: verificationResult.verification.confidence,
          reason: verificationResult.verification.reason,
          red_flags: verificationResult.verification.redFlags,
          isValid: verificationResult.verification.isValid
        });
        console.log('✅ [DB] Verification results saved');
      } catch (dbError: any) {
        console.error('❌ [DB ERROR] Failed to save verification results:', dbError);
        
        // Show a helpful hint if it looks like a migration issue
        if (dbError?.code === 'PGRST202') {
          console.error('💡 HINT: Please ensure you have run the latest SQL migration to update the submit_payment_proof RPC.');
        }
      }

      // 5) Handle Suspicious / Invalid payments
      if (!verificationResult.verification.isValid || verificationResult.verification.confidence < 40) {
        console.warn('⚠️ [SUSPICIOUS] Screenshot flagged for admin review');
        console.warn('Reason:', verificationResult.verification.reason);
        
        // Track the suspicious attempt
        try {
          if (window.fbq) {
            window.fbq('track', 'SuspiciousPayment', {
              value: calculateFinalPrice(selectedPackage.price),
              currency: 'USD',
              content_name: selectedPackage.name,
              reason: verificationResult.verification.reason
            });
          }
        } catch (e) {}

        // Redirect to suspicious page instead of thank you page
        setSuccess('Payment submission received but requires manual review. Our team will verify your payment shortly.');
        setAiVerifying(false);
        navigate('/suspicious-payment');
        return;
      }

      console.log('✅ [SUCCESS] Screenshot verified successfully');
      console.log('Proceeding with account purchase...');
      
      // Track the purchase submission with Facebook
      trackPurchaseSubmission({
        amount: calculateFinalPrice(selectedPackage.price),
        packageName: selectedPackage.name,
        requestId: accountRequestId
      });

      // Use the same request ID we created earlier
      const requestId = accountRequestId;

      // Get user profile data
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      // Send confirmation email to user
      if (userProfile) {
        try {
          await sendEmail({
            to: userProfile.email,
            template: 'account_purchase_submitted',
            data: {
              name: userProfile.name,
              packageName: selectedPackage.name,
              packageBalance: selectedPackage.balance,
              amount: calculateFinalPrice(selectedPackage.price)
            },
            userId: user.id
          });
        } catch (emailError) {
          console.error('Failed to send user confirmation email:', emailError);
        }

        // Send admin notification email
        try {
          await sendEmail({
            to: import.meta.env.VITE_ADMIN_EMAIL,
            template: 'admin_account_purchase_notification',
            data: {
              userName: userProfile.name,
              userEmail: userProfile.email,
              packageName: selectedPackage.name,
              amount: calculateFinalPrice(selectedPackage.price),
              requestId: requestId,
              requestTime: new Date().toLocaleString(),
              aiVerification: `Verified by AI - Confidence: ${verificationResult.verification.confidence}% - ${verificationResult.verification.reason}`
            }
          });
        } catch (emailError) {
          console.error('Failed to send admin notification email:', emailError);
        }
      }

      setSuccess('Payment verified and submitted successfully! Your account will be activated after admin approval.');
      // Modal already closed at start of function
      
      console.log('✅ [COMPLETE] Purchase request created successfully');
      console.log('📧 [EMAIL] Confirmation emails sent');
      console.log('🔄 [REDIRECT] Navigating to thank you page...');
      
      // Clear the purchase tracking flag before navigating
      (window as any).__purchaseTracked = false;
      
      // Close AI verification modal before navigation
      setAiVerifying(false);
      
      // Note: Facebook pixel will fire ONLY when admin approves the request
      // Redirect to thank you page with purchase amount
      navigate('/thank-you', { 
        state: { 
          amount: calculateFinalPrice(selectedPackage.price),
          packageName: selectedPackage.name
        } 
      });
    } catch (err) {
      console.error('❌ [FATAL ERROR] Payment submission failed');
      console.error('Error type:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', JSON.stringify(err, null, 2));
      console.error('Timestamp:', new Date().toISOString());
      
      // Close AI modal on error
      setAiVerifying(false);
      
      setError(err instanceof Error ? err.message : 'Failed to create purchase request');
    } finally {
      console.log('🏁 [CLEANUP] Payment submission process ended');
      setSubmitting(false);
      setAiVerifying(false);
    }
  };

  const handleApplyDiscount = () => {
    if (discountExpired || timeRemaining > 0 || !selectedPackage) return;

    const couponData = getDefaultCouponForPackage(selectedPackage);
    
    setAppliedCoupon(couponData);
    setCouponCode(couponData.code);
    
    // Start 15-minute timer and save to localStorage
    const endTime = Date.now() + (15 * 60 * 1000); // 15 minutes
    localStorage.setItem('discountTimerEnd', endTime.toString());
    localStorage.setItem('appliedCoupon', JSON.stringify(couponData));
    setTimeRemaining(15 * 60); // 900 seconds
    setShowDiscountBanner(false);
    
    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      }));
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      }));
    }, 250);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateFinalPrice = (price: number) => {
    if (!appliedCoupon) return price;
    return price * (1 - appliedCoupon.discount / 100);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const availableModels = Array.from(new Set(packages.map(pkg => getPackageModel(pkg)))) as AccountModelType[];
  const selectedModelPackages = getModelPackages(selectedModel);
  const selectedPackageRules = getRulesForPackage(selectedPackage);

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 mt-0.5" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* AI Verification Modal (Ultra Modern) */}
      {aiVerifying && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 text-white overflow-hidden">
          <div className="max-w-md w-full relative">
            {/* Background Glows */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#bd4dd6]/20 blur-[80px] animate-pulse"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="bg-[#1a1a1a] rounded-3xl p-10 border border-[#bd4dd6]/30 shadow-[0_0_50px_rgba(189,77,214,0.15)] relative">
              {/* Radar Scanner Animation */}
              <div className="flex justify-center mb-10">
                <div className="relative w-32 h-32 flex items-center justify-center">
                   <div className="absolute inset-0 border-4 border-dashed border-[#bd4dd6]/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                   <div className="absolute inset-2 border-2 border-[#bd4dd6]/40 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
                   <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#bd4dd6] to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(189,77,214,0.5)] z-10 transition-transform hover:scale-110">
                     <Shield className="w-10 h-10 text-white" />
                   </div>
                   <div className="absolute top-0 left-0 w-full h-[2px] bg-[#bd4dd6] shadow-[0_0_15px_#bd4dd6] animate-[scan_2s_ease-in-out_infinite] z-20"></div>
                </div>
              </div>

              <div className="text-center mb-10">
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">AI Sentinel <span className="text-[#bd4dd6]">Active</span></h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Protocol: Proof Authentication & Validation</p>
              </div>

              <div className="space-y-6 mb-10">
                {[
                  { step: 'INITIALIZING', desc: 'Secure image uplink', icon: Upload },
                  { step: 'PROCESSING', desc: 'Neural OCR analysis', icon: Sparkles },
                  { step: 'VALIDATING', desc: 'Cross-reference ledger', icon: Shield },
                  { step: 'CALCULATING', desc: 'Confidence scoring', icon: Check }
                ].map((s, i) => (
                  <div key={i} className={`flex items-center gap-4 transition-all duration-700 ${verificationStep >= i ? 'opacity-100 translate-x-0' : 'opacity-20 -translate-x-4'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${verificationStep > i ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : verificationStep === i ? 'bg-[#bd4dd6] animate-pulse' : 'bg-white/5'}`}>
                      {verificationStep > i ? <Check className="w-5 h-5 text-white" /> : <s.icon className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.step}</div>
                       <div className="text-sm font-bold text-white uppercase tracking-tight">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress & Security */}
              <div className="pt-6 border-t border-[#2A2A2A]">
                 <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
                    <Info className="w-4 h-4 text-[#bd4dd6]" />
                    Verification powered by <span className="text-white">GPT-4V Core</span>
                 </div>
                 <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#bd4dd6] to-purple-500 transition-all duration-1000" style={{ width: `${(verificationStep + 1) * 25}%` }}></div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit-Intent Modal */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-[#1e1e1e] rounded-2xl p-8 border border-[#bd4dd6]/30 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Wait — your discount is expiring!</h3>
            <p className="text-gray-400 text-sm mb-6">
              You have a <span className="text-green-400 font-bold">
                {selectedPackage ? `${getDefaultCouponForPackage(selectedPackage).discount}%` : '10%'}
              </span> discount locked on your <span className="text-white font-semibold">{selectedPackage?.name}</span>. It disappears the moment you leave.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowExitIntent(false); setShowPaymentModal(true); }}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-700 hover:to-primary-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/30"
              >
                <Lock className="w-4 h-4" />
                <span>Complete My Purchase</span>
              </button>
              <button
                onClick={() => setShowExitIntent(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                No thanks, I'll pass on the discount
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* 🚀 Left Column: The Configuration Builder */}
        <div className="w-full lg:w-[65%] space-y-8">
          
          {/* Progress Tracker (Horizontal Breadcrumbs) */}
          <div className="bg-[#1e1e1e]/50 backdrop-blur-md rounded-2xl p-4 border border-[#2A2A2A] flex items-center justify-between">
            {['Strategy', 'Account Configuration', 'Confirm & Pay'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  (i === 0 || (i === 1 && (selectedPackage || selectedPlatform || selectedServer))) 
                    ? 'bg-[#bd4dd6] text-white shadow-[0_0_10px_rgba(189,77,214,0.4)]' 
                    : 'bg-[#2A2A2A] text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block ${
                   (i === 0 || (i === 1 && (selectedPackage || selectedPlatform || selectedServer))) ? 'text-white' : 'text-gray-600'
                }`}>{step}</span>
                {i < 2 && <div className="w-8 md:w-16 h-[1px] bg-[#2A2A2A] mx-2"></div>}
              </div>
            ))}
          </div>

          {/* 🟢 Live Payout Ticker (Compact & Premium) */}
          <div className="flex items-center space-x-3 py-3 px-5 rounded-2xl bg-green-500/5 border border-green-500/10 overflow-hidden shadow-inner font-mono">
            <span className="flex-shrink-0 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-green-400 text-[10px] font-black uppercase tracking-widest">REAL-TIME</span>
            </span>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-gray-400 italic">
                <span className="text-white font-bold">{payoutTicker[tickerIndex].trader}</span> withdrew{' '}
                <span className="text-green-400 font-black">{payoutTicker[tickerIndex].amount}</span> from their{' '}
                <span className="text-[#bd4dd6] font-bold">{payoutTicker[tickerIndex].pkg}</span>
              </p>
            </div>
            <span className="text-gray-600 text-[10px] hidden sm:block">{payoutTicker[tickerIndex].time}</span>
          </div>

          {/* Main Account Configuration Builder */}
          <div className="bg-[#1e1e1e] rounded-[2rem] border border-[#2A2A2A] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Sparkles className="w-32 h-32 text-[#bd4dd6]" />
            </div>

            <div className="p-8 border-b border-[#2A2A2A] bg-gradient-to-br from-[#bd4dd6]/10 to-transparent">
               <h2 className="text-3xl font-black text-white tracking-tight">Cobra Lab <span className="text-[#bd4dd6]">Builder</span></h2>
               <p className="text-gray-400 mt-2 font-medium">Precision-engineer your trading vehicle.</p>
            </div>

            <div className="p-6 md:p-8 space-y-10">
              {/* Step 1: Platform & Server Hybrid Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-black text-[#606060] mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="text-[#bd4dd6]">01.</span> Terminal Platform
                  </h3>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-[#bd4dd6] bg-[#bd4dd6]/5 text-left transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-black border border-[#bd4dd6]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-white font-black text-xl">5</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg leading-tight uppercase tracking-tight">MetaTrader 5</div>
                          <div className="text-[10px] text-[#bd4dd6] font-black uppercase tracking-widest">Recommended</div>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#bd4dd6] fill-[#bd4dd6]/20" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#606060] mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="text-[#bd4dd6]">02.</span> Liquidity Server
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSelectedServer('Exness')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all relative ${
                        selectedServer === 'Exness' 
                          ? 'border-green-500 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                          : 'border-[#2A2A2A] bg-[#161616] grayscale opacity-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1.5 mb-2">
                        <span className="text-black font-black text-sm italic tracking-tighter">ex</span>
                      </div>
                      <span className="text-white font-bold text-xs uppercase tracking-widest">Exness</span>
                      {selectedServer === 'Exness' && <Check className="absolute top-2 right-2 w-4 h-4 text-green-500" />}
                    </button>
                    <button disabled className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-[#2A2A2A] bg-black opacity-30 cursor-not-allowed group">
                      <div className="w-10 h-10 rounded-lg bg-black border border-[#2A2A2A] flex items-center justify-center mb-2">
                        <Lock className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors" />
                      </div>
                      <span className="text-gray-600 font-bold text-xs uppercase tracking-widest">Cobra-1</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Choose Model */}
              <div>
                <h3 className="text-xs font-black text-[#606060] mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-[#bd4dd6]">03.</span> Choose Model
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {availableModels.map((model) => {
                    const active = selectedModel === model;
                    return (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          setSelectedPackage(null);
                        }}
                        className={`group p-6 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden backdrop-blur-md ${
                          active
                            ? MODEL_META[model].accentBorder
                            : 'border-[#2A2A2A] bg-white/[0.03] hover:border-[#404040]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl ${active ? 'bg-white text-black' : 'bg-[#2A2A2A] text-gray-500'}`}>
                            {model === 'instant' && <Zap className="w-6 h-6" />}
                            {model === '1_step' && <Star className="w-6 h-6" />}
                            {model === '2_step' && <Shield className="w-6 h-6" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                            active ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'
                          }`}>
                            {getModelPackages(model).length} Sizes
                          </span>
                        </div>
                        <div className={`font-black text-xl uppercase tracking-tight mb-2 ${MODEL_META[model].accent}`}>
                          {MODEL_META[model].label}
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">{MODEL_META[model].subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Choose Size */}
              <div>
                <h3 className="text-xs font-black text-[#606060] mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-[#bd4dd6]">04.</span> Choose Size
                </h3>

                {selectedModelPackages.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-400">
                    No active packages available for this model yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedModelPackages.map((pkg) => {
                      const coupon = getDefaultCouponForPackage(pkg);
                      const isSelected = selectedPackage?.id === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`group relative p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden ${
                            isSelected
                              ? `${MODEL_META[selectedModel].accentBorder} border-opacity-70`
                              : 'border-[#2A2A2A] bg-[#161616] hover:bg-[#1f1f1f] hover:border-[#404040]'
                          }`}
                        >
                          <div className={`font-black text-2xl md:text-3xl tracking-tighter mb-1 transition-transform group-hover:scale-105 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            ${(pkg.balance / 1000).toFixed(1)}K
                          </div>
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Balance</div>

                          <div className="w-full pt-4 border-t border-[#2A2A2A] flex flex-col items-center">
                            {coupon.discount > 0 ? (
                              <>
                                <span className="text-[10px] text-gray-600 line-through mb-1">${pkg.price.toFixed(2)}</span>
                                <span className="text-green-400 font-black text-lg">${(pkg.price * (1 - coupon.discount / 100)).toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-[#bd4dd6] font-black text-lg">${pkg.price.toFixed(2)}</span>
                            )}
                          </div>

                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-300" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 4: Dynamic Comparison Matrix */}
              {selectedPackage && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#bd4dd6]/15 to-transparent">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Comparison Matrix</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Live rules for {selectedPackage.name} ({MODEL_META[selectedModel].label})
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">Price</td>
                          <td className="px-6 py-3 text-right text-white font-semibold">${selectedPackage.price.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">Profit Target Phase 1</td>
                          <td className="px-6 py-3 text-right text-white font-semibold">
                            {selectedPackageRules?.profit_target_phase1 ?? '--'}%
                          </td>
                        </tr>
                        {selectedModel === '2_step' && (
                          <tr className="border-b border-white/10">
                            <td className="px-6 py-3 text-gray-400">Profit Target Phase 2</td>
                            <td className="px-6 py-3 text-right text-white font-semibold">
                              {selectedPackageRules?.profit_target_phase2 ?? '--'}%
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">Daily Drawdown</td>
                          <td className="px-6 py-3 text-right text-red-300 font-semibold">
                            {selectedPackageRules?.daily_drawdown_percent ?? '--'}%
                          </td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">Overall Drawdown</td>
                          <td className="px-6 py-3 text-right text-orange-300 font-semibold">
                            {selectedPackageRules?.overall_drawdown_percent ?? '--'}%
                          </td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">Minimum Trading Days</td>
                          <td className="px-6 py-3 text-right text-white font-semibold">
                            {selectedPackageRules?.minimum_trading_days ?? 0}
                          </td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">Payout Split</td>
                          <td className="px-6 py-3 text-right text-emerald-300 font-semibold">
                            {selectedPackageRules?.payout_split_percent ?? 80}%
                          </td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="px-6 py-3 text-gray-400">News Trading</td>
                          <td className="px-6 py-3 text-right text-white font-semibold">
                            {selectedPackageRules?.news_trading_allowed ? 'Allowed' : 'Restricted'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3 text-gray-400">Weekend Holding</td>
                          <td className="px-6 py-3 text-right text-white font-semibold">
                            {selectedPackageRules?.weekend_holding_allowed ? 'Allowed' : 'Restricted'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* Trust Footer inside Builder */}
            <div className="px-8 py-6 bg-black/40 border-t border-[#2A2A2A] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Secure SSL Configuration</span>
              </div>
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => <div key={i} className="w-6 h-6 rounded-full bg-[#333] border-2 border-black"></div>)}
                <div className="pl-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Joined by 12,400+ Traders</div>
              </div>
            </div>
          </div>

           {/* Rules Accordion (Better Integration) */}
          <div className="bg-[#1e1e1e]/80 rounded-3xl p-8 border border-[#2A2A2A] shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Trading <span className="text-[#bd4dd6]">Protocol</span></h3>
                <button onClick={() => setShowRules(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-gray-400 transition-all uppercase tracking-widest">Read Whitepaper</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-green-400/10 text-green-400"><Check className="w-4 h-4" /></div>
                      <div>
                    <div className="text-white font-bold text-sm uppercase tracking-tight">Weekend Holding</div>
                    <p className="text-gray-500 text-xs mt-1">
                      {selectedPackageRules?.weekend_holding_allowed ? 'Allowed for this package.' : 'Restricted for this package.'}
                    </p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-green-400/10 text-green-400"><Check className="w-4 h-4" /></div>
                      <div>
                    <div className="text-white font-bold text-sm uppercase tracking-tight">News Trading</div>
                    <p className="text-gray-500 text-xs mt-1">
                      {selectedPackageRules?.news_trading_allowed ? 'Allowed for high-impact events.' : 'Restricted around major news events.'}
                    </p>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-red-400/10 text-red-400"><Info className="w-4 h-4" /></div>
                      <div>
                    <div className="text-white font-bold text-sm uppercase tracking-tight">Daily Drawdown Limit</div>
                    <p className="text-gray-500 text-xs mt-1">{selectedPackageRules?.daily_drawdown_percent ?? '--'}% maximum daily loss.</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-red-400/10 text-red-400"><Info className="w-4 h-4" /></div>
                      <div>
                    <div className="text-white font-bold text-sm uppercase tracking-tight">Overall Drawdown Limit</div>
                    <p className="text-gray-500 text-xs mt-1">{selectedPackageRules?.overall_drawdown_percent ?? '--'}% maximum account loss.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 💳 Right Column: Sticky Summary Panel */}
        <div className="w-full lg:w-[35%] sticky top-24">
          <div className="bg-[#1e1e1e] rounded-[2.5rem] p-8 border border-[#2A2A2A] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            {/* Header Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#bd4dd6] to-transparent"></div>

            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8 text-center">Checkout Summary</h3>
            
            {selectedPackage ? (
              <div className="space-y-8">
                {/* Visual Representation of Selected Bag */}
                <div className="bg-[#161616] rounded-3xl p-6 border border-[#2A2A2A] text-center">
                   <div className="text-4xl font-black text-white tracking-tighter mb-1">${(selectedPackage.balance / 1000).toFixed(0)}K</div>
                   <div className="text-[10px] font-heavy text-[#bd4dd6] uppercase tracking-[0.2em]">{MODEL_META[getPackageModel(selectedPackage)].label}</div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Access Fee</span>
                      <span className="text-white font-mono">${selectedPackage.price}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Platform</span>
                      <span className="text-white font-mono">{selectedPlatform}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Liquidity</span>
                      <span className="text-white font-mono">{selectedServer}</span>
                   </div>

                   {/* Offers */}
                   {appliedCoupon && (
                     <div className="pt-4 mt-4 border-t border-[#2A2A2A] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-black text-green-400 uppercase tracking-widest">
                            PROMO: {appliedCoupon.code}
                           </div>
                        </div>
                        <span className="text-green-400 font-mono font-bold">-{appliedCoupon.discount}%</span>
                     </div>
                   )}
                </div>

                {/* Final Total */}
                <div className="pt-6 mt-6 border-t border-[#2A2A2A]">
                   <div className="flex justify-between items-end mb-8">
                      <span className="text-gray-400 font-black text-lg uppercase tracking-tighter">Grand Total</span>
                      <div className="text-right">
                         <div className="text-white font-black text-4xl tracking-tighter leading-none mb-1">
                            ${calculateFinalPrice(selectedPackage.price).toFixed(0)}
                         </div>
                         <div className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">All taxes included</div>
                      </div>
                   </div>

                   <button
                    onClick={handlePurchase}
                    className="w-full group relative py-5 px-6 bg-gradient-to-r from-[#bd4dd6] to-[#9c3fc0] hover:scale-[1.02] active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-[0_10px_30px_rgba(189,77,214,0.3)] flex items-center justify-center gap-3"
                  >
                    <Lock className="w-5 h-5 transition-transform group-hover:rotate-12" />
                    <span className="uppercase tracking-widest text-sm">INITIATE DEPLOYMENT</span>
                  </button>

                  <div className="mt-4 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      <Shield className="w-3 h-3 text-green-500" /> Secure 256-Bit Verification Active
                    </p>
                  </div>
                </div>

                {/* Proof Ticker inside Sidebar (Redesigned) */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mt-8">
                   <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 blur-[2px] animate-pulse"></div>
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Live Approvals</span>
                   </div>
                   <div className="text-xs text-gray-500 leading-relaxed italic">
                      "Just got my second payout in 2 weeks. The slippage is almost non-existent on the Exness server." - <span className="text-white">Dmitri V.</span>
                   </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 px-6 border-2 border-dashed border-[#2A2A2A] rounded-3xl">
                <CreditCard className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
                <h4 className="text-gray-400 font-black uppercase tracking-widest text-xs">Awaiting Selection</h4>
                <p className="text-gray-600 text-[10px] mt-2 uppercase tracking-wider font-bold">Choose your capital and model to see the full breakdown.</p>
              </div>
            )}
          </div>

          {/* Refund Notice Banner */}
          <div className="mt-6 p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-emerald-400" />
             </div>
             <div>
                <div className="text-emerald-400 font-black text-sm uppercase tracking-tight">Zero-Risk Protocol</div>
                <p className="text-gray-500 text-[10px] leading-tight font-bold uppercase tracking-wider mt-1">Get 100% of your fee back automatically after 5 successful withdrawals.</p>
             </div>
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl bg-gray-900 sm:rounded-2xl rounded-t-2xl border border-white/10 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            {/* Header */}
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Trading Rules</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Live rules pulled from your active package configurations
                </p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-gray-400 hover:text-white flex-shrink-0 ml-3"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-5">
              {selectedModelPackages.length === 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
                  No package rules found for this model.
                </div>
              )}

              {selectedModelPackages.map((pkg) => {
                const rules = getRulesForPackage(pkg);
                return (
                  <div key={pkg.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">{pkg.name}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${MODEL_META[getPackageModel(pkg)].accent}`}>
                        {MODEL_META[getPackageModel(pkg)].label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">Phase 1 Target</div>
                        <div className="text-white font-semibold mt-1">{rules?.profit_target_phase1 ?? '--'}%</div>
                      </div>
                      {getPackageModel(pkg) === '2_step' && (
                        <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                          <div className="text-gray-500">Phase 2 Target</div>
                          <div className="text-white font-semibold mt-1">{rules?.profit_target_phase2 ?? '--'}%</div>
                        </div>
                      )}
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">Daily Drawdown</div>
                        <div className="text-red-300 font-semibold mt-1">{rules?.daily_drawdown_percent ?? '--'}%</div>
                      </div>
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">Overall Drawdown</div>
                        <div className="text-orange-300 font-semibold mt-1">{rules?.overall_drawdown_percent ?? '--'}%</div>
                      </div>
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">Minimum Trading Days</div>
                        <div className="text-white font-semibold mt-1">{rules?.minimum_trading_days ?? 0}</div>
                      </div>
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">Payout Split</div>
                        <div className="text-emerald-300 font-semibold mt-1">{rules?.payout_split_percent ?? 80}%</div>
                      </div>
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">News Trading</div>
                        <div className="text-white font-semibold mt-1">{rules?.news_trading_allowed ? 'Allowed' : 'Restricted'}</div>
                      </div>
                      <div className="rounded-lg bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-gray-500">Weekend Holding</div>
                        <div className="text-white font-semibold mt-1">{rules?.weekend_holding_allowed ? 'Allowed' : 'Restricted'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <h4 className="text-sm font-bold text-red-400 mb-3">🚫 Not Allowed</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> Automated bots / Expert Advisors (EAs)</span>
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> High-frequency trading (HFT)</span>
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> Trades under 60 seconds</span>
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> Martingale or grid strategies</span>
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> Arbitrage</span>
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> Hedging on the same pair</span>
                  <span className="flex items-center gap-2"><span className="text-red-400">✗</span> More than 3 consecutive trades in one direction only</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      {/* Ultra-Modern Payment Console */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-500">
          <div className="w-full sm:max-w-xl bg-[#161616] sm:rounded-[3rem] rounded-t-[3rem] border border-[#2A2A2A] shadow-[0_25px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[96vh] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-[#bd4dd6]/10 blur-[80px] -z-10"></div>

            <div className="flex justify-center pt-4 pb-2 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 relative z-10">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Deployment <span className="text-[#bd4dd6]">Console</span></h3>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Status: Ready for Injection</p>
                </div>
              </div>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedPaymentMethod(null); setSelectedPkrMethod(null); }}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-gray-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-8 py-8 space-y-8 custom-scrollbar relative z-10">
              
              {/* Checkout Progress Mini-Tracker */}
              <div className="flex items-center justify-between gap-2 px-1">
                 {['Method', 'Payment', 'Proof'].map((s, i) => (
                   <div key={s} className="flex-1 flex flex-col gap-2">
                       <div className={`h-1 rounded-full transition-all duration-500 ${
                         (i === 0 && !selectedPaymentMethod) || (i === 1 && selectedPaymentMethod && !paymentScreenshot) || (i === 2 && paymentScreenshot)
                           ? 'bg-[#bd4dd6] shadow-[0_0_10px_#bd4dd6]' 
                           : (i < 1 && selectedPaymentMethod) || (i < 2 && paymentScreenshot) ? 'bg-green-500' : 'bg-[#2A2A2A]'
                       }`}></div>
                       <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center">{s}</span>
                   </div>
                 ))}
              </div>

              {/* Step Title Indicator */}
              <div className="text-center">
                 {!selectedPaymentMethod && <h4 className="text-xs font-black text-[#bd4dd6] uppercase tracking-[0.3em]">Phase 01: Select Gateway</h4>}
                 {selectedPaymentMethod && !paymentScreenshot && <h4 className="text-xs font-black text-[#bd4dd6] uppercase tracking-[0.3em]">Phase 02: Remittance</h4>}
                 {paymentScreenshot && <h4 className="text-xs font-black text-green-400 uppercase tracking-[0.3em]">Phase 03: Validation</h4>}
              </div>

              {/* Content Switching */}
              {!selectedPaymentMethod ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedPaymentMethod('usdt')}
                    className="w-full group p-6 rounded-[2rem] bg-[#1a1a1a] border-2 border-[#2A2A2A] hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CreditCard className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-black text-lg uppercase tracking-tight">USDT (TRC20)</p>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Global Crypto Standard</p>
                    </div>
                    <div className="text-right">
                       <p className="text-white font-mono font-bold">${calculateFinalPrice(selectedPackage.price).toFixed(0)}</p>
                       <p className="text-green-400 text-[8px] font-black tracking-widest uppercase">Instant</p>
                    </div>
                  </button>

                  {!isIndianUser && (
                  <button
                    onClick={() => setSelectedPaymentMethod('pkr')}
                    className="w-full group p-6 rounded-[2rem] bg-[#1a1a1a] border-2 border-[#2A2A2A] hover:border-[#bd4dd6]/50 hover:bg-[#bd4dd6]/5 transition-all text-left flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-[#bd4dd6]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CreditCard className="w-8 h-8 text-[#bd4dd6]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-black text-lg uppercase tracking-tight">Local PKR</p>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">JazzCash / Nayapay / Bank</p>
                    </div>
                    <div className="text-right">
                       <p className="text-white font-mono font-bold">Rs.{(calculateFinalPrice(selectedPackage.price) * usdToPkr).toLocaleString()}</p>
                       <p className="text-[#bd4dd6] text-[8px] font-black tracking-widest uppercase">EASY SETUP</p>
                    </div>
                  </button>
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Selected Method Details Wrap */}
                  <div className="bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-[#2A2A2A] relative">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPaymentMethod === 'usdt' ? 'bg-green-500/10 text-green-400' : 'bg-[#bd4dd6]/10 text-[#bd4dd6]'}`}>
                              <CreditCard className="w-5 h-5" />
                           </div>
                           <div>
                              <div className="text-white font-black text-sm uppercase tracking-tight">{selectedPaymentMethod === 'usdt' ? 'Tether TRC20' : (selectedPkrMethod?.name || 'Local Method')}</div>
                              <button onClick={() => { setSelectedPaymentMethod(null); setSelectedPkrMethod(null); }} className="text-[9px] text-[#bd4dd6] font-black uppercase tracking-widest hover:underline">Switch Gateway</button>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Required Amount</div>
                           <div className="text-white font-mono font-bold">
                              {selectedPaymentMethod === 'usdt' ? `$${calculateFinalPrice(selectedPackage.price).toFixed(2)}` : `Rs.${(calculateFinalPrice(selectedPackage.price) * usdToPkr).toLocaleString()}`}
                           </div>
                        </div>
                     </div>

                     {/* Details Rendering */}
                     {selectedPaymentMethod === 'usdt' ? (
                       <div className="space-y-4">
                         <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2 text-center">WALLET ADDRESS</p>
                            <div className="flex items-center gap-4 bg-[#161616] p-4 rounded-xl border border-[#2A2A2A] group">
                               <code className="flex-1 text-xs text-[#bd4dd6] font-mono break-all text-center">TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5</code>
                               <button onClick={() => copyToClipboard('TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5', 'usdt')} className="p-3 rounded-lg bg-[#bd4dd6] text-white hover:scale-110 active:scale-95 transition-all">
                                  {copiedAccount === 'usdt' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                               </button>
                            </div>
                         </div>
                       </div>
                     ) : !selectedPkrMethod ? (
                       <div className="space-y-3">
                          {paymentMethods.map(m => (
                            <button key={m.id} onClick={() => setSelectedPkrMethod(m)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-black/20 hover:bg-black/40 border border-[#2A2A2A] transition-all group">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#bd4dd6]/10 text-[#bd4dd6] flex items-center justify-center uppercase font-black text-xs">{m.name.slice(0,2)}</div>
                                  <div className="text-left">
                                     <div className="text-white font-bold text-sm uppercase tracking-tight">{m.name}</div>
                                     <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{m.account_name}</div>
                                  </div>
                               </div>
                               <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                            </button>
                          ))}
                       </div>
                     ) : (
                       <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">ACCOUNT TITLE</p>
                                <p className="text-white font-black text-sm uppercase tracking-tight">{selectedPkrMethod.account_name}</p>
                             </div>
                             <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">NETWORK</p>
                                <p className="text-[#bd4dd6] font-black text-sm uppercase tracking-tight">{selectedPkrMethod.name}</p>
                             </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2 text-center">ACCOUNT NUMBER</p>
                            <div className="flex items-center gap-4 bg-[#161616] p-4 rounded-xl border border-[#2A2A2A]">
                               <code className="flex-1 text-lg text-white font-black tracking-widest text-center">{selectedPkrMethod.account_number}</code>
                               <button onClick={() => copyToClipboard(selectedPkrMethod.account_number, selectedPkrMethod.id)} className="p-3 rounded-lg bg-[#bd4dd6] text-white hover:scale-110 active:scale-95 transition-all">
                                  {copiedAccount === selectedPkrMethod.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                               </button>
                            </div>
                          </div>
                       </div>
                     )}
                  </div>

                  {/* Proof Submission AI Area */}
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    <div className="relative group">
                       <input type="file" id="screenshot" accept="image/*" className="hidden" onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)} required />
                       <label htmlFor="screenshot" className={`flex flex-col items-center justify-center w-full py-10 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer ${
                         paymentScreenshot 
                           ? 'bg-green-500/5 border-green-500/30' 
                           : 'bg-white/5 border-[#2A2A2A] hover:border-[#bd4dd6]/50 hover:bg-[#bd4dd6]/5'
                       }`}>
                          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${paymentScreenshot ? 'bg-green-500 text-white' : 'bg-[#1e1e1e] text-gray-500'}`}>
                             {paymentScreenshot ? <Check className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                          </div>
                          <span className="text-white font-black text-sm uppercase tracking-widest">{paymentScreenshot ? paymentScreenshot.name : 'Inject Proof Screenshot'}</span>
                          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-2 italic">Vision AI Processing Enabled</span>
                       </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !paymentScreenshot}
                      className="w-full relative py-5 bg-gradient-to-r from-[#bd4dd6] to-[#9c3fc0] hover:scale-[1.02] active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-[0_15px_40px_rgba(189,77,214,0.4)] disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3">
                         <Zap className="w-5 h-5 transition-transform group-hover:animate-pulse" />
                         <span className="uppercase tracking-[0.2em] text-sm">{submitting ? 'ENGAGING AI...' : (selectedPkrMethod || selectedPaymentMethod === 'usdt') ? 'VALIDATE & DEPLOY' : 'SELECT METHOD ABOVE'}</span>
                      </div>
                    </button>
                    <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                       <Lock className="w-3 h-3 text-[#bd4dd6]" /> AES-256 Cloud Encryption Active
                    </p>
                  </form>

                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Sticky Mobile CTA (Glassmorphism) */}
      {selectedPackage && (
        <div className="fixed bottom-0 left-0 right-0 z-[55] md:hidden">
           <div className="mx-4 mb-6 p-4 bg-[#1e1e1e]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
              <div>
              <div className="text-[10px] text-[#bd4dd6] font-black uppercase tracking-widest">{MODEL_META[getPackageModel(selectedPackage)].label}</div>
                 <div className="text-white font-black text-lg tracking-tight">${(selectedPackage.balance / 1000).toFixed(0)}K Balance</div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-[#bd4dd6] to-[#9c3fc0] text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-[0_10px_20px_rgba(189,77,214,0.3)] active:scale-95 transition-all"
              >
                PROCEED
              </button>
           </div>
        </div>
      )}

    </div>
  );
}