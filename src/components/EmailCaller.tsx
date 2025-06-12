import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, Calendar, MapPin, Globe, Plus, X, Copy, ExternalLink, Smartphone } from 'lucide-react';

interface EmailCallerProps {
  onLinkGenerated: (link: string, text: string) => void;
  className?: string;
}

interface ContactAction {
  type: 'email' | 'phone' | 'sms' | 'calendar' | 'map' | 'website';
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  prefix: string;
}

export default function EmailCaller({ onLinkGenerated, className = '' }: EmailCallerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ContactAction['type'] | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    sms: { phone: '', message: '' },
    calendar: { title: '', start: '', end: '', description: '' },
    map: { address: '' },
    website: { url: '', text: '' }
  });

  const contactActions: ContactAction[] = [
    {
      type: 'email',
      label: 'Email Link',
      value: 'Send Email',
      icon: Mail,
      prefix: 'mailto:'
    },
    {
      type: 'phone',
      label: 'Phone Call',
      value: 'Call Now',
      icon: Phone,
      prefix: 'tel:'
    },
    {
      type: 'sms',
      label: 'SMS Message',
      value: 'Send SMS',
      icon: MessageSquare,
      prefix: 'sms:'
    },
    {
      type: 'calendar',
      label: 'Calendar Event',
      value: 'Add to Calendar',
      icon: Calendar,
      prefix: 'data:text/calendar;charset=utf8,'
    },
    {
      type: 'map',
      label: 'Map Location',
      value: 'View on Map',
      icon: MapPin,
      prefix: 'https://maps.google.com/?q='
    },
    {
      type: 'website',
      label: 'Website Link',
      value: 'Visit Website',
      icon: Globe,
      prefix: 'https://'
    }
  ];

  const generateLink = (action: ContactAction) => {
    let link = '';
    let displayText = '';

    switch (action.type) {
      case 'email':
        link = `mailto:${formData.email}`;
        displayText = formData.email || 'Email Us';
        break;
      case 'phone':
        link = `tel:${formData.phone.replace(/\D/g, '')}`;
        displayText = formData.phone || 'Call Us';
        break;
      case 'sms':
        link = `sms:${formData.sms.phone.replace(/\D/g, '')}${formData.sms.message ? `?body=${encodeURIComponent(formData.sms.message)}` : ''}`;
        displayText = `Text ${formData.sms.phone}` || 'Send SMS';
        break;
      case 'calendar':
        const startDate = new Date(formData.calendar.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(formData.calendar.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Company//Your App//EN
BEGIN:VEVENT
UID:${Date.now()}@yourcompany.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${formData.calendar.title}
DESCRIPTION:${formData.calendar.description}
END:VEVENT
END:VCALENDAR`;
        link = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
        displayText = formData.calendar.title || 'Add to Calendar';
        break;
      case 'map':
        link = `https://maps.google.com/?q=${encodeURIComponent(formData.map.address)}`;
        displayText = formData.map.address || 'View Location';
        break;
      case 'website':
        link = formData.website.url.startsWith('http') ? formData.website.url : `https://${formData.website.url}`;
        displayText = formData.website.text || formData.website.url || 'Visit Website';
        break;
    }

    return { link, displayText };
  };

  const handleGenerate = (action: ContactAction) => {
    const { link, displayText } = generateLink(action);
    if (link) {
      onLinkGenerated(link, displayText);
      setIsOpen(false);
      setActiveAction(null);
      // Reset form
      setFormData({
        email: '',
        phone: '',
        sms: { phone: '', message: '' },
        calendar: { title: '', start: '', end: '', description: '' },
        map: { address: '' },
        website: { url: '', text: '' }
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderForm = (action: ContactAction) => {
    switch (action.type) {
      case 'email':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@company.com"
              />
            </div>
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        );

      case 'sms':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.sms.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, sms: { ...prev.sms, phone: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
              <textarea
                value={formData.sms.message}
                onChange={(e) => setFormData(prev => ({ ...prev, sms: { ...prev.sms, message: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Pre-filled message..."
              />
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input
                type="text"
                value={formData.calendar.title}
                onChange={(e) => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Meeting with John"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.calendar.start}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, start: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.calendar.end}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, end: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={formData.calendar.description}
                onChange={(e) => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, description: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Event description..."
              />
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address or Location</label>
              <input
                type="text"
                value={formData.map.address}
                onChange={(e) => setFormData(prev => ({ ...prev, map: { address: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>
        );

      case 'website':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={formData.website.url}
                onChange={(e) => setFormData(prev => ({ ...prev, website: { ...prev.website, url: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="www.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Text (Optional)</label>
              <input
                type="text"
                value={formData.website.text}
                onChange={(e) => setFormData(prev => ({ ...prev, website: { ...prev.website, text: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Visit Our Website"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors ${className}`}
      >
        <Smartphone className="w-4 h-4 mr-2" />
        Email Caller
      </button>
    );
  }

  return (
    <div className={`border border-green-200 rounded-lg bg-green-50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Smartphone className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-green-900">Email Caller - Add Interactive Links</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setActiveAction(null);
          }}
          className="text-green-600 hover:text-green-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!activeAction ? (
        <div>
          <p className="text-green-700 text-sm mb-4">
            Create interactive links that allow recipients to call, email, text, or add calendar events directly from your email.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {contactActions.map((action) => (
              <button
                key={action.type}
                onClick={() => setActiveAction(action.type)}
                className="flex items-center p-3 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                <action.icon className="w-5 h-5 text-green-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.value}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-green-600 hover:text-green-800 mr-3"
            >
              ←
            </button>
            <h4 className="text-lg font-medium text-green-900">
              {contactActions.find(a => a.type === activeAction)?.label}
            </h4>
          </div>

          {renderForm(contactActions.find(a => a.type === activeAction)!)}

          <div className="flex space-x-3 mt-4">
            <button
              onClick={() => handleGenerate(contactActions.find(a => a.type === activeAction)!)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Email
            </button>
            <button
              onClick={() => {
                const { link } = generateLink(contactActions.find(a => a.type === activeAction)!);
                copyToClipboard(link);
              }}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}