'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/doctor', icon: '👨‍⚕️' },
  { label: 'Doctor Queue', href: '/doctor/queue', icon: '📋' },
  { label: 'Lab Results', href: '/doctor/lab-results', icon: '🔬' },
  { label: 'Patients', href: '/doctor/patients', icon: '👥' },
];

export default function DoctorQueuePage() {
  const router = useRouter();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await apiClient.get('/queue/DOCTOR');
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Dr. Smith" userRole="Doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Doctor Queue</h1>
          <p className="text-gray-600 mt-1">Manage your patient queue</p>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Queue #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Visit Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item: any, index) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">#{index + 1}</td>
                    <td className="py-3 px-4">{item.visit?.patient?.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{item.visit?.visitType}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.status === 'WAITING' ? 'warning' : 'success'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {item.priority > 50 ? (
                        <Badge variant="danger">🔴 Lab Return</Badge>
                      ) : (
                        <Badge variant="info">Normal</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Button size="sm" onClick={() => router.push('/doctor')}>
                        Consult
                      </Button>
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
