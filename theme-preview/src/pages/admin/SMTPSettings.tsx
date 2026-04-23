import React, { useState, useEffect } from 'react';
import { Mail, Save, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendTestEmail } from '../../lib/email';

interface SMTPConfig {
  id?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  created_at?: string;
  updated_at?: string;
}

const defaultConfig: SMTPConfig = {
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  username: 'username@example.com',
  password: '',
  from_email: 'noreply@example.com'
};

export default function SMTPSettings() {
  const [config, setConfig] = useState<SMTPConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smtp_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) setConfig(data);
    } catch (err) {
      console.error('Error loading SMTP config:', err);
      setError('Failed to load SMTP configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('smtp_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setSuccess('SMTP configuration saved successfully');
      await loadConfig();
    } catch (err) {
      console.error('Error saving SMTP config:', err);
      setError('Failed to save SMTP configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setTestResult({ success: false, message: 'Please enter a test email address' });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const result = await sendTestEmail(testEmail);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send test email');
      }

      setTestResult({ success: true, message: 'Test email sent successfully!' });
    } catch (err) {
      console.error('Error sending test email:', err);
      setTestResult({ 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to send test email'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/4"></div>
          <div className="h-32 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">SMTP Settings</h1>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                SMTP Host
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                placeholder="smtp.example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                SMTP Port
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                placeholder="587"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                SMTP Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                placeholder="username@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                SMTP Password
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                From Email
              </label>
              <input
                type="email"
                value={config.from_email}
                onChange={(e) => setConfig(prev => ({ ...prev, from_email: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                placeholder="noreply@example.com"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="secure"
                checked={config.secure}
                onChange={(e) => setConfig(prev => ({ ...prev, secure: e.target.checked }))}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="secure" className="text-sm font-medium text-gray-400">
                Use SSL/TLS
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Test Email Section */}
      <div className="card-gradient rounded-2xl p-6 border border-white/5">
        <h2 className="text-xl font-bold text-white mb-6">Test Email Configuration</h2>

        <div className="space-y-4">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                placeholder="Enter email address for testing"
              />
            </div>
            <button
              onClick={handleTestEmail}
              disabled={sendingTest || !testEmail}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center whitespace-nowrap"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            } flex items-start space-x-3`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                {testResult.message}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}