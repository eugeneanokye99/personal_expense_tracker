import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Bell, Shield, RefreshCw, Check, Sparkles, User, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { useExpenseStore } from '../store/ExpenseStore';
import { toast } from 'sonner';
import { useLocation } from 'react-router';

export default function Settings() {
  const { user, updateUser, connectGmail, scanInbox, connectedEmails, disconnectEmail } = useExpenseStore();
  const location = useLocation();
  const [displayName, setDisplayName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency);
  const [notificationMode, setNotificationMode] = useState(user.notificationsEnabled ? 'funny' : 'off');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Check if redirect query exists (e.g. from Gmail auth callback)
    const params = new URLSearchParams(location.search);
    if (params.get('gmail') === 'connected') {
      toast.success('Gmail successfully connected! We will now automatically parse your receipts.');
    }
  }, [location]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser({
        name: displayName,
        currency,
        notificationsEnabled: notificationMode !== 'off',
        phoneNumber
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      await scanInbox();
    } finally {
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          Settings
        </h2>
        <p className="text-slate-400 text-sm">Configure your personal, email connection, and automated tracking preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-2 lg:col-span-1">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Settings</div>
            <a href="#profile" className="flex items-center gap-3 px-3 py-2 rounded-xl text-violet-400 bg-violet-500/10 font-medium text-sm transition-colors">
              <User className="w-4 h-4" />
              Profile Details
            </a>
            <a href="#gmail" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 text-sm transition-colors">
              <Mail className="w-4 h-4" />
              Gmail Connections
            </a>
            <a href="#alerts" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 text-sm transition-colors">
              <Bell className="w-4 h-4" />
              Notifications
            </a>
          </div>
        </div>

        {/* Content Panels */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gmail Connect Section */}
          <motion.div
            id="gmail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl"
          >
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
              <Mail className="w-5 h-5 text-red-400" />
              Gmail Auto-Tracking
            </h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Connect your Gmail account to enable Sika's automated parsing engine. The background worker securely searches for incoming transaction receipts from MTN MoMo, GCB, Ecobank, Absa, and Fidelity Bank to register your expenses instantly.
            </p>

            <div className="space-y-4">
              {/* Linked Accounts Header */}
              {connectedEmails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-slate-450 text-xs font-bold uppercase tracking-wider">Connected Accounts ({connectedEmails.length})</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {connectedEmails.map((account) => (
                      <div key={account.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-green-500/10 text-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-medium text-sm truncate">{account.emailAddress}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 capitalize">Gmail Scanning Active</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => disconnectEmail(account.id)}
                          className="p-2 text-slate-405 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Disconnect email"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connect Button Card */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    connectedEmails.length > 0 ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm sm:text-base">Google Account Connection</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {connectedEmails.length > 0 ? `${connectedEmails.length} active email connections` : 'Link your Gmail address to start tracking'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={connectGmail}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg hover:shadow-red-500/20 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {connectedEmails.length > 0 ? 'Connect Another Gmail' : 'Connect Gmail'}
                </button>
              </div>

              {/* Sync Card */}
              {connectedEmails.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm sm:text-base">Sync Inboxes Manually</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Force a scan of all connected Gmail accounts for new MTN MoMo or banking alerts right now.
                    </div>
                  </div>

                  <button
                    onClick={handleManualScan}
                    disabled={isScanning}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                    {isScanning ? 'Syncing...' : 'Sync Inboxes'}
                  </button>
                </div>
              )}

              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex gap-3 items-start">
                <Shield className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-violet-300 font-semibold">Security & Privacy:</strong> We strictly isolate financial notification templates (MTN MoMo, Ecobank, GCB, Absa, Fidelity) inside your inbox. We never read, store, or parse any of your personal conversation threads.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profile Form */}
          <motion.div
            id="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <User className="w-5 h-5 text-violet-400" />
              Profile Customization
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5 font-medium">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-850/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1.5 font-medium">Preferred Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-850/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  >
                    <option value="GHS">GHS (₵) — Ghana Cedi</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1.5 font-medium">Phone Number (For SMS reminders)</label>
                <input
                  type="tel"
                  placeholder="+233..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-850/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div id="alerts">
                <label className="block text-slate-400 text-xs mb-2 font-medium">AI Notification Personality</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNotificationMode('funny')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      notificationMode === 'funny'
                        ? 'bg-violet-500/10 border-violet-500 text-white'
                        : 'bg-slate-850/40 border-slate-800 text-slate-450 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-sm">Funny / Humorous</span>
                      <Sparkles className={`w-4 h-4 ${notificationMode === 'funny' ? 'text-violet-400' : 'text-slate-500'}`} />
                    </div>
                    <span className="text-xs text-slate-500 mt-2">Funny nudges and blunt spending feedback!</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationMode('off')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      notificationMode === 'off'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-850/40 border-slate-800 text-slate-450 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-sm">Quiet Mode</span>
                      <Shield className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="text-xs text-slate-500 mt-2">Bypasses alerts completely, keeping spending logs silent.</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-lg hover:shadow-violet-500/25 text-white rounded-xl font-medium transition-all cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
