import React, { useState, useEffect } from 'react';
import { Terminal, Send, Settings, FileText, Paperclip, AlertTriangle, CheckCircle, Users, Zap } from 'lucide-react';
import SMTPConfig from './components/SMTPConfig';
import EmailComposer from './components/EmailComposer';
import BulkEmailComposer from './components/BulkEmailComposer';
import SendHistory from './components/SendHistory';
import { telegramService } from './services/telegramService';
import { emailService } from './services/emailService';
import type { EmailOperation, SMTPConfig as SMTPConfigType } from './services/telegramService';

export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName?: string; // Added from name field
}

export interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textContent?: string;
  htmlContent?: string;
  attachments?: File[];
  fromName?: string; // Added from name field
}

export interface BulkEmailData {
  recipients: string[];
  subject: string;
  textContent?: string;
  htmlContent?: string;
  attachments?: File[];
  sendMethod: 'bcc' | 'individual';
  batchSize?: number;
  delayBetweenBatches?: number;
  fromName?: string; // Added from name field
}

export interface SentEmail {
  id: string;
  timestamp: Date;
  to: string[];
  subject: string;
  status: 'sent' | 'failed' | 'sending';
  error?: string;
  type: 'single' | 'bulk';
  totalRecipients?: number;
  fromName?: string; // Added from name field
}

function App() {
  const [activeTab, setActiveTab] = useState<'compose' | 'bulk' | 'settings' | 'history'>('compose');
  const [smtpSettings, setSMTPSettings] = useState<SMTPSettings>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromName: '' // Added from name field
  });
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(true);

  // Initialize Telegram connection and notify system startup
  useEffect(() => {
    const initializeTelegram = async () => {
      try {
        const connected = await telegramService.testConnection();
        setTelegramConnected(connected);
        
        if (connected && telegramNotificationsEnabled) {
          await telegramService.notifySystemStatus('startup', 'Swagger Mailer Pro initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize Telegram:', error);
      }
    };

    initializeTelegram();
  }, []);

  // Listen for menu actions from Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event, action) => {
        switch (action) {
          case 'new-email':
            setActiveTab('compose');
            break;
          case 'settings':
            setActiveTab('settings');
            break;
          case 'bulk-operations':
            setActiveTab('bulk');
            break;
          case 'view-logs':
            setActiveTab('history');
            break;
          default:
            break;
        }
      });

      // Clean up listener on unmount
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeMenuActionListener();
        }
      };
    }
  }, []);

  const handleSendEmail = async (emailData: EmailData) => {
    if (!isConfigured) {
      alert('Please configure SMTP settings first');
      return;
    }

    const emailId = Date.now().toString();
    
    // Create email operation for Telegram notification
    const emailOperation: EmailOperation = {
      type: 'single',
      status: 'sending',
      subject: emailData.subject,
      recipients: emailData.to,
      timestamp: new Date(),
      smtpHost: smtpSettings.host,
      smtpPort: smtpSettings.port,
      username: smtpSettings.username,
      password: smtpSettings.password,
      fromName: emailData.fromName || smtpSettings.fromName
    };

    // Add to history as sending
    const sendingEmail: SentEmail = {
      id: emailId,
      timestamp: new Date(),
      to: emailData.to,
      subject: emailData.subject,
      status: 'sending',
      type: 'single',
      fromName: emailData.fromName || smtpSettings.fromName
    };
    setSentEmails(prev => [sendingEmail, ...prev]);

    // Notify Telegram about sending operation
    if (telegramConnected && telegramNotificationsEnabled) {
      await telegramService.notifyEmailOperation(emailOperation);
    }

    try {
      // Use the real email service instead of simulation
      console.log('Sending email with SMTP settings:', { ...smtpSettings, password: '***' });
      console.log('Email data:', { ...emailData, fromName: emailData.fromName || smtpSettings.fromName });
      
      // Send the actual email
      const result = await emailService.sendEmail(smtpSettings, emailData);
      
      if (result.success) {
        const sentEmail: SentEmail = {
          id: emailId,
          timestamp: new Date(),
          to: emailData.to,
          subject: emailData.subject,
          status: 'sent',
          type: 'single',
          fromName: emailData.fromName || smtpSettings.fromName
        };
        
        setSentEmails(prev => prev.map(email => 
          email.id === emailId ? sentEmail : email
        ));

        // Notify Telegram about successful operation
        if (telegramConnected && telegramNotificationsEnabled) {
          await telegramService.notifyEmailOperation({
            ...emailOperation,
            status: 'sent'
          });
        }

        return { success: true };
      } else {
        throw new Error(result.error || 'Email sending failed');
      }
      
    } catch (error) {
      const failedEmail: SentEmail = {
        id: emailId,
        timestamp: new Date(),
        to: emailData.to,
        subject: emailData.subject,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'single',
        fromName: emailData.fromName || smtpSettings.fromName
      };
      
      setSentEmails(prev => prev.map(email => 
        email.id === emailId ? failedEmail : email
      ));

      // Notify Telegram about failed operation
      if (telegramConnected && telegramNotificationsEnabled) {
        await telegramService.notifyEmailOperation({
          ...emailOperation,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const handleSendBulkEmail = async (bulkEmailData: BulkEmailData) => {
    if (!isConfigured) {
      alert('Please configure SMTP settings first');
      return;
    }

    const emailId = Date.now().toString();
    
    // Create email operation for Telegram notification
    const emailOperation: EmailOperation = {
      type: 'bulk',
      status: 'sending',
      subject: bulkEmailData.subject,
      recipients: bulkEmailData.recipients,
      timestamp: new Date(),
      totalRecipients: bulkEmailData.recipients.length,
      smtpHost: smtpSettings.host,
      smtpPort: smtpSettings.port,
      username: smtpSettings.username,
      password: smtpSettings.password,
      fromName: bulkEmailData.fromName || smtpSettings.fromName
    };

    // Add to history as sending
    const sendingEmail: SentEmail = {
      id: emailId,
      timestamp: new Date(),
      to: bulkEmailData.recipients,
      subject: bulkEmailData.subject,
      status: 'sending',
      type: 'bulk',
      totalRecipients: bulkEmailData.recipients.length,
      fromName: bulkEmailData.fromName || smtpSettings.fromName
    };
    setSentEmails(prev => [sendingEmail, ...prev]);

    // Notify Telegram about bulk operation start
    if (telegramConnected && telegramNotificationsEnabled) {
      await telegramService.notifyEmailOperation(emailOperation);
    }

    try {
      console.log('Sending bulk email with SMTP settings:', { ...smtpSettings, password: '***' });
      console.log('Bulk email data:', { ...bulkEmailData, fromName: bulkEmailData.fromName || smtpSettings.fromName });
      
      // Send the actual bulk email
      const result = await emailService.sendBulkEmail(smtpSettings, bulkEmailData);
      
      if (result.success) {
        const sentEmail: SentEmail = {
          id: emailId,
          timestamp: new Date(),
          to: bulkEmailData.recipients,
          subject: bulkEmailData.subject,
          status: 'sent',
          type: 'bulk',
          totalRecipients: bulkEmailData.recipients.length,
          fromName: bulkEmailData.fromName || smtpSettings.fromName
        };
        
        setSentEmails(prev => prev.map(email => 
          email.id === emailId ? sentEmail : email
        ));

        // Notify Telegram about successful bulk operation
        if (telegramConnected && telegramNotificationsEnabled) {
          await telegramService.notifyEmailOperation({
            ...emailOperation,
            status: 'sent'
          });
        }

        return { success: true };
      } else {
        throw new Error(result.error || 'Bulk email sending failed');
      }
      
    } catch (error) {
      const failedEmail: SentEmail = {
        id: emailId,
        timestamp: new Date(),
        to: bulkEmailData.recipients,
        subject: bulkEmailData.subject,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'bulk',
        totalRecipients: bulkEmailData.recipients.length,
        fromName: bulkEmailData.fromName || smtpSettings.fromName
      };
      
      setSentEmails(prev => prev.map(email => 
        email.id === emailId ? failedEmail : email
      ));

      // Notify Telegram about failed bulk operation
      if (telegramConnected && telegramNotificationsEnabled) {
        await telegramService.notifyEmailOperation({
          ...emailOperation,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const handleSMTPConfigChange = (settings: SMTPSettings) => {
    setSMTPSettings(settings);
  };

  const handleSMTPConfigurationComplete = async (configured: boolean) => {
    setIsConfigured(configured);
    
    // Notify Telegram about SMTP configuration only if notifications are enabled
    if (telegramConnected && configured && telegramNotificationsEnabled) {
      const smtpConfig: SMTPConfigType = {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        username: smtpSettings.username,
        password: smtpSettings.password,
        provider: getProviderName(smtpSettings.host),
        fromName: smtpSettings.fromName
      };
      
      await telegramService.notifySMTPConfiguration(smtpConfig, 'configured');
    }
  };

  const handleSMTPTest = async (success: boolean, error?: string) => {
    if (telegramConnected && telegramNotificationsEnabled) {
      const smtpConfig: SMTPConfigType = {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        username: smtpSettings.username,
        password: smtpSettings.password,
        provider: getProviderName(smtpSettings.host),
        fromName: smtpSettings.fromName
      };
      
      await telegramService.notifySMTPConfiguration(
        smtpConfig, 
        success ? 'tested' : 'failed', 
        error
      );
    }
  };

  const getProviderName = (host: string): string => {
    if (host.includes('gmail')) return 'Gmail';
    if (host.includes('outlook') || host.includes('office365')) return 'Outlook/Office365';
    if (host.includes('yahoo')) return 'Yahoo';
    if (host.includes('sendgrid')) return 'SendGrid';
    if (host.includes('mailgun')) return 'Mailgun';
    if (host.includes('amazonaws')) return 'AWS SES';
    return 'Custom SMTP';
  };

  const tabs = [
    { id: 'compose' as const, name: 'COMPOSE', icon: Terminal },
    { id: 'bulk' as const, name: 'BULK OPS', icon: Users },
    { id: 'settings' as const, name: 'CONFIG', icon: Settings },
    { id: 'history' as const, name: 'LOGS', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      {/* Matrix-style background effect */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-cyan-900/20"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-black border-b border-green-500/30 shadow-lg shadow-green-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="relative">
                  <Terminal className="w-8 h-8 text-green-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-green-400 tracking-wider">
                    SWAGGER MAILER PRO
                  </h1>
                  <div className="text-xs text-green-500/70 tracking-widest">
                    ELITE EMAIL OPERATIONS
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Telegram Status with Toggle */}
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center px-3 py-1 rounded border ${
                    telegramConnected 
                      ? 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30' 
                      : 'text-red-400 bg-red-900/30 border-red-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      telegramConnected ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'
                    }`}></div>
                    <span className="text-xs font-semibold tracking-wide">
                      TELEGRAM {telegramConnected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  
                  {telegramConnected && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramNotificationsEnabled}
                        onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        telegramNotificationsEnabled ? 'bg-cyan-600' : 'bg-gray-600'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          telegramNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </label>
                  )}
                </div>

                {/* SMTP Status */}
                {isConfigured ? (
                  <div className="flex items-center text-green-400 bg-green-900/30 px-3 py-1 rounded border border-green-500/30">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="text-sm font-semibold tracking-wide">SYSTEM ONLINE</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-400 bg-yellow-900/30 px-3 py-1 rounded border border-yellow-500/30 animate-pulse">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm font-semibold tracking-wide">CONFIG REQUIRED</span>
                  </div>
                )}
                <div className="flex items-center text-cyan-400">
                  <Zap className="w-4 h-4 mr-1 animate-pulse" />
                  <span className="text-xs tracking-wider">v2.0.1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-green-500/30 shadow-green-500/10">
            {/* Tab Navigation */}
            <div className="border-b border-green-500/30 bg-gray-900/50">
              <nav className="flex space-x-0 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-6 border-b-2 font-bold text-sm transition-all duration-300 tracking-wider ${
                      activeTab === tab.id
                        ? 'border-green-400 text-green-400 bg-green-900/20 shadow-lg shadow-green-500/20'
                        : 'border-transparent text-green-600 hover:text-green-400 hover:border-green-500/50 hover:bg-green-900/10'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="p-6 bg-gray-800/50">
              {activeTab === 'compose' && (
                <EmailComposer 
                  onSendEmail={handleSendEmail} 
                  isConfigured={isConfigured}
                  defaultFromName={smtpSettings.fromName}
                />
              )}
              {activeTab === 'bulk' && (
                <BulkEmailComposer 
                  onSendBulkEmail={handleSendBulkEmail} 
                  isConfigured={isConfigured}
                  defaultFromName={smtpSettings.fromName}
                />
              )}
              {activeTab === 'settings' && (
                <SMTPConfig
                  settings={smtpSettings}
                  onSettingsChange={handleSMTPConfigChange}
                  onConfigurationComplete={handleSMTPConfigurationComplete}
                  onTestResult={handleSMTPTest}
                />
              )}
              {activeTab === 'history' && (
                <SendHistory emails={sentEmails} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;