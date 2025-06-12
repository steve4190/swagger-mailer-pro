import React, { useState, useRef } from 'react';
import { FileText, Download, Plus, Eye, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface HTMLToPDFConverterProps {
  onPDFGenerated: (pdfFile: File) => void;
  className?: string;
}

export default function HTMLToPDFConverter({ onPDFGenerated, className = '' }: HTMLToPDFConverterProps) {
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PDF Document</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
        }
        h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
        }
        h2 {
            color: #1e40af;
            margin-top: 30px;
        }
        .highlight {
            background-color: #fef3c7;
            padding: 2px 4px;
            border-radius: 3px;
        }
        .box {
            border: 1px solid #d1d5db;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            background-color: #f9fafb;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f3f4f6;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Sample PDF Document</h1>
    
    <p>This is a sample HTML document that will be converted to PDF. You can customize this content with your own HTML, CSS, and styling.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Full HTML and CSS support</li>
        <li>Custom fonts and styling</li>
        <li>Tables and lists</li>
        <li>Images and graphics</li>
        <li><span class="highlight">Highlighted text</span></li>
    </ul>
    
    <div class="box">
        <h3>Information Box</h3>
        <p>This is an example of a styled box with custom CSS. You can create professional-looking documents with proper formatting.</p>
    </div>
    
    <h2>Sample Table</h2>
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Price</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Product A</td>
                <td>High-quality product with excellent features</td>
                <td>$99.99</td>
            </tr>
            <tr>
                <td>Product B</td>
                <td>Premium solution for advanced users</td>
                <td>$149.99</td>
            </tr>
        </tbody>
    </table>
    
    <p><strong>Note:</strong> This PDF was generated from HTML using the built-in converter.</p>
</body>
</html>`);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [fileName, setFileName] = useState('document.pdf');
  const previewRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!htmlContent.trim()) {
      setResult({ success: false, message: 'Please enter HTML content' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // Create a temporary container for rendering
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '40px';
      tempContainer.style.boxSizing = 'border-box';
      
      document.body.appendChild(tempContainer);

      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Convert HTML to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: tempContainer.scrollHeight + 80
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, canvas.height]
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 794, canvas.height);

      // Convert PDF to blob and then to File
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Call the callback to add to attachments
      onPDFGenerated(pdfFile);

      setResult({ success: true, message: `PDF "${fileName}" generated and added to attachments!` });
    } catch (error) {
      console.error('PDF generation error:', error);
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate PDF' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!htmlContent.trim()) {
      setResult({ success: false, message: 'Please enter HTML content' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // Create a temporary container for rendering
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '40px';
      tempContainer.style.boxSizing = 'border-box';
      
      document.body.appendChild(tempContainer);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: tempContainer.scrollHeight + 80
      });

      document.body.removeChild(tempContainer);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, canvas.height]
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 794, canvas.height);

      // Download the PDF
      pdf.save(fileName);

      setResult({ success: true, message: `PDF "${fileName}" downloaded successfully!` });
    } catch (error) {
      console.error('PDF generation error:', error);
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate PDF' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const insertTemplate = (template: string) => {
    const templates = {
      invoice: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info { text-align: left; }
        .invoice-info { text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        .total { text-align: right; font-weight: bold; font-size: 18px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
    </div>
    
    <div class="invoice-details">
        <div class="company-info">
            <h3>Your Company Name</h3>
            <p>123 Business Street<br>City, State 12345<br>Phone: (555) 123-4567</p>
        </div>
        <div class="invoice-info">
            <p><strong>Invoice #:</strong> INV-001</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>
    </div>
    
    <h3>Bill To:</h3>
    <p>Customer Name<br>Customer Address<br>City, State 12345</p>
    
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Service/Product 1</td>
                <td>1</td>
                <td>$100.00</td>
                <td>$100.00</td>
            </tr>
            <tr>
                <td>Service/Product 2</td>
                <td>2</td>
                <td>$50.00</td>
                <td>$100.00</td>
            </tr>
        </tbody>
    </table>
    
    <div class="total">
        <p>Subtotal: $200.00</p>
        <p>Tax (10%): $20.00</p>
        <p><strong>Total: $220.00</strong></p>
    </div>
</body>
</html>`,
      
      report: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Business Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .section { margin: 30px 0; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .chart-placeholder { background: #f1f5f9; border: 2px dashed #cbd5e1; height: 200px; display: flex; align-items: center; justify-content: center; margin: 20px 0; border-radius: 8px; }
        h1 { color: #1e40af; }
        h2 { color: #2563eb; border-left: 4px solid #2563eb; padding-left: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Monthly Business Report</h1>
        <p>Report Period: ${new Date().toLocaleDateString()} - ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="section">
        <h2>Executive Summary</h2>
        <p>This report provides an overview of key business metrics and performance indicators for the current period. Our analysis shows positive growth across multiple areas with opportunities for continued expansion.</p>
    </div>
    
    <div class="section">
        <h2>Key Metrics</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">$125K</div>
                <div>Revenue</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">1,250</div>
                <div>New Customers</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">95%</div>
                <div>Satisfaction Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">15%</div>
                <div>Growth Rate</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Performance Analysis</h2>
        <div class="chart-placeholder">
            <p>Chart: Revenue Trend (Chart would be inserted here)</p>
        </div>
        <p>Revenue has shown consistent growth over the past quarter, with a notable increase in customer acquisition and retention rates.</p>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Continue investment in customer acquisition channels</li>
            <li>Expand product offerings based on customer feedback</li>
            <li>Implement new retention strategies</li>
            <li>Optimize operational efficiency</li>
        </ul>
    </div>
</body>
</html>`,
      
      letter: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Business Letter</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 60px; color: #333; line-height: 1.8; }
        .letterhead { text-align: center; margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
        .date { text-align: right; margin-bottom: 40px; }
        .recipient { margin-bottom: 30px; }
        .content { margin-bottom: 30px; }
        .signature { margin-top: 60px; }
        .signature-line { border-bottom: 1px solid #333; width: 200px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="letterhead">
        <h2>Your Company Name</h2>
        <p>123 Business Street, Suite 100<br>
        City, State 12345<br>
        Phone: (555) 123-4567 | Email: info@company.com</p>
    </div>
    
    <div class="date">
        ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
    
    <div class="recipient">
        <p>Mr./Ms. Recipient Name<br>
        Title<br>
        Company Name<br>
        Address<br>
        City, State 12345</p>
    </div>
    
    <div class="content">
        <p>Dear Mr./Ms. [Last Name],</p>
        
        <p>I am writing to [purpose of letter]. This letter serves to [main objective or reason for correspondence].</p>
        
        <p>[Main body paragraph 1 - Provide details, context, or background information relevant to your purpose.]</p>
        
        <p>[Main body paragraph 2 - Include additional details, supporting information, or specific requests/offers.]</p>
        
        <p>I would appreciate the opportunity to [next steps or call to action]. Please feel free to contact me at [phone number] or [email address] if you have any questions or would like to discuss this matter further.</p>
        
        <p>Thank you for your time and consideration. I look forward to hearing from you soon.</p>
        
        <p>Sincerely,</p>
    </div>
    
    <div class="signature">
        <div class="signature-line"></div>
        <p>Your Name<br>
        Your Title<br>
        Your Company Name</p>
    </div>
</body>
</html>`
    };
    
    setHtmlContent(templates[template as keyof typeof templates] || htmlContent);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <FileText className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-900">HTML to PDF Converter</h3>
        </div>
        <p className="text-blue-700 text-sm">
          Convert HTML content to PDF and automatically attach it to your email. Supports full HTML, CSS, images, and styling.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            PDF File Name
          </label>
          <div className="flex space-x-2">
            <select
              onChange={(e) => insertTemplate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1"
              defaultValue=""
            >
              <option value="">Insert Template</option>
              <option value="invoice">Invoice Template</option>
              <option value="report">Business Report</option>
              <option value="letter">Business Letter</option>
            </select>
          </div>
        </div>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="document.pdf"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            HTML Content
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
        
        <textarea
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          rows={16}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Enter your HTML content here..."
        />
        
        <p className="mt-1 text-xs text-gray-500">
          Enter complete HTML with CSS styling. The content will be rendered and converted to PDF.
        </p>
      </div>

      {showPreview && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">HTML Preview:</h4>
          <div 
            ref={previewRef}
            className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-lg flex items-center ${
          result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {result.success ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
          {result.message}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {isGenerating ? 'Generating...' : 'Generate & Add to Attachments'}
        </button>
        
        <button
          onClick={downloadPDF}
          disabled={isGenerating}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}