'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Component imports
import FilterBar from '../../../components/dashboard/FilterBar';
import SummaryCards from '../../../components/dashboard/SummaryCards';
import RevenueCharts from '../../../components/dashboard/RevenueCharts';
import BookingTypesChart from '../../../components/dashboard/BookingTypesChart';
import AgentTable from '../../../components/dashboard/AgentTable';
import TopAgentsWidget from '../../../components/dashboard/TopAgentsWidget';
import SkeletonLoading from '../../../components/dashboard/SkeletonLoading';
import SlowRespondersWidget from '../../../components/dashboard/SlowRespondersWidget';

// Create a client
const queryClient = new QueryClient();

// Wrap the app with QueryClientProvider
function StatisticsDashboardContent() {
  const { getToken, api } = useAuth();
  
  // State for filters
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'year', 'month', 'week'
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());
  const [agentFilter, setAgentFilter] = useState(null);
  const [rentalTypeFilter, setRentalTypeFilter] = useState(null);
  
  // Function to format currency
  const formatCurrency = (amount) => {
    // Handle null, undefined, or NaN values
    if (amount === null || amount === undefined || isNaN(amount)) {
      return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 0
      }).format(0);
    }
    
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Fetch current period statistics
  const {
    data: currentStats,
    isLoading: isLoadingCurrent,
    error: currentError,
    refetch: refetchCurrent
  } = useQuery({
    queryKey: ['statistics', timeFilter, yearFilter, monthFilter, agentFilter, rentalTypeFilter],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Authentication required');
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        timeFilter: timeFilter
      });
      
      if (timeFilter !== 'all') {
        queryParams.append('year', yearFilter);
        
        if (timeFilter === 'month') {
          queryParams.append('month', monthFilter);
        }
      }
      
      if (agentFilter) {
        queryParams.append('agentId', agentFilter);
      }
      
      if (rentalTypeFilter) {
        queryParams.append('rentalType', rentalTypeFilter);
      }
      
      const response = await api.get(`/api/statistics?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load statistics');
      }
      
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
  
  // Fetch previous period statistics for comparison
  const {
    data: previousStats,
    isLoading: isLoadingPrevious
  } = useQuery({
    queryKey: ['previous-statistics', timeFilter, yearFilter, monthFilter, agentFilter, rentalTypeFilter],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Authentication required');
      
      // For "all time", there's no defined previous period, so we'll skip the query
      if (timeFilter === 'all') {
        // Return a default object with zeros for all stats to avoid NaN in calculations
        return {
          totalBookings: 0,
          approvedBookings: 0,
          pendingBookings: 0,
          rejectedBookings: 0,
          totalRevenue: 0,
          monthlyRevenue: {},
          agentStats: []
        };
      }
      
      // Build query for previous period
      const queryParams = new URLSearchParams();
      
      let prevYear = yearFilter;
      let prevMonth = monthFilter;
      
      if (timeFilter === 'year') {
        prevYear = yearFilter - 1;
        queryParams.append('timeFilter', 'year');
        queryParams.append('year', prevYear);
      } else if (timeFilter === 'month') {
        if (monthFilter === 0) {
          prevYear = yearFilter - 1;
          prevMonth = 11;
        } else {
          prevMonth = monthFilter - 1;
        }
        queryParams.append('timeFilter', 'month');
        queryParams.append('year', prevYear);
        queryParams.append('month', prevMonth);
      } else if (timeFilter === 'week') {
        // For week, we fetch 1 week previous
        queryParams.append('timeFilter', 'custom');
        queryParams.append('daysAgo', 14);
        queryParams.append('daysAgoEnd', 7);
      }
      
      if (agentFilter) {
        queryParams.append('agentId', agentFilter);
      }
      
      if (rentalTypeFilter) {
        queryParams.append('rentalType', rentalTypeFilter);
      }
      
      try {
        const response = await api.get(`/api/statistics?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.data.success) {
          console.warn('Failed to load previous statistics:', response.data.message);
          // Return zeros instead of throwing an error
          return {
            totalBookings: 0,
            approvedBookings: 0,
            pendingBookings: 0,
            rejectedBookings: 0,
            totalRevenue: 0,
            monthlyRevenue: {},
            agentStats: []
          };
        }
        
        return response.data.data;
      } catch (error) {
        console.warn('Error loading previous statistics:', error.message);
        // Return zeros instead of throwing an error
        return {
          totalBookings: 0,
          approvedBookings: 0,
          pendingBookings: 0,
          rejectedBookings: 0,
          totalRevenue: 0,
          monthlyRevenue: {},
          agentStats: []
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: false
  });
  
  // Fetch agent list for filter dropdown
  const {
    data: agentList = [],
    isLoading: isLoadingAgents
  } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await api.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load agent list');
      }
      
      return response.data.data
        .filter(user => user.role === 'agent')
        .map(user => ({
          agentId: user._id,
          agentName: user.name,
          agentEmail: user.email
        }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
  
  // Handle errors
  useEffect(() => {
    if (currentError) {
      toast.error(`Error: ${currentError.message || 'Failed to load statistics'}`);
    }
  }, [currentError]);
  
  // Handle refresh
  const handleRefresh = () => {
    toast.success('Refreshing data...');
    refetchCurrent();
  };
  
  const isLoading = isLoadingCurrent || isLoadingPrevious || isLoadingAgents;
  
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FilterBar
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        agentFilter={agentFilter}
        setAgentFilter={setAgentFilter}
        rentalTypeFilter={rentalTypeFilter}
        setRentalTypeFilter={setRentalTypeFilter}
        agents={agentList}
        onRefresh={handleRefresh}
      />

      {isLoading ? (
        <SkeletonLoading />
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <SummaryCards
            currentStats={currentStats}
            previousStats={previousStats}
            loading={isLoading}
            formatCurrency={formatCurrency}
          />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RevenueCharts
              monthlyRevenue={currentStats?.monthlyRevenue}
              formatCurrency={formatCurrency}
              loading={isLoading}
            />
            
            <BookingTypesChart
              currentStats={currentStats}
              loading={isLoading}
              formatCurrency={formatCurrency}
            />
          </div>
          
          {/* Agents Performance Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Agents Widget */}
            <TopAgentsWidget
              agentStats={currentStats?.agentStats}
              loading={isLoading}
              formatCurrency={formatCurrency}
            />
            
            {/* Slow Responders Widget */}
            <SlowRespondersWidget
              slowResponders={currentStats?.slowResponders}
              loading={isLoading}
            />
          </div>
          
          {/* Agent Performance Table */}
          <AgentTable
            agentStats={currentStats?.agentStats}
            formatCurrency={formatCurrency}
            loading={isLoading}
          />
        </div>
      )}
    </div>
  );
}

export default function StatisticsDashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <QueryClientProvider client={queryClient}>
        <StatisticsDashboardContent />
      </QueryClientProvider>
    </ProtectedRoute>
  );
} 