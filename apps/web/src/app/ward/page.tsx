'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import toast from 'react-hot-toast';

interface Admission {
  id: string;
  visit: {
    id: string;
    patient: {
      id: string;
      name: string;
      phone: string;
      dob: string;
    };
  };
  wardName: string;
  bedNumber: string;
  status: string;
  admittedAt: string;
  dischargedAt?: string;
}

interface Visit {
  id: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  visitType: string;
  createdAt: string;
}

interface QueueItem {
  id: string;
  stage: string;
  status: string;
  notes?: string;
  createdAt: string;
  visit: {
    id: string;
    visitType: string;
    patient: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

export default function WardClerkPage() {
  const { isChecking } = useAuthGuard(['WARD_CLERK']);
  const [incomingAdmissions, setIncomingAdmissions] = useState<QueueItem[]>([]);
  const [currentInpatients, setCurrentInpatients] = useState<Admission[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Admission | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    wardName: 'General Ward',
    bedNumber: '',
  });

  const [dischargeForm, setDischargeForm] = useState({
    dischargeSummary: '',
    totalCharges: 0,
    paymentMethod: 'CASH' as 'CASH' | 'MPESA',
    mpesaPhone: '',
  });

  useEffect(() => {
    if (!isChecking) {
      fetchIncomingAdmissions();
      fetchCurrentInpatients();
    }
  }, [isChecking]);

  const fetchIncomingAdmissions = async () => {
    try {
      const response = await apiClient.get('/queue/WARD');
      // Only show WAITING items — patients referred by doctor but not yet formally admitted
      setIncomingAdmissions(response.data.filter((q: QueueItem) => q.status === 'WAITING'));
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('Access denied: Check authentication token and user permissions', error);
        toast.error('❌ Access denied. Please login again.');
      } else {
        console.error('Failed to fetch incoming admissions:', error);
      }
    }
  };

  const fetchCurrentInpatients = async () => {
    try {
      const response = await apiClient.get('/admissions/active');
      setCurrentInpatients(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('Access denied: Check authentication token and user permissions', error);
        toast.error('❌ Access denied. Please login again.');
      } else {
        console.error('Failed to fetch inpatients:', error);
      }
    }
  };

  const handleAdmitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem) return;

    try {
      await apiClient.post('/admissions', {
        visitId: selectedQueueItem.visit.id,
        wardName: admitForm.wardName,
        bedNumber: admitForm.bedNumber,
      });

      setShowAdmitModal(false);
      setSelectedQueueItem(null);
      setAdmitForm({ wardName: 'General Ward', bedNumber: '' });
      fetchIncomingAdmissions();
      fetchCurrentInpatients();
      toast.success('✅ Patient admitted successfully!');
    } catch (error) {
      console.error('Failed to admit patient:', error);
      toast.error('❌ Failed to admit patient');
    }
  };

  const handleDischargePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      // For testing: Discharge directly without payment check
      await apiClient.patch(`/admissions/${selectedPatient.id}/discharge`);

      toast.success('✅ Patient discharged! Email notification sent.');
      setShowDischargeModal(false);
      setSelectedPatient(null);
      setDischargeForm({
        dischargeSummary: '',
        totalCharges: 0,
        paymentMethod: 'CASH',
        mpesaPhone: '',
      });
      fetchCurrentInpatients();
    } catch (error) {
      console.error('Failed to discharge patient:', error);
      toast.error('❌ Failed to discharge patient');
    }
  };

  const calculateAge = (dob: string) => {
    return new Date().getFullYear() - new Date(dob).getFullYear();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const user = useAuthStore((state) => state.user);

  // Show loading while auth is being checked
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout navItems={navItems} userName={user?.name || 'Ward Clerk'} userRole="Ward Clerk">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Welcome, {user?.name || 'Ward Clerk'}</h1>
          <p className="text-gray-600 mt-1">Ward management and patient admissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Incoming</p>
                <p className="text-3xl font-bold text-blue-600">{incomingAdmissions.length}</p>
              </div>
              <span className="text-3xl">📥</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admitted</p>
                <p className="text-3xl font-bold text-green-600">{currentInpatients.length}</p>
              </div>
              <span className="text-3xl">🛏️</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Beds</p>
                <p className="text-3xl font-bold text-purple-600">
                  {20 - currentInpatients.length}
                </p>
              </div>
              <span className="text-3xl">🛌</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Discharges Today</p>
                <p className="text-3xl font-bold text-orange-600">0</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming Admissions */}
          <Card
            title="Incoming Admissions"
            action={
              <Button size="sm" variant="primary">
                + Admit Patient
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                      Patient Name
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                      Ward
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Bed</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {incomingAdmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                        No incoming admissions
                      </td>
                    </tr>
                  ) : (
                    incomingAdmissions.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.visit.patient.name}
                            </p>
                            <p className="text-xs text-gray-600">{item.visit.patient.phone}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-900">—</td>
                        <td className="py-2 px-3 text-sm text-gray-900">—</td>
                        <td className="py-2 px-3 text-sm text-gray-600">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="warning">Pending</Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedQueueItem(item);
                              // Try to pre-populate ward name from doctor's referral notes
                              const notesWard = item.notes?.match(/Ward referral:\s*([^,]+)/i)?.[1]?.trim();
                              setAdmitForm({
                                wardName: notesWard || 'General Ward',
                                bedNumber: '',
                              });
                              setShowAdmitModal(true);
                            }}
                          >
                            Admit Patient
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Current Inpatients */}
          <Card title="Current Inpatients">
            <div className="space-y-4">
              {currentInpatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No current inpatients</div>
              ) : (
                currentInpatients.map((admission) => (
                  <div
                    key={admission.id}
                    onClick={() => setSelectedPatient(admission)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPatient?.id === admission.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {admission.visit.patient.name}
                        </p>
                        <p className="text-sm text-gray-600">{admission.visit.patient.phone}</p>
                      </div>
                      <Badge variant="success">Admitted</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Ward</p>
                        <p className="font-medium text-gray-900">{admission.wardName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Bed</p>
                        <p className="font-medium text-gray-900">{admission.bedNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <Badge variant="success">{admission.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Patient Details & Actions */}
        {selectedPatient && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Record Timeline */}
            <div className="lg:col-span-2">
              <Card title={`Patient Record Timeline: ${selectedPatient.visit.patient.name}`}>
                <div className="space-y-4">
                  {/* Timeline Item */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📅</span>
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-600">{formatDate(selectedPatient.admittedAt)}</p>
                      <p className="font-semibold text-gray-900">Admission Date</p>
                      <p className="text-sm text-gray-600">• Admitted</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📋</span>
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-600">{formatDate(selectedPatient.admittedAt)}</p>
                      <p className="font-semibold text-gray-900">Visit History</p>
                      <p className="text-sm text-gray-600">• Initial assessment</p>
                      <p className="text-sm text-gray-600">• Specialist consultation</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">💊</span>
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-600">{formatDate(selectedPatient.admittedAt)}</p>
                      <p className="font-semibold text-gray-900">Treatment Plan</p>
                      <p className="text-sm text-gray-600">• Physical therapy</p>
                      <p className="text-sm text-gray-600">• Medication</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🔬</span>
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-600">{formatDate(selectedPatient.admittedAt)}</p>
                      <p className="font-semibold text-gray-900">Medications</p>
                      <p className="text-sm text-gray-600">• Amoxicillin 500mg</p>
                      <p className="text-sm text-gray-600">• Ibuprofen 400mg</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📊</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{formatDate(selectedPatient.admittedAt)}</p>
                      <p className="font-semibold text-gray-900">Lab Results</p>
                      <p className="text-sm text-gray-600">• Blood Test: Normal</p>
                      <p className="text-sm text-gray-600">• X-Ray: Fracture detected</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charges & Discharge */}
            <div className="space-y-6">
              {/* Charges Overview */}
              <Card title="Charges Overview">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {selectedPatient.visit.patient.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedPatient.visit.patient.name}
                      </p>
                      <p className="text-sm text-gray-600">{selectedPatient.visit.patient.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Daily Charges</span>
                      <span className="font-semibold text-gray-900">KES 500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Charges</span>
                      <span className="font-semibold text-gray-900">KES 2,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Payment Status</span>
                      <Badge variant="warning">Partially Paid</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button className="w-full" onClick={() => setShowDischargeModal(true)}>
                      Request Payment
                    </Button>
                    <Button className="w-full" variant="secondary">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Discharge Summary */}
              <Card title="Discharge Summary">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Bill Summary</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Charges:</span>
                        <span className="font-semibold">KES 2,500</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Payments:</span>
                        <span className="font-semibold">KES 1,000</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-gray-200 pt-1">
                        <span className="text-gray-900 font-semibold">Outstanding:</span>
                        <span className="font-bold text-red-600">KES 1,500</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => setShowDischargeModal(true)}
                    >
                      📱 Request Payment (M-Pesa)
                    </Button>
                    <Button variant="secondary" className="w-full">
                      💵 Cash Paid
                    </Button>
                    <Button variant="secondary" className="w-full">
                      ✅ Confirm Payment
                    </Button>
                    <Button variant="danger" className="w-full">
                      🚪 Discharge Patient
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Admit Modal */}
      {showAdmitModal && selectedQueueItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Admit Patient</h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">Patient</p>
              <p className="font-semibold text-blue-900">{selectedQueueItem.visit.patient.name}</p>
              <p className="text-sm text-blue-700">{selectedQueueItem.visit.patient.phone}</p>
              {selectedQueueItem.notes && (
                <p className="text-xs text-blue-600 mt-2 italic">📋 Doctor note: {selectedQueueItem.notes}</p>
              )}
            </div>

            <form onSubmit={handleAdmitPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ward Name
                </label>
                <select
                  value={admitForm.wardName}
                  onChange={(e) => setAdmitForm({ ...admitForm, wardName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General Ward">General Ward</option>
                  <option value="ICU">ICU</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Paediatrics">Paediatrics</option>
                  <option value="Surgical">Surgical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bed Number
                </label>
                <input
                  type="text"
                  required
                  value={admitForm.bedNumber}
                  onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })}
                  placeholder="e.g. G-101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAdmitModal(false);
                    setSelectedQueueItem(null);
                    setAdmitForm({ wardName: 'General Ward', bedNumber: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  ✅ Confirm Admission
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischargeModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Discharge Patient</h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">Patient</p>
              <p className="font-semibold text-blue-900">{selectedPatient.visit.patient.name}</p>
              <p className="text-sm text-blue-700 mt-2">
                Ward: {selectedPatient.wardName} • Bed: {selectedPatient.bedNumber}
              </p>
            </div>

            <form onSubmit={handleDischargePatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discharge Summary
                </label>
                <textarea
                  rows={3}
                  value={dischargeForm.dischargeSummary}
                  onChange={(e) =>
                    setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })
                  }
                  placeholder="Brief discharge summary..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Charges (KES)
                </label>
                <input
                  type="number"
                  value={dischargeForm.totalCharges}
                  onChange={(e) =>
                    setDischargeForm({ ...dischargeForm, totalCharges: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={dischargeForm.paymentMethod === 'CASH' ? 'primary' : 'secondary'}
                    onClick={() => setDischargeForm({ ...dischargeForm, paymentMethod: 'CASH' })}
                    className="flex-1"
                  >
                    💵 Cash
                  </Button>
                  <Button
                    type="button"
                    variant={dischargeForm.paymentMethod === 'MPESA' ? 'success' : 'secondary'}
                    onClick={() => setDischargeForm({ ...dischargeForm, paymentMethod: 'MPESA' })}
                    className="flex-1"
                  >
                    📱 M-Pesa
                  </Button>
                </div>
              </div>

              {dischargeForm.paymentMethod === 'MPESA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={dischargeForm.mpesaPhone}
                    onChange={(e) =>
                      setDischargeForm({ ...dischargeForm, mpesaPhone: e.target.value })
                    }
                    placeholder="254712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowDischargeModal(false);
                    setDischargeForm({
                      dischargeSummary: '',
                      totalCharges: 0,
                      paymentMethod: 'CASH',
                      mpesaPhone: '',
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" className="flex-1">
                  ✅ Discharge (Testing: No Payment)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
