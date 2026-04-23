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
    <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-[#bd4dd6] drop-shadow-[0_0_8px_rgba(189,77,214,0.8)]" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Global Arena</h2>
        </div>
        <Link
          to="/leaderboard"
          className="text-[10px] font-black text-[#1D9BF0] hover:text-[#38bdf8] uppercase tracking-widest border border-[#1D9BF0]/30 px-3 py-1.5 rounded-lg bg-[#1D9BF0]/10 transition-colors drop-shadow-[0_0_5px_rgba(29,155,240,0.5)]"
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
                className="flex items-center space-x-4 p-4 border-b border-[#2A2A2A] last:border-0 hover:bg-[#2A2A2A]/30 transition-colors cursor-pointer"
              >
                {/* Rank */}
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded overflow-hidden ${
                    index === 0 ? 'bg-[#bd4dd6] text-white' : 
                    index === 1 ? 'bg-[#2A2A2A] text-white' :
                    index === 2 ? 'bg-[#2A2A2A] text-white' : 
                    'bg-[#2A2A2A] text-[#a0a0a0]'
                  }`}>
                    {trader.avatar_url ? (
                      <img src={trader.avatar_url} alt={trader.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">
                        {getInitials(trader.display_name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col items-start gap-1">
                    <p className="text-sm font-bold text-white truncate">{trader.display_name}</p>
                    {trader.account_type && (
                      <span className="bg-[#2A2A2A] text-[#a0a0a0] text-[10px] px-2 py-0.5 rounded-sm">
                        {trader.account_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payout Amount */}
                <div className="text-right flex-shrink-0 px-4">
                  <p className="text-sm font-bold text-green-500">
                    ${trader.total_payout.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#808080]">Rewarded</p>
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