import React, { useState, useRef } from 'react';
import { QrCode, Download, Plus, Copy, AlertTriangle, CheckCircle, Loader, Upload, Palette, Image, Terminal } from 'lucide-react';

interface BarcodeGeneratorProps {
  onBarcodeGenerated: (barcodeUrl: string, text: string) => void;
  className?: string;
}

export default function BarcodeGenerator({ onBarcodeGenerated, className = '' }: BarcodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [barcodeType, setBarcodeType] = useState<'qr' | 'barcode'>('qr');
  const [size, setSize] = useState(200);
  const [foregroundColor, setForegroundColor] = useState('#10b981');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateBarcode = async () => {
    if (!text.trim()) {
      setResult({ success: false, message: 'Data payload required for encoding' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      let barcodeUrl = '';
      
      if (barcodeType === 'qr') {
        // Generate QR code using QR Server API with customization
        const qrText = encodeURIComponent(text);
        const fgColor = foregroundColor.replace('#', '');
        const bgColor = backgroundColor.replace('#', '');
        
        // Base QR code URL
        barcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${qrText}&color=${fgColor}&bgcolor=${bgColor}`;
        
        // Add logo if provided
        if (logoUrl) {
          // For QR codes with logos, we'll use a different approach
          // Since QR Server API doesn't support logo overlay directly, we'll create a composite image
          barcodeUrl = await createQRWithLogo(qrText, size, foregroundColor, backgroundColor, logoUrl, logoSize);
        }
      } else {
        // Generate barcode using Barcode API with color customization
        const barcodeText = encodeURIComponent(text);
        const fgColor = foregroundColor.replace('#', '%23');
        const bgColor = backgroundColor.replace('#', '%23');
        barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${barcodeText}&code=Code128&multiplebarcodes=false&translate-esc=false&unit=Fit&dpi=96&imagetype=Png&rotation=0&color=${fgColor}&bgcolor=${bgColor}&qunit=Mm&quiet=0`;
      }

      // Test if the URL is accessible
      const img = new Image();
      img.onload = () => {
        onBarcodeGenerated(barcodeUrl, text);
        setResult({ 
          success: true, 
          message: `${barcodeType === 'qr' ? 'QR code' : 'Barcode'} generated and deployed to payload!`,
          url: barcodeUrl
        });
        setIsOpen(false);
        setText('');
        setLogoFile(null);
        setLogoUrl('');
      };
      img.onerror = () => {
        setResult({ success: false, message: 'Generation failed. Retry operation.' });
      };
      img.src = barcodeUrl;

    } catch (error) {
      console.error('Barcode generation error:', error);
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'System error during generation' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createQRWithLogo = async (text: string, size: number, fgColor: string, bgColor: string, logoDataUrl: string, logoSizePercent: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      // First, load the base QR code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        // Draw the QR code
        ctx.drawImage(qrImg, 0, 0, size, size);

        // Load and draw the logo
        const logoImg = new Image();
        logoImg.onload = () => {
          const logoSize = (size * logoSizePercent) / 100;
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;

          // Create a background circle for the logo
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, logoSize / 2 + 5, 0, 2 * Math.PI);
          ctx.fill();

          // Draw the logo
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

          // Convert canvas to data URL
          resolve(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = () => {
          // If logo fails to load, just return the QR code without logo
          resolve(canvas.toDataURL('image/png'));
        };
        logoImg.src = logoDataUrl;
      };
      qrImg.onerror = () => {
        reject(new Error('Failed to load QR code'));
      };
      
      const fgColorHex = fgColor.replace('#', '');
      const bgColorHex = bgColor.replace('#', '');
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fgColorHex}&bgcolor=${bgColorHex}`;
    });
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const downloadBarcode = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${barcodeType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presetColors = [
    { name: 'MATRIX', fg: '#10b981', bg: '#000000' },
    { name: 'CYBER', fg: '#00ffff', bg: '#1a1a2e' },
    { name: 'NEON', fg: '#ff0080', bg: '#0f0f23' },
    { name: 'GHOST', fg: '#ffffff', bg: '#1f2937' },
    { name: 'FIRE', fg: '#ff4500', bg: '#000000' },
    { name: 'ICE', fg: '#87ceeb', bg: '#000080' },
  ];

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center px-3 py-2 text-sm bg-purple-900/50 text-purple-400 rounded-lg hover:bg-purple-900/70 transition-colors border border-purple-500/30 font-semibold tracking-wider ${className}`}
      >
        <QrCode className="w-4 h-4 mr-2" />
        BARCODE GEN
      </button>
    );
  }

  return (
    <div className={`border border-purple-500/30 rounded-lg bg-purple-900/20 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Terminal className="w-5 h-5 text-purple-400 mr-2" />
          <h3 className="text-lg font-bold text-purple-400 tracking-wider">ADVANCED BARCODE GENERATOR</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setResult(null);
            setLogoFile(null);
            setLogoUrl('');
          }}
          className="text-purple-400 hover:text-purple-300 font-bold text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-purple-400 mb-2 tracking-wider">
            ENCODING TYPE
          </label>
          <div className="flex space-x-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="barcodeType"
                value="qr"
                checked={barcodeType === 'qr'}
                onChange={(e) => setBarcodeType(e.target.value as 'qr' | 'barcode')}
                className="mr-2"
              />
              <span className="text-sm text-purple-400 font-semibold tracking-wider">QR CODE</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="barcodeType"
                value="barcode"
                checked={barcodeType === 'barcode'}
                onChange={(e) => setBarcodeType(e.target.value as 'qr' | 'barcode')}
                className="mr-2"
              />
              <span className="text-sm text-purple-400 font-semibold tracking-wider">LINEAR BARCODE</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-purple-400 mb-2 tracking-wider">
            DATA PAYLOAD
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-purple-500/50 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-purple-400 font-mono"
            rows={3}
            placeholder="Enter data, URL, or payload to encode..."
          />
        </div>

        {barcodeType === 'qr' && (
          <div>
            <label className="block text-sm font-bold text-purple-400 mb-2 tracking-wider">
              DIMENSIONS (pixels)
            </label>
            <select
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-900 border border-purple-500/50 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-purple-400 font-mono"
            >
              <option value={150}>150x150</option>
              <option value={200}>200x200</option>
              <option value={300}>300x300</option>
              <option value={400}>400x400</option>
              <option value={500}>500x500</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-purple-400 mb-2 tracking-wider">
            <Palette className="w-4 h-4 inline mr-1" />
            COLOR SCHEME
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setForegroundColor(preset.fg);
                  setBackgroundColor(preset.bg);
                }}
                className="flex items-center p-2 bg-gray-900 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex mr-2">
                  <div 
                    className="w-4 h-4 border border-gray-600" 
                    style={{ backgroundColor: preset.fg }}
                  ></div>
                  <div 
                    className="w-4 h-4 border border-gray-600" 
                    style={{ backgroundColor: preset.bg }}
                  ></div>
                </div>
                <span className="text-xs text-purple-400 font-semibold tracking-wider">{preset.name}</span>
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-purple-400 mb-1 tracking-wider">
                FOREGROUND
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-8 h-8 border border-purple-500/50 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-purple-500/50 rounded focus:ring-1 focus:ring-purple-400 text-purple-400 font-mono"
                  placeholder="#10b981"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-400 mb-1 tracking-wider">
                BACKGROUND
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 border border-purple-500/50 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-purple-500/50 rounded focus:ring-1 focus:ring-purple-400 text-purple-400 font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </div>

        {barcodeType === 'qr' && (
          <div>
            <label className="block text-sm font-bold text-purple-400 mb-2 tracking-wider">
              <Image className="w-4 h-4 inline mr-1" />
              LOGO OVERLAY (Optional)
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center px-3 py-2 text-sm bg-gray-900 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 transition-colors text-purple-400 font-semibold tracking-wider"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  UPLOAD LOGO
                </button>
                {logoFile && (
                  <div className="flex items-center text-sm text-purple-400 font-semibold">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {logoFile.name}
                  </div>
                )}
              </div>
              
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              
              {logoUrl && (
                <div className="flex items-center space-x-3">
                  <img 
                    src={logoUrl} 
                    alt="Logo preview" 
                    className="w-12 h-12 object-contain border border-purple-500/30 rounded bg-gray-900"
                  />
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-purple-400 mb-1 tracking-wider">
                      LOGO SIZE (% of QR code)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      value={logoSize}
                      onChange={(e) => setLogoSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-purple-400 font-semibold tracking-wider">{logoSize}%</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoUrl('');
                    }}
                    className="text-red-400 hover:text-red-300 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={`p-3 rounded-lg flex items-center border ${
            result.success 
              ? 'bg-green-900/30 text-green-400 border-green-500/30' 
              : 'bg-red-900/30 text-red-400 border-red-500/30'
          }`}>
            {result.success ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
            <span className="flex-1 font-semibold tracking-wider">{result.message}</span>
            {result.success && result.url && (
              <div className="flex space-x-2 ml-2">
                <button
                  onClick={() => copyToClipboard(result.url!)}
                  className="text-green-400 hover:text-green-300"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => downloadBarcode(result.url!)}
                  className="text-green-400 hover:text-green-300"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={generateBarcode}
            disabled={isGenerating || !text.trim()}
            className="flex items-center px-4 py-2 bg-purple-600 text-black rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold tracking-wider shadow-lg shadow-purple-500/20"
          >
            {isGenerating ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {isGenerating ? 'GENERATING...' : 'GENERATE & DEPLOY'}
          </button>
        </div>

        <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-3">
          <h4 className="text-sm font-bold text-purple-400 mb-2 tracking-wider">FEATURES:</h4>
          <ul className="text-xs text-purple-400 space-y-1 font-mono">
            <li>• Custom color schemes with presets</li>
            <li>• Logo overlay for QR codes (10-30% size)</li>
            <li>• Multiple size options for QR codes</li>
            <li>• Support for various data types (URLs, text, contact info)</li>
            <li>• Download and copy functionality</li>
            <li>• Real-time preview and validation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}