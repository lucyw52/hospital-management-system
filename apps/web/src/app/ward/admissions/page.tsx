'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

export default function AdmissionsPage() {
  const router = useRouter();
  const [incomingAdmissions, setIncomingAdmissions] = useState([]);

  useEffect(() => {
    fetchIncomingAdmissions();
  }, []);

  const fetchIncomingAdmissions = async () => {
    try {
      const response = await apiClient.get('/queue/WARD');
      setIncomingAdmissions(response.data);
    } catch (error) {
      console.error('Failed to fetch admissions:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Nurse Sarah" userRole="Ward Clerk">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Incoming Admissions</h1>
          <p className="text-gray-600 mt-1">Patients pending admission</p>
        </div>

        <Card>
          <div className="space-y-4">
            {incomingAdmissions.map((item: any) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.visit?.patient?.name}</p>
                    <p className="text-sm text-gray-600">{item.visit?.patient?.phone}</p>
                    <p className="text-xs text-gray-500 mt-2">{item.notes}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="warning">PENDING</Badge>
                    <Button size="sm" onClick={() => router.push('/ward')}>
                      Admit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
