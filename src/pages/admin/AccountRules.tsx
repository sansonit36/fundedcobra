import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccountRule {
  id: string;
  account_package_name: string;
  account_type: 'instant' | '1_step' | '2_step';
  withdrawal_target_percent: number;
  profit_target_phase1: number;
  profit_target_phase2: number | null;
  daily_drawdown_phase1: number;
  daily_drawdown_phase2: number | null;
  overall_drawdown_phase1: number;
  overall_drawdown_phase2: number | null;
  minimum_trading_days_phase1: number;
  minimum_trading_days_phase2: number | null;
  has_profit_target: boolean;
  profit_target_percent: number | null;
  minimum_trading_days: number;
  has_minimum_trading_days: boolean;
  daily_payout_enabled: boolean;
  weekly_payout_enabled: boolean;
  bi_weekly_payout_enabled: boolean;
  minimum_withdrawal_amount: number;
  single_trade_limit_percent: number;
  daily_drawdown_percent: number;
  overall_drawdown_percent: number;
  payout_split_percent: number;
  drawdown_type: string;
  drawdown_basis: string;
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
          profit_target_phase1: rule.profit_target_phase1,
          profit_target_phase2: rule.profit_target_phase2,
          daily_drawdown_phase1: rule.daily_drawdown_phase1,
          daily_drawdown_phase2: rule.daily_drawdown_phase2,
          overall_drawdown_phase1: rule.overall_drawdown_phase1,
          overall_drawdown_phase2: rule.overall_drawdown_phase2,
          minimum_trading_days_phase1: rule.minimum_trading_days_phase1,
          minimum_trading_days_phase2: rule.minimum_trading_days_phase2,
          has_profit_target: rule.has_profit_target,
          profit_target_percent: rule.profit_target_percent,
          minimum_trading_days: rule.minimum_trading_days,
          has_minimum_trading_days: rule.has_minimum_trading_days,
          daily_payout_enabled: rule.daily_payout_enabled,
          weekly_payout_enabled: rule.weekly_payout_enabled,
          bi_weekly_payout_enabled: (rule as any).bi_weekly_payout_enabled,
          minimum_withdrawal_amount: rule.minimum_withdrawal_amount,
          single_trade_limit_percent: rule.single_trade_limit_percent,
          daily_drawdown_percent: rule.daily_drawdown_percent,
          overall_drawdown_percent: rule.overall_drawdown_percent,
          payout_split_percent: rule.payout_split_percent,
          drawdown_type: rule.drawdown_type,
          drawdown_basis: rule.drawdown_basis,
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
        {/* Phase 1 Rules (Evaluation / 1-Step) */}
        {rule.account_type !== 'instant' && (
          <div className="lg:col-span-3 p-6 rounded-xl bg-primary-500/5 border border-primary-500/20 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 font-black text-xs">P1</div>
               <h4 className="text-white font-black uppercase tracking-widest text-sm">Phase 1 Configuration</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Profit Target %</label>
                {isEditing ? (
                  <input type="number" value={localRule.profit_target_phase1} onChange={(e) => setLocalRule({ ...localRule, profit_target_phase1: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.profit_target_phase1}%</div>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Daily Drawdown %</label>
                {isEditing ? (
                  <input type="number" value={localRule.daily_drawdown_phase1} onChange={(e) => setLocalRule({ ...localRule, daily_drawdown_phase1: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.daily_drawdown_phase1}%</div>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Overall Drawdown %</label>
                {isEditing ? (
                  <input type="number" value={localRule.overall_drawdown_phase1} onChange={(e) => setLocalRule({ ...localRule, overall_drawdown_phase1: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.overall_drawdown_phase1}%</div>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Min. Days</label>
                {isEditing ? (
                  <input type="number" value={localRule.minimum_trading_days_phase1} onChange={(e) => setLocalRule({ ...localRule, minimum_trading_days_phase1: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.minimum_trading_days_phase1} Days</div>}
              </div>
            </div>
          </div>
        )}

        {/* Phase 2 Rules (2-Step Only) */}
        {rule.account_type === '2_step' && (
          <div className="lg:col-span-3 p-6 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">P2</div>
               <h4 className="text-white font-black uppercase tracking-widest text-sm">Phase 2 Configuration</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Profit Target %</label>
                {isEditing ? (
                  <input type="number" value={localRule.profit_target_phase2 || 0} onChange={(e) => setLocalRule({ ...localRule, profit_target_phase2: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.profit_target_phase2}%</div>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Daily Drawdown %</label>
                {isEditing ? (
                  <input type="number" value={localRule.daily_drawdown_phase2 || 0} onChange={(e) => setLocalRule({ ...localRule, daily_drawdown_phase2: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.daily_drawdown_phase2}%</div>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Overall Drawdown %</label>
                {isEditing ? (
                  <input type="number" value={localRule.overall_drawdown_phase2 || 0} onChange={(e) => setLocalRule({ ...localRule, overall_drawdown_phase2: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.overall_drawdown_phase2}%</div>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase">Min. Days</label>
                {isEditing ? (
                  <input type="number" value={localRule.minimum_trading_days_phase2 || 0} onChange={(e) => setLocalRule({ ...localRule, minimum_trading_days_phase2: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                ) : <div className="text-sm font-bold text-white">{rule.minimum_trading_days_phase2} Days</div>}
              </div>
            </div>
          </div>
        )}

        {/* Global/Funded Rules */}
        <div className="lg:col-span-3 p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">F</div>
             <h4 className="text-white font-black uppercase tracking-widest text-sm">{rule.account_type === 'instant' ? 'Live Account Rules' : 'Funded Stage Configuration'}</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase">Profit Split %</label>
              {isEditing ? (
                <input type="number" value={localRule.payout_split_percent} onChange={(e) => setLocalRule({ ...localRule, payout_split_percent: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
              ) : <div className="text-sm font-bold text-white">{rule.payout_split_percent}%</div>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase">Trailing Daily Loss %</label>
              {isEditing ? (
                <input type="number" value={localRule.daily_drawdown_percent} onChange={(e) => setLocalRule({ ...localRule, daily_drawdown_percent: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
              ) : <div className="text-sm font-bold text-white">{rule.daily_drawdown_percent}%</div>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase">Overall Drawdown %</label>
              {isEditing ? (
                <input type="number" value={localRule.overall_drawdown_percent} onChange={(e) => setLocalRule({ ...localRule, overall_drawdown_percent: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
              ) : <div className="text-sm font-bold text-white">{rule.overall_drawdown_percent}%</div>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase">Withdrawal Target %</label>
              {isEditing ? (
                <input type="number" value={localRule.withdrawal_target_percent} onChange={(e) => setLocalRule({ ...localRule, withdrawal_target_percent: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
              ) : <div className="text-sm font-bold text-white">{rule.withdrawal_target_percent}%</div>}
            </div>
          </div>
        </div>

        {/* Drawdown Configuration Row */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Drawdown Type
          </label>
          {isEditing ? (
            <select
              value={localRule.drawdown_type}
              onChange={(e) => setLocalRule({ ...localRule, drawdown_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
            >
              <option value="static" className="bg-gray-900">Static</option>
              <option value="trailing" className="bg-gray-900">Trailing</option>
            </select>
          ) : (
            <div className="text-lg font-bold text-white uppercase">{rule.drawdown_type || 'Static'}</div>
          )}
        </div>

        {/* Drawdown Basis */}
        <div className="p-4 rounded-lg bg-white/5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Drawdown Basis
          </label>
          {isEditing ? (
            <select
              value={localRule.drawdown_basis}
              onChange={(e) => setLocalRule({ ...localRule, drawdown_basis: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
            >
              <option value="balance" className="bg-gray-900">Balance</option>
              <option value="equity" className="bg-gray-900">Equity</option>
            </select>
          ) : (
            <div className="text-lg font-bold text-white uppercase">{rule.drawdown_basis || 'Balance'}</div>
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
      <div className="mt-6 p-4 rounded-xl bg-black/20 border border-white/5">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Payout Settings</p>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                localRule.daily_payout_enabled ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'
              }`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={localRule.daily_payout_enabled}
                  onChange={(e) => setLocalRule({ ...localRule, daily_payout_enabled: e.target.checked })}
                />
                <span className="text-[10px] font-black uppercase">Daily Payouts</span>
              </label>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                localRule.weekly_payout_enabled ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/10 text-gray-500'
              }`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={localRule.weekly_payout_enabled}
                  onChange={(e) => setLocalRule({ ...localRule, weekly_payout_enabled: e.target.checked })}
                />
                <span className="text-[10px] font-black uppercase">Weekly Payouts</span>
              </label>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                (localRule as any).bi_weekly_payout_enabled ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'
              }`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={(localRule as any).bi_weekly_payout_enabled}
                  onChange={(e) => setLocalRule({ ...localRule, bi_weekly_payout_enabled: e.target.checked } as any)}
                />
                <span className="text-[10px] font-black uppercase">Bi-Weekly Payouts</span>
              </label>
            </>
          ) : (
            <>
              {rule.daily_payout_enabled && (
                <span className="px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase ring-1 ring-emerald-500/20">Daily Payouts</span>
              )}
              {rule.weekly_payout_enabled && (
                <span className="px-3 py-1.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase ring-1 ring-purple-500/20">Weekly Payouts</span>
              )}
              {(rule as any).bi_weekly_payout_enabled && (
                <span className="px-3 py-1.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase ring-1 ring-blue-500/20">Bi-Weekly Payouts</span>
              )}
              {!rule.daily_payout_enabled && !rule.weekly_payout_enabled && !(rule as any).bi_weekly_payout_enabled && (
                <span className="px-3 py-1.5 rounded bg-gray-500/10 text-gray-400 text-[10px] font-black uppercase ring-1 ring-gray-500/20">Standard Payouts</span>
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
