# Swagger Mailer Pro API

A robust SMTP email API backend for the Swagger Mailer Pro application.

## Features

- ✅ **SMTP Email Sending**: Support for any SMTP provider
- ✅ **Bulk Email Operations**: Send to multiple recipients with batching
- ✅ **File Attachments**: Support for multiple file types up to 25MB
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **Input Validation**: Comprehensive data validation
- ✅ **Error Handling**: Detailed error responses
- ✅ **CORS Support**: Cross-origin request handling
- ✅ **Security Headers**: Helmet.js security middleware
- ✅ **Health Checks**: API status monitoring

## Quick Start

### 1. Installation

```bash
cd api
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Test SMTP Connection
```
POST /api/test-smtp
Content-Type: application/json

{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "username": "your-email@gmail.com",
  "password": "your-app-password",
  "fromName": "Your Name"
}
```

### Send Single Email
```
POST /api/send-email
Content-Type: application/json

{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "username": "your-email@gmail.com",
    "password": "your-app-password"
  },
  "from": "Your Name <your-email@gmail.com>",
  "to": ["recipient@example.com"],
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "subject": "Test Email",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>",
  "attachments": [
    {
      "filename": "document.pdf",
      "content": "base64-encoded-content",
      "contentType": "application/pdf",
      "encoding": "base64"
    }
  ]
}
```

### Send Bulk Email
```
POST /api/send-bulk-email
Content-Type: application/json

{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "username": "your-email@gmail.com",
    "password": "your-app-password"
  },
  "from": "Your Name <your-email@gmail.com>",
  "recipients": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "subject": "Bulk Email",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>",
  "sendMethod": "individual",
  "batchSize": 10,
  "delayBetweenBatches": 1000
}
```

### Get SMTP Providers
```
GET /api/providers
```

## File Uploads

The API supports file attachments via multipart/form-data:

```javascript
const formData = new FormData();
formData.append('smtp', JSON.stringify(smtpConfig));
formData.append('from', 'sender@example.com');
formData.append('to', JSON.stringify(['recipient@example.com']));
formData.append('subject', 'Email with attachment');
formData.append('text', 'Email content');
formData.append('attachments', file1);
formData.append('attachments', file2);

fetch('/api/send-email', {
  method: 'POST',
  body: formData
});
```

## Rate Limits

- **Email Sending**: 100 requests per 15 minutes per IP
- **SMTP Testing**: 10 requests per 5 minutes per IP

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Joi schema validation
- **File Type Filtering**: Only allowed file types
- **Size Limits**: 25MB per file, 10 files max

## Supported SMTP Providers

- Gmail (requires App Password)
- Outlook/Hotmail
- Office 365
- Yahoo (requires App Password)
- SendGrid
- Mailgun
- AWS SES
- Custom SMTP servers

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error information"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `ALLOWED_ORIGINS` | CORS origins | `*` |

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Heroku

```bash
# Add Heroku remote
heroku git:remote -a your-app-name

# Deploy
git push heroku main
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

## Monitoring

The API includes health check endpoints for monitoring:

- `GET /health` - Basic health status
- Response includes timestamp, version, and status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details