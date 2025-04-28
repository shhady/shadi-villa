import React, { useEffect, useState } from 'react';

export default function FilterBar({ 
  timeFilter, 
  setTimeFilter, 
  yearFilter, 
  setYearFilter, 
  monthFilter, 
  setMonthFilter,
  agentFilter,
  setAgentFilter,
  rentalTypeFilter,
  setRentalTypeFilter,
  agents = [],
  onRefresh
}) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Store filters in URL to support bookmarking and sharing
  useEffect(() => {
    setIsMounted(true);
    
    // Only update URL after initial mount to prevent hydration errors
    if (isMounted) {
      const urlParams = new URLSearchParams(window.location.search);
      
      urlParams.set('timeFilter', timeFilter);
      
      if (timeFilter !== 'all') {
        urlParams.set('year', yearFilter);
        
        if (timeFilter === 'month') {
          urlParams.set('month', monthFilter);
        } else {
          urlParams.delete('month');
        }
      } else {
        urlParams.delete('year');
        urlParams.delete('month');
      }
      
      if (agentFilter) {
        urlParams.set('agent', agentFilter);
      } else {
        urlParams.delete('agent');
      }
      
      if (rentalTypeFilter) {
        urlParams.set('type', rentalTypeFilter);
      } else {
        urlParams.delete('type');
      }
      
      // Update URL without refreshing the page
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, [isMounted, timeFilter, yearFilter, monthFilter, agentFilter, rentalTypeFilter]);
  
  // Load filters from URL on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Time filter
      const urlTimeFilter = urlParams.get('timeFilter');
      if (urlTimeFilter && ['all', 'year', 'month', 'week'].includes(urlTimeFilter)) {
        setTimeFilter(urlTimeFilter);
      }
      
      // Year filter
      const urlYear = urlParams.get('year');
      if (urlYear && !isNaN(Number(urlYear))) {
        setYearFilter(Number(urlYear));
      }
      
      // Month filter
      const urlMonth = urlParams.get('month');
      if (urlMonth && !isNaN(Number(urlMonth))) {
        setMonthFilter(Number(urlMonth));
      }
      
      // Agent filter
      const urlAgent = urlParams.get('agent');
      if (urlAgent) {
        setAgentFilter(urlAgent);
      }
      
      // Rental type filter
      const urlType = urlParams.get('type');
      if (urlType && ['pool', 'villa_pool', 'all'].includes(urlType)) {
        setRentalTypeFilter(urlType);
      }
    }
  }, []);
  
  // Get month name from number
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber];
  };
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Booking Statistics Dashboard</h1>
      
      <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
        {/* Time filter selector */}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-label="Time period filter"
        >
          <option value="all">All Time</option>
          <option value="year">This Year</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
        
        {/* Year filter */}
        {timeFilter !== 'all' && (
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            aria-label="Year filter"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
        
        {/* Month filter */}
        {timeFilter === 'month' && (
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(Number(e.target.value))}
            className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            aria-label="Month filter"
          >
            {Array.from({ length: 12 }, (_, i) => i).map(month => (
              <option key={month} value={month}>{getMonthName(month)}</option>
            ))}
          </select>
        )}
        
        {/* Agent filter */}
        <select
          value={agentFilter || ''}
          onChange={(e) => setAgentFilter(e.target.value || null)}
          className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-label="Agent filter"
        >
          <option value="">All Agents</option>
          {agents.map(agent => (
            <option key={agent.agentId} value={agent.agentId}>
              {agent.agentName}
            </option>
          ))}
        </select>
        
        {/* Rental type filter */}
        <select
          value={rentalTypeFilter || 'all'}
          onChange={(e) => setRentalTypeFilter(e.target.value === 'all' ? null : e.target.value)}
          className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-label="Rental type filter"
        >
          <option value="all">All Types</option>
          <option value="pool">Pool Only</option>
          <option value="villa_pool">Villa + Pool</option>
        </select>
        
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Refresh data"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
} 