import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart2, Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/favicon.png" alt="FundedCobra Logo" className="w-[135px] h-[135px] object-contain drop-shadow-2xl" />
        </div>

        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <Link 
            to="/login"
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>

          <h1 className="text-2xl font-bold text-white text-center mb-2">Reset Password</h1>
          <p className="text-gray-400 text-center mb-6">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Check Your Email</h2>
              <p className="text-gray-400 mb-6">
                We've sent password reset instructions to <span className="text-white">{email}</span>.
                Please check your spam folder if you don't see it in your inbox.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Reset Link...
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
  );
}
