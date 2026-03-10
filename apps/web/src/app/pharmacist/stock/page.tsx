'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  price: number;
}

const navItems = [
  { label: 'Dashboard', href: '/pharmacist', icon: '💊' },
  { label: 'Pharmacy Queue', href: '/pharmacist/queue', icon: '📋' },
  { label: 'Dispense', href: '/pharmacist/dispense', icon: '✅' },
  { label: 'Stock Management', href: '/pharmacist/stock', icon: '📦' },
  { label: 'Reports', href: '/pharmacist/reports', icon: '📈' },
];

export default function StockManagementPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [newMedicineForm, setNewMedicineForm] = useState({ name: '', quantity: 0, reorderLevel: 0, price: 0 });
  const [updateQuantity, setUpdateQuantity] = useState(0);

  const user = useAuthStore((state) => state.user);

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

  const handleAddMedicine = async () => {
    if (!newMedicineForm.name) {
      toast.error('Medicine name is required');
      return;
    }
    try {
      await apiClient.post('/pharmacy/stock', newMedicineForm);
      toast.success('✅ Medicine added successfully!');
      setShowAddMedicineModal(false);
      setNewMedicineForm({ name: '', quantity: 0, reorderLevel: 0, price: 0 });
      fetchStock();
    } catch (error: any) {
      console.error('Failed to add medicine:', error);
      const msg = error?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || '❌ Failed to add medicine');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedStockItem) return;
    try {
      await apiClient.patch(`/pharmacy/stock/${selectedStockItem.id}`, { quantity: updateQuantity });
      toast.success('✅ Stock updated successfully!');
      setShowUpdateStockModal(false);
      setSelectedStockItem(null);
      fetchStock();
    } catch (error: any) {
      console.error('Failed to update stock:', error);
      const msg = error?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || '❌ Failed to update stock');
    }
  };

  const lowStockItems = stockItems.filter((item) => item.quantity <= item.reorderLevel);

  return (
    <>
      <DashboardLayout navItems={navItems} userName={user?.name || 'Pharmacist'} userRole="Pharmacist">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">Stock Management</h1>
              <p className="text-gray-600 mt-1">Manage medication inventory</p>
            </div>
            <Button variant="primary" onClick={() => setShowAddMedicineModal(true)}>
              + Add Medicine
            </Button>
          </div>

          {lowStockItems.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <Badge variant="danger">Low Stock Alert</Badge>
              <span className="text-sm text-red-800">
                {lowStockItems.length} item(s) need reordering
              </span>
            </div>
          )}

          <Card>
            <div className="space-y-4">
              {stockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No medicines in stock. Add some to get started.</div>
              ) : (
                stockItems.map((item) => (
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
                          <p className="text-sm text-gray-600">Price (KSh)</p>
                          <p className="font-semibold text-gray-900">{item.price?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        {item.quantity <= item.reorderLevel ? (
                          <Badge variant="danger">Low Stock</Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedStockItem(item);
                            setUpdateQuantity(item.quantity);
                            setShowUpdateStockModal(true);
                          }}
                        >
                          Update Stock
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>

      {/* Add Medicine Modal */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Medicine</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amoxicillin"
                  value={newMedicineForm.name}
                  onChange={(e) => setNewMedicineForm({ ...newMedicineForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  min={0}
                  value={newMedicineForm.quantity}
                  onChange={(e) => setNewMedicineForm({ ...newMedicineForm, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                <input
                  type="number"
                  placeholder="e.g. 20"
                  min={0}
                  value={newMedicineForm.reorderLevel}
                  onChange={(e) => setNewMedicineForm({ ...newMedicineForm, reorderLevel: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (KSh)</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  min={0}
                  value={newMedicineForm.price}
                  onChange={(e) => setNewMedicineForm({ ...newMedicineForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddMedicineModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Add Medicine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Stock Modal */}
      {showUpdateStockModal && selectedStockItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Update Stock</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedStockItem.name}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Quantity</label>
              <input
                type="number"
                min={0}
                value={updateQuantity}
                onChange={(e) => setUpdateQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Current: {selectedStockItem.quantity}</p>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowUpdateStockModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStock}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
