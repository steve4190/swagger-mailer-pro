import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, FileText, File, Image, AlertTriangle, Loader, Plus, Code, Eye, QrCode, Terminal, User } from 'lucide-react';
import { EmailData } from '../App';
import HTMLToPDFConverter from './HTMLToPDFConverter';
import RichTextEditor from './RichTextEditor';
import EmailCaller from './EmailCaller';
import BarcodeGenerator from './BarcodeGenerator';

interface EmailComposerProps {
  onSendEmail: (emailData: EmailData) => Promise<{ success: boolean; error?: string }>;
  isConfigured: boolean;
  defaultFromName?: string;
}

export default function EmailComposer({ onSendEmail, isConfigured, defaultFromName }: EmailComposerProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    textContent: '',
    htmlContent: '',
    attachments: [],
    fromName: defaultFromName || ''
  });
  const [emailType, setEmailType] = useState<'plain' | 'html' | 'rich'>('rich');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showPDFConverter, setShowPDFConverter] = useState(false);
  const [showEmailCaller, setShowEmailCaller] = useState(false);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [showHtmlView, setShowHtmlView] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update fromName when defaultFromName changes
  React.useEffect(() => {
    if (defaultFromName && !emailData.fromName) {
      setEmailData(prev => ({ ...prev, fromName: defaultFromName }));
    }
  }, [defaultFromName]);

  const handleEmailListChange = (field: 'to' | 'cc' | 'bcc', value: string) => {
    const emails = value.split(',').map(email => email.trim()).filter(email => email);
    setEmailData(prev => ({ ...prev, [field]: emails }));
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEmailData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...files]
    }));
  };

  const handlePDFGenerated = (pdfFile: File) => {
    setEmailData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), pdfFile]
    }));
    setShowPDFConverter(false);
  };

  const handleLinkGenerated = (link: string, text: string) => {
    const linkHtml = `<a href="${link}" style="color: #10b981; text-decoration: underline;">${text}</a>`;
    
    if (emailType === 'rich') {
      setEmailData(prev => ({
        ...prev,
        htmlContent: (prev.htmlContent || '') + linkHtml
      }));
    } else if (emailType === 'html') {
      setEmailData(prev => ({
        ...prev,
        htmlContent: (prev.htmlContent || '') + linkHtml
      }));
    } else {
      setEmailData(prev => ({
        ...prev,
        textContent: (prev.textContent || '') + `${text}: ${link}`
      }));
    }
  };

  const handleBarcodeGenerated = (barcodeUrl: string, text: string) => {
    const barcodeHtml = `<div style="text-align: center; margin: 20px 0;"><img src="${barcodeUrl}" alt="Barcode: ${text}" style="max-width: 100%; height: auto;" /><br><small style="color: #666;">${text}</small></div>`;
    
    if (emailType === 'rich') {
      setEmailData(prev => ({
        ...prev,
        htmlContent: (prev.htmlContent || '') + barcodeHtml
      }));
    } else if (emailType === 'html') {
      setEmailData(prev => ({
        ...prev,
        htmlContent: (prev.htmlContent || '') + barcodeHtml
      }));
    } else {
      setEmailData(prev => ({
        ...prev,
        textContent: (prev.textContent || '') + `\n\nBarcode: ${text}\nURL: ${barcodeUrl}\n`
      }));
    }
    setShowBarcodeGenerator(false);
  };

  const removeAttachment = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('image')) return <Image className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSend = async () => {
    if (!isConfigured) {
      setSendResult({ success: false, message: 'SMTP configuration required' });
      return;
    }

    if (emailData.to.length === 0) {
      setSendResult({ success: false, message: 'Target recipients required' });
      return;
    }

    if (!emailData.subject.trim()) {
      setSendResult({ success: false, message: 'Subject line required' });
      return;
    }

    if (!emailData.textContent?.trim() && !emailData.htmlContent?.trim()) {
      setSendResult({ success: false, message: 'Message payload required' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await onSendEmail(emailData);
      if (result.success) {
        setSendResult({ success: true, message: 'Email transmission successful!' });
        // Reset form
        setEmailData({
          to: [],
          cc: [],
          bcc: [],
          subject: '',
          textContent: '',
          htmlContent: '',
          attachments: [],
          fromName: defaultFromName || ''
        });
      } else {
        setSendResult({ success: false, message: result.error || 'Transmission failed' });
      }
    } catch (error) {
      setSendResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'System error occurred' 
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Terminal className="w-6 h-6 text-green-400 mr-3" />
          <h2 className="text-2xl font-bold text-green-400 tracking-wider glitch">EMAIL COMPOSER</h2>
        </div>
        <p className="text-green-600 tracking-wide">Deploy HTML emails, attachments, and payloads via SMTP protocol</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
            <User className="w-4 h-4 inline mr-1" />
            FROM NAME (Optional)
          </label>
          <input
            type="text"
            value={emailData.fromName || ''}
            onChange={(e) => setEmailData(prev => ({ ...prev, fromName: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
            placeholder="Your Name or Organization"
          />
          <p className="mt-1 text-xs text-green-600">Display name for the sender (e.g., "John Doe" or "Company Name")</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
            TARGET RECIPIENTS *
          </label>
          <input
            type="text"
            value={emailData.to.join(', ')}
            onChange={(e) => handleEmailListChange('to', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
            placeholder="target1@domain.com, target2@domain.com"
            required
          />
          <p className="mt-1 text-xs text-green-600">Separate multiple targets with commas</p>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="text-sm text-cyan-400 hover:text-cyan-300 tracking-wider font-semibold"
          >
            {showCcBcc ? 'HIDE' : 'SHOW'} CC/BCC TARGETS
          </button>
        </div>

        {showCcBcc && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
                CC TARGETS
              </label>
              <input
                type="text"
                value={emailData.cc?.join(', ') || ''}
                onChange={(e) => handleEmailListChange('cc', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
                placeholder="cc@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
                BCC TARGETS
              </label>
              <input
                type="text"
                value={emailData.bcc?.join(', ') || ''}
                onChange={(e) => handleEmailListChange('bcc', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
                placeholder="bcc@domain.com"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-green-400 mb-2 tracking-wider">
            SUBJECT LINE *
          </label>
          <input
            type="text"
            value={emailData.subject}
            onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono"
            placeholder="Message subject"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-green-400 tracking-wider">
              MESSAGE PAYLOAD *
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex border border-green-500/50 rounded-lg overflow-hidden bg-gray-900">
                <button
                  type="button"
                  onClick={() => setEmailType('rich')}
                  className={`px-3 py-1 text-sm font-semibold tracking-wider ${
                    emailType === 'rich'
                      ? 'bg-green-600 text-black'
                      : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                  }`}
                >
                  RICH
                </button>
                <button
                  type="button"
                  onClick={() => setEmailType('html')}
                  className={`px-3 py-1 text-sm font-semibold tracking-wider ${
                    emailType === 'html'
                      ? 'bg-green-600 text-black'
                      : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                  }`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setEmailType('plain')}
                  className={`px-3 py-1 text-sm font-semibold tracking-wider ${
                    emailType === 'plain'
                      ? 'bg-green-600 text-black'
                      : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                  }`}
                >
                  PLAIN
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailCaller(!showEmailCaller)}
                className="flex items-center px-3 py-2 text-sm bg-cyan-900/50 text-cyan-400 rounded-lg hover:bg-cyan-900/70 transition-colors border border-cyan-500/30 font-semibold tracking-wider"
              >
                <Plus className="w-4 h-4 mr-1" />
                LINKS
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeGenerator(!showBarcodeGenerator)}
                className="flex items-center px-3 py-2 text-sm bg-purple-900/50 text-purple-400 rounded-lg hover:bg-purple-900/70 transition-colors border border-purple-500/30 font-semibold tracking-wider"
              >
                <QrCode className="w-4 h-4 mr-1" />
                BARCODE
              </button>
            </div>
          </div>

          {showEmailCaller && (
            <div className="mb-6">
              <EmailCaller onLinkGenerated={handleLinkGenerated} />
            </div>
          )}

          {showBarcodeGenerator && (
            <div className="mb-6">
              <BarcodeGenerator onBarcodeGenerated={handleBarcodeGenerated} />
            </div>
          )}

          {emailType === 'rich' ? (
            <RichTextEditor
              value={emailData.htmlContent || ''}
              onChange={(value) => setEmailData(prev => ({ ...prev, htmlContent: value }))}
              placeholder="Initialize message payload..."
              height="400px"
              showHtmlView={showHtmlView}
              onHtmlViewToggle={() => setShowHtmlView(!showHtmlView)}
            />
          ) : emailType === 'plain' ? (
            <textarea
              value={emailData.textContent || ''}
              onChange={(e) => setEmailData(prev => ({ ...prev, textContent: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent font-mono text-sm text-green-400"
              placeholder="Enter plain text message payload..."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 font-semibold tracking-wider">HTML EDITOR</span>
                <button
                  type="button"
                  onClick={() => setShowHtmlView(!showHtmlView)}
                  className="flex items-center px-3 py-1 text-xs bg-gray-700 text-green-400 rounded hover:bg-gray-600 transition-colors font-semibold tracking-wider"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {showHtmlView ? 'HIDE' : 'SHOW'} PREVIEW
                </button>
              </div>
              <textarea
                value={emailData.htmlContent || ''}
                onChange={(e) => setEmailData(prev => ({ ...prev, htmlContent: e.target.value }))}
                rows={12}
                className="w-full px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent font-mono text-sm text-green-400"
                placeholder="Enter HTML message payload..."
              />
              {showHtmlView && (
                <div className="bg-gray-900 border border-green-500/50 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-green-400 mb-2 tracking-wider">HTML PREVIEW:</h4>
                  <div 
                    className="bg-gray-800 border border-green-500/30 rounded p-3 min-h-[100px] text-sm"
                    dangerouslySetInnerHTML={{ __html: emailData.htmlContent || '<p class="text-gray-400">HTML preview will render here...</p>' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-green-400 tracking-wider">
              ATTACHMENTS
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowPDFConverter(!showPDFConverter)}
                className="flex items-center px-3 py-2 text-sm bg-purple-900/50 text-purple-400 rounded-lg hover:bg-purple-900/70 transition-colors border border-purple-500/30 font-semibold tracking-wider"
              >
                <FileText className="w-4 h-4 mr-2" />
                {showPDFConverter ? 'HIDE' : 'HTML→PDF'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-3 py-2 text-sm bg-gray-700 text-green-400 rounded-lg hover:bg-gray-600 transition-colors border border-green-500/30 font-semibold tracking-wider"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                ADD FILES
              </button>
            </div>
          </div>

          {showPDFConverter && (
            <div className="mb-6 p-4 border border-purple-500/30 rounded-lg bg-purple-900/20">
              <HTMLToPDFConverter onPDFGenerated={handlePDFGenerated} />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileAttachment}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
          />

          {emailData.attachments && emailData.attachments.length > 0 && (
            <div className="space-y-2">
              {emailData.attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-900 border border-green-500/30 rounded-lg">
                  <div className="flex items-center">
                    {getFileIcon(file)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-400">{file.name}</p>
                      <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {sendResult && (
          <div className={`p-4 rounded-lg flex items-center border ${
            sendResult.success 
              ? 'bg-green-900/30 text-green-400 border-green-500/30' 
              : 'bg-red-900/30 text-red-400 border-red-500/30'
          }`}>
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="font-semibold tracking-wider">{sendResult.message}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={isSending || !isConfigured}
            className="flex items-center px-6 py-3 bg-green-600 text-black rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold tracking-wider shadow-lg shadow-green-500/20 hover:shadow-green-500/40"
          >
            {isSending ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {isSending ? 'TRANSMITTING...' : 'EXECUTE SEND'}
          </button>
        </div>
      </div>
    </div>
  );
}