// src/components/Dashboard/RecentActivity.tsx

"use client"

import React from 'react'
import { Card } from '../Common/Card'

const RecentActivity: React.FC = () => {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      <ul className="list-disc list-inside mt-2">
        <li>Added new scene: Opening</li>
        <li>Updated character: Protagonist</li>
        <li>Assigned prop: Key to Scene 2</li>
        {/* Add more activities as needed */}
      </ul>
    </Card>
  )
}

export default RecentActivity