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

// Blue verified badge SVG (like Twitter/FTMO verified tick)
function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.396 11c0-.795-.313-1.53-.85-2.09.395-.71.465-1.55.167-2.316a2.722 2.722 0 00-1.837-1.636c-.134-.77-.562-1.467-1.2-1.91a2.725 2.725 0 00-2.204-.356 2.98 2.98 0 00-2.09-.85h-.468a2.98 2.98 0 00-2.09.85 2.725 2.725 0 00-2.204.357c-.638.442-1.066 1.139-1.2 1.909a2.722 2.722 0 00-1.837 1.636 2.752 2.752 0 00.167 2.316 2.98 2.98 0 00-.85 2.09v.468c0 .795.313 1.53.85 2.09a2.752 2.752 0 00-.167 2.316 2.722 2.722 0 001.837 1.636c.134.77.562 1.467 1.2 1.91.64.443 1.42.57 2.204.356a2.98 2.98 0 002.09.85h.468a2.98 2.98 0 002.09-.85 2.725 2.725 0 002.204-.357c.638-.442 1.066-1.139 1.2-1.909a2.722 2.722 0 001.837-1.636 2.752 2.752 0 00-.167-2.316 2.98 2.98 0 00.85-2.09v-.468z" fill="#1D9BF0"/>
      <path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 5.085-5.085 1.168 1.168-6.253 6.253z" fill="white"/>
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#0d1117' }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl p-5 animate-pulse" style={{ background: '#161b22', border: '1px solid #21262d' }}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-14 h-14 rounded-full" style={{ background: '#21262d' }} />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 rounded w-28" style={{ background: '#21262d' }} />
                    <div className="h-3 rounded w-20" style={{ background: '#21262d' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="rounded-xl p-5 animate-pulse" style={{ background: '#161b22', border: '1px solid #21262d' }}>
                <div className="h-4 rounded w-36 mb-4" style={{ background: '#21262d' }} />
                <div className="flex space-x-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-24 h-28 rounded-lg flex-shrink-0" style={{ background: '#21262d' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#161b22' }}>
            <User className="w-7 h-7" style={{ color: '#484f58' }} />
          </div>
          <h1 className="text-lg font-semibold mb-2" style={{ color: '#e6edf3' }}>Profile Not Available</h1>
          <p className="text-sm mb-6" style={{ color: '#7d8590' }}>This trader's profile is either private or doesn't exist.</p>
          <a
            href="https://fundedcobra.com"
            className="inline-block px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#7c3aed', color: '#fff' }}
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
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#e6edf3', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ========== HEADER ========== */}
      <header style={{ borderBottom: '1px solid #21262d', background: '#0d1117' }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="FundedCobra" className="h-7 object-contain" />
          </Link>
          <div className="flex items-center space-x-4">
            <a href="https://fundedcobra.com" className="text-sm transition-colors" style={{ color: '#7d8590' }}>
              Home
            </a>
          </div>
        </div>
      </header>

      {/* ========== MAIN ========== */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ========== LEFT COLUMN ========== */}
          <div className="lg:col-span-4 space-y-4">

            {/* Profile Card */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#161b22', border: '1px solid #21262d' }}>
              <div className="p-5">
                {/* Avatar + Name */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid #30363d' }}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#21262d' }}>
                        <span className="text-lg font-semibold" style={{ color: '#7d8590' }}>
                          {getInitials(displayName)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center space-x-1">
                      <h1 className="text-base font-semibold truncate" style={{ color: '#e6edf3' }}>
                        {displayName}
                      </h1>
                      <VerifiedBadge className="w-[18px] h-[18px] flex-shrink-0" />
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs" style={{ color: '#7d8590' }}>
                        <Calendar className="w-3 h-3 inline mr-1" style={{ color: '#484f58' }} />
                        with FundedCobra: <strong style={{ color: '#e6edf3' }}>{daysSinceJoined}</strong> days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 mb-4">
                  <button
                    onClick={handleShare}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{ background: '#21262d', color: '#e6edf3', border: '1px solid #30363d' }}
                  >
                    <Share2 className="w-3 h-3" />
                    <span>{copied ? 'Copied!' : 'Share profile'}</span>
                  </button>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div>
                    <p className={`text-sm leading-relaxed ${!showBioFull ? 'line-clamp-3' : ''}`} style={{ color: '#7d8590' }}>
                      {profile.bio}
                    </p>
                    {profile.bio.length > 120 && (
                      <button
                        onClick={() => setShowBioFull(!showBioFull)}
                        className="text-xs mt-1 transition-colors"
                        style={{ color: '#58a6ff' }}
                      >
                        {showBioFull ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Rewarded */}
            <div className="rounded-xl p-5 text-center" style={{ background: '#0d2818', border: '1px solid #1b4332' }}>
              <p className="text-2xl font-bold tracking-tight" style={{ color: '#3fb950' }}>
                {formatAmountShort(profile.total_payouts)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#3fb950', opacity: 0.7 }}>Rewarded</p>
            </div>

            {/* CTA */}
            <div className="rounded-xl p-5" style={{ background: '#161b22', border: '1px solid #21262d' }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#e6edf3' }}>Start your trading journey</h3>
              <p className="text-xs mb-3" style={{ color: '#7d8590' }}>Get funded and trade with our capital.</p>
              <div className="flex items-center space-x-2">
                <a
                  href="https://fundedcobra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-md text-xs font-medium"
                  style={{ background: '#7c3aed', color: '#fff' }}
                >
                  FundedCobra Challenge
                </a>
                <a
                  href="https://fundedcobra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-md text-xs font-medium"
                  style={{ background: '#21262d', color: '#e6edf3', border: '1px solid #30363d' }}
                >
                  Free Trial
                </a>
              </div>
            </div>
          </div>

          {/* ========== RIGHT COLUMN ========== */}
          <div className="lg:col-span-8 space-y-5">

            {/* Certificates */}
            <div className="rounded-xl" style={{ background: '#161b22', border: '1px solid #21262d' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>My certificates</h2>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#21262d', color: '#7d8590' }}>
                    {certificates.length}
                  </span>
                </div>
                {certificates.length > 5 && (
                  <button
                    onClick={() => setShowAllCerts(!showAllCerts)}
                    className="text-xs px-2.5 py-1 rounded-md transition-colors"
                    style={{ background: '#21262d', color: '#7d8590', border: '1px solid #30363d' }}
                  >
                    {showAllCerts ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>

              <div className="px-5 pb-4">
                {certificates.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-7 h-7 mx-auto mb-2" style={{ color: '#30363d' }} />
                    <p className="text-xs" style={{ color: '#484f58' }}>No certificates earned yet</p>
                  </div>
                ) : (
                  <div className={showAllCerts
                    ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'
                    : 'flex space-x-3 overflow-x-auto pb-1'
                  } style={{ scrollbarWidth: 'thin', scrollbarColor: '#21262d transparent' }}>
                    {(showAllCerts ? certificates : certificates.slice(0, 5)).map(cert => (
                      <Link
                        key={cert.id}
                        to={`/verify/${cert.certificate_number}`}
                        className={`flex-shrink-0 block ${showAllCerts ? '' : 'w-[100px]'}`}
                      >
                        <div className="rounded-lg p-2.5 text-center transition-colors group"
                          style={{ background: '#0d1117', border: '1px solid #21262d' }}
                        >
                          {/* Mini cert thumbnail */}
                          <div className="w-full aspect-[3/4] rounded-md mb-1.5 flex flex-col items-center justify-center relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)', border: '1px solid #21262d' }}
                          >
                            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(to right, #3fb950, #7c3aed)' }} />
                            <img src="/logo.png" alt="" className="h-3 object-contain opacity-40 mb-0.5" />
                            <p className="text-[9px] font-bold" style={{ color: '#3fb950' }}>
                              {formatAmount(cert.payout_amount)}
                            </p>
                          </div>
                          <p className="text-[10px] truncate" style={{ color: '#7d8590' }}>
                            {cert.account_type || 'Rewards'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Highlighted Trades */}
            <div className="rounded-xl" style={{ background: '#161b22', border: '1px solid #21262d' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Highlighted trades</h2>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: '#484f58' }} />
                </div>
                {trades.length > 4 && (
                  <button
                    onClick={() => setShowAllTrades(!showAllTrades)}
                    className="text-xs px-2.5 py-1 rounded-md transition-colors"
                    style={{ background: '#21262d', color: '#7d8590', border: '1px solid #30363d' }}
                  >
                    {showAllTrades ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>
              <p className="px-5 text-[11px] mb-3" style={{ color: '#484f58' }}>
                These trades were chosen by the trader for display purposes and do not necessarily reflect their overall results, strategy, or consistency.
              </p>

              <div className="px-5 pb-4 space-y-2">
                {trades.length === 0 ? (
                  <div className="text-center py-6">
                    <BarChart3 className="w-7 h-7 mx-auto mb-2" style={{ color: '#30363d' }} />
                    <p className="text-xs" style={{ color: '#484f58' }}>No highlighted trades yet</p>
                  </div>
                ) : (
                  <>
                    {visibleTrades.map(trade => (
                      <div
                        key={trade.id}
                        className="relative rounded-lg overflow-hidden"
                        style={{ background: '#0d1117', border: '1px solid #21262d' }}
                      >
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'linear-gradient(to bottom, #3fb950, #2ea043)' }} />
                        {/* Subtle left glow */}
                        <div className="absolute left-0 top-0 bottom-0 w-20" style={{ background: 'linear-gradient(to right, rgba(63,185,80,0.04), transparent)' }} />

                        <div className="relative flex items-center py-3 px-4 pl-5">
                          {/* Profit */}
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold tracking-tight" style={{ color: '#3fb950' }}>
                              {formatAmount(trade.profit)}
                            </p>
                            <p className="text-[11px]" style={{ color: '#484f58' }}>Profit</p>
                            {trade.account_type && (
                              <p className="text-[11px] mt-0.5" style={{ color: '#484f58' }}>
                                <span style={{ color: '#7c3aed' }}>↗</span> {trade.account_type}
                              </p>
                            )}
                          </div>

                          {/* Middle stats */}
                          <div className="hidden sm:flex items-center space-x-5 mr-5">
                            {trade.duration && (
                              <div className="text-center">
                                <p className="text-xs font-medium" style={{ color: '#e6edf3' }}>{trade.duration}</p>
                                <p className="text-[10px]" style={{ color: '#484f58' }}>Duration</p>
                              </div>
                            )}
                            {trade.close_date && (
                              <div className="text-center">
                                <p className="text-xs font-medium" style={{ color: '#e6edf3' }}>{formatDate(trade.close_date)}</p>
                                <p className="text-[10px]" style={{ color: '#484f58' }}>Closed</p>
                              </div>
                            )}
                          </div>

                          {/* Symbol + Direction */}
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="flex items-center space-x-1.5 justify-end">
                                <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>{trade.symbol}</span>
                                <span className="text-[10px] font-bold px-1.5 py-[1px] rounded" style={{
                                  background: trade.direction === 'buy' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                                  color: trade.direction === 'buy' ? '#3fb950' : '#f85149',
                                  border: `1px solid ${trade.direction === 'buy' ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.2)'}`
                                }}>
                                  {trade.direction === 'buy' ? 'Buy' : 'Sell'}
                                </span>
                              </div>
                              <p className="text-[10px] mt-0.5" style={{ color: '#484f58' }}>Symbol</p>
                            </div>
                            {trade.volume > 0 && (
                              <div className="text-center pl-3" style={{ borderLeft: '1px solid #21262d' }}>
                                <p className="text-xs font-medium" style={{ color: '#e6edf3' }}>{trade.volume}</p>
                                <p className="text-[10px]" style={{ color: '#484f58' }}>Volume</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {trades.length > 4 && !showAllTrades && (
                      <button
                        onClick={() => setShowAllTrades(true)}
                        className="w-full py-2 text-xs font-medium rounded-lg transition-colors"
                        style={{ background: '#21262d', color: '#7d8590', border: '1px solid #30363d' }}
                      >
                        Show more
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Community */}
            {community.length > 0 && (
              <div className="rounded-xl" style={{ background: '#161b22', border: '1px solid #21262d' }}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>FundedCobra Community</h2>
                  <Link
                    to="/public/leaderboard"
                    className="text-xs px-2.5 py-1 rounded-md transition-colors"
                    style={{ background: '#21262d', color: '#7d8590', border: '1px solid #30363d' }}
                  >
                    Show all
                  </Link>
                </div>

                <div className="px-5 pb-4">
                  <div className="flex space-x-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#21262d transparent' }}>
                    {community.map(trader => (
                      <Link
                        key={trader.id}
                        to={trader.user_id ? `/trader/${trader.user_id}` : '#'}
                        className="flex-shrink-0 w-[120px] block"
                      >
                        <div className="rounded-lg p-3 text-center transition-colors"
                          style={{ background: '#0d1117', border: '1px solid #21262d' }}
                        >
                          <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center overflow-hidden"
                            style={{ background: '#21262d', border: '1px solid #30363d' }}
                          >
                            {trader.avatar_url ? (
                              <img src={trader.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-semibold" style={{ color: '#7d8590' }}>
                                {getInitials(trader.display_name)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold truncate" style={{ color: '#e6edf3' }}>{trader.display_name}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: '#484f58' }}>
                            Rewarded: <span style={{ color: '#3fb950' }}>${trader.total_payout.toLocaleString()}</span>
                          </p>
                          <button
                            className="mt-2 w-full py-1 rounded-md text-[10px] font-medium transition-colors"
                            style={{ background: '#7c3aed', color: '#fff' }}
                          >
                            View
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer style={{ borderTop: '1px solid #21262d' }} className="mt-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
          <p className="text-[10px] leading-relaxed" style={{ color: '#484f58' }}>
            All trades are simulated and provided for informational and educational purposes only. They do not constitute financial, investment, legal, or tax advice.
            Users may be onboarded under different legal entities and subject to varying rules, trading conditions, regulatory requirements, and investor protections.
            Variations in leverage and other trading parameters may materially affect performance outcomes. Past performance is not indicative of future results.
          </p>
          <p className="text-[10px] leading-relaxed mt-3" style={{ color: '#484f58' }}>
            All information provided on this site is intended solely for educational purposes related to trading on financial markets and does not serve in any way as a specific investment recommendation,
            business recommendation, investment opportunity analysis or similar general recommendation regarding the trading of investment instruments. FundedCobra only provides services of simulated trading
            and educational tools for traders. FundedCobra does not act as a broker and do not accept any deposits.
          </p>
          <p className="text-[10px] mt-4" style={{ color: '#30363d' }}>
            {new Date().getFullYear()} © Copyright · FundedCobra · Made with ❤️ for trading.
          </p>
        </div>
      </footer>
    </div>
  );
}
