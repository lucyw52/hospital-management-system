'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';

const navItems = [
  { label: 'Dashboard', href: '/pharmacist', icon: '💊' },
  { label: 'Pharmacy Queue', href: '/pharmacist/queue', icon: '📋' },
  { label: 'Dispense', href: '/pharmacist/dispense', icon: '✅' },
  { label: 'Stock Management', href: '/pharmacist/stock', icon: '📦' },
  { label: 'Reports', href: '/pharmacist/reports', icon: '📈' },
];

export default function StockManagementPage() {
  const [stockItems, setStockItems] = useState([]);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await apiClient.get('/pharmacy/stock');
      setStockItems(response.data);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userName="Pharmacist" userRole="Pharmacist">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Stock Management</h1>
            <p className="text-gray-600 mt-1">Manage medication inventory</p>
          </div>
          <Button>+ Add Medicine</Button>
        </div>

        <Card>
          <div className="space-y-4">
            {stockItems.map((item: any) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Medicine Name</p>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="font-semibold text-gray-900">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reorder Level</p>
                      <p className="font-semibold text-gray-900">{item.reorderLevel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      {item.quantity <= item.reorderLevel ? (
                        <Badge variant="danger">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">
                    Update
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
