# Swagger Mailer Pro - Desktop Application

A powerful desktop email application built with Electron, React, and TypeScript for Windows and macOS.

## Features

- 📧 **Advanced Email Composition**: Rich text editor with HTML support
- 📨 **Bulk Email Operations**: Send to multiple recipients with batching
- 📎 **File Attachments**: Support for multiple file types up to 25MB
- 🔧 **SMTP Configuration**: Support for all major email providers
- 📊 **Email History**: Track sent emails and delivery status
- 🎨 **Modern UI**: Dark theme with cyberpunk aesthetics
- 🔐 **Secure**: Local storage of credentials with encryption
- 📱 **Cross-Platform**: Works on Windows and macOS

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd swagger-mailer-pro
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run electron-dev
```

### Building for Production

#### Build for current platform:
```bash
npm run dist
```

#### Build for Windows:
```bash
npm run dist-win
```

#### Build for macOS:
```bash
npm run dist-mac
```

#### Build for all platforms:
```bash
npm run dist-all
```

## SMTP Configuration

The application supports all major email providers:

- **Gmail**: Requires App Password for 2FA accounts
- **Outlook/Office365**: Works with personal and business accounts
- **Yahoo**: Requires App Password
- **SendGrid**: Use API key as password
- **Mailgun**: SMTP relay support
- **AWS SES**: Amazon email service
- **Custom SMTP**: Any SMTP server

## Usage

1. **Configure SMTP**: Go to Settings tab and enter your email provider details
2. **Compose Email**: Use the Compose tab to create single emails
3. **Bulk Operations**: Use Bulk Ops tab for mass email campaigns
4. **View History**: Check Logs tab for email delivery status

## Security Features

- Local credential storage
- TLS/SSL encryption support
- Rate limiting protection
- Input validation
- Secure file handling

## File Structure

```
swagger-mailer-pro/
├── electron/           # Electron main process files
│   ├── main.js        # Main Electron process
│   ├── preload.js     # Preload script for security
│   └── assets/        # Application icons
├── src/               # React application source
│   ├── components/    # React components
│   ├── services/      # Email and API services
│   └── App.tsx        # Main application component
├── api/               # Backend API server
└── dist/              # Built application files
```

## API Server

The application includes a Node.js API server for email operations:

```bash
cd api
npm install
npm start
```

The API provides endpoints for:
- SMTP testing
- Email sending
- Bulk operations
- Provider information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and support, please create an issue in the repository.