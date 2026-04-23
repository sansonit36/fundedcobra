import React, { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Medal, Filter, User } from 'lucide-react';

interface Trader {
  id: string;
  name: string;
  win_rate: number;
  profit_factor: number;
  total_profit: number;
  rank: number;
  change: number;
}

type SortKey = 'win_rate' | 'profit_factor' | 'total_profit';

const mockTraders: Trader[] = [
  {
    id: '1',
    name: 'John Doe',
    win_rate: 65.5,
    profit_factor: 2.3,
    total_profit: 2500,
    rank: 1,
    change: 2
  },
  {
    id: '2',
    name: 'Sarah Chen',
    win_rate: 70.2,
    profit_factor: 2.8,
    total_profit: 5000,
    rank: 2,
    change: -1
  },
  {
    id: '3',
    name: 'Mike Johnson',
    win_rate: 62.8,
    profit_factor: 2.1,
    total_profit: 1800,
    rank: 3,
    change: 1
  },
  {
    id: '4',
    name: 'Emma Wilson',
    win_rate: 58.5,
    profit_factor: 1.9,
    total_profit: 1200,
    rank: 4,
    change: -2
  },
  {
    id: '5',
    name: 'David Brown',
    win_rate: 55.0,
    profit_factor: 1.7,
    total_profit: 950,
    rank: 5,
    change: 0
  }
];

export default function Leaderboard() {
  const [traders] = useState<Trader[]>(mockTraders);
  const [sortBy, setSortBy] = useState<SortKey>('total_profit');
  const [timeFrame, setTimeFrame] = useState('week');

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-500';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className={`font-bold ${getRankColor(rank)}`}>{rank}</span>;
    }
  };

  const sortedTraders = [...traders].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="bg-[#111118] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="p-5 border-b border-white/[0.04]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-sm font-bold text-white">Top Traders</h2>
          
          <div className="flex items-center space-x-2">
            {/* Time Frame Filter */}
            <div className="relative">
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#08080c] border border-white/[0.06] text-gray-300 text-xs font-medium focus:outline-none focus:border-primary-500/40 transition-colors"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
              <Filter className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#08080c] border border-white/[0.06] text-gray-300 text-xs font-medium focus:outline-none focus:border-primary-500/40 transition-colors"
              >
                <option value="total_profit">Profit</option>
                <option value="win_rate">Win Rate</option>
                <option value="profit_factor">Profit Factor</option>
              </select>
              <Filter className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Rank</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Trader</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Win Rate</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Profit Factor</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Total Profit</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Change</th>
            </tr>
          </thead>
          <tbody>
            {sortedTraders.map((trader) => (
              <tr key={trader.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors last:border-b-0">
                <td className="px-5 py-3.5 w-16">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04]">
                    {getRankIcon(trader.rank)}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/[0.08] border border-primary-500/[0.12] flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{trader.name}</div>
                      <div className="text-[10px] text-gray-600 font-mono">ID: #{trader.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="font-semibold text-white text-sm">{trader.win_rate.toFixed(1)}%</div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="font-semibold text-white text-sm">{trader.profit_factor.toFixed(2)}</div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="font-bold text-green-400 text-sm font-mono">
                    ${trader.total_profit.toLocaleString()}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right w-20">
                  {trader.change !== 0 && (
                    <div className={`flex items-center justify-end text-xs font-semibold ${
                      trader.change > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trader.change > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 mr-1" />
                      )}
                      {Math.abs(trader.change)}
                    </div>
                  )}
                  {trader.change === 0 && (
                    <div className="text-gray-600 text-xs">-</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}