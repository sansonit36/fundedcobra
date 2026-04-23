import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, Share2, Award, Calendar, TrendingUp, BarChart3, ChevronDown
} from 'lucide-react';
import {
  getPublicTraderProfile, getCertificatesByUser,
  getHighlightedTrades, getLeaderboard
} from '../../lib/certificates';
import type { TraderProfile as TraderProfileType, PayoutCertificate, HighlightedTrade, LeaderboardEntry } from '../../lib/certificates';

// Verified badge (FTMO style)
function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 12c0-.85-.34-1.63-.9-2.24.42-.76.5-1.66.18-2.48a2.91 2.91 0 00-1.95-1.75c-.14-.82-.6-1.57-1.28-2.04a2.92 2.92 0 00-2.36-.38 3.19 3.19 0 00-2.24-.91h-.5a3.19 3.19 0 00-2.24.91 2.92 2.92 0 00-2.36.38c-.68.47-1.14 1.22-1.28 2.04a2.91 2.91 0 00-1.95 1.75 2.94 2.94 0 00.18 2.48A3.19 3.19 0 004.9 12V12.5c0 .85.34 1.63.9 2.24-.42.76-.5 1.66-.18 2.48a2.91 2.91 0 001.95 1.75c.14.82.6 1.57 1.28 2.04.68.47 1.51.6 2.36.38a3.19 3.19 0 002.24.91h.5a3.19 3.19 0 002.24-.91 2.92 2.92 0 002.36-.38c.68-.47 1.14-1.22 1.28-2.04a2.91 2.91 0 001.95-1.75 2.94 2.94 0 00-.18-2.48 3.19 3.19 0 00.9-2.24V12z" fill="#1D9BF0"/>
      <path d="M10 16.5l-4-4 1.5-1.5 2.5 2.5 6-6 1.5 1.5-7.5 7.5z" fill="white"/>
    </svg>
  );
}

export default function TraderProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<TraderProfileType | null>(null);
  const [certificates, setCertificates] = useState<PayoutCertificate[]>([]);
  const [trades, setTrades] = useState<HighlightedTrade[]>([]);
  const [community, setCommunity] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [showAllCerts, setShowAllCerts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBioFull, setShowBioFull] = useState(false);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const [profileData, certsData, tradesData, leaderboardData] = await Promise.all([
        getPublicTraderProfile(userId),
        getCertificatesByUser(userId),
        getHighlightedTrades(userId),
        getLeaderboard()
      ]);

      if (!profileData || !profileData.is_public) {
        setNotFound(true);
        return;
      }

      setProfile(profileData);
      setCertificates(certsData);
      setTrades(tradesData);
      setCommunity(leaderboardData.filter(e => e.user_id !== userId).slice(0, 10));
    } catch (err) {
      console.error('Error loading profile:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount);
  };

  const formatAmountShort = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDaysSinceJoined = (dateStr: string) => {
    const joined = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117]">
        <div className="max-w-[1240px] mx-auto px-6 py-10 flex space-x-8">
          <div className="w-[380px] space-y-6 flex-shrink-0 animate-pulse">
             <div className="h-64 rounded-xl bg-[#161B22] border border-white/5" />
             <div className="h-32 rounded-xl bg-[#161B22] border border-white/5" />
          </div>
          <div className="flex-1 space-y-6 animate-pulse">
            <div className="h-48 rounded-xl bg-[#161B22] border border-white/5" />
            <div className="h-96 rounded-xl bg-[#161B22] border border-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="text-center px-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-[#161B22] border border-white/5 flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-[#8B949E]" />
          </div>
          <h1 className="text-xl font-bold text-[#E6EDF3] mb-3">Profile Not Available</h1>
          <p className="text-sm text-[#8B949E] leading-relaxed mb-8">This trader's profile is either set to private or does not exist on our records.</p>
          <a
            href="https://fundedcobra.com"
            className="inline-block w-full py-3 px-6 rounded-lg font-medium text-white transition-all bg-[#8A2BE2] hover:bg-[#7220BC]"
          >
            Visit FundedCobra
          </a>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.full_name || 'Trader';
  const daysSinceJoined = getDaysSinceJoined(profile.created_at);
  const visibleTrades = showAllTrades ? trades : trades.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0E1117] text-[#E6EDF3] font-sans antialiased selection:bg-[#8A2BE2] selection:text-white pb-20">

      {/* ========== NAVBAR ========== */}
      <header className="sticky top-0 z-50 bg-[#0E1117]/80 backdrop-blur-lg border-b border-white/[0.04]">
        <div className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            {/* Logo scaling up by 1.5x compared to before (h-10 = 40px) */}
            <img src="/logo.png" alt="FundedCobra" className="h-10 object-contain transition-opacity group-hover:opacity-90" />
          </Link>
          <nav>
            <a 
              href="https://fundedcobra.com" 
              className="text-sm font-medium text-[#8B949E] hover:text-[#E6EDF3] px-3 py-2 transition-colors inline-block"
            >
              Dashboard
            </a>
          </nav>
        </div>
      </header>

      {/* ========== MAIN GRID ========== */}
      <main className="max-w-[1240px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ----- LEFT COLUMN (380px wide equivalent) ----- */}
          <div className="lg:col-span-4 space-y-6">

            {/* Profile Identity Card */}
            <div className="rounded-2xl bg-[#161B22] border border-white/[0.04] p-8">
              <div className="flex items-start space-x-5">
                <div className="w-[72px] h-[72px] rounded-full overflow-hidden flex-shrink-0 border border-white/10 ring-4 ring-[#0E1117] bg-[#21262D]">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#21262D]">
                      <span className="text-xl font-bold text-[#8B949E] tracking-tight">
                        {getInitials(displayName)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {/* H1 Hierarchy */}
                    <h1 className="text-[22px] font-bold text-[#E6EDF3] tracking-tight truncate leading-none">
                      {displayName}
                    </h1>
                    <VerifiedBadge className="w-5 h-5 flex-shrink-0 translate-y-[-1px]" />
                  </div>
                  <div className="mt-2.5">
                    <span className="inline-flex items-center text-xs font-medium text-[#8B949E]">
                      <Calendar className="w-[14px] h-[14px] mr-1.5 opacity-70" />
                      with FundedCobra: <span className="ml-1 text-[#C9D1D9]">{daysSinceJoined}</span> days
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-7">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] border border-white/[0.05] w-fit"
                >
                  <Share2 className="w-4 h-4 opacity-70" />
                  <span>{copied ? 'Link Copied!' : 'Share Profile'}</span>
                </button>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mt-7 pt-7 border-t border-white/[0.04]">
                  <p className={`text-[15px] leading-relaxed text-[#8B949E] ${!showBioFull ? 'line-clamp-4' : ''}`}>
                    {profile.bio}
                  </p>
                  {profile.bio.length > 200 && (
                    <button
                      onClick={() => setShowBioFull(!showBioFull)}
                      className="text-[13px] font-medium mt-2 transition-colors text-[#58A6FF] hover:text-[#79C0FF]"
                    >
                      {showBioFull ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rewarded Value Card */}
            <div className="rounded-2xl bg-[#161B22] border border-white/[0.04] p-8 text-center">
              <p className="text-4xl font-extrabold tracking-tight text-[#3FB950] tabular-nums">
                {formatAmountShort(profile.total_payouts)}
              </p>
              <p className="text-sm font-medium mt-2 text-[#8B949E] uppercase tracking-widest">
                Total Rewarded
              </p>
            </div>

            {/* Start Journey CTA */}
            <div className="rounded-2xl bg-[#161B22] border border-white/[0.04] p-8 text-center pt-9 pb-9">
              <h3 className="text-lg font-bold text-[#E6EDF3] mb-2 tracking-tight">Become a FundedCobra Trader</h3>
              <p className="text-[15px] text-[#8B949E] mb-7 leading-relaxed px-2">Take the challenge, prove your edge, and trade with our capital.</p>
              <a
                href="https://fundedcobra.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all bg-[#8A2BE2] hover:bg-[#7220BC] text-white shadow-lg shadow-[#8A2BE2]/20"
              >
                Start Challenge
              </a>
            </div>
          </div>

          {/* ----- RIGHT COLUMN ----- */}
          <div className="lg:col-span-8 space-y-8">

            {/* Certificates Section */}
            <section className="rounded-2xl bg-[#161B22] border border-white/[0.04]">
              {/* Section Header */}
              <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/[0.04]">
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-bold text-[#E6EDF3] tracking-tight">Certificates</h2>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#21262D] text-[#8B949E] border border-white/[0.04]">
                    {certificates.length}
                  </span>
                </div>
                {certificates.length > 5 && (
                  <button
                    onClick={() => setShowAllCerts(!showAllCerts)}
                    className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] border border-white/[0.05]"
                  >
                    {showAllCerts ? 'Show less' : 'View all'}
                  </button>
                )}
              </div>

              <div className="px-8 py-8">
                {certificates.length === 0 ? (
                  <div className="text-center py-10 opacity-60">
                    <Award className="w-10 h-10 mx-auto mb-4 text-[#30363D]" />
                    <p className="text-[15px] text-[#7D8590] mt-1">No certificates awarded yet.</p>
                  </div>
                ) : (
                  <div className={showAllCerts
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
                    : 'flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10'
                  }>
                    {(showAllCerts ? certificates : certificates.slice(0, 5)).map(cert => (
                      <Link
                        key={cert.id}
                        to={`/verify/${cert.certificate_number}`}
                        className={`flex-shrink-0 block group ${showAllCerts ? '' : 'w-[124px]'}`}
                      >
                        <div className="rounded-xl p-3 text-center transition-all duration-300 bg-[#0E1117] border border-white/[0.04] hover:border-white/10">
                          {/* Mini cert thumbnail */}
                          <div className="w-full aspect-[3/4] rounded-lg mb-3 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#161B22] to-[#0E1117] border border-white/[0.04] group-hover:shadow-[0_0_15px_rgba(138,43,226,0.1)] transition-shadow">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#8A2BE2] to-[#58A6FF]" />
                            <img src="/logo.png" alt="" className="h-4 object-contain opacity-40 mb-1" />
                            <p className="text-[11px] font-bold text-[#E6EDF3] tracking-tight mt-1">
                              {formatAmount(cert.payout_amount)}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-[#8B949E] truncate px-1">
                            {cert.account_type || 'Payout'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Highlighted Trades Section */}
            <section className="rounded-2xl bg-[#161B22] border border-white/[0.04]">
              {/* Section Header */}
              <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/[0.04]">
                <h2 className="text-lg font-bold text-[#E6EDF3] tracking-tight flex items-center">
                  Highlighted Trades
                  <TrendingUp className="w-4 h-4 ml-2.5 text-[#484F58]" />
                </h2>
                {trades.length > 4 && (
                  <button
                    onClick={() => setShowAllTrades(!showAllTrades)}
                    className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] border border-white/[0.05]"
                  >
                    {showAllTrades ? 'Show less' : 'View all'}
                  </button>
                )}
              </div>
              
              <div className="px-8 py-5">
                <p className="text-[13px] leading-relaxed text-[#7D8590] mb-5">
                  These trades were chosen by the trader for display purposes and do not necessarily reflect complete consistency or strategy metrics.
                </p>

                <div className="space-y-3">
                  {trades.length === 0 ? (
                    <div className="text-center py-12 opacity-60">
                      <BarChart3 className="w-10 h-10 mx-auto mb-4 text-[#30363D]" />
                      <p className="text-[15px] text-[#7D8590]">No highlighted trades added.</p>
                    </div>
                  ) : (
                    <>
                      {visibleTrades.map(trade => (
                        <div
                          key={trade.id}
                          className="relative rounded-xl overflow-hidden bg-[#0E1117] border border-white/[0.04] transition-colors hover:border-white/10"
                        >
                          <div className="relative flex items-center py-4 px-6">
                            {/* Base Profit */}
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-xl font-bold tracking-tight text-[#3FB950] tabular-nums">
                                {formatAmount(trade.profit)}
                              </p>
                              <p className="text-[12px] font-medium text-[#8B949E] mt-0.5 uppercase tracking-wider">Profit</p>
                            </div>

                            {/* Center Stats (Grid) */}
                            <div className="hidden md:flex items-center space-x-12 px-6 border-l border-r border-white/[0.04]">
                              {trade.duration && (
                                <div>
                                  <p className="text-[15px] font-medium text-[#E6EDF3]">{trade.duration}</p>
                                  <p className="text-[11px] font-medium text-[#7D8590] mt-0.5 uppercase tracking-wider">Duration</p>
                                </div>
                              )}
                              {trade.close_date && (
                                <div>
                                  <p className="text-[15px] font-medium text-[#E6EDF3]">{formatDate(trade.close_date)}</p>
                                  <p className="text-[11px] font-medium text-[#7D8590] mt-0.5 uppercase tracking-wider">Closed</p>
                                </div>
                              )}
                            </div>

                            {/* Right: Symbol & Action */}
                            <div className="flex items-center justify-end min-w-[140px] pl-4">
                              <div className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <span className="text-[15px] font-bold text-[#E6EDF3]">{trade.symbol}</span>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    trade.direction === 'buy'
                                      ? 'bg-[#3FB950]/10 text-[#3FB950]'
                                      : 'bg-[#F85149]/10 text-[#F85149]'
                                  }`}>
                                    {trade.direction === 'buy' ? 'Buy' : 'Sell'}
                                  </span>
                                </div>
                                {trade.account_type && (
                                  <p className="text-[12px] font-medium text-[#8B949E] mt-1 text-right">
                                    {trade.account_type}
                                  </p>
                                )}
                              </div>
                              {trade.volume > 0 && (
                                <div className="ml-5 pl-5 border-l border-white/[0.04] text-right">
                                  <p className="text-[15px] font-medium text-[#E6EDF3] tabular-nums">{trade.volume}</p>
                                  <p className="text-[11px] font-medium text-[#7D8590] mt-0.5 uppercase tracking-wider">Vol</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {trades.length > 4 && !showAllTrades && (
                        <button
                          onClick={() => setShowAllTrades(true)}
                          className="w-full mt-2 py-3 rounded-xl text-sm font-medium transition-colors bg-[#21262D]/50 hover:bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] border border-dashed border-white/[0.05]"
                        >
                          View {trades.length - 4} more highlighted trades
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-[#21262D] mt-10">
        <div className="max-w-[1240px] mx-auto px-6 py-10">
          <p className="text-xs leading-relaxed text-[#7D8590] text-justify md:text-left font-medium">
            All trades shown are simulated and provided for informational and educational purposes only. They do not constitute financial, investment, legal, or tax advice. 
            Users may be onboarded under different legal entities and subject to varying rules, trading conditions, regulatory requirements, and investor protections. 
            Variations in leverage and other trading parameters may materially affect performance outcomes. Past performance is not indicative of future results.
          </p>
          <p className="text-xs leading-relaxed text-[#7D8590] text-justify md:text-left mt-4 font-medium">
            All information provided on this site is intended solely for educational purposes related to trading on financial markets and does not serve in any way as a specific 
            investment recommendation, business recommendation, investment opportunity analysis or similar general recommendation regarding the trading of investment instruments. 
            FundedCobra only provides services of simulated trading and educational tools for traders. FundedCobra does not act as a broker and does not accept any deposits.
          </p>
          <p className="text-xs mt-8 text-[#484F58] font-semibold">
            {new Date().getFullYear()} © Copyright · FundedCobra
          </p>
        </div>
      </footer>
    </div>
  );
}
