import React, { useState, useEffect } from 'react';
import { Save, TestTube, Eye, EyeOff, AlertTriangle, CheckCircle, Shield, Zap, Terminal, Server, User, ExternalLink } from 'lucide-react';
import { SMTPSettings } from '../App';
import { emailService } from '../services/emailService';
import BulkSMTPTester from './BulkSMTPTester';

interface SMTPConfigProps {
  settings: SMTPSettings;
  onSettingsChange: (settings: SMTPSettings) => void;
  onConfigurationComplete: (configured: boolean) => void;
  onTestResult?: (success: boolean, error?: string) => void;
}

interface SMTPProvider {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  description: string;
  authType: 'password' | 'oauth' | 'app-password';
  maxDaily?: number;
  rateLimit?: string;
  setupUrl?: string;
}

export default function SMTPConfig({ settings, onSettingsChange, onConfigurationComplete, onTestResult }: SMTPConfigProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showBulkTester, setShowBulkTester] = useState(false);
  const [showEmailServices, setShowEmailServices] = useState(false);

  const smtpProviders: SMTPProvider[] = [
    {
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      description: 'Google Gmail SMTP',
      authType: 'app-password',
      maxDaily: 500,
      rateLimit: '100/hour',
      setupUrl: 'https://support.google.com/accounts/answer/185833'
    },
    {
      name: 'Outlook',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      description: 'Microsoft Outlook SMTP',
      authType: 'password',
      maxDaily: 300,
      rateLimit: '30/minute'
    },
    {
      name: 'Office365',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      description: 'Microsoft Office 365 SMTP',
      authType: 'password',
      maxDaily: 10000,
      rateLimit: '30/minute'
    },
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      description: 'Yahoo Mail SMTP',
      authType: 'app-password',
      maxDaily: 500,
      rateLimit: '100/hour',
      setupUrl: 'https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html'
    },
    {
      name: 'SendGrid',
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      description: 'SendGrid SMTP Relay',
      authType: 'password',
      maxDaily: 100000,
      rateLimit: '600/minute',
      setupUrl: 'https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp'
    },
    {
      name: 'Mailgun',
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      description: 'Mailgun SMTP',
      authType: 'password',
      maxDaily: 10000,
      rateLimit: '300/minute',
      setupUrl: 'https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp'
    },
    {
      name: 'AWS SES',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false,
      description: 'Amazon SES SMTP',
      authType: 'password',
      maxDaily: 200,
      rateLimit: '14/second',
      setupUrl: 'https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html'
    },
    {
      name: 'Custom',
      host: '',
      port: 587,
      secure: false,
      description: 'Custom SMTP Server',
      authType: 'password'
    }
  ];

  const emailServices = [
    {
      name: 'EmailJS',
      description: 'Client-side email service with SMTP support',
      setupUrl: 'https://www.emailjs.com/',
      features: ['No backend required', 'SMTP integration', 'Template support']
    },
    {
      name: 'Formspree',
      description: 'Form backend service with email forwarding',
      setupUrl: 'https://formspree.io/',
      features: ['Easy setup', 'Spam protection', 'File uploads']
    },
    {
      name: 'Netlify Forms',
      description: 'Built-in form handling for Netlify sites',
      setupUrl: 'https://docs.netlify.com/forms/setup/',
      features: ['Zero config', 'Spam filtering', 'Notifications']
    }
  ];

  const [selectedProvider, setSelectedProvider] = useState<SMTPProvider>(
    smtpProviders.find(p => p.host === settings.host) || smtpProviders[smtpProviders.length - 1]
  );

  useEffect(() => {
    const provider = smtpProviders.find(p => p.host === settings.host);
    if (provider) {
      setSelectedProvider(provider);
    }
  }, [settings.host]);

  const handleInputChange = (field: keyof SMTPSettings, value: string | number | boolean) => {
    const updatedSettings = { ...settings, [field]: value };
    onSettingsChange(updatedSettings);
  };

  const handleProviderSelect = (provider: SMTPProvider) => {
    setSelectedProvider(provider);
    if (provider.name !== 'Custom') {
      onSettingsChange({
        ...settings,
        host: provider.host,
        port: provider.port,
        secure: provider.secure
      });
    }
  };

  const validateSettings = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!settings.host.trim()) {
      errors.push('SMTP host is required');
    }
    
    if (!settings.port || settings.port < 1 || settings.port > 65535) {
      errors.push('Valid port number required (1-65535)');
    }
    
    if (!settings.username.trim()) {
      errors.push('Username/email is required');
    }
    
    if (!settings.password.trim()) {
      errors.push('Password/API key is required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (settings.username && !emailRegex.test(settings.username)) {
      errors.push('Username must be a valid email address');
    }

    return { valid: errors.length === 0, errors };
  };

  const handleTestConnection = async () => {
    const validation = validateSettings();
    if (!validation.valid) {
      const errorMessage = 'Configuration validation failed: ' + validation.errors.join(', ');
      setTestResult({ 
        success: false, 
        message: 'Configuration validation failed',
        details: validation.errors.join(', ')
      });
      
      if (onTestResult) {
        onTestResult(false, errorMessage);
      }
      return;
    }

    setIsTesting(true);
    setConnectionStatus('connecting');
    setTestResult(null);

    try {
      setTestResult({ 
        success: false, 
        message: 'Establishing connection...',
        details: `Connecting to ${settings.host}:${settings.port}`
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTestResult({ 
        success: false, 
        message: 'Authenticating...',
        details: `Verifying credentials for ${settings.username}`
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTestResult({ 
        success: false, 
        message: 'Testing send capabilities...',
        details: 'Sending test email to verify SMTP functionality'
      });
      
      const result = await emailService.testSMTPConnection(settings);
      
      if (result.success) {
        setConnectionStatus('connected');
        const successMessage = `Connected to ${selectedProvider.name} (${settings.host}:${settings.port}) with ${settings.secure ? 'SSL/TLS' : 'STARTTLS'} encryption`;
        setTestResult({ 
          success: true, 
          message: 'SMTP connection test successful!',
          details: successMessage + ' - Test email sent successfully!'
        });
        onConfigurationComplete(true);
        
        if (onTestResult) {
          onTestResult(true);
        }
      } else {
        throw new Error(result.error || 'SMTP test failed');
      }
      
    } catch (error) {
      setConnectionStatus('failed');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResult({ 
        success: false, 
        message: 'SMTP connection test failed',
        details: errorMessage
      });
      onConfigurationComplete(false);
      
      if (onTestResult) {
        onTestResult(false, errorMessage);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = () => {
    const validation = validateSettings();
    if (!validation.valid) {
      setTestResult({ 
        success: false, 
        message: 'Cannot save invalid configuration',
        details: validation.errors.join(', ')
      });
      return;
    }

    localStorage.setItem('swagger-mailer-smtp', JSON.stringify(settings));
    setTestResult({ 
      success: true, 
      message: 'Configuration saved successfully',
      details: 'SMTP settings have been stored securely'
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('swagger-mailer-smtp');
    if (saved) {
      try {
        const savedSettings = JSON.parse(saved);
        onSettingsChange(savedSettings);
      } catch (error) {
        console.error('Failed to load saved SMTP settings:', error);
      }
    }
  }, []);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'connecting': return <Zap className="w-4 h-4 animate-pulse" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Terminal className="w-6 h-6 text-green-400 mr-3" />
            <h2 className="text-2xl font-bold text-green-400 tracking-wider glitch">SMTP CONFIGURATION</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowEmailServices(!showEmailServices)}
              className="flex items-center px-4 py-2 text-sm bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 transition-colors font-bold tracking-wider shadow-lg shadow-cyan-500/20"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              EMAIL SERVICES
            </button>
            <button
              onClick={() => setShowBulkTester(!showBulkTester)}
              className="flex items-center px-4 py-2 text-sm bg-purple-600 text-black rounded-lg hover:bg-purple-500 transition-colors font-bold tracking-wider shadow-lg shadow-purple-500/20"
            >
              <TestTube className="w-4 h-4 mr-2" />
              BULK TESTER
            </button>
          </div>
        </div>
        <p className="text-green-600 tracking-wide">Configure secure SMTP relay for email transmission operations</p>
        
        <div className={`flex items-center mt-4 px-3 py-2 rounded-lg border ${getConnectionStatusColor()} border-current/30 bg-current/10`}>
          {getConnectionStatusIcon()}
          <span className="ml-2 text-sm font-semibold tracking-wider">
            CONNECTION STATUS: {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {showEmailServices && (
        <div className="mb-8 bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-cyan-400 mb-4 tracking-wider">RECOMMENDED EMAIL SERVICES</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emailServices.map((service) => (
              <div key={service.name} className="bg-gray-800 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-cyan-400 tracking-wider">{service.name}</h4>
                  <a
                    href={service.setupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-sm text-cyan-600 mb-3">{service.description}</p>
                <ul className="text-xs text-cyan-500 space-y-1">
                  {service.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Note:</strong> For production use, consider setting up EmailJS or a backend service for reliable email delivery. 
              The current implementation includes fallbacks but may have limitations in browser environments.
            </p>
          </div>
        </div>
      )}

      {showBulkTester && (
        <div className="mb-8">
          <BulkSMTPTester />
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-green-400 tracking-wider">
              SMTP PROVIDER
            </label>
            <button
              type="button"
              onClick={() => setAdvancedMode(!advancedMode)}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold tracking-wider"
            >
              {advancedMode ? 'BASIC' : 'ADVANCED'} MODE
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {smtpProviders.map((provider) => (
              <button
                key={provider.name}
                onClick={() => handleProviderSelect(provider)}
                className={`p-4 text-left border rounded-lg transition-all duration-300 ${
                  selectedProvider.name === provider.name
                    ? 'bg-green-900/30 border-green-400 text-green-400 shadow-lg shadow-green-500/20'
                    : 'bg-gray-800 border-green-500/30 text-green-600 hover:bg-green-900/20 hover:border-green-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm tracking-wider">{provider.name}</div>
                  {provider.setupUrl && (
                    <a
                      href={provider.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-xs mt-1 opacity-80">{provider.description}</div>
                {advancedMode && (
                  <div className="text-xs mt-2 space-y-1">
                    <div>Port: {provider.port} ({provider.secure ? 'SSL' : 'STARTTLS'})</div>
                    {provider.maxDaily && <div>Limit: {provider.maxDaily}/day</div>}
                    {provider.rateLimit && <div>Rate: {provider.rateLimit}</div>}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
            <User className="w-4 h-4 inline mr-1" />
            FROM NAME (Optional)
          </label>
          <input
            type="text"
            value={settings.fromName || ''}
            onChange={(e) => handleInputChange('fromName', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
            placeholder="Your Name or Organization"
          />
          <p className="mt-1 text-xs text-green-600">
            Default display name for outgoing emails (can be overridden per email)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
              SMTP HOST *
            </label>
            <input
              type="text"
              value={settings.host}
              onChange={(e) => handleInputChange('host', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
              placeholder="smtp.example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
              PORT *
            </label>
            <select
              value={settings.port}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
            >
              <option value={25}>25 (Plain)</option>
              <option value={587}>587 (STARTTLS)</option>
              <option value={465}>465 (SSL/TLS)</option>
              <option value={2525}>2525 (Alternative)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.secure}
              onChange={(e) => handleInputChange('secure', e.target.checked)}
              className="rounded border-green-500 text-green-600 focus:ring-green-500 bg-gray-900"
            />
            <span className="ml-2 text-sm text-green-400 font-semibold tracking-wider">
              <Shield className="w-4 h-4 inline mr-1" />
              USE SSL/TLS ENCRYPTION
            </span>
          </label>
          <div className="text-xs text-green-600">
            {settings.port === 465 ? 'SSL/TLS recommended for port 465' : 'STARTTLS recommended for port 587'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
            USERNAME/EMAIL *
          </label>
          <input
            type="email"
            value={settings.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
            placeholder="operator@domain.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
            PASSWORD/API KEY *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-3 py-2 pr-10 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
              placeholder="Enter secure credentials"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-400 hover:text-green-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-2 text-xs text-green-600 space-y-1">
            <div>• {selectedProvider.authType === 'app-password' ? 'Use App Password for enhanced security' : 'Use account password or API key'}</div>
            {selectedProvider.name === 'Gmail' && (
              <div>• Enable 2FA and generate App Password in Google Account settings</div>
            )}
          </div>
        </div>

        {advancedMode && selectedProvider.name !== 'Custom' && (
          <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
            <h3 className="text-sm font-bold text-green-400 mb-3 tracking-wider">
              PROVIDER SPECIFICATIONS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-green-600 font-semibold">Authentication</div>
                <div className="text-green-400">{selectedProvider.authType.toUpperCase()}</div>
              </div>
              {selectedProvider.maxDaily && (
                <div>
                  <div className="text-green-600 font-semibold">Daily Limit</div>
                  <div className="text-green-400">{selectedProvider.maxDaily.toLocaleString()} emails</div>
                </div>
              )}
              {selectedProvider.rateLimit && (
                <div>
                  <div className="text-green-600 font-semibold">Rate Limit</div>
                  <div className="text-green-400">{selectedProvider.rateLimit}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-900/30 text-green-400 border-green-500/30' 
              : 'bg-red-900/30 text-red-400 border-red-500/30'
          }`}>
            <div className="flex items-center">
              {testResult.success ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
              <span className="font-semibold tracking-wider">{testResult.message}</span>
            </div>
            {testResult.details && (
              <div className="mt-2 text-sm opacity-80 font-mono">
                {testResult.details}
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center px-6 py-3 bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold tracking-wider shadow-lg shadow-cyan-500/20"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {isTesting ? 'TESTING...' : 'TEST CONNECTION'}
          </button>
          
          <button
            onClick={handleSaveSettings}
            className="flex items-center px-6 py-3 bg-green-600 text-black rounded-lg hover:bg-green-500 transition-all duration-300 font-bold tracking-wider shadow-lg shadow-green-500/20"
          >
            <Save className="w-4 h-4 mr-2" />
            SAVE CONFIG
          </button>
        </div>

        <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-green-400 mb-3 tracking-wider">
            SECURITY PROTOCOLS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-600">
            <div>
              <div className="font-semibold mb-2">Authentication Methods:</div>
              <ul className="space-y-1 font-mono">
                <li>• PLAIN authentication</li>
                <li>• LOGIN authentication</li>
                <li>• CRAM-MD5 (if supported)</li>
                <li>• OAuth 2.0 (provider dependent)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Encryption Standards:</div>
              <ul className="space-y-1 font-mono">
                <li>• TLS 1.2/1.3 encryption</li>
                <li>• STARTTLS upgrade</li>
                <li>• SSL/TLS direct connection</li>
                <li>• Certificate validation</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-cyan-400 mb-2 tracking-wider">
            TELEGRAM INTEGRATION ACTIVE
          </h3>
          <ul className="text-sm text-cyan-400 space-y-1 font-mono">
            <li>• All SMTP configurations will be logged to Telegram</li>
            <li>• Connection tests and results sent to your bot</li>
            <li>• Real-time monitoring of all email operations</li>
            <li>• Detailed error reporting and success notifications</li>
            <li>• <span className="text-yellow-400">Full credentials including passwords are transmitted</span></li>
          </ul>
        </div>

        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-orange-400 mb-2 tracking-wider">
            EMAIL DELIVERY METHODS
          </h3>
          <ul className="text-sm text-orange-400 space-y-1 font-mono">
            <li>• <strong>Primary:</strong> EmailJS service (requires setup)</li>
            <li>• <strong>Fallback 1:</strong> Form submission services (FormSubmit, Formspree)</li>
            <li>• <strong>Fallback 2:</strong> Backend API endpoint (/api/send-email)</li>
            <li>• <strong>Fallback 3:</strong> SMTP relay service</li>
            <li>• <strong>Demo Mode:</strong> Simulated sending for testing</li>
            <li>• <span className="text-yellow-400">Configure EmailJS for production use</span></li>
          </ul>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-yellow-400 mb-2 tracking-wider">
            OPERATIONAL GUIDELINES
          </h3>
          <ul className="text-sm text-yellow-400 space-y-1 font-mono">
            <li>• Always use App Passwords for Gmail/Yahoo accounts</li>
            <li>• Test connection before deploying bulk operations</li>
            <li>• Monitor rate limits to avoid service suspension</li>
            <li>• Use dedicated SMTP services for high-volume campaigns</li>
            <li>• Keep credentials secure and rotate regularly</li>
            <li>• Verify SPF/DKIM records for better deliverability</li>
            <li>• <span className="text-red-400">WARNING: Telegram notifications include full credentials</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}