import React from 'react';

// Helper to format response time nicely
const formatResponseTime = (hours) => {
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} ${days === 1 ? 'day' : 'days'} ${remainingHours > 0 ? `${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}` : ''}`;
  }
};

// Component for a single agent card
const SlowResponderCard = ({ agent, rank }) => (
  <div className="flex items-center p-4 bg-white rounded-lg border border-gray-100 hover:border-red-200 transition-colors duration-200">
    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-red-600 font-bold mr-4">
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
      <p className="text-sm font-semibold text-red-600">
        {formatResponseTime(agent.avgResponseTime)}
      </p>
      <p className="text-xs text-gray-500">
        {agent.pendingBookings} pending
      </p>
    </div>
  </div>
);

export default function SlowRespondersWidget({ 
  slowResponders, 
  loading
}) {
  if (loading || !slowResponders || slowResponders.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Slow Responding Agents
      </h2>
      
      <div className="space-y-3">
        {slowResponders.map((agent, index) => (
          <SlowResponderCard 
            key={agent.agentId} 
            agent={agent} 
            rank={index + 1} 
          />
        ))}
      </div>
    </div>
  );
} 