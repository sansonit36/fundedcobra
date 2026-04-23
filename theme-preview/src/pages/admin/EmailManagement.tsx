import React, { useState, useEffect } from 'react';
import { Mail, Send, Eye, Users, Edit, Save, X, Filter, Search, Code } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendEmail, logEmailSent, EmailTemplate } from '../../lib/emailService';

interface EmailLog {
  id: string;
  user_id: string;
  template: string;
  sent_at: string;
  opened_at?: string;
  user: {
    name: string;
    email: string;
  };
}

interface UserSegment {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

type SegmentType = 'all' | 'purchased' | 'kyc_no_purchase' | 'no_kyc' | 'breached' | 'active_traders' | 'custom';

export default function EmailManagement() {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'send'>('templates');
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<Record<EmailTemplate, any>>({} as any);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [viewingTemplate, setViewingTemplate] = useState<EmailTemplate | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentType>('all');
  const [segmentUsers, setSegmentUsers] = useState<UserSegment[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customEmails, setCustomEmails] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmailLogs();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === 'send') {
      loadSegmentUsers();
    }
  }, [selectedSegment, activeTab, customEmails]);

  const loadEmailLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select(`
          id,
          user_id,
          template,
          sent_at,
          opened_at
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user details separately
      const userIds = [...new Set((data || []).map((log: any) => log.user_id))];
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

      const formattedLogs = (data || []).map((log: any) => {
        const user = userMap.get(log.user_id) || { name: 'Unknown', email: 'N/A' };
        return {
          id: log.id,
          user_id: log.user_id,
          template: log.template,
          sent_at: log.sent_at,
          opened_at: log.opened_at,
          user: {
            name: user.name,
            email: user.email
          }
        };
      });

      setEmailLogs(formattedLogs);
    } catch (err) {
      console.error('Error loading email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_key');

      if (error) throw error;

      const templateMap: Record<EmailTemplate, any> = {} as any;
      (data || []).forEach((template: any) => {
        templateMap[template.template_key as EmailTemplate] = {
          subject: template.subject,
          html: template.html_body,
          editable: true,
          id: template.id
        };
      });

      setTemplates(templateMap);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const loadSegmentUsers = async () => {
    setLoading(true);
    try {
      let query;

      switch (selectedSegment) {
        case 'purchased':
          // Users who purchased accounts
          const { data: purchasedData } = await supabase
            .from('account_requests')
            .select('user_id, profiles!inner(id, name, email, created_at)')
            .eq('status', 'approved');
          
          const uniquePurchased = Array.from(
            new Map((purchasedData || []).map((item: any) => [
              item.profiles.id,
              {
                id: item.profiles.id,
                name: item.profiles.name,
                email: item.profiles.email,
                created_at: item.profiles.created_at
              }
            ])).values()
          );
          setSegmentUsers(uniquePurchased);
          break;

        case 'kyc_no_purchase':
          // Users with KYC approved but no purchase
          const { data: kycUsers } = await supabase
            .from('kyc_verifications')
            .select('user_id, profiles!inner(id, name, email, created_at)')
            .eq('status', 'approved');

          const kycUserIds = (kycUsers || []).map((u: any) => u.user_id);
          
          const { data: purchases } = await supabase
            .from('account_requests')
            .select('user_id')
            .in('user_id', kycUserIds);

          const purchasedUserIds = (purchases || []).map((p: any) => p.user_id);
          const kycNoPurchase = (kycUsers || [])
            .filter((u: any) => !purchasedUserIds.includes(u.user_id))
            .map((u: any) => ({
              id: u.profiles.id,
              name: u.profiles.name,
              email: u.profiles.email,
              created_at: u.profiles.created_at
            }));

          setSegmentUsers(kycNoPurchase);
          break;

        case 'no_kyc':
          // Users registered but no KYC
          const { data: allUsers } = await supabase
            .from('profiles')
            .select('id, name, email, created_at')
            .eq('role', 'user');

          const { data: kycSubmissions } = await supabase
            .from('kyc_verifications')
            .select('user_id');

          const kycSubmittedIds = (kycSubmissions || []).map((k: any) => k.user_id);
          const noKycUsers = (allUsers || []).filter(
            (u: any) => !kycSubmittedIds.includes(u.id)
          );

          setSegmentUsers(noKycUsers);
          break;

        case 'breached':
          // Users with breached accounts
          const { data: breachedData } = await supabase
            .from('trading_accounts')
            .select('user_id, profiles!inner(id, name, email, created_at)')
            .eq('status', 'breached');

          const uniqueBreached = Array.from(
            new Map((breachedData || []).map((item: any) => [
              item.profiles.id,
              {
                id: item.profiles.id,
                name: item.profiles.name,
                email: item.profiles.email,
                created_at: item.profiles.created_at
              }
            ])).values()
          );
          setSegmentUsers(uniqueBreached);
          break;

        case 'active_traders':
          // Users with active trading accounts
          const { data: activeData } = await supabase
            .from('trading_accounts')
            .select('user_id, profiles!inner(id, name, email, created_at)')
            .eq('status', 'active');

          const uniqueActive = Array.from(
            new Map((activeData || []).map((item: any) => [
              item.profiles.id,
              {
                id: item.profiles.id,
                name: item.profiles.name,
                email: item.profiles.email,
                created_at: item.profiles.created_at
              }
            ])).values()
          );
          setSegmentUsers(uniqueActive);
          break;

        case 'custom':
          // Parse custom emails (comma or newline separated)
          if (!customEmails.trim()) {
            setSegmentUsers([]);
            break;
          }

          const emailList = customEmails
            .split(/[,\n]/)
            .map(email => email.trim())
            .filter(email => email && email.includes('@'));

          // Fetch user data for these emails
          const { data: customUsersData } = await supabase
            .from('profiles')
            .select('id, name, email, created_at')
            .in('email', emailList);

          // Create user objects for emails not in database
          const customUsersList = emailList.map(email => {
            const existingUser = customUsersData?.find(u => u.email === email);
            if (existingUser) {
              return existingUser;
            }
            return {
              id: email,
              name: email,
              email: email,
              created_at: new Date().toISOString()
            };
          });

          setSegmentUsers(customUsersList);
          break;

        default:
          // All users
          const { data: allUsersData } = await supabase
            .from('profiles')
            .select('id, name, email, created_at')
            .eq('role', 'user');

          setSegmentUsers(allUsersData || []);
      }
    } catch (err) {
      console.error('Error loading segment users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (templateKey: EmailTemplate) => {
    setEditingTemplate(templateKey);
    setEditedSubject(templates[templateKey]?.subject || '');
    setEditedHtml(templates[templateKey]?.html || '');
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { error: updateError } = await supabase
        .from('email_templates')
        .update({
          subject: editedSubject,
          html_body: editedHtml,
          updated_at: new Date().toISOString()
        })
        .eq('template_key', editingTemplate);

      if (updateError) throw updateError;

      // Update local state
      setTemplates(prev => ({
        ...prev,
        [editingTemplate]: {
          ...prev[editingTemplate],
          subject: editedSubject,
          html: editedHtml
        }
      }));

      setSuccess(`Template "${editingTemplate}" updated successfully`);
      setEditingTemplate(null);
      setEditedSubject('');
      setEditedHtml('');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomEmail = async () => {
    if (!customSubject || !customMessage) {
      setError('Subject and message are required');
      return;
    }

    if (segmentUsers.length === 0) {
      setError('No users in selected segment');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      let sentCount = 0;
      const errors: string[] = [];
      
      for (const user of segmentUsers) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              to: user.email,
              subject: customSubject,
              html: customMessage.replace(/\n/g, '<br>'),
              userId: user.id,
              template: 'custom_email'
            })
          });

          if (response.ok) {
            sentCount++;
          } else {
            const errorData = await response.json();
            errors.push(`${user.email}: ${errorData.error || 'Unknown error'}`);
            console.error(`Failed to send to ${user.email}:`, errorData);
          }
        } catch (emailError) {
          errors.push(`${user.email}: ${emailError}`);
          console.error(`Failed to send to ${user.email}:`, emailError);
        }
      }

      if (sentCount > 0) {
        setSuccess(`Successfully sent ${sentCount} of ${segmentUsers.length} emails`);
      }
      
      if (errors.length > 0) {
        setError(`Failed to send ${errors.length} emails. First error: ${errors[0]}`);
      }

      if (sentCount > 0) {
        setCustomSubject('');
        setCustomMessage('');
        loadEmailLogs();
      }
    } catch (err) {
      console.error('Error sending emails:', err);
      setError(`Failed to send emails: ${err}`);
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = emailLogs.filter(log =>
    log.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.template.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOpenRate = () => {
    if (emailLogs.length === 0) return 0;
    const opened = emailLogs.filter(log => log.opened_at).length;
    return ((opened / emailLogs.length) * 100).toFixed(1);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Email Management</h1>
        <p className="text-gray-400">Manage email templates, view logs, and send campaigns</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Edit className="w-4 h-4 inline mr-2" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Email Logs
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'send'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4 inline mr-2" />
          Send Campaign
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid gap-4">
          {Object.entries(templates).map(([key, value]) => (
            <div key={key} className="card-gradient rounded-xl border border-white/5 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">{value.subject}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewingTemplate(key as EmailTemplate)}
                    className="px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors flex items-center"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    View Body
                  </button>
                  <button
                    onClick={() => handleEditTemplate(key as EmailTemplate)}
                    className="px-4 py-2 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 transition-colors flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="card-gradient rounded-xl border border-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Sent</p>
                  <p className="text-2xl font-bold text-white">{emailLogs.length}</p>
                </div>
                <Mail className="w-10 h-10 text-primary-400" />
              </div>
            </div>

            <div className="card-gradient rounded-xl border border-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Opened</p>
                  <p className="text-2xl font-bold text-white">
                    {emailLogs.filter(log => log.opened_at).length}
                  </p>
                </div>
                <Eye className="w-10 h-10 text-green-400" />
              </div>
            </div>

            <div className="card-gradient rounded-xl border border-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Open Rate</p>
                  <p className="text-2xl font-bold text-white">{getOpenRate()}%</p>
                </div>
                <Users className="w-10 h-10 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, name, or template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/50"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="card-gradient rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Recipient</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Template</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Sent At</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{log.user.name}</p>
                          <p className="text-gray-400 text-sm">{log.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm">
                          {log.template.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {log.opened_at ? (
                          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm flex items-center w-fit">
                            <Eye className="w-3 h-3 mr-1" />
                            Opened
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-gray-500/10 text-gray-400 text-sm">
                            Sent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Send Campaign Tab */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Segment Selection */}
          <div className="card-gradient rounded-xl border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Select Audience
            </h3>
            
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All Users', icon: Users },
                { value: 'purchased', label: 'Purchased Accounts', icon: Mail },
                { value: 'kyc_no_purchase', label: 'KYC Approved (No Purchase)', icon: Users },
                { value: 'no_kyc', label: 'Registered (No KYC)', icon: Users },
                { value: 'breached', label: 'Breached Accounts', icon: Users },
                { value: 'active_traders', label: 'Active Traders', icon: Users },
                { value: 'custom', label: 'Custom Emails', icon: Edit }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSelectedSegment(value as SegmentType)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between ${
                    selectedSegment === value
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <span className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </span>
                  {value !== 'custom' && <span className="text-sm">{loading ? '...' : segmentUsers.length}</span>}
                </button>
              ))}
            </div>

            {/* Custom Emails Textarea */}
            {selectedSegment === 'custom' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Enter Email Addresses
                </label>
                <textarea
                  value={customEmails}
                  onChange={(e) => {
                    setCustomEmails(e.target.value);
                    loadSegmentUsers();
                  }}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  placeholder="Enter emails separated by commas or new lines:\nuser1@example.com\nuser2@example.com, user3@example.com"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {segmentUsers.length} email{segmentUsers.length !== 1 ? 's' : ''} ready
                </p>
              </div>
            )}
          </div>

          {/* Compose Email */}
          <div className="lg:col-span-2 card-gradient rounded-xl border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Send className="w-5 h-5 mr-2" />
              Compose Email
            </h3>

            {success && (
              <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Recipients: {segmentUsers.length} users
                </label>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm max-h-24 overflow-y-auto">
                  {segmentUsers.slice(0, 5).map(u => u.email).join(', ')}
                  {segmentUsers.length > 5 && ` +${segmentUsers.length - 5} more`}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Enter your message..."
                />
              </div>

              <button
                onClick={handleSendCustomEmail}
                disabled={sending || !customSubject || !customMessage}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sending ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send to {segmentUsers.length} Recipients
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white capitalize">
                Edit Template: {editingTemplate.replace(/_/g, ' ')}
              </h3>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditedSubject('');
                  setEditedHtml('');
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success && (
              <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50"
                  placeholder="Enter subject line..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Body (HTML)
                </label>
                <textarea
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500/50 font-mono text-sm"
                  placeholder="Enter HTML content...Use placeholders like: {{name}}, {{accountBalance}}, etc."
                />
              </div>

              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                <p className="text-primary-400 text-sm">
                  <strong>Available Placeholders:</strong> {'{{'} name {'}}'},  {'{{'} accountBalance {'}}'},  {'{{'} mt5Login {'}}'},  {'{{'} mt5Server {'}}'},  {'{{'} breachReason {'}}'},  {'{{'} reason {'}}'}
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleSaveTemplate}
                  disabled={!editedSubject || !editedHtml}
                  className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setEditedSubject('');
                    setEditedHtml('');
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template View Modal */}
      {viewingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
          <div className="card-gradient rounded-2xl border border-white/5 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white capitalize">
                View Template: {viewingTemplate.replace(/_/g, ' ')}
              </h3>
              <button
                onClick={() => setViewingTemplate(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Subject
                </label>
                <div className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white">
                  {templates[viewingTemplate]?.subject}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  HTML Body
                </label>
                <pre className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 overflow-x-auto text-sm">
                  {templates[viewingTemplate]?.html}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Preview
                </label>
                <div 
                  className="w-full p-6 rounded-lg bg-white border border-white/10 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: templates[viewingTemplate]?.html || '' }}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setViewingTemplate(null);
                    handleEditTemplate(viewingTemplate);
                  }}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edit Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
