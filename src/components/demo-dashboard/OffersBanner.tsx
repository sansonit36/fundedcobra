import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Zap, Clock, TrendingUp, Users, Check, Shield, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PackageInfo {
  id: string;
  name: string;
  balance: number;
  price: number;
  account_type: string;
}

type ModelTab = 'instant' | '1_step' | '2_step';

const MODEL_CONFIG: Record<ModelTab, { label: string; color: string; tagline: string; features: string[] }> = {
  instant: {
    label: 'Instant Funding',
    color: '#bd4dd6',
    tagline: 'No evaluation. Get funded immediately.',
    features: ['Direct Allocation', 'No Phases Required', 'Up to 80% Profit Split', 'Daily Payouts'],
  },
  '1_step': {
    label: '1-Step Challenge',
    color: '#3B82F6',
    tagline: 'One phase. Prove your edge. Get funded.',
    features: ['Single Evaluation Phase', 'Clear Profit Target', 'Up to 80% Profit Split', 'Low Drawdown Limits'],
  },
  '2_step': {
    label: '2-Step Challenge',
    color: '#10B981',
    tagline: 'Two phases. Lower cost. Maximum opportunity.',
    features: ['Two Evaluation Phases', 'Lowest Entry Price', 'Up to 80% Profit Split', 'Structured Progression'],
  },
};

export default function OffersBanner() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelTab>('instant');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('account_packages')
        .select('id, name, balance, price, account_type')
        .eq('is_active', true)
        .order('balance', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter packages by selected model
  const filteredPackages = packages.filter(p => p.account_type === selectedModel);
  const selectedPkg = filteredPackages[selectedIndex] || filteredPackages[0];
  const config = MODEL_CONFIG[selectedModel];

  // Fetch category discount from account_rules for this model
  const [categoryDiscount, setCategoryDiscount] = useState(0);
  useEffect(() => {
    supabase
      .from('account_rules')
      .select('discount_percent')
      .eq('is_template', true)
      .eq('account_type', selectedModel)
      .single()
      .then(({ data }) => {
        setCategoryDiscount(data?.discount_percent || 0);
      });
    setSelectedIndex(0);
  }, [selectedModel]);

  const discountedPrice = categoryDiscount > 0
    ? Math.round(selectedPkg?.price * (1 - categoryDiscount / 100))
    : selectedPkg?.price;

  if (loading) return null;

  return (
    <div className="mb-6 space-y-6">
      {/* Hero Section */}
      <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-[#12161f] to-[#1e1e1e] border-b border-[#2A2A2A] relative flex flex-col md:flex-row items-center justify-between text-left overflow-hidden">
          <div className="p-8 lg:p-12 relative z-10 flex-1">
            <div className="inline-flex items-center text-white text-xs font-bold px-3 py-1 rounded-sm mb-6" style={{ backgroundColor: config.color }}>
              <Zap className="w-3 h-3 mr-1.5" />
              FundedCobra — Trade with our capital
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Scale Your Capital.<br/>
              <span style={{ color: config.color }}>Your way.</span>
            </h2>
            <p className="text-[#a0a0a0] mb-8 max-w-lg">
              Choose your funding model — Instant access, 1-Step challenge, or 2-Step evaluation.
              Up to $200,000 in firm capital with competitive profit splits.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/buy-account')}
                className="px-8 py-3 text-white font-bold rounded text-sm transition-colors"
                style={{ backgroundColor: config.color }}
              >
                Get Funded Now
              </button>
            </div>
          </div>

          <div className="w-full md:w-[400px] h-64 md:h-full relative z-0 flex items-end justify-center md:justify-end pr-0 md:pr-12 pt-8 md:pt-0">
             <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1e1e1e] md:from-transparent to-transparent z-10 pointer-events-none"></div>
             <img src="/guy-holding-phone.png" alt="Trader" className="w-[80%] max-w-[300px] h-auto relative z-0 object-contain object-bottom drop-shadow-2xl translate-y-[20%]" />
          </div>
        </div>

        {/* Feature Strip */}
        <div className="bg-black/20 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <Shield className="w-4 h-4" style={{ color: config.color }} />
              RISK MANAGEMENT
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <TrendingUp className="w-4 h-4" style={{ color: config.color }} />
              UP TO 80% SPLIT
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <Zap className="w-4 h-4" style={{ color: config.color }} />
              MT5 PLATFORM
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-white px-3 py-2 border border-[#2A2A2A] rounded bg-[#1e1e1e]">
              <Clock className="w-4 h-4" style={{ color: config.color }} />
              NO TIME LIMITS
            </div>
          </div>
        </div>
      </div>
      
      {/* Model Tabs + Account Selector */}
      <div className="flex items-center gap-2 mb-2">
        {(Object.entries(MODEL_CONFIG) as [ModelTab, typeof MODEL_CONFIG['instant']][]).map(([key, cfg]) => {
          const count = packages.filter(p => p.account_type === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setSelectedModel(key)}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all border ${
                selectedModel === key
                  ? 'text-white border-opacity-30'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
              style={selectedModel === key ? { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}10`, color: cfg.color } : {}}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {filteredPackages.length > 0 && selectedPkg && (
        <div className="bg-[#1e1e1e] border border-[#2A2A2A] rounded-md overflow-hidden flex flex-col">
          <div className="p-5 md:p-6">
            {/* Size Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <span className="text-sm text-gray-400 font-medium w-full sm:w-auto">Select Account Size:</span>
              <div className="flex flex-wrap items-center gap-2">
                {filteredPackages.map((pkg, index) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 ${
                      selectedIndex === index
                        ? 'text-white border shadow-lg'
                        : 'bg-transparent text-gray-400 border border-[#404040] hover:text-white'
                    }`}
                    style={selectedIndex === index ? { borderColor: config.color, backgroundColor: config.color, boxShadow: `0 0 15px ${config.color}30` } : {}}
                  >
                    ${(pkg.balance / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Action Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#161616] p-5 md:p-6 rounded border border-[#2A2A2A] shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: config.color }}></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  ${(selectedPkg.balance / 1000).toFixed(0)}K {MODEL_CONFIG[selectedModel].label}
                </h3>
                <div className="flex items-center gap-3">
                   {categoryDiscount > 0 && (
                     <span className="text-sm text-gray-500 line-through font-mono font-bold mt-1">
                       ${selectedPkg.price}
                     </span>
                   )}
                   <span className="text-3xl font-black font-mono leading-none tracking-tight" style={{ color: config.color }}>
                     ${discountedPrice}
                   </span>
                   {categoryDiscount > 0 && (
                     <span className="text-[10px] uppercase px-2 py-1 rounded font-bold border mt-1" style={{ backgroundColor: `${config.color}10`, color: config.color, borderColor: `${config.color}20` }}>
                       Save {categoryDiscount}%
                     </span>
                   )}
                </div>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <button 
                  onClick={() => navigate('/buy-account')}
                  className="w-full md:w-auto px-8 py-3.5 text-white font-bold rounded text-sm transition-colors shadow-sm flex items-center justify-center gap-2 hover:brightness-110"
                  style={{ backgroundColor: config.color }}
                >
                  Get ${(selectedPkg.balance / 1000).toFixed(0)}K Account <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Features Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 mt-6 pt-5 border-t border-[#2A2A2A]">
              {config.features.map((feature, i) => (
                <div key={i} className="flex items-start md:items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                  <Check className="w-4 h-4 mt-0.5 md:mt-0 flex-shrink-0" style={{ color: config.color }} />
                  <span className="text-[11px] md:text-xs text-[#a0a0a0] font-medium leading-tight">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
