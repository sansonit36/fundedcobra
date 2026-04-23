import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, AlertTriangle, HelpCircle, ChevronRight, Tag, Copy, Upload, Info, CreditCard, Zap, Sparkles, Clock, Lock, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AccountPackage } from '../types';
import { createAccountPurchase, submitPaymentProof, getAccountPackages } from '../lib/database';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/emailService';
import { trackPurchaseSubmission } from '../utils/FacebookTracking';
import confetti from 'canvas-confetti';

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
  const [accountType, setAccountType] = useState<'Special' | 'Premium'>('Special');
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
        const dbPackages = await getAccountPackages();
        setPackages(dbPackages as any);
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

  // Auto-apply Growing Sale offer for Premium Instant accounts ONLY if no coupon is already set
  // (handleBuyNow already sets the correct coupon synchronously — this is just a fallback)
  useEffect(() => {
    if (selectedPackage && !appliedCoupon) {
      const isPremium = !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name);
      if (isPremium) {
        setAppliedCoupon({ code: 'GROWING50', discount: 50 });
        setCouponCode('GROWING50');
      }
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
    const isStandard = !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(pkg.name);
    const discount = isStandard ? 50 : 10;
    if (isStandard) {
      setAppliedCoupon({ code: 'GROWING50', discount: 50 });
      setCouponCode('GROWING50');
    } else {
      setAppliedCoupon({ code: 'WELCOME10', discount: 10 });
      setCouponCode('WELCOME10');
    }
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
    if (discountExpired || timeRemaining > 0) return;
    
    // Determine discount based on account type
    const isStandardAccount = selectedPackage && !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name);
    const discountCode = isStandardAccount ? 'GROWING50' : 'WELCOME10';
    const discountPercent = isStandardAccount ? 50 : 10;
    
    const couponData = { code: discountCode, discount: discountPercent };
    
    setAppliedCoupon(couponData);
    setCouponCode(discountCode);
    
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

      {/* AI Verification Modal */}
      {aiVerifying && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full">
            <div className="bg-[#1e1e1e] rounded-2xl p-8 border-2 border-[#bd4dd6]/30 shadow-2xl">
              {/* Animated Robot/AI Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center animate-pulse">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  {/* Scanning rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary-400 animate-ping opacity-75"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-center mb-2">
                <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                  AI Verification in Progress
                </span>
              </h3>

              {/* Subtitle */}
              <p className="text-center text-gray-400 text-sm mb-8">
                Our advanced AI is analyzing your screenshot...
              </p>

              {/* Progress Steps */}
              <div className="space-y-4 mb-6">
                {/* Step 1: Uploading */}
                <div className={`flex items-center space-x-3 transition-all duration-500 ${
                  verificationStep >= 0 ? 'opacity-100' : 'opacity-30'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    verificationStep > 0
                      ? 'bg-green-500 scale-100'
                      : verificationStep === 0
                      ? 'bg-[#bd4dd6] animate-pulse scale-110'
                      : 'bg-white/10'
                  }`}>
                    {verificationStep > 0 ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Upload className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Uploading screenshot...</p>
                    <p className="text-xs text-gray-400">Securing your image</p>
                  </div>
                </div>

                {/* Step 2: AI Analysis */}
                <div className={`flex items-center space-x-3 transition-all duration-500 ${
                  verificationStep >= 1 ? 'opacity-100' : 'opacity-30'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    verificationStep > 1
                      ? 'bg-green-500 scale-100'
                      : verificationStep === 1
                      ? 'bg-[#bd4dd6] animate-pulse scale-110'
                      : 'bg-white/10'
                  }`}>
                    {verificationStep > 1 ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">AI analyzing image...</p>
                    <p className="text-xs text-gray-400">Checking authenticity & payment details</p>
                  </div>
                </div>

                {/* Step 3: Pattern Matching */}
                <div className={`flex items-center space-x-3 transition-all duration-500 ${
                  verificationStep >= 2 ? 'opacity-100' : 'opacity-30'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    verificationStep > 2
                      ? 'bg-green-500 scale-100'
                      : verificationStep === 2
                      ? 'bg-[#bd4dd6] animate-pulse scale-110'
                      : 'bg-white/10'
                  }`}>
                    {verificationStep > 2 ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Shield className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Verifying transaction...</p>
                    <p className="text-xs text-gray-400">Cross-checking payment method</p>
                  </div>
                </div>

                {/* Step 4: Final Check */}
                <div className={`flex items-center space-x-3 transition-all duration-500 ${
                  verificationStep >= 3 ? 'opacity-100' : 'opacity-30'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    verificationStep === 3
                      ? 'bg-[#bd4dd6] animate-pulse scale-110'
                      : 'bg-white/10'
                  }`}>
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Finalizing verification...</p>
                    <p className="text-xs text-gray-400">Almost done!</p>
                  </div>
                </div>
              </div>

              {/* Fun Messages */}
              <div className="bg-[#bd4dd6]/10 border border-[#bd4dd6]/30 rounded-xl p-4 text-center">
                <p className="text-[#bd4dd6] text-sm font-medium">
                  {verificationStep === 0 && "📤 Hang tight! We're uploading your screenshot..."}
                  {verificationStep === 1 && "🤖 Our AI is examining every pixel of your screenshot..."}
                  {verificationStep === 2 && "🔍 Smart verification in action! Checking transaction details..."}
                  {verificationStep === 3 && "✨ Final touches! Your submission is almost verified..."}
                </p>
              </div>

              {/* Loading Bar */}
              <div className="mt-6">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(verificationStep + 1) * 25}%` }}
                  ></div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                  {Math.min((verificationStep + 1) * 25, 100)}% Complete
                </p>
              </div>

              {/* Security Notice */}
              <div className="mt-6 flex items-start space-x-2 text-xs text-gray-400">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#bd4dd6]" />
                <p>
                  We use <span className="text-[#bd4dd6] font-semibold">GPT-4 Vision AI</span> to ensure all payment screenshots are genuine. 
                  This protects our community from fraud.
                </p>
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
                {selectedPackage && !['$1,250 Account','$3,500 Account','$5,000 Account'].includes(selectedPackage.name) ? '50%' : '10%'}
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

      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        {/* Main Content */}
        <div className="w-full lg:w-2/3 space-y-6">

          {/* 🟢 Live Payout Ticker */}
          <div className="flex items-center space-x-3 py-2.5 px-4 rounded-xl bg-green-500/10 border border-green-500/20 overflow-hidden">
            <span className="flex-shrink-0 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Live</span>
            </span>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-gray-300 transition-all duration-500">
                💸 <span className="text-white font-semibold">{payoutTicker[tickerIndex].trader}</span> just withdrew{' '}
                <span className="text-green-400 font-bold">{payoutTicker[tickerIndex].amount}</span> from their{' '}
                <span className="text-[#bd4dd6]">{payoutTicker[tickerIndex].pkg}</span>{' '}·{' '}
                <span className="text-gray-500 text-xs">{payoutTicker[tickerIndex].time}</span>
              </p>
            </div>
          </div>

          {/* 💚 Zero-Risk Fee Refund Banner */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-500/15 to-green-500/5 border border-emerald-500/30 px-5 py-4 flex items-center space-x-4">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-bold text-sm">100% Risk-Free — Your fee is fully refundable</p>
              <p className="text-gray-400 text-xs mt-0.5">Complete 5 successful payouts and we refund your entire account fee. You literally have nothing to lose.</p>
            </div>
          </div>

          {/* Main Account Configuration Builder */}
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] overflow-hidden">
            <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-br from-black/20 to-transparent">
               <h2 className="text-2xl font-bold text-white mb-2">Configure Your Account</h2>
               <p className="text-gray-400">Follow the steps below to customize your funding parameters.</p>
            </div>

            <div className="p-5 md:p-6 space-y-8">
              {/* Step 1: Platform Selection */}
              <div>
                <h3 className="text-sm font-bold text-[#a0a0a0] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#bd4dd6] text-white flex items-center justify-center text-xs">1</div> 
                  Trading Platform
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center justify-between p-4 rounded-xl border-2 border-[#bd4dd6] bg-[#bd4dd6]/10 text-left transition-all relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#bd4dd6]"></div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded bg-[#161616] flex items-center justify-center">
                        <span className="text-white font-bold text-lg">5</span>
                      </div>
                      <div>
                        <div className="text-white font-bold text-lg">MetaTrader 5</div>
                        <div className="text-xs text-[#bd4dd6]">Industry Standard</div>
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-[#bd4dd6] relative z-10" />
                  </button>
                  <button disabled className="flex items-center justify-between p-4 rounded-xl border-2 border-[#2A2A2A] bg-black/40 text-left opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#161616] flex items-center justify-center grayscale">
                        <span className="text-white font-bold text-lg">4</span>
                      </div>
                      <div>
                        <div className="text-gray-400 font-bold text-lg">MetaTrader 4</div>
                        <div className="text-xs text-gray-500">Currently Unavailable</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Server Selection */}
              <div>
                <h3 className="text-sm font-bold text-[#a0a0a0] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#bd4dd6] text-white flex items-center justify-center text-xs">2</div> 
                  Broker Server
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSelectedServer('Exness')}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                      selectedServer === 'Exness' 
                        ? 'border-[#bd4dd6] bg-[#bd4dd6]/10 shadow-[0_0_15px_rgba(189,77,214,0.15)]' 
                        : 'border-[#2A2A2A] bg-[#161616] hover:border-[#404040]'
                    }`}
                  >
                    {selectedServer === 'Exness' && <div className="absolute top-0 left-0 w-1 h-full bg-[#bd4dd6]"></div>}
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded bg-white flex items-center justify-center p-1">
                        <span className="text-black font-black text-xl italic tracking-tighter">ex</span>
                      </div>
                      <div>
                        <div className="text-white font-bold text-lg">Exness</div>
                        <div className="text-xs text-green-400">Optimal Spreads</div>
                      </div>
                    </div>
                    {selectedServer === 'Exness' && <Check className="w-5 h-5 text-[#bd4dd6] relative z-10" />}
                  </button>
                  <button disabled className="flex items-center justify-between p-4 rounded-xl border-2 border-[#2A2A2A] bg-black/40 text-left opacity-60 cursor-not-allowed relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-black flex items-center justify-center overflow-hidden border border-[#2A2A2A]">
                         <span className="text-[#bd4dd6] font-black absolute">FC</span>
                      </div>
                      <div>
                        <div className="text-gray-400 font-bold text-lg flex items-center gap-2">FundedCobra <Lock className="w-3 h-3 text-red-400" /></div>
                        <div className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded inline-block mt-0.5">Servers Full</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 3: Account Type */}
              <div>
                <h3 className="text-sm font-bold text-[#a0a0a0] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#bd4dd6] text-white flex items-center justify-center text-xs">3</div> 
                  Account Category
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setAccountType('Special');
                      setSelectedPackage(null);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                      accountType === 'Special' 
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.15)]' 
                        : 'border-[#2A2A2A] bg-[#161616] hover:border-[#404040]'
                    }`}
                  >
                    {accountType === 'Special' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className={`w-5 h-5 ${accountType === 'Special' ? 'text-yellow-400' : 'text-gray-500'}`} />
                      <span className={`font-bold text-lg ${accountType === 'Special' ? 'text-white' : 'text-gray-400'}`}>Special Instant</span>
                    </div>
                    <p className={`text-xs ${accountType === 'Special' ? 'text-yellow-400/80' : 'text-gray-500'}`}>Daily Payouts • 5% Withdrawal Target</p>
                  </button>
                  <button 
                    onClick={() => {
                      setAccountType('Premium');
                      setSelectedPackage(null);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                      accountType === 'Premium' 
                        ? 'border-[#bd4dd6] bg-[#bd4dd6]/10 shadow-[0_0_15px_rgba(189,77,214,0.15)]' 
                        : 'border-[#2A2A2A] bg-[#161616] hover:border-[#404040]'
                    }`}
                  >
                    {accountType === 'Premium' && <div className="absolute top-0 left-0 w-1 h-full bg-[#bd4dd6]"></div>}
                    <div className="flex items-center gap-2 mb-2">
                       <Star className={`w-5 h-5 ${accountType === 'Premium' ? 'text-[#bd4dd6]' : 'text-gray-500'}`} />
                       <span className={`font-bold text-lg ${accountType === 'Premium' ? 'text-white' : 'text-gray-400'}`}>Premium Instant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded uppercase font-mono shadow-sm">50% Off</div>
                      <p className={`text-xs ${accountType === 'Premium' ? 'text-[#bd4dd6]/80' : 'text-gray-500'}`}>Weekly Payouts • Scale Capital</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 4: Account Size Selection */}
              <div>
                <h3 className="text-sm font-bold text-[#a0a0a0] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#bd4dd6] text-white flex items-center justify-center text-xs">4</div> 
                  Account Size
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {packages.filter(pkg => 
                    accountType === 'Special' 
                      ? ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(pkg.name)
                      : !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(pkg.name)
                  ).map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center ${
                        selectedPackage?.id === pkg.id
                          ? accountType === 'Special' ? 'border-yellow-500 bg-yellow-500/10' : 'border-[#bd4dd6] bg-[#bd4dd6]/10'
                          : 'border-[#2A2A2A] bg-[#161616] hover:bg-white/5 hover:border-[#404040]'
                      }`}
                    >
                      {accountType === 'Premium' && (
                         <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-green-500 px-2 py-0.5 rounded shadow whitespace-nowrap">
                           SAVE 50%
                         </div>
                      )}
                      {selectedPackage?.id === pkg.id && (
                        <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10 ${accountType === 'Special' ? 'bg-yellow-500' : 'bg-[#bd4dd6]'}`}>
                          <Check className={`w-3 h-3 ${accountType === 'Special' ? 'text-black' : 'text-white'}`} />
                        </div>
                      )}
                      <div className={`font-bold text-lg md:text-xl mb-1 ${selectedPackage?.id === pkg.id ? 'text-white' : 'text-gray-300'}`}>
                        ${pkg.balance.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 flex flex-col items-center">
                        {accountType === 'Premium' ? (
                          <>
                            <span className="line-through text-gray-600">${pkg.price}</span>
                            <span className="text-green-400 font-bold text-sm mt-0.5">${(pkg.price * 0.5).toFixed(0)}</span>
                          </>
                        ) : (
                          <span className="text-yellow-400 font-bold text-sm">Fee: ${pkg.price}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Account Extra Info */}
          <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A] mt-6">

            {/* Profit Split Info Card */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Profit Split Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Initial Split</h4>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#bd4dd6]/20 text-[#bd4dd6]">
                      First 5 Payouts
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Trader</span>
                      <span className="text-white font-medium">50%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Company</span>
                      <span className="text-white font-medium">50%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Increased Split</h4>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                      After 5 Payouts
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Trader</span>
                      <span className="text-white font-medium">90%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Company</span>
                      <span className="text-white font-medium">10%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-[#bd4dd6]/10 border border-primary-500/20">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-[#bd4dd6] mt-0.5" />
                  <div>
                    <p className="text-[#bd4dd6] font-medium">Fee Refund Policy</p>
                    <p className="text-gray-300 mt-1">
                      Your initial fee is fully refundable after completing 5 successful payouts. Once achieved, you'll receive 90% of future profits.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Shield, text: "Instant Funding" },
                { icon: Check, text: "No Evaluation Phase" },
                { icon: AlertTriangle, text: "1:100 Leverage" },
                { icon: HelpCircle, text: "24/7 Support" }
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                  <feature.icon className="w-5 h-5 text-[#bd4dd6]" />
                  <span className="text-gray-200">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trading Rules Summary */}
          <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Key Trading Rules</h3>
              <button
                onClick={() => setShowRules(!showRules)}
                className="text-sm text-[#bd4dd6] hover:text-[#bd4dd6] transition-colors"
              >
                View full rules →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Special Accounts */}
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <h4 className="text-base font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Special Instant Accounts
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" /><span>Reach 5% profit → request withdrawal. No profit target to unlock first.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" /><span>Daily & weekly payouts available</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" /><span>No minimum trading days</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /><span>Max 8% daily loss / 12% total loss</span></li>
                </ul>
              </div>
              {/* Premium Accounts */}
              <div className="p-4 rounded-xl bg-[#bd4dd6]/5 border border-primary-500/20">
                <h4 className="text-base font-semibold text-[#bd4dd6] mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Premium Instant Accounts
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#bd4dd6] mt-0.5 flex-shrink-0" /><span>Reach 5% profit → request weekly payout</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#bd4dd6] mt-0.5 flex-shrink-0" /><span>Trade at least 4 days per week</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 red-400 mt-0.5 flex-shrink-0" /><span>Max 8% daily loss / 12% total loss</span></li>
                </ul>
              </div>
              {/* Universal Rules */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" /> All Accounts
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /><span>MT5 platform · 1:100 leverage</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /><span>News trading & weekend holds allowed</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /><span>No EAs, HFT, martingale or grid trading</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /><span>Min. trade duration: 60 seconds</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="w-full lg:w-1/3 sticky top-24">
          <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A]">
            <h3 className="text-xl font-bold text-white mb-6">Purchase Summary</h3>
            {selectedPackage ? (
              <>
                {/* Discount Banner - Only for Special Accounts */}
                {showDiscountBanner && !discountExpired && timeRemaining === 0 && selectedPackage && 
                  ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name) && (
                  <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-[#bd4dd6]/30 p-6">
                    {/* Background gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-purple-600/10 to-primary-600/10 opacity-50"></div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-[#bd4dd6]/20 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-[#bd4dd6]" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white">Welcome Offer</h4>
                            <p className="text-xs text-gray-400">Limited time exclusive discount</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-400/30">
                          <span className="text-2xl font-bold text-white">10%</span>
                          <span className="text-sm text-gray-300 ml-1">OFF</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-300 text-sm mb-4">
                        Get 10% off your first instant account purchase. Offer valid for 15 minutes after activation.
                      </p>

                      {/* Apply Button */}
                      <button
                        onClick={handleApplyDiscount}
                        className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/30"
                      >
                        <Tag className="w-5 h-5" />
                        <span>Apply WELCOME10 Code</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Discount Display - For Premium Instant Accounts (No Timer) */}
                {appliedCoupon && selectedPackage && 
                  !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name) && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-green-400 font-semibold">Ramadan Kareem Offer - 50% OFF</span>
                        <p className="text-xs text-gray-400 mt-0.5">Auto-applied to all premium instant accounts</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timer Display - Only for Special Accounts with WELCOME10 */}
                {timeRemaining > 0 && selectedPackage &&
                  ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name) && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-green-400 font-semibold">10% Discount Active</span>
                      </div>
                      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-yellow-500/30">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-mono font-bold">{formatTime(timeRemaining)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expired Notice */}
                {discountExpired && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-sm text-center">Discount expired. Regular pricing applies.</p>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-gray-400">Account Size</span>
                    <span className="text-white font-medium">
                      ${selectedPackage.balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-gray-400">One-time Fee</span>
                    <span className="text-white font-medium">
                      ${selectedPackage.price}
                    </span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                      <span className="text-green-400 flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        {appliedCoupon.code}
                      </span>
                      <span className="text-green-400 font-medium">
                        -{appliedCoupon.discount}%
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium text-white">Total</span>
                    <div className="text-right">
                      {appliedCoupon && (
                        <span className="text-sm text-gray-400 line-through mr-2">
                          ${selectedPackage.price}
                        </span>
                      )}
                      <span className="font-bold text-white">
                        ${calculateFinalPrice(selectedPackage.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handlePurchase}
                  className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-700 hover:to-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Secure Purchase</span>
                </button>

                {/* Trust Badges */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-white/5 border border-[#2A2A2A]">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400 text-xs text-center leading-tight">256-bit SSL</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-white/5 border border-[#2A2A2A]">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400 text-xs text-center leading-tight">Instant Access</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-white/5 border border-[#2A2A2A]">
                    <Star className="w-4 h-4 text-[#bd4dd6]" />
                    <span className="text-gray-400 text-xs text-center leading-tight">Fee Refund</span>
                  </div>
                </div>

                {/* Social proof */}
                <div className="mt-3 flex items-center justify-center space-x-1.5">
                  <div className="flex -space-x-1.5">
                    {['bg-[#bd4dd6]', 'bg-[#bd4dd6]', 'bg-purple-500', 'bg-pink-500'].map((color, i) => (
                      <div key={i} className={`w-5 h-5 rounded-full ${color} border border-gray-900 flex items-center justify-center`}>
                        <span className="text-white text-[7px] font-bold">T</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs">500+ funded traders this month</p>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-8">
                Select an account package to continue
              </div>
            )}
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
                <p className="text-xs text-gray-400 mt-0.5">Read before purchasing — these apply to your funded account</p>
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

              {/* Drawdown — most important, first */}
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                  ⚠️ Loss Limits — Both Account Types
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold flex-shrink-0">•</span>
                    <span><strong className="text-white">Daily limit: 8% trailing.</strong> If your account balance ever hits 8% below the day's peak equity, trading stops for that day. Example: $10,000 account reaches $11,000 → daily limit is now $10,120 (8% below $11,000).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold flex-shrink-0">•</span>
                    <span><strong className="text-white">Overall limit: 12%.</strong> Your account can never fall more than 12% below the starting balance. On a $10,000 account that's $8,800 — if you hit this, the account is closed.</span>
                  </li>
                </ul>
              </div>

              {/* Special vs Premium side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                  <h4 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Special Instant Accounts
                    <span className="text-xs text-gray-500 font-normal">($1.25K – $5K)</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2"><span className="text-yellow-400 flex-shrink-0">•</span><span><strong className="text-white">Withdrawal target:</strong> Make 5% profit → you can withdraw anytime</span></li>
                    <li className="flex items-start gap-2"><span className="text-yellow-400 flex-shrink-0">•</span><span><strong className="text-white">Payout schedule:</strong> Daily or weekly — your choice</span></li>
                    <li className="flex items-start gap-2"><span className="text-yellow-400 flex-shrink-0">•</span><span><strong className="text-white">Trading days:</strong> No minimum — trade 1 day or 5</span></li>
                    <li className="flex items-start gap-2"><span className="text-yellow-400 flex-shrink-0">•</span><span><strong className="text-white">Min. withdrawal:</strong> $50</span></li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#bd4dd6]/5 border border-primary-500/20">
                  <h4 className="text-sm font-bold text-[#bd4dd6] mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Premium Instant Accounts
                    <span className="text-xs text-gray-500 font-normal">($7.5K – $200K)</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2"><span className="text-[#bd4dd6] flex-shrink-0">•</span><span><strong className="text-white">Withdrawal target:</strong> Make 5% profit → request a weekly payout</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#bd4dd6] flex-shrink-0">•</span><span><strong className="text-white">Payout schedule:</strong> Weekly only</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#bd4dd6] flex-shrink-0">•</span><span><strong className="text-white">Trading days:</strong> Must trade at least 4 days per week</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#bd4dd6] flex-shrink-0">•</span><span><strong className="text-white">Min. withdrawal:</strong> $50</span></li>
                  </ul>
                </div>
              </div>

              {/* Platform conditions */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Platform & Conditions</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-300">
                  <span>📱 <strong className="text-white">Platform:</strong> MetaTrader 5 (MT5)</span>
                  <span>⚡ <strong className="text-white">Leverage:</strong> 1:100</span>
                  <span>📈 <strong className="text-white">Spreads:</strong> From 0.2 pips</span>
                  <span>🕐 <strong className="text-white">Hours:</strong> 24/5</span>
                  <span>✅ <strong className="text-white">News trading:</strong> Allowed</span>
                  <span>✅ <strong className="text-white">Weekend holds:</strong> Allowed</span>
                </div>
              </div>

              {/* Prohibited */}
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
      {/* Payment Modal — bottom sheet on mobile, centered modal on desktop */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          {/* Sheet itself */}
          <div className="w-full sm:max-w-lg bg-gray-900 sm:rounded-2xl rounded-t-2xl border border-white/10 flex flex-col max-h-[92vh] sm:max-h-[90vh]">

            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Complete Payment</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="text-white font-semibold">${selectedPackage.balance.toLocaleString()}</span> account ·{' '}
                  {appliedCoupon && <span className="text-gray-500 line-through mr-1">${selectedPackage.price}</span>}
                  <span className="text-green-400 font-bold">${calculateFinalPrice(selectedPackage.price).toFixed(2)}</span>
                  {appliedCoupon && <span className="text-green-400"> ({appliedCoupon.discount}% off)</span>}
                </p>
              </div>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedPaymentMethod(null); setSelectedPkrMethod(null); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-gray-400 hover:text-white flex-shrink-0 ml-3"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">

              {/* PKR amount row — only when PKR is selected */}
              {selectedPaymentMethod === 'pkr' && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-[#bd4dd6]/10 border border-primary-500/20 text-sm">
                  <span className="text-gray-400">Amount in PKR</span>
                  <span className="text-white font-bold">PKR {(calculateFinalPrice(selectedPackage.price) * usdToPkr).toLocaleString()}</span>
                </div>
              )}

              {/* Payment Method Selection */}
              {!selectedPaymentMethod && (
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-3">Select payment method</p>
                  <div className="grid grid-cols-1 gap-3">
                    {/* USDT */}
                    <button
                      onClick={() => {
                        setSelectedPaymentMethod('usdt');
                        if (window.fbq) {
                          window.fbq('track', 'InitiateCheckout', {
                            content_ids: [selectedPackage.name],
                            content_name: selectedPackage.name,
                            num_items: 1,
                            value: calculateFinalPrice(selectedPackage.price),
                            currency: 'USD',
                          });
                        }
                      }}
                      className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:border-green-500/50 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">USDT (TRC20)</p>
                        <p className="text-xs text-gray-400">Cryptocurrency</p>
                      </div>
                      <span className="text-green-400 font-bold text-sm flex-shrink-0">
                        ${calculateFinalPrice(selectedPackage.price).toFixed(2)}
                      </span>
                    </button>

                    {/* PKR */}
                    {!isIndianUser && (
                      <button
                        onClick={() => {
                          setSelectedPaymentMethod('pkr');
                          if (window.fbq) {
                            window.fbq('track', 'InitiateCheckout', {
                              content_ids: [selectedPackage.name],
                              content_name: selectedPackage.name,
                              num_items: 1,
                              value: calculateFinalPrice(selectedPackage.price),
                              currency: 'USD',
                            });
                          }
                        }}
                        className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:border-primary-500/50 hover:bg-white/10 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#bd4dd6]/15 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-5 h-5 text-[#bd4dd6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">Pakistani Methods</p>
                          <p className="text-xs text-gray-400">JazzCash, Nayapay, Bank</p>
                        </div>
                        <span className="text-[#bd4dd6] font-bold text-sm flex-shrink-0">
                          PKR {(calculateFinalPrice(selectedPackage.price) * usdToPkr).toLocaleString()}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* USDT Payment Details */}
              {selectedPaymentMethod === 'usdt' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">USDT (TRC20) Details</p>
                    <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-[#bd4dd6] hover:text-[#bd4dd6]">
                      Change
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Network</span>
                      <span className="text-white font-medium">TRC20</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Wallet Address</p>
                      <div className="flex items-center space-x-2 bg-black/30 p-3 rounded-lg">
                        <code className="text-[#bd4dd6] text-xs flex-1 break-all leading-relaxed">
                          TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5
                        </code>
                        <button
                          onClick={() => copyToClipboard('TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5', 'usdt')}
                          className="flex-shrink-0 flex items-center px-2.5 py-1.5 rounded-lg bg-[#bd4dd6]/15 hover:bg-[#bd4dd6]/25 transition-colors"
                        >
                          {copiedAccount === 'usdt'
                            ? <Check className="w-4 h-4 text-green-400" />
                            : <><Copy className="w-3.5 h-3.5 text-[#bd4dd6] mr-1" /><span className="text-[#bd4dd6] text-xs">Copy</span></>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PKR Method List */}
              {selectedPaymentMethod === 'pkr' && !selectedPkrMethod && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">Choose PKR method</p>
                    <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-[#bd4dd6] hover:text-[#bd4dd6]">
                      Change
                    </button>
                  </div>
                  {paymentMethods.length === 0 ? (
                    <p className="text-gray-400 text-sm">No payment methods available. Please contact support.</p>
                  ) : (
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPkrMethod(method)}
                          className="w-full flex items-center space-x-3 p-3.5 rounded-xl bg-white/5 border-2 border-white/10 hover:border-primary-500/50 hover:bg-white/10 transition-all text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#bd4dd6]/15 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-[#bd4dd6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{method.name}</p>
                            <p className="text-xs text-gray-400 truncate">{method.account_name}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected PKR Method Details */}
              {selectedPaymentMethod === 'pkr' && selectedPkrMethod && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">{selectedPkrMethod.name}</p>
                    <button onClick={() => setSelectedPkrMethod(null)} className="text-xs text-[#bd4dd6] hover:text-[#bd4dd6]">
                      Change
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Account Name</p>
                      <p className="text-white font-medium text-sm">{selectedPkrMethod.account_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Account Number</p>
                      <div className="flex items-center space-x-2 bg-black/30 p-3 rounded-lg">
                        <code className="text-[#bd4dd6] font-medium text-sm flex-1">{selectedPkrMethod.account_number}</code>
                        <button
                          onClick={() => copyToClipboard(selectedPkrMethod.account_number, selectedPkrMethod.id)}
                          className="flex-shrink-0 flex items-center px-2.5 py-1.5 rounded-lg bg-[#bd4dd6]/15 hover:bg-[#bd4dd6]/25 transition-colors"
                        >
                          {copiedAccount === selectedPkrMethod.id
                            ? <Check className="w-4 h-4 text-green-400" />
                            : <><Copy className="w-3.5 h-3.5 text-[#bd4dd6] mr-1" /><span className="text-[#bd4dd6] text-xs">Copy</span></>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload + Submit */}
              {(selectedPaymentMethod === 'usdt' || selectedPkrMethod) && (
                <form onSubmit={handlePaymentSubmit} className="space-y-3">
                  {/* Trust badge */}
                  <div className="flex items-start space-x-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Shield className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Protected by <span className="text-white font-medium">GPT-4 Vision AI</span>. Upload a clear full-screenshot for fastest activation.
                    </p>
                  </div>

                  {/* File upload — large touch target */}
                  <div>
                    <input
                      type="file"
                      onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                      className="hidden"
                      id="screenshot"
                      accept="image/*"
                      required
                    />
                    <label
                      htmlFor="screenshot"
                      className="flex flex-col items-center justify-center w-full py-5 rounded-xl bg-white/5 border-2 border-dashed border-white/20 hover:border-primary-500/50 hover:bg-white/10 transition-all cursor-pointer text-center"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                      <span className="text-sm text-white font-medium">
                        {paymentScreenshot ? paymentScreenshot.name : 'Tap to upload screenshot'}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">PNG, JPG, WEBP accepted</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-700 hover:to-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-base"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{submitting ? 'AI Verifying...' : 'Submit & Activate Account'}</span>
                  </button>
                  <p className="text-center text-xs text-gray-500">🔒 Encrypted & secure · Activates after admin review</p>
                </form>
              )}

              {/* Instructions */}
              {selectedPaymentMethod && (
                <div className="text-xs text-gray-500 pb-2">
                  <p className="font-medium text-gray-400 mb-1">Before submitting:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {selectedPaymentMethod === 'usdt' ? (
                      <>
                        <li>Send the exact amount in USDT</li>
                        <li>Use TRC20 network only</li>
                        <li>Double-check the wallet address</li>
                      </>
                    ) : (
                      <>
                        <li>Send the exact amount in PKR</li>
                        <li>Use the correct account number</li>
                        <li>Include reference if required</li>
                      </>
                    )}
                    <li>Upload a clear, complete screenshot</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Sticky Mobile CTA */}
      {selectedPackage && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-900/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 flex items-center space-x-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{selectedPackage.name}</p>
            <p className="text-green-400 text-xs font-bold">
              ${calculateFinalPrice(selectedPackage.price).toFixed(2)}
              {appliedCoupon && (
                <span className="text-gray-500 line-through ml-1.5 text-xs">${selectedPackage.price}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex-shrink-0 flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-primary-500/30"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Buy Now</span>
          </button>
        </div>
      )}

    </div>
  );
}