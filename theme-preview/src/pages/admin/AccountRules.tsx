import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccountRule {
  id: string;
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

export default function AccountRules() {
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AccountRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_rules')
        .select('*')
        .order('account_package_name');

      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Failed to load account rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (rule: AccountRule) => {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('account_rules')
        .update({
          withdrawal_target_percent: rule.withdrawal_target_percent,
          has_profit_target: rule.has_profit_target,
          profit_target_percent: rule.profit_target_percent,
          minimum_trading_days: rule.minimum_trading_days,
          has_minimum_trading_days: rule.has_minimum_trading_days,
          daily_payout_enabled: rule.daily_payout_enabled,
          weekly_payout_enabled: rule.weekly_payout_enabled,
          minimum_withdrawal_amount: rule.minimum_withdrawal_amount,
          single_trade_limit_percent: rule.single_trade_limit_percent,
          daily_drawdown_percent: rule.daily_drawdown_percent,
          overall_drawdown_percent: rule.overall_drawdown_percent,
          rule_description: rule.rule_description,
          updated_at: new Date().toISOString()
        })
        .eq('id', rule.id);

      if (updateError) throw updateError;

      setSuccess('Rules updated successfully');
      setEditingRule(null);
      await loadRules();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving rule:', err);
      setError('Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const isSpecialAccount = (packageName: string) => {
    return ['$1,250 Account', '$3,500 Account', '$5,000 Account'].includes(packageName);
  };

  const isLegacyRule = (rule: AccountRule) => {
    return rule.rule_version === 'legacy';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Account Rules Management</h1>
          <p className="text-gray-400 mt-1">Configure rules and payout structures for each account type</p>
        </div>
        <button
          onClick={loadRules}
          className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 font-medium rounded-lg transition-colors flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Legacy Accounts Section */}
      {rules.filter(r => isLegacyRule(r)).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold text-white">Legacy Accounts (Old Accounts)</h2>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
              Protected - Cannot Modify
            </span>
          </div>
          <div className="p-6 rounded-2xl bg-gray-500/5 border border-gray-500/20">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Legacy Rule Protection</h3>
                <p className="text-gray-400 text-sm">
                  These rules apply to ALL existing accounts created before the v2 system. 
                  Legacy accounts will continue using the old 10% profit target system with 2 minimum trading days, 
                  12% daily drawdown, and 40% overall drawdown. These rules cannot be modified to ensure 
                  old accounts remain stable and unaffected by new changes.
                </p>
              </div>
            </div>
            {rules.filter(r => isLegacyRule(r)).map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isSpecial={false}
                isLegacy={true}
                onEdit={() => {}}
                onSave={() => {}}
                saving={false}
                isEditing={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Special Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Special Instant Accounts</h2>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
            New Rules
          </span>
        </div>

        {rules.filter(r => isSpecialAccount(r.account_package_name) && !isLegacyRule(r)).map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            isSpecial={true}
            onEdit={setEditingRule}
            onSave={handleSaveRule}
            saving={saving}
            isEditing={editingRule?.id === rule.id}
          />
        ))}
      </div>

      {/* Premium Instant Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-primary-400" />
          <h2 className="text-xl font-bold text-white">Premium Instant Accounts</h2>
        </div>

        {rules.filter(r => !isSpecialAccount(r.account_package_name) && !isLegacyRule(r)).map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            isSpecial={false}
            onEdit={setEditingRule}
            onSave={handleSaveRule}
            saving={saving}
            isEditing={editingRule?.id === rule.id}
          />
        ))}
      </div>
    </div>
  );
}

interface RuleCardProps {
  rule: AccountRule;
  isSpecial: boolean;
  isLegacy?: boolean;
  onEdit: (rule: AccountRule) => void;
  onSave: (rule: AccountRule) => void;
  saving: boolean;
  isEditing: boolean;
}

function RuleCard({ rule, isSpecial, isLegacy = false, onEdit, onSave, saving, isEditing }: RuleCardProps) {
  const [localRule, setLocalRule] = useState(rule);

  useEffect(() => {
    setLocalRule(rule);
  }, [rule]);

  return (
    <div className={`card-gradient rounded-2xl p-6 border ${
      isLegacy ? 'border-gray-500/20 opacity-75' : 
      isSpecial ? 'border-yellow-500/20' : 'border-white/5'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{rule.account_package_name}</h3>
          {isLegacy && (
            <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
              Legacy • 10% Profit Target • 2 Days/Week
            </span>
          )}
          {isSpecial && !isLegacy && (
            <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
              Daily Payouts • No Profit Target
            </span>
          )}
        </div>
        {!isEditing && !isLegacy ? (
          <button
            onClick={() => onEdit(rule)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            Edit Rules
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => onSave(localRule)}
              disabled={saving}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => onEdit(null!)}
              disabled={saving}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Withdrawal Target */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Withdrawal Target %
          </label>
          {isEditing ? (
            <input
              type="number"
              value={localRule.withdrawal_target_percent}
              onChange={(e) => setLocalRule({ ...localRule, withdrawal_target_percent: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
              step="0.1"
            />
          ) : (
            <div className="text-lg font-bold text-white">{rule.withdrawal_target_percent}%</div>
          )}
        </div>

        {/* Minimum Withdrawal */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Minimum Withdrawal $
          </label>
          {isEditing ? (
            <input
              type="number"
              value={localRule.minimum_withdrawal_amount}
              onChange={(e) => setLocalRule({ ...localRule, minimum_withdrawal_amount: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
            />
          ) : (
            <div className="text-lg font-bold text-white">${rule.minimum_withdrawal_amount}</div>
          )}
        </div>

        {/* Single Trade Limit */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Single Trade Limit %
          </label>
          {isEditing ? (
            <input
              type="number"
              value={localRule.single_trade_limit_percent}
              onChange={(e) => setLocalRule({ ...localRule, single_trade_limit_percent: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
            />
          ) : (
            <div className="text-lg font-bold text-white">{rule.single_trade_limit_percent}%</div>
          )}
        </div>

        {/* Daily Drawdown */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Daily Drawdown %
          </label>
          {isEditing ? (
            <input
              type="number"
              value={localRule.daily_drawdown_percent}
              onChange={(e) => setLocalRule({ ...localRule, daily_drawdown_percent: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
            />
          ) : (
            <div className="text-lg font-bold text-white">{rule.daily_drawdown_percent}%</div>
          )}
        </div>

        {/* Overall Drawdown */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Overall Drawdown %
          </label>
          {isEditing ? (
            <input
              type="number"
              value={localRule.overall_drawdown_percent}
              onChange={(e) => setLocalRule({ ...localRule, overall_drawdown_percent: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
            />
          ) : (
            <div className="text-lg font-bold text-white">{rule.overall_drawdown_percent}%</div>
          )}
        </div>

        {/* Minimum Trading Days */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Minimum Trading Days
          </label>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localRule.has_minimum_trading_days}
                  onChange={(e) => setLocalRule({ ...localRule, has_minimum_trading_days: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-400">Required</span>
              </div>
              {localRule.has_minimum_trading_days && (
                <input
                  type="number"
                  value={localRule.minimum_trading_days}
                  onChange={(e) => setLocalRule({ ...localRule, minimum_trading_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                />
              )}
            </div>
          ) : (
            <div className="text-lg font-bold text-white">
              {rule.has_minimum_trading_days ? `${rule.minimum_trading_days} days` : 'None'}
            </div>
          )}
        </div>
      </div>

      {/* Payout Settings */}
      <div className="mt-4 p-4 rounded-lg bg-white/5">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Payout Settings</h4>
        <div className="flex flex-wrap gap-4">
          {isEditing ? (
            <>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localRule.daily_payout_enabled}
                  onChange={(e) => setLocalRule({ ...localRule, daily_payout_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-white">Daily Payouts</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localRule.weekly_payout_enabled}
                  onChange={(e) => setLocalRule({ ...localRule, weekly_payout_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-white">Weekly Payouts</span>
              </label>
            </>
          ) : (
            <>
              {rule.daily_payout_enabled && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-400">
                  Daily Payouts
                </span>
              )}
              {rule.weekly_payout_enabled && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-500/10 text-primary-400">
                  Weekly Payouts
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rule Description */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Rule Description (shown to users)
        </label>
        {isEditing ? (
          <textarea
            value={localRule.rule_description}
            onChange={(e) => setLocalRule({ ...localRule, rule_description: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
            rows={3}
          />
        ) : (
          <p className="text-gray-300">{rule.rule_description}</p>
        )}
      </div>
    </div>
  );
}
