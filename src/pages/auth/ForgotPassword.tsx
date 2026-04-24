import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get the absolute URL for the reset page
      const resetPageUrl = new URL('/reset-password', window.location.origin).toString();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPageUrl,
        captchaToken: undefined // Let Supabase handle captcha if enabled
      });

      if (error) throw error;
      setSuccess(true);

      // Track email sent for analytics (optional)
      try {
        if (window.fbq) {
          window.fbq('track', 'ResetPasswordRequest', {
            content_category: 'Authentication',
            status: 'success'
          });
        }
      } catch (trackingError) {
        console.error('Tracking error:', trackingError);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');

      // Track error for analytics (optional)
      try {
        if (window.fbq) {
          window.fbq('track', 'ResetPasswordRequest', {
            content_category: 'Authentication',
            status: 'error'
          });
        }
      } catch (trackingError) {
        console.error('Tracking error:', trackingError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* LEFT: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-[#3B82F6] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 bg-[#bd4dd6]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 max-w-md">
          <img src="/logo.png" alt="FundedCobra" className="w-20 h-20 object-contain mb-10 drop-shadow-2xl" />
          <h2 className="text-4xl text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
            Don't worry, <span className="bg-gradient-to-r from-[#3B82F6] to-[#60a5fa] bg-clip-text text-transparent">we've got you.</span>
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-12">
            Reset your password securely. You'll receive an email with a link to create a new password.
          </p>
          
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#3B82F6]/10">
              <Shield className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <span className="text-sm">Secure password reset via email</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="FundedCobra" className="w-16 h-16 object-contain drop-shadow-2xl" />
          </div>

          <div className="rounded-2xl p-8 lg:p-10 border border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)' }}>
            <Link 
              to="/login"
              className="inline-flex items-center text-gray-500 hover:text-white mb-8 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>

            <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Reset password</h1>
            <p className="text-gray-500 text-sm mb-8">
              Enter your email and we'll send reset instructions.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {success ? (
              <div className="text-center py-4">
                <div className="mb-5 flex justify-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' }}>
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-xl text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Check your email</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  We've sent password reset instructions to <span className="text-white font-medium">{email}</span>.
                  Check your spam folder if you don't see it.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full px-4 py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    background: 'linear-gradient(135deg, #3B82F6, #2563eb)',
                    boxShadow: '0 4px 25px rgba(59,130,246,0.3)'
                  }}
                >
                  Return to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/40 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all text-sm"
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    background: 'linear-gradient(135deg, #3B82F6, #2563eb)',
                    boxShadow: loading ? 'none' : '0 4px 25px rgba(59,130,246,0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
