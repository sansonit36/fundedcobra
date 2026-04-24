import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, X, Target, TrendingDown, Shield, Zap, Activity, Info, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MasterRule {
  account_type: string;
  is_template: boolean;
  profit_target_phase1: number;
  profit_target_phase2: number;
  daily_drawdown_phase1: number;
  daily_drawdown_phase2: number;
  daily_drawdown_funded: number;
  overall_drawdown_phase1: number;
  overall_drawdown_phase2: number;
  overall_drawdown_funded: number;
  daily_drawdown_type_phase1: string;
  daily_drawdown_type_phase2: string;
  daily_drawdown_type_funded: string;
  overall_drawdown_type_phase1: string;
  overall_drawdown_type_phase2: string;
  overall_drawdown_type_funded: string;
  minimum_trading_days_phase1: number;
  minimum_trading_days_phase2: number;
  withdrawal_target_percent: number;
  payout_split_percent: number;
  minimum_withdrawal_amount: number;
  discount_percent: number;
}

export default function Rules() {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rules, setRules] = useState<MasterRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState<'instant' | '1_step' | '2_step'>('instant');

  useEffect(() => {
    loadMasterRules();
  }, []);

  const loadMasterRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_rules')
        .select('*')
        .eq('is_template', true);
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRule = (type: string) => rules.find(r => r.account_type === type);
  const fmtType = (t: string | null | undefined) => {
    const v = t || 'static';
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

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

  const ParamRow = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-[#2A2A2A] last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="text-right">
        <span className={`font-bold text-sm ${accent || 'text-white'}`}>{value}</span>
        {sub && <span className="text-xs text-gray-500 ml-1.5">{sub}</span>}
      </div>
    </div>
  );

  const modelTabs = [
    { key: 'instant' as const, label: 'Instant Funding', color: '#bd4dd6', icon: Zap },
    { key: '1_step' as const, label: '1-Step Challenge', color: '#3B82F6', icon: Target },
    { key: '2_step' as const, label: '2-Step Challenge', color: '#10B981', icon: Activity },
  ];

  const activeRule = getRule(activeModel);
  const activeColor = modelTabs.find(t => t.key === activeModel)?.color || '#bd4dd6';

  // Phase config per model
  const getPhases = (model: string) => {
    if (model === 'instant') return [{ key: 'funded', label: 'Funded Stage' }];
    if (model === '1_step') return [{ key: 'p1', label: 'Phase 1 — Evaluation' }, { key: 'funded', label: 'Funded Stage' }];
    return [{ key: 'p1', label: 'Phase 1 — Evaluation' }, { key: 'p2', label: 'Phase 2 — Verification' }, { key: 'funded', label: 'Funded Stage' }];
  };

  const getPhaseData = (r: MasterRule, phase: string) => {
    if (phase === 'p1') return {
      profitTarget: r.profit_target_phase1,
      dailyDD: r.daily_drawdown_phase1,
      overallDD: r.overall_drawdown_phase1,
      dailyType: fmtType(r.daily_drawdown_type_phase1),
      overallType: fmtType(r.overall_drawdown_type_phase1),
      minDays: r.minimum_trading_days_phase1,
    };
    if (phase === 'p2') return {
      profitTarget: r.profit_target_phase2,
      dailyDD: r.daily_drawdown_phase2,
      overallDD: r.overall_drawdown_phase2,
      dailyType: fmtType(r.daily_drawdown_type_phase2),
      overallType: fmtType(r.overall_drawdown_type_phase2),
      minDays: r.minimum_trading_days_phase2,
    };
    return {
      profitTarget: null,
      dailyDD: r.daily_drawdown_funded,
      overallDD: r.overall_drawdown_funded,
      dailyType: fmtType(r.daily_drawdown_type_funded),
      overallType: fmtType(r.overall_drawdown_type_funded),
      minDays: 0,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trading Rules</h1>
        <p className="text-gray-400 mt-1">Everything you need to know before you start trading your funded account.</p>
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#2A2A2A] h-40" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Model Tabs */}
          <div className="flex gap-2 p-1 bg-[#111] rounded-2xl border border-[#2A2A2A]">
            {modelTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeModel === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveModel(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                    isActive ? 'text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'
                  }`}
                  style={isActive ? { backgroundColor: `${tab.color}20`, color: tab.color, boxShadow: `0 0 20px ${tab.color}15` } : {}}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeRule ? (
            <>
              {/* Phase Rules Cards */}
              <div className={`grid grid-cols-1 ${getPhases(activeModel).length === 1 ? 'md:grid-cols-1 max-w-xl' : getPhases(activeModel).length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                {getPhases(activeModel).map(phase => {
                  const data = getPhaseData(activeRule, phase.key);
                  const isFunded = phase.key === 'funded';
                  return (
                    <div key={phase.key} className="bg-[#1e1e1e] rounded-2xl border overflow-hidden" style={{ borderColor: `${activeColor}25` }}>
                      <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: `${activeColor}15`, background: `linear-gradient(135deg, ${activeColor}10, transparent)` }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
                        <h3 className="font-bold text-white text-sm">{phase.label}</h3>
                      </div>
                      <div className="px-5 py-1">
                        {data.profitTarget !== null && data.profitTarget > 0 && (
                          <ParamRow label="Profit Target" value={`${data.profitTarget}%`} accent="text-green-400" />
                        )}
                        <ParamRow 
                          label="Daily Loss Limit" 
                          value={`${data.dailyDD}%`} 
                          sub={data.dailyType}
                          accent="text-red-400" 
                        />
                        <ParamRow 
                          label="Max Drawdown" 
                          value={`${data.overallDD}%`} 
                          sub={data.overallType}
                          accent="text-orange-400" 
                        />
                        <ParamRow 
                          label="Min. Trading Days" 
                          value={data.minDays > 0 ? `${data.minDays} days` : 'None'} 
                          accent="text-gray-300" 
                        />
                        {isFunded && (
                          <>
                            <ParamRow label="Withdrawal Target" value={`${activeRule.withdrawal_target_percent}%`} sub="of balance" accent={`text-[${activeColor}]`} />
                            <ParamRow label="Profit Split" value={`${activeRule.payout_split_percent}%`} accent={`text-[${activeColor}]`} />
                            <ParamRow label="Min. Withdrawal" value={`$${activeRule.minimum_withdrawal_amount}`} accent="text-gray-300" />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instant-only: Special vs Premium callout */}
              {activeModel === 'instant' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1e1e1e] rounded-xl border border-yellow-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <h4 className="text-sm font-bold text-white">Special Instant</h4>
                      <span className="ml-auto px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[9px] font-bold tracking-widest">10% OFF</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">$1,250 · $3,500 · $5,000</p>
                    <p className="text-xs text-gray-500">Entry-level instant funding accounts with the same trading rules. Perfect for beginners looking to start small and scale up.</p>
                  </div>
                  <div className="bg-[#1e1e1e] rounded-xl border border-[#bd4dd6]/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-[#bd4dd6]" />
                      <h4 className="text-sm font-bold text-white">Premium Instant</h4>
                      <span className="ml-auto px-2 py-0.5 rounded-md bg-[#bd4dd6]/20 text-[#bd4dd6] text-[9px] font-bold tracking-widest">50% OFF</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">$10K · $25K · $50K · $100K</p>
                    <p className="text-xs text-gray-500">Higher capital tiers with the same rules. Maximum flexibility for experienced traders ready to manage larger positions.</p>
                  </div>
                </div>
              )}

              {/* Platform Info */}
              <div className="bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A] overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${activeColor}08, transparent)` }}>
                  <Activity className="w-4 h-4" style={{ color: activeColor }} />
                  <h3 className="font-bold text-white text-sm">Platform &amp; Conditions</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-[#2A2A2A]">
                  {[
                    { label: 'Platform', value: 'MetaTrader 5', note: 'Industry standard' },
                    { label: 'Leverage', value: '1:100', note: 'All instruments' },
                    { label: 'Spreads', value: 'From 0.2 pips', note: 'Raw spreads' },
                    { label: 'Trading Hours', value: '24/5', note: 'Mon–Fri' },
                  ].map(item => (
                    <div key={item.label} className="p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{item.label}</span>
                      <span className="text-lg font-bold text-white">{item.value}</span>
                      <span className="text-[10px] text-gray-600">{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-[#1e1e1e] rounded-2xl border border-[#2A2A2A]">
              <p className="text-gray-500 text-sm">No rules configured for this account type yet.</p>
            </div>
          )}

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
        </>
      )}
    </div>
  );
}
