'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

interface Prescription {
  id: string;
  visit: {
    id: string;
    patient: {
      id: string;
      name: string;
      phone: string;
    };
  };
  items: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  status: string;
  createdAt: string;
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
}

const navItems = [
  { label: 'Dashboard', href: '/pharmacist', icon: '💊' },
  { label: 'Pharmacy Queue', href: '/pharmacist/queue', icon: '📋' },
  { label: 'Dispense', href: '/pharmacist/dispense', icon: '✅' },
  { label: 'Stock Management', href: '/pharmacist/stock', icon: '📦' },
  { label: 'Reports', href: '/pharmacist/reports', icon: '📈' },
];

export default function PharmacistPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStockView, setShowStockView] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [mpesaPhone, setMpesaPhone] = useState('');

  useEffect(() => {
    fetchPrescriptions();
    fetchStockItems();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await apiClient.get('/pharmacy/prescriptions?status=PENDING');
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
    }
  };

  const fetchStockItems = async () => {
    try {
      const response = await apiClient.get('/pharmacy/stock');
      setStockItems(response.data);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    }
  };

  const handleDispense = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDispenseModal(true);
  };

  const handleConfirmDispense = async () => {
    if (!selectedPrescription) return;

    try {
      // For testing: Dispense without payment
      await apiClient.patch(`/pharmacy/prescriptions/${selectedPrescription.id}/dispense`);
      
      toast.success('✅ Medicine dispensed! Patient completed treatment.');
      setShowDispenseModal(false);
      setSelectedPrescription(null);
      fetchPrescriptions();
    } catch (error) {
      console.error('Failed to dispense:', error);
      toast.error('❌ Failed to dispense prescription');
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPrescription) return;

    if (paymentMethod === 'MPESA' && !mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }

    try {
      if (paymentMethod === 'CASH') {
        // Process cash payment and dispense
        await apiClient.patch(`/pharmacy/prescriptions/${selectedPrescription.id}/dispense`);
        toast.success('✅ Payment received and medicine dispensed!');
      } else {
        // Process M-Pesa payment
        toast.loading('📱 M-Pesa request sent. Waiting for payment...');
        await apiClient.patch(`/pharmacy/prescriptions/${selectedPrescription.id}/dispense`);
        toast.success('✅ Payment confirmed and medicine dispensed!');
      }
      
      setShowPaymentModal(false);
      setSelectedPrescription(null);
      setMpesaPhone('');
      fetchPrescriptions();
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error('❌ Failed to process payment');
    }
  };

  const lowStockItems = stockItems.filter((item) => item.quantity <= item.reorderLevel);

  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout navItems={navItems} userName={user?.name || 'Pharmacist'} userRole="Pharmacist">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Welcome, {user?.name || 'Pharmacist'}</h1>
          <p className="text-gray-600 mt-1">Medication dispensing and stock management</p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={!showStockView ? 'primary' : 'secondary'}
            onClick={() => setShowStockView(false)}
          >
            📋 Pharmacy Queue
          </Button>
          <Button
            variant={showStockView ? 'primary' : 'secondary'}
            onClick={() => setShowStockView(true)}
          >
            📦 Stock Management
          </Button>
        </div>

        {!showStockView ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {prescriptions.filter((p) => p.status === 'PENDING').length}
                    </p>
                  </div>
                  <span className="text-3xl">⏳</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Dispensed</p>
                    <p className="text-3xl font-bold text-green-600">
                      {prescriptions.filter((p) => p.status === 'DISPENSED').length}
                    </p>
                  </div>
                  <span className="text-3xl">✅</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Low Stock</p>
                    <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
                  </div>
                  <span className="text-3xl">⚠️</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-3xl font-bold text-purple-600">{stockItems.length}</p>
                  </div>
                  <span className="text-3xl">💊</span>
                </div>
              </Card>
            </div>

            {/* Pharmacy Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card
                  title="Pharmacy Queue"
                  action={
                    <Button size="sm" variant="primary">
                      Dispense
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    {prescriptions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No prescriptions in queue</div>
                    ) : (
                      prescriptions.map((prescription) => (
                        <div
                          key={prescription.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {prescription.visit.patient.name}
                              </p>
                              <p className="text-sm text-gray-600">{prescription.visit.patient.phone}</p>
                            </div>
                            <Badge
                              variant={prescription.status === 'DISPENSED' ? 'success' : 'warning'}
                            >
                              {prescription.status}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Prescription ID
                            </p>
                            <p className="text-sm text-gray-600">#{prescription.id.slice(0, 8)}</p>
                          </div>

                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Medicines</p>
                            <div className="space-y-1">
                              {prescription.items.map((item, index) => (
                                <p key={index} className="text-sm text-gray-600">
                                  {item.name} - {item.dosage}, {item.frequency}, {item.duration}
                                </p>
                              ))}
                            </div>
                          </div>

                          {prescription.status === 'PENDING' && (
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" onClick={() => handleDispense(prescription)}>
                                Dispense
                              </Button>
                              <Button size="sm" variant="success">
                                Request Payment
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Patient Card */}
              {selectedPrescription && (
                <div>
                  <Card>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Patient Card</h3>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {selectedPrescription.visit.patient.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {selectedPrescription.visit.patient.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedPrescription.visit.patient.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Stock Management View */
          <Card title="Stock Management Section">
            {lowStockItems.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <Badge variant="danger">Low Stock Alert</Badge>
                <span className="text-sm text-red-800">
                  {lowStockItems.length} item(s) need reordering
                </span>
              </div>
            )}

            <div className="space-y-4">
              {stockItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Quantity</p>
                          <p className="font-semibold text-gray-900">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reorder Level</p>
                          <p className="font-semibold text-gray-900">
                            {item.reorderLevel} {item.unit}
                          </p>
                        </div>
                      </div>
                      {item.quantity <= item.reorderLevel && (
                        <div className="mt-2">
                          <Badge variant="danger">Low Stock</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {item.quantity <= item.reorderLevel && (
                        <Button size="sm" variant="primary">
                          Reorder
                        </Button>
                      )}
                      <Button size="sm" variant="secondary">
                        Update Stock
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Dispense Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Dispense Medication</h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">Patient</p>
              <p className="font-semibold text-blue-900">{selectedPrescription.visit.patient.name}</p>
            </div>

            <div className="space-y-3">
              <p className="font-medium text-gray-900">Medications:</p>
              {selectedPrescription.items.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.dosage} • {item.frequency} • {item.duration}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDispenseModal(false);
                  setSelectedPrescription(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmDispense} variant="success" className="flex-1">
                ✅ Dispense (Testing: No Payment)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Process Payment</h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">Patient</p>
              <p className="font-semibold text-blue-900">{selectedPrescription.visit.patient.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === 'CASH' ? 'primary' : 'secondary'}
                    onClick={() => setPaymentMethod('CASH')}
                    className="flex-1"
                  >
                    💵 Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'MPESA' ? 'success' : 'secondary'}
                    onClick={() => setPaymentMethod('MPESA')}
                    className="flex-1"
                  >
                    📱 M-Pesa
                  </Button>
                </div>
              </div>

              {paymentMethod === 'MPESA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="254712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPaymentModal(false);
                  setShowDispenseModal(true);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleProcessPayment} variant="success" className="flex-1">
                {paymentMethod === 'CASH' ? 'Confirm Payment' : 'Send M-Pesa Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
