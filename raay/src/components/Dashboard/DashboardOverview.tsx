"use client"

import React from 'react'
import StatsWidget from './StatsWidget'
import RecentActivity from './RecentActivity'

const DashboardOverview: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsWidget />
        <RecentActivity />
      </div>
    </div>
  )
}

export default DashboardOverview
