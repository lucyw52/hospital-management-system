'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card } from '@/components/UI/Card';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthStore } from '@/store/auth-store';

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

export default function DischargePage() {
  const { isChecking } = useAuthGuard(['WARD_CLERK']);
  const user = useAuthStore((state) => state.user);

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
    <DashboardLayout navItems={navItems} userName={user?.name || 'Ward Clerk'} userRole="Ward Clerk">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Patient Discharge</h1>
          <p className="text-gray-600 mt-1">Process patient discharges</p>
        </div>

        <Card>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">✅</div>
            <p>Use the main dashboard to discharge patients from the inpatients list</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
