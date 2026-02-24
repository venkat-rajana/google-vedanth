import React, { useState, useEffect } from 'react';
import { useDbStore } from '../../store/db';
import { AuditLog } from '../../types';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Input } from '../ui/Input';

export function AuditLogViewer() {
  const auditLogs = useDbStore(state => state.auditLogs);
  const users = useDbStore(state => state.users);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLogs = auditLogs.filter(log => {
    const user = users.find(u => u.id === log.userId);
    const searchString = `${user?.name || 'Unknown'} ${log.action} ${log.targetType} ${log.targetId}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">System Audit Logs</h2>
            <p className="text-sm text-gray-500">Track all data access and modifications</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-6 py-3">Timestamp</th>
              <th scope="col" className="px-6 py-3">User</th>
              <th scope="col" className="px-6 py-3">Action</th>
              <th scope="col" className="px-6 py-3">Target Type</th>
              <th scope="col" className="px-6 py-3">Target ID</th>
              <th scope="col" className="px-6 py-3">IP Note</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => {
              const user = users.find(u => u.id === log.userId);
              return (
                <tr key={log.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-xs">
                        {user?.name.charAt(0) || '?'}
                      </div>
                      <span className="font-medium text-gray-900">{user?.name || 'Unknown User'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{log.targetType}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{log.targetId.substring(0, 8)}...</td>
                  <td className="px-6 py-4 text-gray-500">{log.ipNote}</td>
                </tr>
              );
            })}
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No audit logs found matching your search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-medium text-gray-900">{filteredLogs.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
