import React from 'react';

// Component for a single agent card
const AgentCard = ({ agent, rank, formatCurrency }) => (
  <div className="flex items-center p-4 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition-colors duration-200">
    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 font-bold mr-4">
      {rank}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">
        {agent.agentName}
      </p>
      <p className="text-sm text-gray-500 truncate">
        {agent.agentEmail}
      </p>
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold text-indigo-600">
        {formatCurrency(agent.totalRevenue)}
      </p>
      <p className="text-xs text-gray-500">
        {agent.approvedBookings} bookings
      </p>
    </div>
  </div>
);

export default function TopAgentsWidget({ 
  agentStats, 
  formatCurrency, 
  loading, 
  limit = 5 
}) {
  if (loading || !agentStats) return null;
  
  // Get top agents by revenue
  const topAgents = [...agentStats]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
  
  if (topAgents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Top Performing Agents</h2>
        <div className="h-40 flex items-center justify-center text-gray-500">
          No agent data available
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Top Performing Agents</h2>
      
      <div className="space-y-3">
        {topAgents.map((agent, index) => (
          <AgentCard 
            key={agent.agentId} 
            agent={agent} 
            rank={index + 1} 
            formatCurrency={formatCurrency} 
          />
        ))}
      </div>
    </div>
  );
} 