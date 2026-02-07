'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card } from '@/components/UI/Card';

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

export default function WardReportsPage() {
  return (
    <DashboardLayout navItems={navItems} userName="Nurse Sarah" userRole="Ward Clerk">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Ward Reports</h1>
          <p className="text-gray-600 mt-1">Ward statistics and analytics</p>
        </div>

        <Card>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📊</div>
            <p>Reports and analytics coming soon</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
