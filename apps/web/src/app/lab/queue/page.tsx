'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/lab', icon: '🔬' },
  { label: 'Lab Queue', href: '/lab/queue', icon: '📋' },
  { label: 'Result Entry', href: '/lab/results', icon: '📝' },
  { label: 'Reports', href: '/lab/reports', icon: '📈' },
];

export default function LabQueuePage() {
  const router = useRouter();
  const [labQueue, setLabQueue] = useState([]);

  useEffect(() => {
    fetchLabQueue();
  }, []);

  const fetchLabQueue = async () => {
    try {
      const response = await apiClient.get('/lab/queue');
      setLabQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch lab queue:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Lab Tech" userRole="Laboratory Technician">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Lab Queue</h1>
          <p className="text-gray-600 mt-1">Pending laboratory tests</p>
        </div>

        <Card>
          <div className="space-y-4">
            {labQueue.map((order: any) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{order.visit?.patient?.name}</p>
                        <p className="text-sm text-gray-600">{order.visit?.patient?.phone}</p>
                      </div>
                      <Badge variant={order.status === 'ORDERED' ? 'primary' : 'warning'}>
                        {order.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tests:</p>
                      <p className="text-sm text-gray-600">{JSON.parse(order.testsJson).join(', ')}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => router.push('/lab')}>
                    Process
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
