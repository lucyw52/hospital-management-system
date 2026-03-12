'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import PatientReportsView from '@/components/Patients/PatientReportsView';

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

        <PatientReportsView />
      </div>
    </DashboardLayout>
  );
}
