'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card } from '@/components/UI/Card';

const navItems = [
  { label: 'Dashboard', href: '/receptionist', icon: '📊' },
  { label: 'Patients', href: '/receptionist/patients', icon: '👥' },
  { label: 'Queue', href: '/receptionist/queue', icon: '📋' },
  { label: 'Payments', href: '/receptionist/payments', icon: '💳' },
];

export default function PaymentsPage() {
  return (
    <DashboardLayout navItems={navItems} userName="Receptionist" userRole="Reception">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Payments</h1>
          <p className="text-gray-600 mt-1">Payment management and records</p>
        </div>

        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Payments Currently Disabled
            </h3>
            <p className="text-gray-600">
              Payment processing is disabled for testing. All patients are queued directly to doctor.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
