RealtimeAnalytics.jsx  // Real-time Analytics Dashboard for Base Builder Rewards
// React component with live data visualization

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const RealtimeAnalytics = () => {
  const [metrics, setMetrics] = useState({
    currentRank: 150,
    targetRank: 100,
    dailyCommits: 6,
    weeklyGoal: 35
  });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      updateMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    setMetrics(prev => ({
      ...prev,
      dailyCommits: prev.dailyCommits + 1,
      currentRank: Math.max(100, prev.currentRank - 2)
    }));
  };

  const progressToTarget = ((metrics.targetRank - metrics.currentRank) / metrics.targetRank) * 100;

  return (
    <div className="analytics-dashboard">
      <h2>Base Builder Rewards - Live Analytics</h2>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Current Rank</h3>
          <div className="rank-display">{metrics.currentRank}</div>
          <div className="target">Target: {metrics.targetRank}</div>
        </div>
        
        <div className="metric-card">
          <h3>Daily Commits</h3>
          <div className="commits-display">{metrics.dailyCommits}</div>
          <div className="goal">Goal: 8-10/day</div>
        </div>
        
        <div className="metric-card">
          <h3>Progress</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${Math.max(0, progressToTarget)}%`}}
            />
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        <LineChart width={600} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="rank" stroke="#8884d8" />
        </LineChart>
      </div>
    </div>
  );
};

export default RealtimeAnalytics;
