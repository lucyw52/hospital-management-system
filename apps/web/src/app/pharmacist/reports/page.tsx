'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card } from '@/components/UI/Card';

const navItems = [
  { label: 'Dashboard', href: '/pharmacist', icon: '💊' },
  { label: 'Pharmacy Queue', href: '/pharmacist/queue', icon: '📋' },
  { label: 'Dispense', href: '/pharmacist/dispense', icon: '✅' },
  { label: 'Stock Management', href: '/pharmacist/stock', icon: '📦' },
  { label: 'Reports', href: '/pharmacist/reports', icon: '📈' },
];

export default function PharmacyReportsPage() {
  return (
    <DashboardLayout navItems={navItems} userName="Pharmacist" userRole="Pharmacist">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Pharmacy Reports</h1>
          <p className="text-gray-600 mt-1">Sales and inventory reports</p>
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
