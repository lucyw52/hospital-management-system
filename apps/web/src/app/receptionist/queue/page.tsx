'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';

const navItems = [
  { label: 'Dashboard', href: '/receptionist', icon: '📊' },
  { label: 'Patients', href: '/receptionist/patients', icon: '👥' },
  { label: 'Queue', href: '/receptionist/queue', icon: '📋' },
  { label: 'Payments', href: '/receptionist/payments', icon: '💳' },
];

export default function QueuePage() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await apiClient.get('/queue');
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Receptionist" userRole="Reception">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Hospital Queue</h1>
          <p className="text-gray-600 mt-1">Real-time view of all patients in the system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['DOCTOR', 'LAB', 'PHARMACY', 'WARD'].map((stage) => (
            <Card key={stage} className="bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-center">
                <p className="text-sm text-gray-600">{stage}</p>
                <p className="text-3xl font-bold text-blue-600">
                  {queue.filter((q: any) => q.stage === stage && q.status !== 'DONE').length}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Card title="Current Queue">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Stage</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{item.visit?.patient?.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{item.stage}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.status === 'DONE' ? 'success' : 'warning'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {item.priority > 50 ? '🔴 High' : 'Normal'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
