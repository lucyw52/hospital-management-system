'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

export default function InpatientsPage() {
  const { isChecking } = useAuthGuard(['WARD_CLERK']);
  const [inpatients, setInpatients] = useState([]);

  useEffect(() => {
    if (!isChecking) {
      fetchInpatients();
    }
  }, [isChecking]);

  const fetchInpatients = async () => {
    try {
      const response = await apiClient.get('/admissions/active');
      setInpatients(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('Access denied: Check authentication token and user permissions', error);
        toast.error('❌ Access denied. Please login again.');
      } else {
        console.error('Failed to fetch inpatients:', error);
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
          <h1 className="text-3xl font-bold text-blue-600">Current Inpatients</h1>
          <p className="text-gray-600 mt-1">Admitted patients</p>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Ward</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Bed</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Admitted</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inpatients.map((admission: any) => (
                  <tr key={admission.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{admission.visit?.patient?.name}</td>
                    <td className="py-3 px-4">{admission.wardName}</td>
                    <td className="py-3 px-4">{admission.bedNumber}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(admission.admittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="success">ADMITTED</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button size="sm">View</Button>
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
