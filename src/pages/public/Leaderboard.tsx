import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, User, TrendingUp, Award, ArrowUpRight } from 'lucide-react';
import { getLeaderboard } from '../../lib/certificates';
import type { LeaderboardEntry } from '../../lib/certificates';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setEntries(data);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500 w-5 text-center">{index + 1}</span>;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent';
    if (index === 1) return 'border-gray-400/20 bg-gradient-to-r from-gray-400/5 to-transparent';
    if (index === 2) return 'border-amber-600/20 bg-gradient-to-r from-amber-600/5 to-transparent';
    return 'border-white/5 hover:border-white/10';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="FundedCobra" className="h-10 object-contain" />
          </Link>
          <a
            href="https://fundedcobra.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get Funded
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">Leaderboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Top Funded Traders
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Our most successful traders who have received payouts from FundedCobra.
            Every payout listed here is verified.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{entries.length}</p>
            <p className="text-xs text-gray-400 mt-1">Funded Traders</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              ${entries.reduce((sum, e) => sum + e.total_payout, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Total Paid Out</p>
          </div>
          <div className="rounded-xl bg-primary-500/5 border border-primary-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-primary-400">
              {entries.reduce((sum, e) => sum + (e.certificate_count || 0), 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Certificates Issued</p>
          </div>
        </div>

        {/* Top 3 Podium */}
        {entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            {/* 2nd Place */}
            <div className="rounded-2xl border border-gray-400/20 bg-white/[0.02] p-5 text-center mt-8">
              <div className="w-14 h-14 rounded-full bg-gray-400/10 flex items-center justify-center mx-auto mb-3 border border-gray-400/20">
                <span className="text-lg font-bold text-gray-300">
                  {getInitials(entries[1].display_name)}
                </span>
              </div>
              <Medal className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white truncate">{entries[1].display_name}</h3>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                ${entries[1].total_payout.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rewarded</p>
              {entries[1].user_id && (
                <Link
                  to={`/trader/${entries[1].user_id}`}
                  className="inline-flex items-center space-x-1 mt-3 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <span>View Profile</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* 1st Place */}
            <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 border-2 border-yellow-500/30">
                <span className="text-xl font-bold text-yellow-400">
                  {getInitials(entries[0].display_name)}
                </span>
              </div>
              <Crown className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white truncate">{entries[0].display_name}</h3>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                ${entries[0].total_payout.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rewarded</p>
              {entries[0].user_id && (
                <Link
                  to={`/trader/${entries[0].user_id}`}
                  className="inline-flex items-center space-x-1 mt-3 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <span>View Profile</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* 3rd Place */}
            <div className="rounded-2xl border border-amber-600/20 bg-white/[0.02] p-5 text-center mt-12">
              <div className="w-14 h-14 rounded-full bg-amber-600/10 flex items-center justify-center mx-auto mb-3 border border-amber-600/20">
                <span className="text-lg font-bold text-amber-500">
                  {getInitials(entries[2].display_name)}
                </span>
              </div>
              <Medal className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white truncate">{entries[2].display_name}</h3>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                ${entries[2].total_payout.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rewarded</p>
              {entries[2].user_id && (
                <Link
                  to={`/trader/${entries[2].user_id}`}
                  className="inline-flex items-center space-x-1 mt-3 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <span>View Profile</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              <span>All Funded Traders</span>
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No traders on the leaderboard yet. Be the first!
              </div>
            ) : (
              entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center space-x-4 px-5 py-4 transition-colors ${getRankStyle(index)}`}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    {getRankIcon(index)}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-300">
                      {getInitials(entry.display_name)}
                    </span>
                  </div>

                  {/* Name & Type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{entry.display_name}</p>
                    {entry.account_type && (
                      <p className="text-xs text-gray-500">{entry.account_type}</p>
                    )}
                  </div>

                  {/* Payout Amount */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">
                      ${entry.total_payout.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Rewarded</p>
                  </div>

                  {/* View Profile */}
                  {entry.user_id && (
                    <Link
                      to={`/trader/${entry.user_id}`}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0"
                      title="View Profile"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-primary-500/5 via-emerald-500/5 to-primary-500/5 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Want to see your name here?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join FundedCobra and start your journey to becoming a funded trader. Get paid for your trading skills.
          </p>
          <a
            href="https://fundedcobra.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
          >
            <span>Start Trading Now</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-xs text-gray-600 text-center">
            All information provided on this site is intended solely for educational purposes related to trading on financial markets.
            Past performance is not indicative of future results.
          </p>
          <p className="text-xs text-gray-600 text-center mt-2">
            {new Date().getFullYear()} © FundedCobra. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
