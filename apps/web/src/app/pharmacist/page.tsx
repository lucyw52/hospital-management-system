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
    medicine?: string;
    name?: string;
    dosage: string;
    quantity?: number;
  }>;
  status: string;
  createdAt: string;
}

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

export default function PharmacistPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStockView, setShowStockView] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [pharmaInvoiceId, setPharmaInvoiceId] = useState<string | null>(null);
  const [pharmaPayAmount, setPharmaPayAmount] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [newMedicineForm, setNewMedicineForm] = useState({ name: '', quantity: 0, reorderLevel: 0, price: 0 });
  const [updateQuantity, setUpdateQuantity] = useState(0);

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

  const handleDispense = async (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    // Fetch the pharmacy invoice for this visit
    try {
      const res = await apiClient.get(`/invoices/visit/${prescription.visit.id}`);
      const pharmaInv = (res.data as any[]).find((inv: any) => inv.type === 'PHARMACY');
      setPharmaInvoiceId(pharmaInv?.id ?? null);
      setPharmaPayAmount(pharmaInv?.amount ?? 0);
    } catch {
      setPharmaInvoiceId(null);
      setPharmaPayAmount(0);
    }
    setMpesaPhone(prescription.visit.patient.phone);
    setShowPaymentModal(true);
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
    if (!pharmaInvoiceId) {
      toast.error('No invoice found for this prescription. Contact administrator.');
      return;
    }
    if (paymentMethod === 'MPESA' && !mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }
    if (!pharmaPayAmount || pharmaPayAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsProcessingPayment(true);
    try {
      if (paymentMethod === 'CASH') {
        await apiClient.post('/payments', {
          invoiceId: pharmaInvoiceId,
          method: 'CASH',
          amount: pharmaPayAmount,
        });
        toast.success('✅ Cash payment received! Medicine dispensed.');
        setShowPaymentModal(false);
        setSelectedPrescription(null);
        setPharmaInvoiceId(null);
        setMpesaPhone('');
        fetchPrescriptions();
      } else {
        const res = await apiClient.post('/payments', {
          invoiceId: pharmaInvoiceId,
          method: 'MPESA',
          amount: pharmaPayAmount,
          phoneNumber: mpesaPhone,
        });
        toast.success('📱 STK push sent! Waiting for patient payment...');
        setShowPaymentModal(false);
        setSelectedPrescription(null);
        setPharmaInvoiceId(null);
        setMpesaPhone('');
        fetchPrescriptions();
        pollPharmaPayment(res.data.checkoutRequestId);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Payment failed';
      toast.error(`❌ ${msg}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const pollPharmaPayment = (checkoutId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await apiClient.get(`/payments/mpesa/query/${checkoutId}`);
        const status = res.data?.payment?.status || res.data?.status;
        if (status === 'SUCCESS' || res.data?.status === 'paid') {
          clearInterval(interval);
          toast.success('✅ M-Pesa payment confirmed! Medicine dispensed.');
          fetchPrescriptions();
        } else if (status === 'FAILED') {
          clearInterval(interval);
          toast.error('❌ M-Pesa payment failed. Patient needs to retry.');
        }
      } catch {}
      if (attempts >= 20) {
        clearInterval(interval);
        toast.error('⏰ M-Pesa timeout. Verify payment status with patient.');
      }
    }, 3000);
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
      fetchStockItems();
    } catch (error: any) {
      console.error('Failed to add medicine:', error);
      const msg = error?.response?.data?.message || '❌ Failed to add medicine';
      toast.error(msg);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedStockItem) return;
    try {
      await apiClient.patch(`/pharmacy/stock/${selectedStockItem.id}`, { quantity: updateQuantity });
      toast.success('✅ Stock updated successfully!');
      setShowUpdateStockModal(false);
      setSelectedStockItem(null);
      fetchStockItems();
    } catch (error: any) {
      console.error('Failed to update stock:', error);
      const msg = error?.response?.data?.message || '❌ Failed to update stock';
      toast.error(msg);
    }
  };

  const lowStockItems = stockItems.filter((item) => item.quantity <= item.reorderLevel);

  const user = useAuthStore((state) => state.user);

  return (
    <>
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
                              {prescription.items?.map((item: any, index) => (
                                <p key={index} className="text-sm text-gray-600">
                                  {item.medicine || item.name} - {item.dosage}{item.quantity ? ` × ${item.quantity}` : ''}
                                </p>
                              ))}
                            </div>
                          </div>

                          {prescription.status === 'PENDING' && (
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="success" onClick={() => handleDispense(prescription)}>
                                💳 Pay &amp; Dispense
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
            <div className="flex justify-end mb-4">
              <Button variant="primary" onClick={() => setShowAddMedicineModal(true)}>
                + Add Medicine
              </Button>
            </div>
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
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
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
                      {item.quantity <= item.reorderLevel && (
                        <div className="mt-2">
                          <Badge variant="danger">Low Stock</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
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
              ))}
            </div>
          </Card>
        )}
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
              <Button variant="secondary" onClick={() => setShowAddMedicineModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddMedicine} className="flex-1">
                Add Medicine
              </Button>
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
              <Button variant="secondary" onClick={() => setShowUpdateStockModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateStock} className="flex-1">
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

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
              {selectedPrescription.items?.map((item: any, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{item.medicine || item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.dosage}{item.quantity ? ` • Qty: ${item.quantity}` : ''}
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pharmacy Payment</h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">Patient</p>
              <p className="font-semibold text-blue-900">{selectedPrescription.visit.patient.name}</p>
              <p className="text-sm text-blue-600">{selectedPrescription.visit.patient.phone}</p>
            </div>

            <div className="space-y-3 mb-4">
              <p className="font-medium text-gray-900">Prescribed Medications:</p>
              {selectedPrescription.items?.map((item: any, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{item.medicine || item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.dosage}{item.quantity ? ` • Qty: ${item.quantity}` : ''}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KSh) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={pharmaPayAmount}
                  onChange={(e) => setPharmaPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Pre-filled from invoice. Edit if needed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${
                      paymentMethod === 'CASH'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MPESA')}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${
                      paymentMethod === 'MPESA'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    📱 M-Pesa
                  </button>
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
                  setSelectedPrescription(null);
                  setPharmaInvoiceId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} variant="success" className="flex-1" disabled={isProcessingPayment}>
                {isProcessingPayment
                  ? 'Processing...'
                  : paymentMethod === 'CASH'
                  ? '✅ Confirm Payment'
                  : '📱 Send M-Pesa Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
