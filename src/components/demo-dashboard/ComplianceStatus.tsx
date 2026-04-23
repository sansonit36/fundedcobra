import React, { useState, useEffect } from 'react';
import { Shield, AlertOctagon, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ComplianceStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [breachedAccounts, setBreachedAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadCompliance();
  }, [user]);

  const loadCompliance = async () => {
    try {
      const { data } = await supabase
        .from('trading_accounts')
        .select('id, mt5_login, breach_reason')
        .eq('user_id', user!.id)
        .eq('status', 'breached');

      setBreachedAccounts(data || []);
    } catch (err) {
      console.error('Error loading compliance status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || breachedAccounts.length === 0) return null;

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-sm p-5 border-l-2 border-l-red-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertOctagon className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E6EDF3] tracking-wider uppercase">Compliance Violation</h3>
            <p className="text-[#8B949E] text-xs mt-1">
              One or more of your trading accounts has breached risk parameters.
            </p>
            <div className="mt-2 space-y-1">
              {breachedAccounts.map(acc => (
                <div key={acc.id} className="text-[11px] text-red-500 font-mono">
                  ACC {acc.mt5_login} // {acc.breach_reason || 'Automated rule violation'}
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/trading-accounts')}
          className="w-full sm:w-auto px-6 py-2 bg-[#161B22] hover:bg-[#30363D] text-[#E6EDF3] text-xs font-bold uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center border border-[#30363D]"
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
