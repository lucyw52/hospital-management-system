'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import PatientReportsView from '@/components/Patients/PatientReportsView';

const navItems = [
  { label: 'Dashboard', href: '/doctor', icon: '👨‍⚕️' },
  { label: 'Doctor Queue', href: '/doctor/queue', icon: '📋' },
  { label: 'Lab Results', href: '/doctor/lab-results', icon: '🔬' },
  { label: 'Patients', href: '/doctor/patients', icon: '👥' },
];

export default function DoctorPatientsPage() {
  return (
    <DashboardLayout navItems={navItems} userName="Dr. Smith" userRole="Doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Patient Records</h1>
          <p className="text-gray-600 mt-1">Search and view patient history</p>
        </div>

        <PatientReportsView />
      </div>
    </DashboardLayout>
  );
}
