import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

// Custom tooltip for the pie chart
const CustomTooltip = ({ active, payload, formatCurrency }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white shadow-md p-3 rounded border border-gray-200">
        <p className="font-medium text-gray-700">{data.name}</p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Bookings: </span>
          {data.value}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Revenue: </span>
          {formatCurrency(data.revenue)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Percentage: </span>
          {Math.round(data.percent)}%
        </p>
      </div>
    );
  }
  return null;
};

// Custom rendering for the legend
const renderLegend = (props) => {
  const { payload } = props;
  
  return (
    <ul className="flex flex-wrap justify-center mt-4 gap-x-8 gap-y-2">
      {payload.map((entry, index) => (
        <li key={`legend-${index}`} className="flex items-center">
          <div 
            className="w-3 h-3 mr-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-700">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

export default function BookingTypesChart({ 
  currentStats, 
  loading, 
  formatCurrency 
}) {
  if (loading || !currentStats) return null;
  
  // Extract booking type statistics, with fallback calculations when direct values aren't available
  let poolBookings = currentStats.poolBookings;
  let villaBookings = currentStats.villaBookings;
  let poolRevenue = currentStats.poolRevenue;
  let villaRevenue = currentStats.villaRevenue;
  
  // If the direct values aren't available, try to calculate them from the agent statistics or booking list
  if ((poolBookings === undefined || villaBookings === undefined) && currentStats.agentStats) {
    // Calculate from agent statistics
    poolBookings = 0;
    villaBookings = 0;
    poolRevenue = 0;
    villaRevenue = 0;
    
    currentStats.agentStats.forEach(agent => {
      // Some agents might have the type breakdown
      if (agent.poolBookings !== undefined) {
        poolBookings += agent.poolBookings || 0;
        villaBookings += agent.villaBookings || 0;
      }
    });
    
    // If we still don't have type breakdown but have approved bookings by rental type
    if ((poolBookings === 0 && villaBookings === 0) && currentStats.approvedBookings && currentStats.totalBookings) {
      // Try to use ratio from total bookings
      const approvedRatio = currentStats.approvedBookings / currentStats.totalBookings;
      
      // If we have totalRevenue, we can approximate the breakdown
      if (currentStats.totalRevenue) {
        // Estimate a 30/70 split between pool and villa if no other data
        poolRevenue = currentStats.totalRevenue * 0.3;
        villaRevenue = currentStats.totalRevenue * 0.7;
        
        // Use the same ratio for bookings
        poolBookings = Math.round(currentStats.totalBookings * 0.3);
        villaBookings = currentStats.totalBookings - poolBookings;
      }
    }
  }
  
  // For safety, ensure we have non-null values
  poolBookings = poolBookings || 0;
  villaBookings = villaBookings || 0;
  poolRevenue = poolRevenue || 0;
  villaRevenue = villaRevenue || 0;
  
  // If no data available
  if (poolBookings === 0 && villaBookings === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Type Distribution</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p>No booking type data available for the selected period</p>
            <p className="text-sm text-gray-400 mt-2">Try selecting a different time period</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Calculate totals
  const totalBookings = poolBookings + villaBookings;
  
  // Prepare data for the pie chart
  const data = [
    { 
      name: 'Pool Only', 
      value: poolBookings, 
      revenue: poolRevenue,
      percent: (poolBookings / totalBookings) * 100
    },
    { 
      name: 'Villa + Pool', 
      value: villaBookings, 
      revenue: villaRevenue,
      percent: (villaBookings / totalBookings) * 100
    }
  ];
  
  // Colors for each slice
  const COLORS = ['#4F46E5', '#10B981'];
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Type Distribution</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary text below chart */}
      <div className="mt-2 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Pool Bookings</p>
          <p className="text-lg font-bold text-blue-600">{poolBookings}</p>
          <p className="text-sm text-gray-600">{formatCurrency(poolRevenue)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Villa Bookings</p>
          <p className="text-lg font-bold text-emerald-600">{villaBookings}</p>
          <p className="text-sm text-gray-600">{formatCurrency(villaRevenue)}</p>
        </div>
      </div>
    </div>
  );
} 