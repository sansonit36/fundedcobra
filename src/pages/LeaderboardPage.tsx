import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, User, TrendingUp, Award, ArrowUpRight, ExternalLink } from 'lucide-react';
import { getLeaderboard } from '../lib/certificates';
import type { LeaderboardEntry } from '../lib/certificates';

export default function LeaderboardPage() {
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5 animate-pulse">
              <div className="h-8 bg-white/10 rounded w-20 mx-auto mb-2" />
              <div className="h-4 bg-white/10 rounded w-24 mx-auto" />
            </div>
          ))}
        </div>
        <div className="card-gradient rounded-2xl p-8 border border-white/5">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 h-4 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm text-gray-400">Our top funded traders</p>
          </div>
        </div>
        <a
          href="/public/leaderboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Public page</span>
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-gradient rounded-2xl p-5 border border-white/5 text-center">
          <p className="text-2xl font-bold text-white">{entries.length}</p>
          <p className="text-xs text-gray-400 mt-1">Funded Traders</p>
        </div>
        <div className="card-gradient rounded-2xl p-5 border border-emerald-500/10 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            ${entries.reduce((sum, e) => sum + e.total_payout, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total Paid Out</p>
        </div>
        <div className="card-gradient rounded-2xl p-5 border border-primary-500/10 text-center">
          <p className="text-2xl font-bold text-primary-400">
            {entries.reduce((sum, e) => sum + (e.certificate_count || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Certificates Issued</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd Place */}
          <div className="card-gradient rounded-2xl border border-gray-400/20 p-5 text-center mt-8">
            <div className="w-12 h-12 rounded-full bg-gray-400/10 flex items-center justify-center mx-auto mb-3 border border-gray-400/20">
              <span className="text-base font-bold text-gray-300">{getInitials(entries[1].display_name)}</span>
            </div>
            <Medal className="w-5 h-5 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white truncate">{entries[1].display_name}</h3>
            <p className="text-lg font-bold text-emerald-400 mt-1">${entries[1].total_payout.toLocaleString()}</p>
            {entries[1].user_id && (
              <Link to={`/trader/${entries[1].user_id}`} className="inline-flex items-center space-x-1 mt-2 text-xs text-primary-400 hover:text-primary-300">
                <span>Profile</span><ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* 1st Place */}
          <div className="card-gradient rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 border-2 border-yellow-500/30">
              <span className="text-lg font-bold text-yellow-400">{getInitials(entries[0].display_name)}</span>
            </div>
            <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white truncate">{entries[0].display_name}</h3>
            <p className="text-xl font-bold text-emerald-400 mt-1">${entries[0].total_payout.toLocaleString()}</p>
            {entries[0].user_id && (
              <Link to={`/trader/${entries[0].user_id}`} className="inline-flex items-center space-x-1 mt-2 text-xs text-primary-400 hover:text-primary-300">
                <span>Profile</span><ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* 3rd Place */}
          <div className="card-gradient rounded-2xl border border-amber-600/20 p-5 text-center mt-12">
            <div className="w-12 h-12 rounded-full bg-amber-600/10 flex items-center justify-center mx-auto mb-3 border border-amber-600/20">
              <span className="text-base font-bold text-amber-500">{getInitials(entries[2].display_name)}</span>
            </div>
            <Medal className="w-5 h-5 text-amber-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white truncate">{entries[2].display_name}</h3>
            <p className="text-lg font-bold text-emerald-400 mt-1">${entries[2].total_payout.toLocaleString()}</p>
            {entries[2].user_id && (
              <Link to={`/trader/${entries[2].user_id}`} className="inline-flex items-center space-x-1 mt-2 text-xs text-primary-400 hover:text-primary-300">
                <span>Profile</span><ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Full Table */}
      <div className="card-gradient rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <span>All Funded Traders</span>
          </h2>
        </div>

        <div className="divide-y divide-white/5">
          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No traders on the leaderboard yet</p>
              <p className="text-gray-500 text-sm mt-1">Top performers will appear here after payouts</p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center space-x-4 px-5 py-4 transition-colors ${getRankStyle(index)}`}
              >
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-300">{getInitials(entry.display_name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{entry.display_name}</p>
                  {entry.account_type && <p className="text-xs text-gray-500">{entry.account_type}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">${entry.total_payout.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Rewarded</p>
                </div>
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
    </div>
  );
}
