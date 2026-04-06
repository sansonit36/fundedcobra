import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, X, DollarSign, Target, TrendingDown, Clock, Shield, Zap, Activity } from 'lucide-react';
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

  const payoutLabel = (rule: AccountRule) => {
    if (rule.daily_payout_enabled && rule.weekly_payout_enabled) return 'Daily or Weekly';
    if (rule.daily_payout_enabled) return 'Daily';
    if (rule.weekly_payout_enabled) return 'Weekly';
    return '—';
  };

  const prohibitedPractices = [
    { label: 'Automated bots / Expert Advisors (EAs)', note: 'All trading must be done manually by you.' },
    { label: 'High-frequency trading (HFT)', note: 'No rapid-fire orders placed by scripts.' },
    { label: 'Trades held under 60 seconds', note: 'Every trade must stay open for at least 1 minute.' },
    { label: 'Martingale strategy', note: "Doubling down after losses to recover is not allowed." },
    { label: 'Grid trading', note: 'Pre-placed orders at set intervals are not permitted.' },
    { label: 'Arbitrage', note: 'Exploiting price differences across brokers is not allowed.' },
    { label: 'More than 3 consecutive same-direction trades', note: "Don't keep placing the same buy or sell over and over — vary your setups." },
    { label: 'Hedging on the same pair', note: 'No simultaneous buy and sell on the same instrument.' },
  ];

  const allowedPractices = [
    'News trading — you can trade around economic events',
    'Weekend position holding — leave trades open over the weekend',
    'Multiple pairs at once',
    'Both long (buy) and short (sell) positions',
    'Partial position closing',
    'Modifying stop loss after entry',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trading Rules</h1>
        <p className="text-gray-400 mt-1">Clear rules for your funded account — read before you start trading.</p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-gradient rounded-2xl p-6 border border-white/5 h-32" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Quick overview: drawdown + platform */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-gradient rounded-2xl p-5 border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-base font-bold text-white">Loss Limits — All Accounts</h3>
              </div>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">•</span>
                  <span><strong className="text-white">Daily (trailing): 8%.</strong> Calculated from the highest equity you reached that day — it moves up with your profits but never down. E.g. peak $11,000 → limit is $10,120.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">•</span>
                  <span><strong className="text-white">Overall (static): 12%.</strong> Fixed at 12% below your starting balance — it never moves. On $10,000 → never go below $8,800 or the account closes.</span>
                </li>
              </ul>
            </div>

            <div className="card-gradient rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white">Platform & Conditions</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-300">
                <span>📱 <strong className="text-white">Platform:</strong> MT5</span>
                <span>⚡ <strong className="text-white">Leverage:</strong> 1:100</span>
                <span>📈 <strong className="text-white">Spreads:</strong> From 0.2 pips</span>
                <span>🕐 <strong className="text-white">Hours:</strong> 24/5</span>
                <span>✅ News trading allowed</span>
                <span>✅ Weekend holds allowed</span>
              </div>
            </div>
          </div>

          {/* 25% Single Trade Limit */}
          {accountRules.length > 0 && (
            <div className="card-gradient rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">
                    📊 {accountRules[0]?.single_trade_limit_percent || 25}% Single Trade Limit
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    No single trade can earn more than <strong className="text-orange-400">{accountRules[0]?.single_trade_limit_percent || 25}% of your withdrawal target</strong>. This ensures consistent skill — not one lucky win — earns your payout.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                    {accountRules.filter(r => r.rule_version !== 'legacy').map((rule) => {
                      const accountSize = parseFloat(rule.account_package_name.replace(/[^0-9.]/g, ''));
                      const targetAmount = accountSize * rule.withdrawal_target_percent / 100;
                      const maxPerTrade = targetAmount * rule.single_trade_limit_percent / 100;
                      return (
                        <div key={rule.account_package_name} className="p-3 rounded-lg bg-white/5 border border-orange-500/10">
                          <p className="text-gray-400 mb-1">{rule.account_package_name.replace(' Account', '')}</p>
                          <p className="text-orange-400 font-bold text-sm">Max: ${maxPerTrade.toFixed(0)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-300">
                      <strong>If exceeded:</strong> Your payout is reduced from 50% to 25% for that cycle. Trade consistently, not just on one big bet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Special Instant Accounts */}
          {specialAccounts.length > 0 && (
            <div className="card-gradient rounded-2xl p-6 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-5">
                <Zap className="w-6 h-6 text-yellow-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Special Instant Accounts</h2>
                  <p className="text-sm text-gray-400 mt-0.5">$1,250 · $3,500 · $5,000</p>
                </div>
              </div>

              <div className="space-y-4">
                {specialAccounts.map((rule) => {
                  const accountSize = parseFloat(rule.account_package_name.replace(/[^0-9.]/g, ''));
                  const targetAmount = accountSize * rule.withdrawal_target_percent / 100;
                  return (
                    <div key={rule.account_package_name} className="p-5 rounded-xl bg-white/5 border border-yellow-500/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">{rule.account_package_name}</h3>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {rule.daily_payout_enabled && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Daily Payouts ✓</span>
                          )}
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">No Profit Target</span>
                        </div>
                      </div>

                      {rule.rule_description && (
                        <p className="text-gray-400 text-sm mb-4">{rule.rule_description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Target className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs text-gray-400">Withdrawal Target</span>
                          </div>
                          <div className="text-white font-bold">{rule.withdrawal_target_percent}%</div>
                          <p className="text-xs text-gray-500 mt-1">= ${targetAmount.toFixed(0)} for this account</p>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs text-gray-400">Trading Days</span>
                          </div>
                          <div className="text-white font-bold">
                            {rule.has_minimum_trading_days ? `${rule.minimum_trading_days}/week min` : 'No minimum'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs text-gray-400">Payout Schedule</span>
                          </div>
                          <div className="text-white font-bold">{payoutLabel(rule)}</div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs text-gray-400">Daily Drawdown</span>
                          </div>
                          <div className="text-white font-bold">{rule.daily_drawdown_percent}% <span className="text-xs text-gray-500 font-normal">(trailing)</span></div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs text-gray-400">Overall Drawdown</span>
                          </div>
                          <div className="text-white font-bold">{rule.overall_drawdown_percent}% <span className="text-xs text-gray-500 font-normal">(static)</span></div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs text-gray-400">Min. Withdrawal</span>
                          </div>
                          <div className="text-white font-bold">${rule.minimum_withdrawal_amount}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Premium Instant Accounts */}
          {standardAccounts.length > 0 && (
            <div className="card-gradient rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Premium Instant Accounts</h2>
                  <p className="text-sm text-gray-400 mt-0.5">$10,000 · $25,000 · $50,000 · $100,000 · $200,000</p>
                </div>
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg transition-colors border border-blue-500/20"
                >
                  Full Rules
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {standardAccounts.map((rule) => {
                  const accountSize = parseFloat(rule.account_package_name.replace(/[^0-9.]/g, ''));
                  const targetAmount = accountSize * rule.withdrawal_target_percent / 100;
                  return (
                    <div key={rule.account_package_name} className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-base font-bold text-white mb-3">{rule.account_package_name}</h3>
                      <div className="grid grid-cols-2 gap-2.5 text-sm">
                        <div className="p-2.5 rounded-lg bg-white/5">
                          <span className="text-gray-400 block text-xs mb-0.5">Withdrawal Target</span>
                          <span className="text-white font-semibold">{rule.withdrawal_target_percent}% <span className="text-gray-500 text-xs font-normal">= ${targetAmount.toFixed(0)}</span></span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5">
                          <span className="text-gray-400 block text-xs mb-0.5">Trading Days</span>
                          <span className="text-white font-semibold">
                            {rule.has_minimum_trading_days ? `${rule.minimum_trading_days}/week min` : 'None'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5">
                          <span className="text-gray-400 block text-xs mb-0.5">Daily Drawdown</span>
                          <span className="text-white font-semibold">{rule.daily_drawdown_percent}% <span className="text-gray-500 text-xs font-normal">(trailing)</span></span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5">
                          <span className="text-gray-400 block text-xs mb-0.5">Overall Drawdown</span>
                          <span className="text-white font-semibold">{rule.overall_drawdown_percent}% <span className="text-gray-500 text-xs font-normal">(static)</span></span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5">
                          <span className="text-gray-400 block text-xs mb-0.5">Payout</span>
                          <span className="text-white font-semibold">{payoutLabel(rule)}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5">
                          <span className="text-gray-400 block text-xs mb-0.5">Min. Withdrawal</span>
                          <span className="text-white font-semibold">${rule.minimum_withdrawal_amount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prohibited & Allowed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Prohibited */}
            <div className="card-gradient rounded-2xl p-5 border border-red-500/10">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" /> Not Allowed
              </h3>
              <div className="space-y-2">
                {prohibitedPractices.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white font-medium">{p.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allowed */}
            <div className="card-gradient rounded-2xl p-5 border border-green-500/10">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" /> Allowed
              </h3>
              <div className="space-y-2">
                {allowedPractices.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl bg-gray-900 sm:rounded-2xl rounded-t-2xl border border-white/10 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-white/10 flex-shrink-0">
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

            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-5">
              {/* Platform */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Platform & Conditions</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-300">
                  <span>📱 <strong className="text-white">Platform:</strong> MetaTrader 5</span>
                  <span>⚡ <strong className="text-white">Leverage:</strong> 1:100</span>
                  <span>📈 <strong className="text-white">Spreads:</strong> From 0.2 pips</span>
                  <span>🕐 <strong className="text-white">Hours:</strong> 24/5</span>
                </div>
              </div>

              {/* Risk management */}
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Risk Management
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-blue-400">•</span> Stop loss is recommended but not required</li>
                  <li className="flex items-start gap-2"><span className="text-blue-400">•</span> Lot size must be proportional to account equity</li>
                  <li className="flex items-start gap-2"><span className="text-blue-400">•</span> Risk per trade should not exceed 5% of account equity</li>
                </ul>
              </div>

              {/* Drawdown */}
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <h4 className="text-sm font-bold text-red-400 mb-3">⚠️ Loss Limits</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-red-400 font-bold">•</span><span><strong className="text-white">Daily (trailing): 8%.</strong> Moves up with your profits — always measured from the highest equity of the day.</span></li>
                  <li className="flex items-start gap-2"><span className="text-red-400 font-bold">•</span><span><strong className="text-white">Overall (static): 12%.</strong> Fixed from starting balance — never changes regardless of profits.</span></li>
                </ul>
              </div>

              {/* Termination */}
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
