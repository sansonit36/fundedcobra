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
    <div className="card-gradient rounded-2xl p-6 border border-red-500/20 bg-red-500/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Rule Violation Detected</h3>
            <p className="text-gray-400 text-sm mt-1">
              One or more of your trading accounts has been breached due to a rule violation.
            </p>
            <div className="mt-2 space-y-1">
              {breachedAccounts.map(acc => (
                <div key={acc.id} className="text-xs text-red-400 font-medium">
                  Account {acc.mt5_login}: {acc.breach_reason || 'Automated rule violation'}
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/trading-accounts')}
          className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center border border-red-500/20"
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
