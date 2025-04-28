import React from 'react';

// Component for displaying a trend arrow
export const TrendIndicator = ({ value, previousValue }) => {
  // Convert value to a number if it's a string or other format
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const numPrevValue = typeof previousValue === 'number' ? previousValue : parseFloat(previousValue);
  
  // Check if we have valid numbers to compare
  if (isNaN(numValue) || isNaN(numPrevValue) || previousValue === undefined || previousValue === null) {
    return null;
  }
  
  // Handle case where previous value is 0
  let percentChange = 0;
  if (numPrevValue === 0) {
    // Only show increase if current value is significant
    percentChange = numValue > 0 ? 100 : 0;
    // If current value is 0 too, don't show any change
    if (numValue === 0) return null;
  } else {
    percentChange = ((numValue - numPrevValue) / numPrevValue) * 100;
  }
  
  // Don't show very small changes
  if (Math.abs(percentChange) < 0.01) return null;
  
  const isPositive = percentChange > 0;
  const displayValue = Math.abs(percentChange).toFixed(1);
  
  return (
    <div className={`flex items-center mt-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? (
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      <span>{displayValue}%</span>
    </div>
  );
};

// Component for a single summary card
export const SummaryCard = ({ 
  title, 
  value, 
  previousValue,
  percentageOf = null,
  percentageTotal = null,
  icon,
  color = 'blue' 
}) => {
  // Calculate percentage if both values are provided
  const percentage = percentageOf !== null && percentageTotal && percentageTotal > 0
    ? Math.round((percentageOf / percentageTotal) * 100)
    : null;
  
  // Color classes
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    indigo: 'text-indigo-600 bg-indigo-100',
    purple: 'text-purple-600 bg-purple-100',
  };
  
  const textColor = colorClasses[color]?.split(' ')[0] || 'text-blue-600';
  const bgColor = colorClasses[color]?.split(' ')[1] || 'bg-blue-100';
  
  return (
    <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold ${textColor.replace('text-', 'text-')}`}>{value}</p>
          {percentage !== null && (
            <p className="text-sm text-gray-500">{percentage}% of total</p>
          )}
          <TrendIndicator value={value} previousValue={previousValue} />
        </div>
        <div className={`rounded-full ${bgColor} p-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function SummaryCards({ 
  currentStats, 
  previousStats, 
  loading, 
  formatCurrency 
}) {
  if (loading) return null;
  
  // Extract numeric value from formatted currency for trend calculation
  const extractNumericValue = (formattedCurrency) => {
    // For handling already formatted currency strings
    if (typeof formattedCurrency === 'string') {
      // Remove currency symbol, thousands separators, etc. and parse as float
      const numericString = formattedCurrency.replace(/[^\d.-]/g, '');
      return parseFloat(numericString);
    }
    return formattedCurrency; // If it's already a number
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Bookings */}
      <SummaryCard
        title="Total Bookings"
        value={currentStats.totalBookings}
        previousValue={previousStats?.totalBookings}
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        color="blue"
      />
      
      {/* Approved Bookings */}
      <SummaryCard
        title="Approved Bookings"
        value={currentStats.approvedBookings}
        previousValue={previousStats?.approvedBookings}
        percentageOf={currentStats.approvedBookings}
        percentageTotal={currentStats.totalBookings}
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        }
        color="green"
      />
      
      {/* Pending Bookings */}
      <SummaryCard
        title="Pending Bookings"
        value={currentStats.pendingBookings}
        previousValue={previousStats?.pendingBookings}
        percentageOf={currentStats.pendingBookings}
        percentageTotal={currentStats.totalBookings}
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="yellow"
      />
      
      {/* Total Revenue */}
      <SummaryCard
        title="Total Revenue"
        value={formatCurrency(currentStats.totalRevenue)}
        // Pass raw numeric values for trend calculation
        previousValue={currentStats.totalRevenue !== undefined && previousStats?.totalRevenue !== undefined ? 
          previousStats.totalRevenue : null}
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="indigo"
      />
    </div>
  );
} 