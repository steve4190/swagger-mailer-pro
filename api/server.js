const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const nodemailer = require('nodemailer');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Rate limiting
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many email requests from this IP, please try again later.'
});

const testLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many test requests from this IP, please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const upload = multer({
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Validation schemas
const smtpSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  secure: Joi.boolean().required(),
  username: Joi.string().email().required(),
  password: Joi.string().required()
});

const emailSchema = Joi.object({
  smtp: smtpSchema.required(),
  from: Joi.string().required(),
  to: Joi.array().items(Joi.string().email()).min(1).required(),
  cc: Joi.array().items(Joi.string().email()).optional(),
  bcc: Joi.array().items(Joi.string().email()).optional(),
  subject: Joi.string().required(),
  text: Joi.string().optional(),
  html: Joi.string().optional(),
  attachments: Joi.array().optional()
});

const bulkEmailSchema = Joi.object({
  smtp: smtpSchema.required(),
  from: Joi.string().required(),
  recipients: Joi.array().items(Joi.string().email()).min(1).required(),
  subject: Joi.string().required(),
  text: Joi.string().optional(),
  html: Joi.string().optional(),
  sendMethod: Joi.string().valid('individual', 'batch').default('individual'),
  batchSize: Joi.number().integer().min(1).max(100).default(10),
  delayBetweenBatches: Joi.number().integer().min(0).default(1000)
});

// SMTP Providers data
const smtpProviders = [
  {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    notes: 'Requires App Password for 2FA accounts'
  },
  {
    name: 'Outlook/Hotmail',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    notes: 'Works with personal Microsoft accounts'
  },
  {
    name: 'Office 365',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    notes: 'For business Microsoft accounts'
  },
  {
    name: 'Yahoo',
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
    requiresAuth: true,
    notes: 'Requires App Password'
  },
  {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    requiresAuth: true,
    notes: 'Use "apikey" as username and API key as password'
  }
];

// Helper function to create transporter
const createTransporter = (smtpConfig) => {
  return nodemailer.createTransporter({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.username,
      pass: smtpConfig.password
    }
  });
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get SMTP providers
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    providers: smtpProviders
  });
});

// Test SMTP connection
app.post('/api/test-smtp', testLimiter, async (req, res) => {
  try {
    const { error, value } = smtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const transporter = createTransporter(value);
    await transporter.verify();

    res.json({
      success: true,
      message: 'SMTP connection successful'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'SMTP connection failed',
      details: err.message
    });
  }
});

// Send single email
app.post('/api/send-email', emailLimiter, upload.array('attachments'), async (req, res) => {
  try {
    let emailData;
    
    // Handle multipart form data
    if (req.files && req.files.length > 0) {
      emailData = {
        smtp: JSON.parse(req.body.smtp),
        from: req.body.from,
        to: JSON.parse(req.body.to),
        cc: req.body.cc ? JSON.parse(req.body.cc) : undefined,
        bcc: req.body.bcc ? JSON.parse(req.body.bcc) : undefined,
        subject: req.body.subject,
        text: req.body.text,
        html: req.body.html,
        attachments: req.files.map(file => ({
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype
        }))
      };
    } else {
      emailData = req.body;
    }

    const { error, value } = emailSchema.validate(emailData);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const transporter = createTransporter(value.smtp);
    
    const mailOptions = {
      from: value.from,
      to: value.to.join(', '),
      cc: value.cc ? value.cc.join(', ') : undefined,
      bcc: value.bcc ? value.bcc.join(', ') : undefined,
      subject: value.subject,
      text: value.text,
      html: value.html,
      attachments: value.attachments
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: err.message
    });
  }
});

// Send bulk email
app.post('/api/send-bulk-email', emailLimiter, async (req, res) => {
  try {
    const { error, value } = bulkEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const transporter = createTransporter(value.smtp);
    const results = [];
    const errors = [];

    if (value.sendMethod === 'individual') {
      // Send individual emails
      for (let i = 0; i < value.recipients.length; i++) {
        try {
          const mailOptions = {
            from: value.from,
            to: value.recipients[i],
            subject: value.subject,
            text: value.text,
            html: value.html
          };

          const info = await transporter.sendMail(mailOptions);
          results.push({
            recipient: value.recipients[i],
            success: true,
            messageId: info.messageId
          });

          // Add delay between batches
          if ((i + 1) % value.batchSize === 0 && i < value.recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, value.delayBetweenBatches));
          }
        } catch (err) {
          errors.push({
            recipient: value.recipients[i],
            error: err.message
          });
        }
      }
    } else {
      // Send as batch (all recipients in TO field)
      try {
        const mailOptions = {
          from: value.from,
          to: value.recipients.join(', '),
          subject: value.subject,
          text: value.text,
          html: value.html
        };

        const info = await transporter.sendMail(mailOptions);
        results.push({
          recipients: value.recipients,
          success: true,
          messageId: info.messageId
        });
      } catch (err) {
        errors.push({
          recipients: value.recipients,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk email operation completed`,
      results,
      errors,
      summary: {
        total: value.recipients.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk email',
      details: err.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        details: 'Maximum file size is 25MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        details: 'Maximum 10 files allowed'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Swagger Mailer Pro API running on port ${PORT}`);
  console.log(`📧 Ready to send emails!`);
});

module.exports = app;