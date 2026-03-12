'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import PatientReportsView from '@/components/Patients/PatientReportsView';

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

        <PatientReportsView />
      </div>
    </DashboardLayout>
  );
}
