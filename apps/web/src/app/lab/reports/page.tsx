'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card } from '@/components/UI/Card';

const navItems = [
  { label: 'Dashboard', href: '/lab', icon: '🔬' },
  { label: 'Lab Queue', href: '/lab/queue', icon: '📋' },
  { label: 'Result Entry', href: '/lab/results', icon: '📝' },
  { label: 'Reports', href: '/lab/reports', icon: '📈' },
];

export default function LabReportsPage() {
  return (
    <DashboardLayout navItems={navItems} userName="Lab Tech" userRole="Laboratory Technician">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Lab Reports</h1>
          <p className="text-gray-600 mt-1">Statistical reports and analytics</p>
        </div>

        <Card>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📈</div>
            <p>Reports and analytics coming soon</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
