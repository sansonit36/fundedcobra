import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, TrendingUp, Activity, BarChart3, ArrowRight, Zap,
  ChevronRight, Rocket, Target, ShieldCheck, Clock, DollarSign,
  Award, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Overview from '../components/demo-dashboard/Overview';
import Leaderboard from '../components/demo-dashboard/Leaderboard';
import OffersBanner from '../components/demo-dashboard/OffersBanner';
import ComplianceStatus from '../components/demo-dashboard/ComplianceStatus';
import RecentTrades from '../components/demo-dashboard/RecentTrades';

type UserStage = 'loading' | 'new_signup' | 'active_trader' | 'recovery';

interface UserContext {
  name: string;
  avatarUrl: string | null;
  activeAccounts: number;
  breachedAccounts: number;
  pendingRequests: number;
  totalAccounts: number;
  totalTrades: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<UserStage>('loading');
  const [ctx, setCtx] = useState<UserContext>({
    name: '', avatarUrl: null, activeAccounts: 0,
    breachedAccounts: 0, pendingRequests: 0, totalAccounts: 0, totalTrades: 0
  });
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    loadUserContext();
  }, [user]);

  const loadUserContext = async () => {
    try {
      const [profileRes, accountsRes, requestsRes] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url').eq('id', user!.id).single(),
        supabase.from('trading_accounts').select('id, status').eq('user_id', user!.id),
        supabase.from('account_requests').select('id').eq('user_id', user!.id).in('status', ['pending_payment', 'payment_submitted'])
      ]);

      const profile = profileRes.data;
      const accounts = accountsRes.data || [];
      const pending = requestsRes.data || [];
      const active = accounts.filter(a => a.status === 'active').length;
      const breached = accounts.filter(a => a.status === 'breached').length;

      const userCtx: UserContext = {
        name: profile?.name || user?.email?.split('@')[0] || 'Trader',
        avatarUrl: profile?.avatar_url || null,
        activeAccounts: active,
        breachedAccounts: breached,
        pendingRequests: pending.length,
        totalAccounts: accounts.length,
        totalTrades: 0
      };
      setCtx(userCtx);

      // Determine stage
      if (active > 0) {
        setStage('active_trader');
      } else if (accounts.length > 0 && breached > 0 && active === 0) {
        setStage('recovery');
      } else {
        setStage('new_signup');
      }
    } catch (err) {
      console.error('Error loading user context:', err);
      setStage('new_signup');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = ctx.name.split(' ')[0];

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (stage === 'loading') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8 space-y-6">
        {/* Greeting skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded-xl w-64 mb-2" />
          <div className="h-4 bg-white/5 rounded-lg w-96" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/[0.03] rounded-2xl border border-white/[0.06] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-80 bg-white/[0.03] rounded-2xl border border-white/[0.06] animate-pulse" />
          <div className="h-80 bg-white/[0.03] rounded-2xl border border-white/[0.06] animate-pulse" />
        </div>
      </div>
    );
  }

  // ============================================================
  // NEW SIGNUP — Welcome + Onboarding
  // ============================================================
  if (stage === 'new_signup') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8 space-y-8">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]"
             style={{ background: 'linear-gradient(135deg, #1a1025 0%, #161B22 40%, #0f1923 100%)' }}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#8A2BE2]/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 p-8 md:p-12 lg:p-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#8A2BE2]/15 border border-[#8A2BE2]/20 text-[#8A2BE2] text-xs font-semibold mb-6">
                <Zap className="w-3.5 h-3.5" />
                Welcome to FundedCobra
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
                Hey {firstName},<br />
                <span className="bg-gradient-to-r from-[#8A2BE2] via-[#a855f7] to-[#06b6d4] bg-clip-text text-transparent">
                  ready to start trading?
                </span>
              </h1>
              
              <p className="text-[#8B949E] text-base md:text-lg leading-relaxed mb-8 max-w-lg">
                Get funded with up to $200,000 in firm capital. No evaluations needed with Instant accounts, or prove your edge with our Step challenges.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/buy-account')}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#8A2BE2]/25 hover:shadow-[#8A2BE2]/40 hover:-translate-y-0.5"
                >
                  <Rocket className="w-4.5 h-4.5" />
                  Get Funded Now
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => navigate('/rules')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold rounded-xl border border-white/[0.08] transition-all duration-200"
                >
                  <ShieldCheck className="w-4 h-4 text-[#8B949E]" />
                  View Rules
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works — 3 Steps */}
        <div>
          <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider mb-5 px-1">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                icon: Target,
                title: 'Choose Your Account',
                desc: 'Select from Instant Funding or Step Evaluations. Pick your account size from $5K to $200K.',
                color: '#8A2BE2',
                gradient: 'from-[#8A2BE2]/15 to-transparent'
              },
              {
                step: '02',
                icon: Activity,
                title: 'Start Trading',
                desc: 'Trade forex, indices, metals, and crypto on MT5. No time limits — trade at your own pace.',
                color: '#06b6d4',
                gradient: 'from-[#06b6d4]/15 to-transparent'
              },
              {
                step: '03',
                icon: DollarSign,
                title: 'Get Paid',
                desc: 'Keep up to 80% of your profits. Bi-weekly payouts processed fast with no hidden fees.',
                color: '#10b981',
                gradient: 'from-[#10b981]/15 to-transparent'
              }
            ].map((item) => (
              <div
                key={item.step}
                className="group relative overflow-hidden rounded-2xl bg-[#161B22]/80 border border-white/[0.06] p-7 hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-b ${item.gradient} pointer-events-none`} />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-xs font-bold text-[#484f58] uppercase tracking-widest">Step {item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#8B949E] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Requests Note */}
        {ctx.pendingRequests > 0 && (
          <div className="rounded-2xl bg-yellow-500/[0.06] border border-yellow-500/15 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">You have {ctx.pendingRequests} pending account request{ctx.pendingRequests > 1 ? 's' : ''}</p>
              <p className="text-xs text-[#8B949E] mt-0.5">Your request is being reviewed by our team. We'll notify you once it's approved.</p>
            </div>
            <button
              onClick={() => navigate('/trading-accounts')}
              className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap"
            >
              View Status →
            </button>
          </div>
        )}

        {/* Social Proof — Leaderboard Preview */}
        <div>
          <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider mb-5 px-1">Top Traders</h2>
          <Leaderboard />
        </div>

        {/* Compact Offers */}
        <OffersBanner compact />
      </div>
    );
  }

  // ============================================================
  // RECOVERY — All Breached, Comeback CTA
  // ============================================================
  if (stage === 'recovery') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-white">{getGreeting()}, {firstName}</h1>
          <p className="text-sm text-[#8B949E] mt-1">Your trading journey continues — every setback is a setup for a comeback.</p>
        </div>

        {/* Recovery Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]"
             style={{ background: 'linear-gradient(135deg, #1a1520 0%, #161B22 50%, #151d1a 100%)' }}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#8A2BE2]/8 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ready for Round {ctx.breachedAccounts + 1}?
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                  Your comeback starts now.
                </h2>
                <p className="text-[#8B949E] text-sm md:text-base leading-relaxed mb-6">
                  {ctx.breachedAccounts} account{ctx.breachedAccounts > 1 ? 's' : ''} behind you — the lessons stay with you. 
                  Get instant funding with no evaluation needed and jump straight back in.
                </p>
                
                <button
                  onClick={() => navigate('/buy-account')}
                  className="group inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                >
                  <Rocket className="w-4.5 h-4.5" />
                  Get Back in the Game
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center min-w-[120px]">
                  <p className="text-2xl font-bold text-white">{ctx.totalAccounts}</p>
                  <p className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider mt-1">Accounts</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center min-w-[120px]">
                  <p className="text-2xl font-bold text-[#8A2BE2]">{ctx.breachedAccounts}</p>
                  <p className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider mt-1">Breached</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Status (redesigned) */}
        <ComplianceStatus />

        {/* Offers */}
        <OffersBanner compact />

        {/* Leaderboard */}
        <div>
          <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider mb-5 px-1">Community Leaderboard</h2>
          <Leaderboard />
        </div>
      </div>
    );
  }

  // ============================================================
  // ACTIVE TRADER — Full Dashboard
  // ============================================================
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-8 space-y-8">
      {/* Greeting Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{getGreeting()}, {firstName}</h1>
          <p className="text-sm text-[#8B949E] mt-1">
            {ctx.activeAccounts} active account{ctx.activeAccounts !== 1 ? 's' : ''}
            {ctx.pendingRequests > 0 && <span> · {ctx.pendingRequests} pending</span>}
            {ctx.breachedAccounts > 0 && <span className="text-red-400/70"> · {ctx.breachedAccounts} breached</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/trading-accounts')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm font-medium rounded-xl border border-white/[0.08] transition-all duration-200"
          >
            <Wallet className="w-4 h-4 text-[#8B949E]" />
            View Accounts
          </button>
          <button
            onClick={() => navigate('/buy-account')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8A2BE2] hover:bg-[#7c22d1] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md shadow-[#8A2BE2]/20"
          >
            <Zap className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* Compliance Alert (only if breached accounts exist) */}
      <ComplianceStatus />

      {/* Metrics Cards */}
      <Overview filterType={filterType} setFilterType={setFilterType} />

      {/* Data Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentTrades filterType={filterType} />
        <Leaderboard />
      </div>

      {/* Compact Offers at bottom */}
      <OffersBanner compact />
    </div>
  );
}