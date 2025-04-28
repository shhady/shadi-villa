import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';

// Helper to convert agent stats to CSV format
const convertToCSV = (agents, formatCurrency) => {
  if (!agents || agents.length === 0) return '';
  
  // Define headers
  const headers = ['Agent Name', 'Email', 'Total Bookings', 'Approved', 'Pending', 'Rejected', 'Revenue'];
  
  // Convert data to CSV format
  const rows = agents.map(agent => [
    agent.agentName,
    agent.agentEmail,
    agent.totalBookings,
    agent.approvedBookings,
    agent.pendingBookings,
    agent.rejectedBookings,
    formatCurrency(agent.totalRevenue).replace(/[₪,]/g, '') // Clean currency format for CSV
  ]);
  
  // Join headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};

// Helper to create sortable column header
const SortableHeader = ({ label, field, currentSort, onSort }) => {
  const isSorted = currentSort.field === field;
  const direction = currentSort.direction;
  
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {isSorted && (
          <span>
            {direction === 'asc' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </span>
        )}
      </div>
    </th>
  );
};

export default function AgentTable({ agentStats, formatCurrency, loading }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: 'totalRevenue', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortedAgents, setSortedAgents] = useState([]);
  
  // Apply sorting and filtering to agent data
  useEffect(() => {
    if (!agentStats) return;
    
    let filtered = [...agentStats];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.agentName.toLowerCase().includes(term) || 
        agent.agentEmail.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (a[sortConfig.field] < b[sortConfig.field]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.field] > b[sortConfig.field]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setSortedAgents(filtered);
    // Reset to first page when sorting or filtering changes
    setCurrentPage(1);
  }, [agentStats, sortConfig, searchTerm]);
  
  // Handle sort change
  const handleSort = (field) => {
    setSortConfig({
      field,
      direction: 
        sortConfig.field === field && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    });
  };
  
  // Handle export to CSV
  const handleExportCSV = () => {
    const csv = convertToCSV(sortedAgents, formatCurrency);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `agent_performance_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  // Pagination
  const totalPages = Math.ceil((sortedAgents?.length || 0) / pageSize);
  const paginatedAgents = sortedAgents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  if (loading) return null;
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Agent Performance</h2>
        
        <div className="flex flex-wrap items-center mt-2 sm:mt-0 gap-3">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <svg 
              className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* CSV Export button */}
          <button
            onClick={handleExportCSV}
            disabled={!sortedAgents || sortedAgents.length === 0}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader 
                label="Agent" 
                field="agentName" 
                currentSort={sortConfig} 
                onSort={handleSort} 
              />
              <SortableHeader 
                label="Total Bookings" 
                field="totalBookings" 
                currentSort={sortConfig} 
                onSort={handleSort} 
              />
              <SortableHeader 
                label="Approved" 
                field="approvedBookings" 
                currentSort={sortConfig} 
                onSort={handleSort} 
              />
              <SortableHeader 
                label="Pending" 
                field="pendingBookings" 
                currentSort={sortConfig} 
                onSort={handleSort} 
              />
              <SortableHeader 
                label="Rejected" 
                field="rejectedBookings" 
                currentSort={sortConfig} 
                onSort={handleSort} 
              />
              <SortableHeader 
                label="Revenue" 
                field="totalRevenue" 
                currentSort={sortConfig} 
                onSort={handleSort} 
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedAgents && paginatedAgents.length > 0 ? (
              paginatedAgents.map((agent) => (
                <tr 
                  key={agent.agentId}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                    <div className="text-sm text-gray-500">{agent.agentEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.totalBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {agent.approvedBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">
                    {agent.pendingBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                    {agent.rejectedBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(agent.totalRevenue)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm 
                    ? 'No agents found matching your search criteria'
                    : 'No agent data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      {sortedAgents.length > pageSize && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, sortedAgents.length)}
              </span>{' '}
              of <span className="font-medium">{sortedAgents.length}</span> agents
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 