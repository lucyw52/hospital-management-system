'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/pharmacist', icon: '💊' },
  { label: 'Pharmacy Queue', href: '/pharmacist/queue', icon: '📋' },
  { label: 'Dispense', href: '/pharmacist/dispense', icon: '✅' },
  { label: 'Stock Management', href: '/pharmacist/stock', icon: '📦' },
  { label: 'Reports', href: '/pharmacist/reports', icon: '📈' },
];

export default function PharmacyQueuePage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await apiClient.get('/pharmacy/queue');
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Pharmacist" userRole="Pharmacist">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Pharmacy Queue</h1>
          <p className="text-gray-600 mt-1">Pending prescriptions to dispense</p>
        </div>

        <Card>
          <div className="space-y-4">
            {prescriptions.map((prescription: any) => (
              <div key={prescription.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{prescription.visit?.patient?.name}</p>
                    <p className="text-sm text-gray-600">{prescription.visit?.patient?.phone}</p>
                  </div>
                  <Badge variant="warning">PENDING</Badge>
                </div>
                <div className="space-y-1">
                  {JSON.parse(prescription.itemsJson).map((item: any, index: number) => (
                    <p key={index} className="text-sm text-gray-600">
                      • {item.name} - {item.dosage}, {item.frequency}
                    </p>
                  ))}
                </div>
                <div className="mt-3">
                  <Button size="sm" onClick={() => router.push('/pharmacist')}>
                    Dispense
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
