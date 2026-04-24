import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Shield, Users, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* LEFT: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-[#bd4dd6] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 bg-[#3B82F6]" />
        </div>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          {/* Hero image */}
          <img src="/auth-trader.png" alt="FundedCobra Trader" className="w-[380px] h-auto object-contain mb-8 drop-shadow-[0_20px_60px_rgba(189,77,214,0.3)]" />
          
          <h2 className="text-3xl text-white mb-3 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
            Trade with <span className="bg-gradient-to-r from-[#bd4dd6] to-[#e879f9] bg-clip-text text-transparent">our capital.</span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm">
            Join thousands of funded traders worldwide. Instant access to capital up to $200K.
          </p>
          
          {/* Trust badges */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-500">
              <Shield className="w-4 h-4 text-emerald-500/70" />
              <span className="text-xs font-medium">256-bit Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Users className="w-4 h-4 text-[#bd4dd6]/70" />
              <span className="text-xs font-medium">47,000+ Traders</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="FundedCobra" className="w-16 h-16 object-contain drop-shadow-2xl" />
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-8 lg:p-10 border border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.98) 100%)' }}>
            <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Welcome back</h1>
            <p className="text-gray-500 text-sm mb-8">Sign in to access your trading dashboard</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all text-sm"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-xs text-[#bd4dd6]/70 hover:text-[#bd4dd6] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-[#bd4dd6]/40 focus:ring-1 focus:ring-[#bd4dd6]/20 transition-all text-sm"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  background: 'linear-gradient(135deg, #bd4dd6, #9333ea)',
                  boxShadow: loading ? 'none' : '0 4px 25px rgba(189,77,214,0.3)'
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
              <p className="text-gray-500 text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-[#bd4dd6] hover:text-[#e879f9] font-semibold transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}