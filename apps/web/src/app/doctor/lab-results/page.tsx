'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';

const navItems = [
  { label: 'Dashboard', href: '/doctor', icon: '👨‍⚕️' },
  { label: 'Doctor Queue', href: '/doctor/queue', icon: '📋' },
  { label: 'Lab Results', href: '/doctor/lab-results', icon: '🔬' },
  { label: 'Patients', href: '/doctor/patients', icon: '👥' },
];

export default function LabResultsPage() {
  const [labOrders, setLabOrders] = useState([]);

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const fetchLabOrders = async () => {
    try {
      const response = await apiClient.get('/lab/orders?status=RESULTS_READY');
      setLabOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch lab orders:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Dr. Smith" userRole="Doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Lab Results</h1>
          <p className="text-gray-600 mt-1">View completed lab test results</p>
        </div>

        <Card>
          <div className="space-y-4">
            {labOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🔬</div>
                <p>No lab results available</p>
              </div>
            ) : (
              labOrders.map((order: any) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{order.visit?.patient?.name}</p>
                      <p className="text-sm text-gray-600">{order.visit?.patient?.phone}</p>
                    </div>
                    <Badge variant="success">RESULTS READY</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tests Ordered:</p>
                    <p className="text-sm text-gray-600">{JSON.parse(order.testsJson).join(', ')}</p>
                  </div>
                  {order.labResults && order.labResults.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-2">Results:</p>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(order.labResults[0].resultsJson), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
