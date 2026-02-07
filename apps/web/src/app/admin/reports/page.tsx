'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card } from '@/components/UI/Card';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Staff Management', href: '/admin/staff', icon: '👥' },
  { label: 'Reports', href: '/admin/reports', icon: '📈' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminReportsPage() {
  return (
    <DashboardLayout navItems={navItems} userName="Admin" userRole="Administrator">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">System Reports</h1>
          <p className="text-gray-600 mt-1">Hospital-wide analytics and reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center py-6">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-sm text-gray-600">Patients</p>
              <p className="text-2xl font-bold text-blue-600">Coming Soon</p>
            </div>
          </Card>

          <Card>
            <div className="text-center py-6">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">Coming Soon</p>
            </div>
          </Card>

          <Card>
            <div className="text-center py-6">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm text-gray-600">Services</p>
              <p className="text-2xl font-bold text-purple-600">Coming Soon</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
