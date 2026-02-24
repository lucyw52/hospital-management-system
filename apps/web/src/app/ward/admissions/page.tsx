'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

export default function AdmissionsPage() {
  const { isChecking } = useAuthGuard(['WARD_CLERK']);
  const router = useRouter();
  const [incomingAdmissions, setIncomingAdmissions] = useState([]);

  useEffect(() => {
    if (!isChecking) {
      fetchIncomingAdmissions();
    }
  }, [isChecking]);

  const fetchIncomingAdmissions = async () => {
    try {
      const response = await apiClient.get('/queue/WARD');
      setIncomingAdmissions(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('Access denied: Check authentication token and user permissions', error);
        toast.error('❌ Access denied. Please login again.');
      } else {
        console.error('Failed to fetch admissions:', error);
      }
    }
  };

  // Show loading while auth is being checked
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
