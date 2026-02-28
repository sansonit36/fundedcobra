import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, AlertTriangle, HelpCircle, ChevronRight, Tag, Copy, Upload, Info, CreditCard, Zap, Sparkles, Clock } from 'lucide-react';
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
  const [showDiscountBanner, setShowDiscountBanner] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [discountExpired, setDiscountExpired] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [isIndianUser, setIsIndianUser] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);

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
        // Use a different IP geolocation service that supports CORS
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.country_code) {
          setUserCountry(data.country_code);
          setIsIndianUser(data.country_code === 'IN');
          console.log('User country detected:', data.country_code);
        }
      } catch (err) {
        console.error('Error detecting user country:', err);
        // Default to allowing all payment methods if detection fails
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

  // Auto-apply Ramadan Kareem Offer for premium instant accounts
  useEffect(() => {
    if (selectedPackage) {
      const isStandardAccount = !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name);
      
      if (isStandardAccount) {
        // Auto-apply RAMADAN50 for premium instant accounts (no timer needed)
        setAppliedCoupon({ code: 'RAMADAN50', discount: 50 });
        setCouponCode('RAMADAN50');
      } else {
        // For special accounts, check if there's an active WELCOME10 timer
        if (timeRemaining > 0) {
          // Restore WELCOME10 if timer is still active
          setAppliedCoupon({ code: 'WELCOME10', discount: 10 });
          setCouponCode('WELCOME10');
        } else {
          // No active discount for special accounts
          setAppliedCoupon(null);
          setCouponCode('');
        }
      }
    }
  }, [selectedPackage, timeRemaining]);

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
      
      if (verifyError) {
        console.error('❌ [AI ERROR] Verification failed');
        console.error('Error object:', verifyError);
        console.error('Error message:', verifyError.message);
        console.error('Error stack:', verifyError.stack);
        console.error('Full error details:', JSON.stringify(verifyError, null, 2));
        
        // Show detailed error to user
        const errorMessage = `AI Verification Error: ${verifyError.message || 'Unknown error'}. ` +
          `Please check console for details or contact support with timestamp: ${new Date().toISOString()}`;
        
        throw new Error(errorMessage);
      }

      // Check if verification result has expected structure
      if (!verificationResult || !verificationResult.verification) {
        console.error('❌ [AI ERROR] Invalid response structure');
        console.error('Received data:', verificationResult);
        throw new Error('AI returned invalid response format. Check edge function logs.');
      }

      console.log('🔍 [AI RESULT] Validation:', verificationResult.verification.isValid ? '✅ VALID' : '❌ INVALID');
      console.log('🎯 [AI RESULT] Confidence:', verificationResult.verification.confidence + '%');
      console.log('📝 [AI RESULT] Reason:', verificationResult.verification.reason);
      console.log('💰 [AI RESULT] Payment Type:', verificationResult.verification.paymentType);
      console.log('🚩 [AI RESULT] Red Flags:', verificationResult.verification.redFlags);

      // Check if account was flagged as suspicious (but don't suspend)
      if (!verificationResult.verification.isValid || verificationResult.verification.confidence < 40) {
        console.warn('⚠️ [SUSPICIOUS] Screenshot flagged for admin review');
        console.warn('Reason:', verificationResult.verification.reason);
        
        // Redirect to suspicious page instead of thank you page
        setSuccess('Payment submission received but requires review. Our team will review your payment and contact you shortly.');
        setAiVerifying(false);
        navigate('/suspicious-payment');
        return;
      }

      // Check confidence score
      if (verificationResult.verification.confidence < 60) {
        console.warn('⚠️ [LOW CONFIDENCE] Screenshot verification uncertain');
        console.warn('Confidence score:', verificationResult.verification.confidence);
        console.warn('Threshold: 60%');
        console.warn('Reason:', verificationResult.verification.reason);
        
        setError(
          `Screenshot verification uncertain (${verificationResult.verification.confidence}% confidence). ` +
          `Reason: ${verificationResult.verification.reason}. Please upload a clearer screenshot or contact support.`
        );
        setSubmitting(false);
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

      // Submit payment proof
      await submitPaymentProof(requestId, paymentScreenshot);

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
            to: 'dogarhusnian3@gmail.com',
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
    const discountCode = isStandardAccount ? 'RAMADAN50' : 'WELCOME10';
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
            <div className="card-gradient rounded-2xl p-8 border-2 border-blue-500/30 shadow-2xl">
              {/* Animated Robot/AI Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  {/* Scanning rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-75"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-center mb-2">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
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
                      ? 'bg-blue-500 animate-pulse scale-110'
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
                      ? 'bg-blue-500 animate-pulse scale-110'
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
                      ? 'bg-blue-500 animate-pulse scale-110'
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
                      ? 'bg-blue-500 animate-pulse scale-110'
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
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-blue-300 text-sm font-medium">
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
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(verificationStep + 1) * 25}%` }}
                  ></div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                  {Math.min((verificationStep + 1) * 25, 100)}% Complete
                </p>
              </div>

              {/* Security Notice */}
              <div className="mt-6 flex items-start space-x-2 text-xs text-gray-400">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <p>
                  We use <span className="text-blue-400 font-semibold">GPT-4 Vision AI</span> to ensure all payment screenshots are genuine. 
                  This protects our community from fraud.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        {/* Main Content */}
        <div className="w-full lg:w-2/3 space-y-6">
          {/* Special Instant Accounts Highlight */}
          <div className="card-gradient rounded-2xl p-6 border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">⚡ Special Instant Accounts</h2>
                <p className="text-yellow-400 font-medium">No Profit Target | Daily Payouts Available</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.filter(pkg => ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(pkg.name)).map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative p-5 rounded-xl border-2 transition-all ${selectedPackage?.id === pkg.id
                      ? 'bg-yellow-500/20 border-yellow-500/60 shadow-lg shadow-yellow-500/20'
                      : 'bg-white/5 border-yellow-500/20 hover:bg-yellow-500/10 hover:border-yellow-500/40'
                  }`}
                >
                  {selectedPackage?.id === pkg.id && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-black" />
                    </div>
                  )}
                  <div className="text-2xl font-bold text-white mb-2">
                    ${pkg.balance.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    Fee: <span className="text-yellow-400 font-bold">${pkg.price}</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-xs text-green-400">
                      <Check className="w-3 h-3 mr-1" />
                      <span>Daily Payouts</span>
                    </div>
                    <div className="flex items-center text-xs text-green-400">
                      <Check className="w-3 h-3 mr-1" />
                      <span>No Profit Target</span>
                    </div>
                    <div className="flex items-center text-xs text-green-400">
                      <Check className="w-3 h-3 mr-1" />
                      <span>5% Withdrawal Target</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Premium Instant Accounts */}
          <div className="card-gradient rounded-2xl p-6 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-2">Premium Instant Accounts</h2>
            <p className="text-gray-400 mb-6">5% Withdrawal Target | Weekly Payouts | 4 Trading Days</p>
            
            {/* Account Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {packages.filter(pkg => !['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(pkg.name)).map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative p-4 rounded-xl border transition-all ${
                    selectedPackage?.id === pkg.id
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {/* Ramadan Kareem Badge */}
                  <div className="absolute -top-2 -left-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                    50% OFF
                  </div>
                  
                  {selectedPackage?.id === pkg.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-2xl font-bold text-white mb-2 mt-2">
                    ${pkg.balance.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    <span className="line-through">${pkg.price}</span>
                    {' '}
                    <span className="text-green-400 font-bold text-lg">${(pkg.price * 0.5).toFixed(0)}</span>
                  </div>
                  <div className="text-xs text-green-400 font-medium mb-2">
                    Save ${(pkg.price * 0.5).toFixed(0)}!
                  </div>
                  <div className="text-xs text-blue-400 mt-2">
                    Refundable after 5 payouts
                  </div>
                </button>
              ))}
            </div>

            {/* Profit Split Info Card */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Profit Split Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Initial Split</h4>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
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
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium">Fee Refund Policy</p>
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
                  <feature.icon className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-200">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trading Rules Summary */}
          <div className="card-gradient rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Key Trading Rules</h3>
              <button
                onClick={() => setShowRules(!showRules)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all rules
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                  Special Accounts
                </h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <span>No profit target required</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <span>5% withdrawal target</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <span>Daily + Weekly payouts</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <span>No minimum trading days</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Premium Instant Accounts</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-blue-400 mt-0.5" />
                    <span>5% withdrawal target</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-blue-400 mt-0.5" />
                    <span>Weekly payouts</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-blue-400 mt-0.5" />
                    <span>4 trading days per week</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Drawdown Limits</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-red-400 mt-0.5" />
                    <span>8% daily trailing drawdown</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-red-400 mt-0.5" />
                    <span>12% maximum overall drawdown</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="w-full lg:w-1/3 sticky top-24">
          <div className="card-gradient rounded-2xl p-6 border border-white/5">
            <h3 className="text-xl font-bold text-white mb-6">Purchase Summary</h3>
            {selectedPackage ? (
              <>
                {/* Discount Banner - Only for Special Accounts */}
                {showDiscountBanner && !discountExpired && timeRemaining === 0 && selectedPackage && 
                  ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(selectedPackage.name) && (
                  <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-blue-500/30 p-6">
                    {/* Background gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 opacity-50"></div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white">Welcome Offer</h4>
                            <p className="text-xs text-gray-400">Limited time exclusive discount</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30">
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
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/30"
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
                  className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  Purchase Account
                </button>
                <p className="text-center text-sm text-gray-400 mt-4">
                  Fee is refundable after 5 successful payouts
                </p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Trading Rules</h3>
              <button
                onClick={() => setShowRules(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Trading Platform & Conditions</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Trading Platform: MetaTrader 5 (MT5)</li>
                  <li>Leverage: 1:100</li>
                  <li>Spreads: Starting from 0.2 pips</li>
                  <li>Trading Hours: 24/5 market access</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Profit Target & Payout Rules</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li><strong className="text-yellow-400">Special Accounts ($1,250, $3,500, $5,000):</strong> No profit target, 5% withdrawal target, Daily + Weekly payouts</li>
                  <li><strong className="text-blue-400">Premium Instant Accounts:</strong> 5% withdrawal target, Weekly payouts only</li>
                  <li>Maximum Single Trade Profit: 25% of withdrawal target</li>
                  <li>Minimum withdrawal amount: $50</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Drawdown Limits</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Daily Drawdown: 8% trailing from highest equity</li>
                  <li>Overall Drawdown: 12% maximum from initial equity</li>
                  <li>Daily reset at market close</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Trading Requirements</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li><strong className="text-yellow-400">Special Accounts:</strong> No minimum trading days required</li>
                  <li><strong className="text-blue-400">Premium Instant Accounts:</strong> Minimum 4 trading days per week</li>
                  <li>Trading across multiple sessions recommended</li>
                  <li>Weekend holding positions allowed</li>
                  <li>News trading allowed</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Prohibited Trading Practices</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>High-Frequency Trading (HFT)</li>
                  <li>Expert Advisors (EAs) or automated trading</li>
                  <li>Trades under 60 seconds duration</li>
                  <li>Martingale strategy</li>
                  <li>Grid trading</li>
                  <li>Arbitrage trading</li>
                 <li>No One-Sided Trading (Max 3 Consecutive)</li>
                  <li>Hedging on same pair</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Complete Payment</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentMethod(null);
                  setSelectedPkrMethod(null);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Amount Summary */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Package:</span>
                  <span className="text-white font-bold text-xl">
                    ${selectedPackage.balance.toLocaleString()} Account
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fee in USD:</span>
                  <span className="text-white font-bold text-xl">
                    ${calculateFinalPrice(selectedPackage.price).toFixed(2)}
                  </span>
                </div>
                {selectedPaymentMethod === 'pkr' && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-400/20">
                    <span className="text-gray-400">Amount in PKR:</span>
                    <span className="text-white font-bold text-xl">
                      PKR {(calculateFinalPrice(selectedPackage.price) * usdToPkr).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedPaymentMethod === 'pkr' && (
                  <div className="text-xs text-gray-500 mt-2">
                    Exchange Rate: 1 USD = {usdToPkr} PKR
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              {!selectedPaymentMethod && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Select Payment Method</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* USDT Option */}
                    <button
                      onClick={() => setSelectedPaymentMethod('usdt')}
                      className="p-6 rounded-lg bg-white/5 border-2 border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h5 className="text-white font-semibold text-lg">USDT (TRC20)</h5>
                          <p className="text-sm text-gray-400">Cryptocurrency</p>
                        </div>
                      </div>
                      <div className="text-green-400 font-medium">
                        ${calculateFinalPrice(selectedPackage.price).toFixed(2)} USDT
                      </div>
                    </button>

                    {/* PKR Option - Hidden for Indian users */}
                    {!isIndianUser && (
                      <button
                        onClick={() => setSelectedPaymentMethod('pkr')}
                        className="p-6 rounded-lg bg-white/5 border-2 border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all text-left"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h5 className="text-white font-semibold text-lg">Pakistani Methods</h5>
                            <p className="text-sm text-gray-400">JazzCash, Nayapay, Bank</p>
                          </div>
                        </div>
                        <div className="text-blue-400 font-medium">
                          PKR {(calculateFinalPrice(selectedPackage.price) * usdToPkr).toLocaleString()}
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* USDT Payment Details */}
              {selectedPaymentMethod === 'usdt' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-white">USDT Payment Details</h4>
                      <button
                        onClick={() => setSelectedPaymentMethod(null)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Change Method
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Network:</span>
                        <span className="text-white font-medium">TRC20</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-gray-400">Wallet Address:</span>
                        <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                          <code className="text-blue-400 font-medium flex-1 break-all text-sm">
                            TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5
                          </code>
                          <button
                            onClick={() => copyToClipboard('TDiAo8WAhsmgs64Z35mgk5fEqn6GqJsDR5', 'usdt')}
                            className="flex items-center px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                          >
                            {copiedAccount === 'usdt' ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-blue-400 mr-1" />
                                <span className="text-blue-400 text-sm">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PKR Payment Methods */}
              {selectedPaymentMethod === 'pkr' && !selectedPkrMethod && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">Choose PKR Method</h4>
                    <button
                      onClick={() => setSelectedPaymentMethod(null)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Change Method
                    </button>
                  </div>
                  {paymentMethods.length === 0 ? (
                    <p className="text-gray-400">No payment methods available. Please contact support.</p>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPkrMethod(method)}
                          className="w-full p-4 rounded-lg bg-white/5 border-2 border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h5 className="text-white font-semibold">{method.name}</h5>
                              <p className="text-sm text-gray-400">{method.account_name}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected PKR Method Details */}
              {selectedPaymentMethod === 'pkr' && selectedPkrMethod && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">{selectedPkrMethod.name} Details</h4>
                    <button
                      onClick={() => setSelectedPkrMethod(null)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Change Method
                    </button>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-1">Account Name</p>
                      <p className="text-white font-medium">{selectedPkrMethod.account_name}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Account Number</p>
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                        <code className="text-blue-400 font-medium">{selectedPkrMethod.account_number}</code>
                        <button
                          onClick={() => copyToClipboard(selectedPkrMethod.account_number, selectedPkrMethod.id)}
                          className="flex items-center px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                        >
                          {copiedAccount === selectedPkrMethod.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-blue-400 mr-1" />
                              <span className="text-blue-400 text-sm">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Form - Show only after method is selected */}
              {(selectedPaymentMethod === 'usdt' || selectedPkrMethod) && (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {/* AI Verification Warning */}
                  <div className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500/40">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-400 font-bold text-sm mb-1">⚠️ AI-Powered Screenshot Verification Active</p>
                        <p className="text-red-300 text-xs">
                          Our system uses advanced AI to verify all payment screenshots. 
                          <span className="font-bold"> If you upload a fake or manipulated screenshot, your account will be permanently suspended and you will be banned from our platform.</span>
                          {' '}Only upload genuine payment confirmations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Payment Screenshot
                    </label>
                    <div className="relative">
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
                        className="flex items-center justify-center w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {paymentScreenshot ? paymentScreenshot.name : 'Upload Screenshot'}
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Verifying Screenshot...' : 'Submit Payment'}
                  </button>
                </form>
              )}

              {/* Instructions */}
              {selectedPaymentMethod && (
                <div className="text-sm text-gray-400">
                  <p>Please make sure to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
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
                    <li>Include a clear screenshot of the transaction</li>
                    <li>Wait for admin verification</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}