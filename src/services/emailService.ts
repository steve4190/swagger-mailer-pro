import { SMTPSettings, EmailData, BulkEmailData } from '../App';

interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

class EmailService {
  private apiBaseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  private async sendEmailViaAPI(
    smtpSettings: SMTPSettings,
    emailData: EmailData | BulkEmailData,
    isBulk: boolean = false
  ): Promise<EmailResult> {
    try {
      const endpoint = isBulk ? '/api/send-bulk-email' : '/api/send-email';
      const url = `${this.apiBaseUrl}${endpoint}`;

      const fromName = (emailData as any).fromName || smtpSettings.fromName || '';
      const fromAddress = fromName ? `"${fromName}" <${smtpSettings.username}>` : smtpSettings.username;

      let payload: any;

      if (isBulk) {
        const bulkData = emailData as BulkEmailData;
        payload = {
          smtp: {
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            username: smtpSettings.username,
            password: smtpSettings.password,
            fromName: smtpSettings.fromName
          },
          from: fromAddress,
          recipients: bulkData.recipients,
          subject: bulkData.subject,
          text: bulkData.textContent || '',
          html: bulkData.htmlContent || '',
          sendMethod: bulkData.sendMethod,
          batchSize: bulkData.batchSize,
          delayBetweenBatches: bulkData.delayBetweenBatches,
          attachments: bulkData.attachments ? await this.processAttachments(bulkData.attachments) : []
        };
      } else {
        const singleData = emailData as EmailData;
        payload = {
          smtp: {
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            username: smtpSettings.username,
            password: smtpSettings.password,
            fromName: smtpSettings.fromName
          },
          from: fromAddress,
          to: singleData.to,
          cc: singleData.cc || [],
          bcc: singleData.bcc || [],
          subject: singleData.subject,
          text: singleData.textContent || '',
          html: singleData.htmlContent || '',
          attachments: singleData.attachments ? await this.processAttachments(singleData.attachments) : []
        };
      }

      console.log(`Sending ${isBulk ? 'bulk' : 'single'} email via API:`, {
        url,
        smtp: { ...payload.smtp, password: '***' },
        recipients: isBulk ? payload.recipients.length : payload.to.length
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          messageId: result.messageId || 'Email sent successfully'
        };
      } else {
        throw new Error(result.error || result.details || 'API request failed');
      }

    } catch (error) {
      console.error('Email API error:', error);
      
      // If API is not available, try fallback methods
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('API not available, trying fallback methods...');
        return await this.sendViaFallbackMethods(smtpSettings, emailData, isBulk);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async sendViaFallbackMethods(
    smtpSettings: SMTPSettings,
    emailData: EmailData | BulkEmailData,
    isBulk: boolean
  ): Promise<EmailResult> {
    try {
      // Try form submission services as final fallback
      return await this.sendViaFormSubmit(smtpSettings, emailData, isBulk);
    } catch (error) {
      console.log('Form submission fallback failed:', error);
    }

    return {
      success: false,
      error: 'All email sending methods failed. Please check your API server.'
    };
  }

  private async sendViaFormSubmit(
    smtpSettings: SMTPSettings,
    emailData: EmailData | BulkEmailData,
    isBulk: boolean
  ): Promise<EmailResult> {
    try {
      const formData = new FormData();
      
      // SMTP Configuration
      formData.append('smtp_host', smtpSettings.host);
      formData.append('smtp_port', smtpSettings.port.toString());
      formData.append('smtp_secure', smtpSettings.secure.toString());
      formData.append('smtp_username', smtpSettings.username);
      formData.append('smtp_password', smtpSettings.password);
      
      const fromName = (emailData as any).fromName || smtpSettings.fromName || '';
      const fromAddress = fromName ? `"${fromName}" <${smtpSettings.username}>` : smtpSettings.username;
      formData.append('from', fromAddress);
      
      formData.append('subject', emailData.subject);
      formData.append('text', emailData.textContent || '');
      formData.append('html', emailData.htmlContent || '');
      
      if (isBulk) {
        const bulkData = emailData as BulkEmailData;
        if (bulkData.sendMethod === 'bcc') {
          formData.append('to', smtpSettings.username);
          formData.append('bcc', bulkData.recipients.join(','));
        } else {
          formData.append('to', bulkData.recipients.join(','));
        }
      } else {
        const singleData = emailData as EmailData;
        formData.append('to', singleData.to.join(','));
        if (singleData.cc && singleData.cc.length > 0) {
          formData.append('cc', singleData.cc.join(','));
        }
        if (singleData.bcc && singleData.bcc.length > 0) {
          formData.append('bcc', singleData.bcc.join(','));
        }
      }
      
      // Try FormSubmit service
      const response = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(smtpSettings.username), {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        return {
          success: true,
          messageId: 'Email sent via FormSubmit'
        };
      }
      
      throw new Error('FormSubmit service failed');
      
    } catch (error) {
      throw new Error('Form submission service failed');
    }
  }

  private async processAttachments(attachments: File[]): Promise<any[]> {
    const processedAttachments = [];
    
    for (const file of attachments) {
      try {
        const base64Content = await this.fileToBase64(file);
        processedAttachments.push({
          filename: file.name,
          content: base64Content,
          contentType: file.type,
          encoding: 'base64'
        });
      } catch (error) {
        console.error('Failed to process attachment:', file.name, error);
      }
    }
    
    return processedAttachments;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Content = result.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async sendEmail(smtpSettings: SMTPSettings, emailData: EmailData): Promise<EmailResult> {
    return await this.sendEmailViaAPI(smtpSettings, emailData, false);
  }

  async sendBulkEmail(smtpSettings: SMTPSettings, bulkEmailData: BulkEmailData): Promise<EmailResult> {
    return await this.sendEmailViaAPI(smtpSettings, bulkEmailData, true);
  }

  async testSMTPConnection(smtpSettings: SMTPSettings): Promise<EmailResult> {
    try {
      const url = `${this.apiBaseUrl}/api/test-smtp`;
      
      console.log('Testing SMTP connection via API:', {
        url,
        smtp: { ...smtpSettings, password: '***' }
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: smtpSettings.host,
          port: smtpSettings.port,
          secure: smtpSettings.secure,
          username: smtpSettings.username,
          password: smtpSettings.password,
          fromName: smtpSettings.fromName
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          messageId: result.messageId || 'SMTP test successful'
        };
      } else {
        throw new Error(result.error || result.details || 'SMTP test failed');
      }

    } catch (error) {
      console.error('SMTP test error:', error);
      
      // If API is not available, return a helpful error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'API server not available. Please start the SMTP API server.'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMTP test failed'
      };
    }
  }

  // Method to check API health
  async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const emailService = new EmailService();
export type { EmailResult };