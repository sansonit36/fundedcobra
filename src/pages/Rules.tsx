import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function Rules() {
  const prohibitedPractices = [
    { label: 'Automated Bots / Expert Advisors (EAs)', note: 'All trading must be done manually by you.' },
    { label: 'High-Frequency Trading (HFT)', note: 'No rapid-fire orders placed by scripts.' },
    { label: 'Trades Held Under 60 Seconds', note: 'Every trade must stay open for at least 1 minute.' },
    { label: '3+ Consecutive Same-Direction Trades', note: "Don't keep placing the same buy or sell over and over." },
    { label: 'Hedging On The Same Pair', note: 'No simultaneous buy and sell on the same instrument.' },
  ];

  const allowedPractices = [
    'News trading — trade around economic events',
    'Weekend position holding — leave trades open over the weekend',
    'Trading multiple pairs simultaneously',
    'Both long (buy) and short (sell) positions',
    'Partial position closing',
    'Modifying stop loss after entry',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trading Rules</h1>
        <p className="text-gray-400 mt-1">Everything you need to know before you start trading your funded account.</p>
      </div>

      {/* Dos & Don'ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#1e1e1e] rounded-2xl border border-red-500/20 overflow-hidden">
          <div className="p-4 border-b border-red-500/15 bg-gradient-to-r from-red-500/10 to-transparent flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <h3 className="font-bold text-white text-sm">Not Allowed</h3>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {prohibitedPractices.map((p, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium leading-snug">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl border border-green-500/20 overflow-hidden">
          <div className="p-4 border-b border-green-500/15 bg-gradient-to-r from-green-500/10 to-transparent flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <h3 className="font-bold text-white text-sm">You Can</h3>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {allowedPractices.map((p, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-300">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Single Trade Limit Warning */}
      <div className="bg-[#1e1e1e] rounded-xl border border-orange-500/20 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-white font-bold text-sm mb-0.5">25% Single Trade Rule</p>
          <p className="text-gray-400 text-xs">No single trade can earn more than 25% of your total payout target. This ensures consistent skill — not one lucky win — earns your payout. <span className="text-orange-400 font-semibold">If exceeded: payout is reduced from 80% to 40% for that cycle.</span></p>
        </div>
      </div>
    </div>
  );
}
