import React, { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle, CheckCircle, XCircle, X, DollarSign, Target, TrendingDown, Clock, Shield, Zap, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Rule {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

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

const generalRules: Rule[] = [
  {
    title: 'Trading Hours',
    description: '24/5 market access with weekend holding positions allowed.',
    icon: Clock,
    color: 'text-blue-400'
  },
  {
    title: 'Account Protection',
    description: 'Stop loss recommended but not mandatory. Maximum lot size based on account equity.',
    icon: Shield,
    color: 'text-purple-400'
  },
  {
    title: 'Universal Drawdown Limits',
    description: '8% daily trailing drawdown from highest equity. 12% maximum overall drawdown from initial equity.',
    icon: TrendingDown,
    color: 'text-red-400'
  },
  {
    title: 'Platform & Leverage',
    description: 'MetaTrader 5 (MT5) platform with 1:100 leverage. Spreads starting from 0.2 pips.',
    icon: Activity,
    color: 'text-green-400'
  }
];

export default function Rules() {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
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

  const isSpecialAccount = (packageName: string) => {
    return ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(packageName);
  };

  const specialAccounts = accountRules.filter(r => isSpecialAccount(r.account_package_name) && r.rule_version !== 'legacy');
  const standardAccounts = accountRules.filter(r => !isSpecialAccount(r.account_package_name) && r.rule_version !== 'legacy');
  const legacyAccounts = accountRules.filter(r => r.rule_version === 'legacy');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trading Rules</h1>
        <p className="text-gray-400 mt-1">Review our comprehensive trading rules and guidelines</p>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {generalRules.map((rule, index) => (
          <div key={index} className="card-gradient rounded-2xl p-6 border border-white/5">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-2xl bg-${rule.color.replace('text-', '')}/10 flex items-center justify-center flex-shrink-0`}>
                <rule.icon className={`w-6 h-6 ${rule.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{rule.title}</h3>
                <p className="text-gray-400">{rule.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 25% Single Trade Limit Explanation */}
      {!loading && accountRules.length > 0 && (
        <div className="card-gradient rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-3">📊 Understanding the {accountRules[0]?.single_trade_limit_percent || 25}% Single Trade Limit</h3>
              <p className="text-gray-300 mb-4">
                This rule means you can't make more than <strong className="text-orange-400">{accountRules[0]?.single_trade_limit_percent || 25}% of your withdrawal target</strong> from just ONE trade. We want to see consistent trading skills, not just lucky big wins!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Dynamic Examples from Database */}
                {accountRules.filter(r => r.rule_version !== 'legacy').slice(0, 2).map((rule) => {
                  const withdrawalTarget = rule.withdrawal_target_percent;
                  const singleTradeLimit = rule.single_trade_limit_percent;
                  // Parse account size from package name (e.g., "$1,250 Account" -> 1250)
                  const accountSize = parseFloat(rule.account_package_name.replace(/[^0-9.]/g, ''));
                  const targetAmount = (accountSize * withdrawalTarget / 100);
                  const maxPerTrade = (targetAmount * singleTradeLimit / 100);
                  const isSpecial = ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(rule.account_package_name);
                  
                  return (
                    <div key={rule.account_package_name} className="p-4 rounded-lg bg-white/5 border border-orange-500/10">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={isSpecial ? "text-yellow-400 text-2xl" : "text-blue-400 text-2xl"}>
                          {isSpecial ? '⚡' : '📈'}
                        </span>
                        <h4 className="text-sm font-semibold text-white">{rule.account_package_name}</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">Withdrawal Target: <span className="text-white font-medium">{withdrawalTarget}% = ${targetAmount.toFixed(2)}</span></p>
                        <p className="text-orange-400 font-bold">Max Per Trade: ${maxPerTrade.toFixed(2)}</p>
                        <p className="text-gray-400 text-xs mt-2">💡 You need about {Math.ceil(100 / singleTradeLimit)} profitable trades to reach your goal!</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Reference - Dynamic from Database */}
              <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <h4 className="text-sm font-semibold text-orange-400 mb-2">📋 Quick Reference - Max Profit Per Trade:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {accountRules.filter(r => r.rule_version !== 'legacy').map((rule) => {
                    const accountSize = parseFloat(rule.account_package_name.replace(/[^0-9.]/g, ''));
                    const targetAmount = (accountSize * rule.withdrawal_target_percent / 100);
                    const maxPerTrade = (targetAmount * rule.single_trade_limit_percent / 100);
                    
                    return (
                      <div key={rule.account_package_name}>
                        <span className="text-gray-400">{rule.account_package_name.replace(' Account', '')}:</span>
                        <span className="text-white font-bold ml-1">${maxPerTrade.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-300">
                  <strong>Important:</strong> If a single trade exceeds your limit, your account will be flagged and future payouts will be reduced to 25% instead of 50%. Trade consistently, not just luckily!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Accounts Info Banner (if exists) */}
      {!loading && legacyAccounts.length > 0 && (
        <div className="card-gradient rounded-2xl p-6 border border-gray-500/20">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Legacy Accounts Notice</h2>
              <p className="text-gray-400 mb-3">
                If you have accounts created before our v2 rule system, they continue using the original rules:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-gray-400">Profit Target:</span>
                  <span className="text-white font-medium ml-2">10%</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-gray-400">Min Trading Days:</span>
                  <span className="text-white font-medium ml-2">4 days/week</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-gray-400">Daily Drawdown:</span>
                  <span className="text-white font-medium ml-2">8%</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <span className="text-gray-400">Overall Drawdown:</span>
                  <span className="text-white font-medium ml-2">12%</span>
                </div>
              </div>
              <p className="text-gray-400 mt-3 text-sm">
                Your legacy accounts are protected and will never be affected by new rule changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Special Instant Accounts Section */}
      {!loading && specialAccounts.length > 0 && (
        <div className="card-gradient rounded-2xl p-6 border border-yellow-500/20">
          <div className="flex items-center space-x-3 mb-6">
            <Zap className="w-6 h-6 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Special Instant Accounts</h2>
              <p className="text-gray-400 mt-1">New special rules for $1,250, $3,500, and $5,000 accounts</p>
            </div>
          </div>

          <div className="space-y-6">
            {specialAccounts.map((rule) => (
              <div key={rule.account_package_name} className="p-6 rounded-xl bg-white/5 border border-yellow-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{rule.account_package_name}</h3>
                  <div className="flex space-x-2">
                    {rule.daily_payout_enabled && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        Daily Payouts
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                      No Profit Target
                    </span>
                  </div>
                </div>

                <p className="text-gray-300 mb-4">{rule.rule_description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-gray-400">Withdrawal Target</span>
                    </div>
                    <div className="text-lg font-bold text-white">{rule.withdrawal_target_percent}%</div>
                    <p className="text-xs text-gray-400 mt-2">
                      This is the minimum profit required before you can request a payout. For this account: ${(parseFloat(rule.account_package_name.replace(/[^0-9.]/g, '')) * rule.withdrawal_target_percent / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-400">Min Withdrawal</span>
                    </div>
                    <div className="text-lg font-bold text-white">${rule.minimum_withdrawal_amount}</div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-gray-400">Single Trade Limit</span>
                    </div>
                    <div className="text-lg font-bold text-white">{rule.single_trade_limit_percent}%</div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-gray-400">Daily Drawdown</span>
                    </div>
                    <div className="text-lg font-bold text-white">{rule.daily_drawdown_percent}%</div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-gray-400">Overall Drawdown</span>
                    </div>
                    <div className="text-lg font-bold text-white">{rule.overall_drawdown_percent}%</div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-400">Min Trading Days</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {rule.has_minimum_trading_days ? `${rule.minimum_trading_days}/week` : 'None'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-gray-400">Payout Schedule</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {rule.daily_payout_enabled && rule.weekly_payout_enabled ? 'Daily + Weekly' : 
                       rule.daily_payout_enabled ? 'Daily' : 
                       rule.weekly_payout_enabled ? 'Weekly' : 'Not Configured'}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-400">Profit Target</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {rule.has_profit_target ? `${rule.profit_target_percent}%` : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Instant Accounts Section */}
      {!loading && standardAccounts.length > 0 && (
        <div className="card-gradient rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Premium Instant Accounts</h2>
              <p className="text-gray-400 mt-1">Rules for all other account sizes</p>
            </div>
            <button
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium rounded-lg transition-colors"
            >
              View Detailed Rules
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standardAccounts.map((rule) => (
              <div key={rule.account_package_name} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">{rule.account_package_name}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400 block mb-1">Withdrawal Target</span>
                    <span className="text-white font-medium">{rule.withdrawal_target_percent}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400 block mb-1">Min Trading Days</span>
                    <span className="text-white font-medium">
                      {rule.has_minimum_trading_days ? `${rule.minimum_trading_days}/week` : 'None'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400 block mb-1">Daily Drawdown</span>
                    <span className="text-white font-medium">{rule.daily_drawdown_percent}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400 block mb-1">Overall Drawdown</span>
                    <span className="text-white font-medium">{rule.overall_drawdown_percent}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400 block mb-1">Payout Schedule</span>
                    <span className="text-white font-medium">
                      {rule.daily_payout_enabled && rule.weekly_payout_enabled ? 'Daily + Weekly' : 
                       rule.daily_payout_enabled ? 'Daily' : 
                       rule.weekly_payout_enabled ? 'Weekly' : 'Not Configured'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400 block mb-1">Min Withdrawal</span>
                    <span className="text-white font-medium">${rule.minimum_withdrawal_amount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#0a0f1e] pb-4">
              <h3 className="text-2xl font-bold text-white">Comprehensive Trading Rules</h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Prohibited Trading Practices */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                  <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  Prohibited Trading Practices
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'High-Frequency Trading (HFT)',
                    'Expert Advisors (EAs) or automated trading',
                    'Trades under 60 seconds duration',
                    'Martingale strategy',
                    'Grid trading',
                    'Arbitrage trading',
                    'One-sided trading (max 3 consecutive)',
                    'Hedging on same pair',
                    'Toxic trading patterns',
                    'Scalping under 1 minute'
                  ].map((practice, index) => (
                    <div key={index} className="flex items-start p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-300">{practice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Universal Trading Platform & Conditions */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-blue-400 mr-2" />
                  Trading Platform & Conditions (All Accounts)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-sm text-blue-400 font-medium mb-1">Trading Platform</p>
                    <p className="text-white font-semibold">MetaTrader 5 (MT5)</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-sm text-blue-400 font-medium mb-1">Leverage</p>
                    <p className="text-white font-semibold">1:100</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-sm text-blue-400 font-medium mb-1">Spreads</p>
                    <p className="text-white font-semibold">Starting from 0.2 pips</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-sm text-blue-400 font-medium mb-1">Trading Hours</p>
                    <p className="text-white font-semibold">24/5 market access</p>
                  </div>
                </div>
              </div>

              {/* Allowed Trading Practices */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  Allowed Trading Practices
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Multiple trading pairs allowed',
                    'Both long and short positions',
                    'News trading allowed',
                    'Weekend position holding',
                    'Multiple positions simultaneously',
                    'Partial position closing',
                    'Stop loss modification'
                  ].map((practice, index) => (
                    <div key={index} className="flex items-start p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-300">{practice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-blue-400 mr-2" />
                  Risk Management Requirements
                </h4>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-gray-300">
                      • Stop loss recommended but not mandatory
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-gray-300">
                      • Maximum lot size based on account equity
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-gray-300">
                      • Position sizing must be reasonable relative to account size
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-gray-300">
                      • Risk per trade should not exceed 5% of account equity
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Termination Conditions */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400 mr-2" />
                  Account Termination Conditions
                </h4>
                <div className="space-y-3">
                  {[
                    'Breach of maximum drawdown limit',
                    'Violation of trading rules',
                    'Suspicious trading activity',
                    'Manipulation attempts'
                  ].map((condition, index) => (
                    <div key={index} className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10">
                      <p className="text-gray-300">{condition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-12">
          Loading account rules...
        </div>
      )}
    </div>
  );
}
