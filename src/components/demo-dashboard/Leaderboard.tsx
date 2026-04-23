import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, User, ArrowUpRight, Crown } from 'lucide-react';
import { getLeaderboard } from '../../lib/certificates';
import type { LeaderboardEntry } from '../../lib/certificates';

export default function Leaderboard() {
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setTraders(data.slice(0, 5)); // Show top 5 on dashboard
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
    return <span className="text-sm font-bold text-gray-500">{index + 1}</span>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-sm">
      <div className="flex items-center justify-between p-5 border-b border-[#30363D]">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-[#8B949E]" />
          <h2 className="text-sm font-bold text-[#E6EDF3] uppercase tracking-widest">Global Ranking</h2>
        </div>
        <Link
          to="/leaderboard"
          className="text-[11px] font-bold text-[#8B949E] uppercase tracking-widest hover:text-[#E6EDF3] transition-colors flex items-center"
        >
          <span>View Ledger</span>
        </Link>
      </div>
      
      <div className="p-5">

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-sm bg-[#0E1117] border border-[#30363D] animate-pulse">
                <div className="w-8 h-8 bg-[#30363D]/50" />
                <div className="flex-1">
                  <div className="h-4 bg-[#30363D]/50 w-24 mb-1" />
                  <div className="h-3 bg-[#30363D]/50 w-16" />
                </div>
                <div className="h-4 bg-[#30363D]/50 w-16" />
              </div>
            ))}
          </div>
        ) : traders.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No traders on the leaderboard yet</p>
            <p className="text-gray-500 text-xs mt-1">Top performers will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {traders.map((trader, index) => (
              <div
                key={trader.id}
                className={`flex items-center space-x-4 p-3 rounded-sm transition-colors ${
                  index === 0
                    ? 'bg-[#0E1117] border border-[#3FB950]/30'
                    : 'bg-[#0E1117] border border-[#30363D] hover:border-[#8B949E]'
                }`}
              >
                {/* Rank */}
                <div className="w-8 h-8 bg-[#161B22] border border-[#30363D] flex items-center justify-center flex-shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${
                    index === 0 ? 'bg-[#3FB950]/10 border-[#3FB950]/20' : 'bg-[#161B22] border-[#30363D]'
                  }`}>
                    <span className={`text-[10px] font-bold ${index === 0 ? 'text-[#3FB950]' : 'text-[#8B949E]'}`}>
                      {getInitials(trader.display_name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#E6EDF3] tracking-wide uppercase truncate">{trader.display_name}</p>
                    {trader.account_type && (
                      <p className="text-[10px] text-[#8B949E] uppercase tracking-widest truncate">{trader.account_type}</p>
                    )}
                  </div>
                </div>

                {/* Payout Amount */}
                <div className="text-right flex-shrink-0 px-4 border-r border-[#30363D]">
                  <p className="text-[13px] font-bold text-[#1D9BF0] font-mono">
                    ${trader.total_payout.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-[#8B949E] uppercase tracking-widest">Rewarded</p>
                </div>

                {/* Profile Link */}
                {trader.user_id && (
                  <Link
                    to={`/trader/${trader.user_id}`}
                    className="p-1.5 flex items-center justify-center transition-colors text-[#8B949E] hover:text-[#E6EDF3] flex-shrink-0"
                    title="View Public Profile"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}