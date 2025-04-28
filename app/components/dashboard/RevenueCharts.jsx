import React from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useState } from 'react';

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-md p-3 rounded border border-gray-200">
        <p className="font-medium text-gray-700">{label}</p>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Revenue: </span>
          {currency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// Helper to transform monthly revenue data
const transformChartData = (monthlyRevenue) => {
  return Object.entries(monthlyRevenue || {}).map(([key, value]) => ({
    name: key,
    revenue: value
  }));
};

export default function RevenueCharts({ monthlyRevenue, formatCurrency, loading }) {
  const [chartType, setChartType] = useState('bar');
  
  if (loading || !monthlyRevenue) return null;
  
  const chartData = transformChartData(monthlyRevenue);
  
  // Add empty data notification
  if (chartData.length === 0 || chartData.every(item => item.revenue === 0)) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Chart</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No revenue data available for the selected period
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Revenue Chart</h2>
        
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <button
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'bar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setChartType('bar')}
            aria-label="Show bar chart"
          >
            Bar
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'line' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setChartType('line')}
            aria-label="Show line chart"
          >
            Line
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'area' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setChartType('area')}
            aria-label="Show area chart"
          >
            Area
          </button>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                height={50}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value).split('.')[0]}
              />
              <Tooltip content={<CustomTooltip currency={formatCurrency} />} />
              <Bar 
                dataKey="revenue" 
                name="Revenue" 
                fill="#4F46E5" 
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                height={50}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value).split('.')[0]}
              />
              <Tooltip content={<CustomTooltip currency={formatCurrency} />} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#4F46E5" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
                animationDuration={1000}
              />
            </LineChart>
          ) : (
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                height={50}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value).split('.')[0]}
              />
              <Tooltip content={<CustomTooltip currency={formatCurrency} />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#4F46E5"
                fill="#818CF8"
                animationDuration={1000}
                fillOpacity={0.6}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
} 