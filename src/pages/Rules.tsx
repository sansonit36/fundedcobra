import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, X, DollarSign, Target, TrendingDown, Clock, Shield, Zap, Activity, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccountRule {
  account_package_name: string;
  withdrawal_target_percent: number;
  has_profit_target: boolean;
  profit_target_percent: number | null;
  minimum_trading_days: number;
  has_minimum_trading_days: boolean;
  daily_payout_enabled: boolean;
  weekly_payout_enabled: boolean;
  minimum_withdrawal_amount: number;
  single_trade_limit_percent: number;
  daily_drawdown_percent: number;
  overall_drawdown_percent: number;
  rule_description: string;
  rule_version: string;
}

export default function Rules() {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [accountRules, setAccountRules] = useState<AccountRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountRules();
  }, []);

  const loadAccountRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_rules')
        .select('*')
        .order('account_package_name');
      if (error) throw error;
      setAccountRules(data || []);
    } catch (err) {
      console.error('Error loading account rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSpecialAccount = (packageName: string) =>
    ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(packageName);

  const specialAccounts = accountRules.filter(r => isSpecialAccount(r.account_package_name) && r.rule_version !== 'legacy');
  const standardAccounts = accountRules.filter(r => !isSpecialAccount(r.account_package_name) && r.rule_version !== 'legacy');

  // Pick representative rule (all sizes share same params — just use first)
  const specialRef = specialAccounts[0];
  const standardRef = standardAccounts[0];

  const payoutLabel = (rule: AccountRule) => {
    if (rule.daily_payout_enabled && rule.weekly_payout_enabled) return 'Daily or Weekly';
    if (rule.daily_payout_enabled) return 'Daily';
    if (rule.weekly_payout_enabled) return 'Weekly';
    return '—';
  };

  const prohibitedPractices = [
    { label: 'Automated Bots / Expert Advisors (EAs)', note: 'All trading must be done manually by you.' },
    { label: 'High-Frequency Trading (HFT)', note: 'No rapid-fire orders placed by scripts.' },
    { label: 'Trades Held Under 60 Seconds', note: 'Every trade must stay open for at least 1 minute.' },
    { label: 'Martingale Strategy', note: 'Doubling down after losses to recover is not allowed.' },
    { label: 'Grid Trading', note: 'Pre-placed orders at set intervals are not permitted.' },
    { label: 'Arbitrage', note: 'Exploiting price differences across brokers is not allowed.' },
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

  const ParamRow = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A] last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="text-right">
        <span className={`font-bold text-sm ${accent || 'text-white'}`}>{value}</span>
        {sub && <span className="text-xs text-gray-500 ml-1.5">{sub}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trading Rules</h1>
        <p className="text-gray-400 mt-1">Everything you need to know before you start trading your funded account.</p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A] h-40" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Global Rules Banner */}
          <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] overflow-hidden">
            <div className="p-4 border-b border-[#2A2A2A] bg-gradient-to-r from-[#bd4dd6]/10 to-transparent flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#bd4dd6]" />
              <h2 className="font-bold text-white">Universal Rules — Apply To All Accounts</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-[#2A2A2A]">
              {[
                { icon: TrendingDown, label: 'Daily Loss Limit', value: '8%', note: 'From start-of-day equity', color: 'text-red-400' },
                { icon: AlertTriangle, label: 'Max Loss Limit', value: '12%', note: 'Static from start', color: 'text-orange-400' },
                { icon: Target, label: 'Single Trade Limit', value: '25%', note: 'of payout target', color: 'text-yellow-400' },
                { icon: Activity, label: 'Platform', value: 'MT5', note: 'Exness · 1:100 leverage', color: 'text-[#bd4dd6]' },
              ].map(({ icon: Icon, label, value, note, color }) => (
                <div key={label} className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${color}`}>{value}</span>
                  <span className="text-xs text-gray-500">{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loss Limit Explainer */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300 space-y-1">
              <p><strong className="text-white">Daily Loss (8%):</strong> Calculated from your equity at the <strong className="text-white">start of each trading day</strong>. If you begin the day at $10,500, your floor for that day is $9,660 — you cannot lose more than 8% of that opening balance.</p>
              <p><strong className="text-white">Overall Loss (12% static):</strong> Fixed from your starting balance — never moves. On a $10K account, you can never go below $8,800.</p>
            </div>
          </div>

          {/* Account Type Parameter Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Special Instant */}
            {specialRef && (
              <div className="bg-[#1e1e1e] rounded-2xl border border-yellow-500/30 overflow-hidden">
                <div className="p-4 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-transparent flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Special Instant</h3>
                    <p className="text-xs text-yellow-400/80">$1,250 · $3,500 · $5,000</p>
                  </div>
                </div>
                <div className="px-5 py-1">
                  <ParamRow label="Withdrawal Target" value={`${specialRef.withdrawal_target_percent}%`} sub="of account balance" accent="text-yellow-400" />
                  <ParamRow label="Profit Target" value="None" sub="trade freely" accent="text-green-400" />
                  <ParamRow label="Payout Schedule" value={payoutLabel(specialRef)} accent="text-green-400" />
                  <ParamRow
                    label="Minimum Trading Days"
                    value={specialRef.has_minimum_trading_days ? `${specialRef.minimum_trading_days} days/week` : 'No minimum'}
                    accent="text-gray-300"
                  />
                  <ParamRow label="Daily Loss Limit" value={`${specialRef.daily_drawdown_percent}%`} sub="trailing" accent="text-red-400" />
                  <ParamRow label="Max Loss Limit" value={`${specialRef.overall_drawdown_percent}%`} sub="static" accent="text-orange-400" />
                  <ParamRow label="Min. Withdrawal" value={`$${specialRef.minimum_withdrawal_amount}`} accent="text-gray-300" />
                  <ParamRow label="Profit Split" value="80%" accent="text-[#bd4dd6]" />
                </div>
              </div>
            )}

            {/* Premium Instant */}
            {standardRef && (
              <div className="bg-[#1e1e1e] rounded-2xl border border-[#bd4dd6]/30 overflow-hidden">
                <div className="p-4 border-b border-[#bd4dd6]/20 bg-gradient-to-r from-[#bd4dd6]/10 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#bd4dd6]" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Premium Instant</h3>
                      <p className="text-xs text-[#bd4dd6]/80">$10K · $25K · $50K · $100K · $200K</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="text-xs text-[#bd4dd6] underline underline-offset-2 hover:text-white transition-colors"
                  >
                    Full Rules
                  </button>
                </div>
                <div className="px-5 py-1">
                  <ParamRow label="Withdrawal Target" value={`${standardRef.withdrawal_target_percent}%`} sub="of account balance" accent="text-[#bd4dd6]" />
                  <ParamRow
                    label="Profit Target"
                    value={standardRef.has_profit_target && standardRef.profit_target_percent ? `${standardRef.profit_target_percent}%` : 'None'}
                    accent="text-green-400"
                  />
                  <ParamRow label="Payout Schedule" value={payoutLabel(standardRef)} accent="text-green-400" />
                  <ParamRow
                    label="Minimum Trading Days"
                    value={standardRef.has_minimum_trading_days ? `${standardRef.minimum_trading_days} days/week` : 'No minimum'}
                    accent="text-gray-300"
                  />
                  <ParamRow label="Daily Loss Limit" value={`${standardRef.daily_drawdown_percent}%`} sub="trailing" accent="text-red-400" />
                  <ParamRow label="Max Loss Limit" value={`${standardRef.overall_drawdown_percent}%`} sub="static" accent="text-orange-400" />
                  <ParamRow label="Min. Withdrawal" value={`$${standardRef.minimum_withdrawal_amount}`} accent="text-gray-300" />
                  <ParamRow label="Profit Split" value="80%" accent="text-[#bd4dd6]" />
                </div>
              </div>
            )}
          </div>

          {/* Single Trade Limit Warning */}
          <div className="bg-[#1e1e1e] rounded-xl border border-orange-500/20 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-sm mb-0.5">25% Single Trade Rule</p>
              <p className="text-gray-400 text-xs">No single trade can earn more than 25% of your total payout target. This ensures consistent skill — not one lucky win — earns your payout. <span className="text-orange-400 font-semibold">If exceeded: payout is reduced from 80% to 40% for that cycle.</span></p>
            </div>
          </div>

          {/* Dos & Don'ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Prohibited */}
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

            {/* Allowed */}
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
        </>
      )}

      {/* Full Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl bg-[#1a1a1a] sm:rounded-2xl rounded-t-2xl border border-[#2A2A2A] flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-[#2A2A2A] flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Comprehensive Trading Rules</h3>
                <p className="text-xs text-gray-400 mt-0.5">Applies to all Premium Instant Accounts</p>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-gray-400 hover:text-white flex-shrink-0 ml-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-4">
              <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A]">
                <h4 className="text-sm font-bold text-white mb-3">Platform & Conditions</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-300">
                  <span>📱 <strong className="text-white">Platform:</strong> MetaTrader 5</span>
                  <span>⚡ <strong className="text-white">Leverage:</strong> 1:100</span>
                  <span>📈 <strong className="text-white">Spreads:</strong> From 0.2 pips</span>
                  <span>🕐 <strong className="text-white">Hours:</strong> 24/5</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#bd4dd6]/5 border border-[#bd4dd6]/20">
                <h4 className="text-sm font-bold text-[#bd4dd6] mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Risk Management
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-[#bd4dd6]">•</span> Stop loss is recommended but not required</li>
                  <li className="flex items-start gap-2"><span className="text-[#bd4dd6]">•</span> Lot size must be proportional to account equity</li>
                  <li className="flex items-start gap-2"><span className="text-[#bd4dd6]">•</span> Risk per trade should not exceed 5% of account equity</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <h4 className="text-sm font-bold text-red-400 mb-3">⚠️ Loss Limits</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-red-400 font-bold">•</span><span><strong className="text-white">Daily: 8%.</strong> Measured from your equity at the <strong className="text-white">start of each trading day</strong>. If your day opens at $10,500, the maximum you can lose that day is $840 (8% of $10,500).</span></li>
                  <li className="flex items-start gap-2"><span className="text-red-400 font-bold">•</span><span><strong className="text-white">Overall (static): 12%.</strong> Fixed from starting balance — never changes regardless of profits.</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Account Termination
                </h4>
                <ul className="space-y-1.5 text-sm text-gray-300">
                  {['Breaching the maximum drawdown limit', 'Violating any prohibited trading practice', 'Suspicious or manipulative trading activity'].map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
