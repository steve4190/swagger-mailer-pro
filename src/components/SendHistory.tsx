import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, Mail, Users, Loader, Terminal, Filter, Search, Download, RefreshCw } from 'lucide-react';
import { SentEmail } from '../App';

interface SendHistoryProps {
  emails: SentEmail[];
}

export default function SendHistory({ emails }: SendHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'sending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'recipients'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const getStatusIcon = (status: 'sent' | 'failed' | 'sending') => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'sending':
        return <Loader className="w-5 h-5 text-yellow-400 animate-spin" />;
      default:
        return <Mail className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: 'sent' | 'failed' | 'sending') => {
    switch (status) {
      case 'sent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-900/30 text-green-400 border border-green-500/30 tracking-wider">DELIVERED</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-500/30 tracking-wider">FAILED</span>;
      case 'sending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 tracking-wider">TRANSMITTING</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-900/30 text-gray-400 border border-gray-500/30 tracking-wider">UNKNOWN</span>;
    }
  };

  const getTypeIcon = (type: 'single' | 'bulk') => {
    return type === 'bulk' ? <Users className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  };

  const getTypeLabel = (type: 'single' | 'bulk') => {
    return type === 'bulk' ? 'BULK OPS' : 'SINGLE';
  };

  // Filter and search emails
  const filteredEmails = emails.filter(email => {
    const matchesFilter = filter === 'all' || email.status === filter;
    const matchesSearch = searchTerm === '' || 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.to.some(recipient => recipient.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Sort emails
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'recipients':
        comparison = (a.totalRecipients || a.to.length) - (b.totalRecipients || b.to.length);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Status', 'Subject', 'Recipients', 'Total Recipients', 'Error'].join(','),
      ...sortedEmails.map(email => [
        email.timestamp.toISOString(),
        email.type,
        email.status,
        `"${email.subject}"`,
        `"${email.to.join('; ')}"`,
        email.totalRecipients || email.to.length,
        `"${email.error || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `swagger-mailer-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (emails.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Terminal className="w-6 h-6 text-green-400 mr-3" />
            <h2 className="text-2xl font-bold text-green-400 tracking-wider glitch">TRANSMISSION LOGS</h2>
          </div>
          <p className="text-green-600 tracking-wide">Monitor email delivery status and operation history</p>
        </div>

        <div className="text-center py-12 bg-gray-800/50 border border-green-500/30 rounded-lg">
          <Terminal className="w-16 h-16 text-green-400/50 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-green-400 mb-2 tracking-wider">NO OPERATIONS LOGGED</h3>
          <p className="text-green-600">Transmission history will appear here after email operations</p>
        </div>
      </div>
    );
  }

  const sentCount = emails.filter(email => email.status === 'sent').length;
  const failedCount = emails.filter(email => email.status === 'failed').length;
  const sendingCount = emails.filter(email => email.status === 'sending').length;
  const totalRecipients = emails.reduce((sum, email) => sum + (email.totalRecipients || email.to.length), 0);
  const successRate = emails.length > 0 ? ((sentCount / emails.length) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Terminal className="w-6 h-6 text-green-400 mr-3" />
          <h2 className="text-2xl font-bold text-green-400 tracking-wider glitch">TRANSMISSION LOGS</h2>
        </div>
        <p className="text-green-600 tracking-wide">Monitor email delivery status and operation history</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-900/30 rounded border border-green-500/30">
              <Terminal className="w-5 h-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-green-400">{emails.length}</p>
              <p className="text-xs text-green-600 tracking-wider">OPERATIONS</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-900/30 rounded border border-green-500/30">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-green-400">{sentCount}</p>
              <p className="text-xs text-green-600 tracking-wider">DELIVERED</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-900/30 rounded border border-red-500/30">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-red-400">{failedCount}</p>
              <p className="text-xs text-red-600 tracking-wider">FAILED</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-900/30 rounded border border-purple-500/30">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-purple-400">{totalRecipients}</p>
              <p className="text-xs text-purple-600 tracking-wider">TARGETS</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-cyan-900/30 rounded border border-cyan-500/30">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="ml-3">
              <p className="text-xl font-bold text-cyan-400">{successRate}%</p>
              <p className="text-xs text-cyan-600 tracking-wider">SUCCESS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono text-sm"
                placeholder="Search operations..."
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-green-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono text-sm"
              >
                <option value="all">ALL STATUS</option>
                <option value="sent">DELIVERED</option>
                <option value="failed">FAILED</option>
                <option value="sending">TRANSMITTING</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-gray-900 border border-green-500/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-green-400 font-mono text-sm"
              >
                <option value="date">SORT BY DATE</option>
                <option value="status">SORT BY STATUS</option>
                <option value="recipients">SORT BY TARGETS</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-gray-700 border border-green-500/30 rounded-lg hover:bg-gray-600 transition-colors text-green-400 font-mono text-sm"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <button
            onClick={exportLogs}
            className="flex items-center px-4 py-2 bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 transition-colors font-bold tracking-wider"
          >
            <Download className="w-4 h-4 mr-2" />
            EXPORT LOGS
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 text-sm text-green-600 font-semibold tracking-wider">
        SHOWING {sortedEmails.length} OF {emails.length} OPERATIONS
      </div>

      {/* Email List */}
      <div className="bg-gray-800 border border-green-500/30 rounded-lg overflow-hidden">
        <div className="divide-y divide-green-500/20">
          {sortedEmails.map((email) => (
            <div key={email.id} className="p-6 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {getStatusIcon(email.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-sm font-bold text-green-400 tracking-wider truncate">{email.subject}</h4>
                      <div className="flex items-center text-xs text-green-600 bg-gray-900 px-2 py-1 rounded border border-green-500/30">
                        {getTypeIcon(email.type)}
                        <span className="ml-1 font-semibold tracking-wider">{getTypeLabel(email.type)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-green-600 font-mono">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {email.type === 'bulk' ? 
                          `${email.totalRecipients} TARGETS` : 
                          `${email.to.length} TARGET${email.to.length > 1 ? 'S' : ''}`
                        }
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(email.timestamp)}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-xs text-green-500 font-mono">
                      {email.type === 'bulk' ? 
                        `BULK OPERATION: ${email.to.length} recipients` :
                        `TARGETS: ${email.to.join(', ')}`
                      }
                    </div>
                    
                    {email.error && (
                      <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400 font-mono">
                        <strong>ERROR:</strong> {email.error}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 ml-4">
                  {getStatusBadge(email.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sortedEmails.length === 0 && (
        <div className="text-center py-8 bg-gray-800/50 border border-green-500/30 rounded-lg">
          <Search className="w-12 h-12 text-green-400/50 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-green-400 mb-2 tracking-wider">NO MATCHING OPERATIONS</h3>
          <p className="text-green-600">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}