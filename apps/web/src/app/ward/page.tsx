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
    consultations?: Array<{
      id: string;
      notes: string;
      diagnosis: string;
      createdAt: string;
      doctor?: { name: string };
    }>;
    prescriptions?: Array<{
      id: string;
      status: string;
      itemsJson?: string;
      items?: any[];
      createdAt: string;
      doctor?: { name: string };
    }>;
    labOrders?: Array<{
      id: string;
      testsJson: string;
      status: string;
      createdAt: string;
      labResults?: Array<{ id: string; resultsJson: string; attachmentUrl?: string; createdAt: string }>;
    }>;
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
  const [isProcessingDischarge, setIsProcessingDischarge] = useState(false);

  // View details
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAdmission, setViewingAdmission] = useState<Admission | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Billing & insurance
  const [billingForm, setBillingForm] = useState({
    dailyRate: 0,
    days: 1,
    hasInsurance: false,
    insuranceProvider: '',
    insuranceMemberNo: '',
  });
  const INSURANCE_PROVIDERS = ['SHA', 'NHIF Legacy', 'Jubilee Insurance', 'AAR Insurance'];
  const INSURANCE_THRESHOLD = 10000;
  const INSURANCE_COVER_PCT = 0.5;
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

  // Derived billing calculations
  const computedTotal = billingForm.dailyRate * billingForm.days;
  const insurancePays = billingForm.hasInsurance && computedTotal >= INSURANCE_THRESHOLD
    ? Math.floor(computedTotal * INSURANCE_COVER_PCT)
    : 0;
  const patientOwes = computedTotal - insurancePays;

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

  const fetchVisitDetails = async (admission: Admission) => {
    setLoadingDetails(true);
    try {
      const visitId = admission.visit.id;
      const [consultRes, labRes] = await Promise.all([
        apiClient.get(`/consultations/visit/${visitId}`).catch(() => ({ data: [] })),
        apiClient.get(`/lab/results/visit/${visitId}`).catch(() => ({ data: [] })),
      ]);
      // Also enrich prescriptions items from itemsJson
      const enrichedAdmission: Admission = {
        ...admission,
        visit: {
          ...admission.visit,
          consultations: consultRes.data,
          labOrders: labRes.data,
          prescriptions: (admission.visit.prescriptions || []).map((p: any) => ({
            ...p,
            items: p.items || (p.itemsJson ? JSON.parse(p.itemsJson) : []),
          })),
        },
      };
      setViewingAdmission(enrichedAdmission);
    } catch (error) {
      console.error('Failed to fetch visit details:', error);
      setViewingAdmission(admission);
    } finally {
      setLoadingDetails(false);
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

    if (!dischargeForm.totalCharges || dischargeForm.totalCharges <= 0) {
      toast.error('Please enter the total ward charges amount');
      return;
    }
    if (dischargeForm.paymentMethod === 'MPESA' && !dischargeForm.mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }

    setIsProcessingDischarge(true);
    try {
      // Step 1: Create the ward discharge invoice
      const invoiceRes = await apiClient.post(
        `/admissions/${selectedPatient.visit.id}/discharge-invoice`,
        { amount: dischargeForm.totalCharges },
      );
      const invoiceId = invoiceRes.data.id;

      // Step 2: Process payment (payments service auto-discharges on success)
      if (dischargeForm.paymentMethod === 'CASH') {
        await apiClient.post('/payments', {
          invoiceId,
          method: 'CASH',
          amount: dischargeForm.totalCharges,
        });
        toast.success('✅ Payment received. Patient discharged successfully!');
        setShowDischargeModal(false);
        setSelectedPatient(null);
        setDischargeForm({ dischargeSummary: '', totalCharges: 0, paymentMethod: 'CASH', mpesaPhone: '' });
        fetchCurrentInpatients();
      } else {
        const payRes = await apiClient.post('/payments', {
          invoiceId,
          method: 'MPESA',
          amount: dischargeForm.totalCharges,
          phoneNumber: dischargeForm.mpesaPhone,
        });
        toast.success('📱 STK push sent! Waiting for patient payment...');
        setShowDischargeModal(false);
        pollDischargePayment(payRes.data.checkoutRequestId);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to process payment';
      toast.error(`❌ ${msg}`);
    } finally {
      setIsProcessingDischarge(false);
    }
  };

  const pollDischargePayment = (checkoutId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await apiClient.get(`/payments/mpesa/query/${checkoutId}`);
        const status = res.data?.payment?.status || res.data?.status;
        if (status === 'SUCCESS' || res.data?.status === 'paid') {
          clearInterval(interval);
          toast.success('✅ M-Pesa payment confirmed! Patient discharged.');
          setSelectedPatient(null);
          setDischargeForm({ dischargeSummary: '', totalCharges: 0, paymentMethod: 'CASH', mpesaPhone: '' });
          fetchCurrentInpatients();
        } else if (status === 'FAILED') {
          clearInterval(interval);
          toast.error('❌ M-Pesa payment failed. Please retry.');
        }
      } catch {}
      if (attempts >= 20) {
        clearInterval(interval);
        toast.error('⏰ Payment timeout. Verify payment status.');
      }
    }, 3000);
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
            {/* Patient Record Timeline — real data */}
            <div className="lg:col-span-2">
              <Card title={`Patient Record: ${selectedPatient.visit.patient.name}`}>
                <div className="space-y-4">
                  {/* Admission */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">📅</div>
                      <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-xs text-gray-500">{formatDate(selectedPatient.admittedAt)}</p>
                      <p className="font-semibold text-gray-900">Admitted</p>
                      <p className="text-sm text-gray-600">Ward: <strong>{selectedPatient.wardName}</strong> • Bed: <strong>{selectedPatient.bedNumber}</strong></p>
                    </div>
                  </div>

                  {/* Consultations (real) */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">🩺</div>
                      <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900 mb-1">Doctor Consultation</p>
                      {(!selectedPatient.visit.consultations || selectedPatient.visit.consultations.length === 0) ? (
                        <p className="text-sm text-gray-400 italic">No consultation notes recorded</p>
                      ) : (
                        selectedPatient.visit.consultations.map((c) => (
                          <div key={c.id} className="mb-2 p-2 bg-green-50 rounded-lg border border-green-100">
                            <p className="text-xs text-gray-500">{formatDate(c.createdAt)} — {c.doctor?.name || 'Doctor'}</p>
                            {c.diagnosis && <p className="text-sm font-medium text-gray-900">Diagnosis: {c.diagnosis}</p>}
                            {c.notes && <p className="text-sm text-gray-700 mt-1">Notes: {c.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Prescriptions (real) */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">💊</div>
                      <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900 mb-1">Prescriptions</p>
                      {(!selectedPatient.visit.prescriptions || selectedPatient.visit.prescriptions.length === 0) ? (
                        <p className="text-sm text-gray-400 italic">No prescriptions</p>
                      ) : (
                        selectedPatient.visit.prescriptions.map((rx) => (
                          <div key={rx.id} className="mb-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="text-xs text-gray-500">{formatDate(rx.createdAt)} — {rx.doctor?.name || 'Doctor'} • <Badge variant={rx.status === 'DISPENSED' ? 'success' : 'warning'}>{rx.status}</Badge></p>
                            {(rx.items || (rx.itemsJson ? JSON.parse(rx.itemsJson) : [])).map((item: any, i: number) => (
                              <p key={i} className="text-sm text-gray-700">• {item.medicine || item.name} {item.dosage} {item.quantity ? `× ${item.quantity}` : ''}</p>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Lab Results (real) */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm">🔬</div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Lab Results</p>
                      {(!selectedPatient.visit.labOrders || selectedPatient.visit.labOrders.length === 0) ? (
                        <p className="text-sm text-gray-400 italic">No lab orders</p>
                      ) : (
                        selectedPatient.visit.labOrders.map((order: any) => (
                          <div key={order.id} className="mb-2 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                            <p className="text-xs text-gray-500">Tests: {(typeof order.testsJson === 'string' ? JSON.parse(order.testsJson) : order.testsJson || []).join(', ')} • <Badge variant={order.status === 'COMPLETED' ? 'success' : 'info'}>{order.status}</Badge></p>
                            {(order.labResults || []).flatMap((res: any, i: number) => {
                              const items: any[] = typeof res.resultsJson === 'string' ? JSON.parse(res.resultsJson) : (res.resultsJson || []);
                              return items.map((item: any, j: number) => (
                                <p key={`${i}-${j}`} className="text-sm text-gray-700">• {item.testName}: <strong>{item.value}{item.unit ? ` ${item.unit}` : ''}</strong>{item.referenceRange ? ` (Ref: ${item.referenceRange})` : ''}</p>
                              ));
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Billing & Discharge */}
            <div className="space-y-4">
              <Card title="Ward Billing">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedPatient.visit.patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedPatient.visit.patient.name}</p>
                      <p className="text-xs text-gray-500">{selectedPatient.visit.patient.phone}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Daily Rate (KES)</label>
                    <input
                      type="number"
                      min="0"
                      value={billingForm.dailyRate || ''}
                      onChange={(e) => setBillingForm({ ...billingForm, dailyRate: Number(e.target.value) })}
                      placeholder="e.g. 2000"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Number of Days</label>
                    <input
                      type="number"
                      min="1"
                      value={billingForm.days}
                      onChange={(e) => setBillingForm({ ...billingForm, days: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {computedTotal > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total ({billingForm.days}d × KES {billingForm.dailyRate.toLocaleString()})</span>
                        <span className="font-semibold">KES {computedTotal.toLocaleString()}</span>
                      </div>
                      {insurancePays > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Insurance pays (50%)</span>
                          <span className="font-semibold text-green-700">- KES {insurancePays.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t border-gray-300 pt-1">
                        <span className="font-semibold text-gray-900">Patient pays</span>
                        <span className="font-bold text-blue-700">KES {patientOwes.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Insurance */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billingForm.hasInsurance}
                        onChange={(e) => setBillingForm({ ...billingForm, hasInsurance: e.target.checked, insuranceProvider: '', insuranceMemberNo: '' })}
                        className="rounded"
                      />
                      Patient has insurance
                    </label>
                  </div>

                  {billingForm.hasInsurance && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      {computedTotal < INSURANCE_THRESHOLD && (
                        <p className="text-xs text-orange-600">⚠️ Insurance only applies for bills of KES {INSURANCE_THRESHOLD.toLocaleString()} or more</p>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Provider</label>
                        <select
                          value={billingForm.insuranceProvider}
                          onChange={(e) => setBillingForm({ ...billingForm, insuranceProvider: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select provider...</option>
                          {INSURANCE_PROVIDERS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Member / Policy No.</label>
                        <input
                          type="text"
                          value={billingForm.insuranceMemberNo}
                          onChange={(e) => setBillingForm({ ...billingForm, insuranceMemberNo: e.target.value })}
                          placeholder="e.g. SHA-123456"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Button
                      className="w-full"
                      disabled={patientOwes <= 0}
                      onClick={() => {
                        if (patientOwes <= 0) { toast.error('Please enter daily rate and days'); return; }
                        setDischargeForm((prev) => ({
                          ...prev,
                          totalCharges: patientOwes,
                          mpesaPhone: '',
                        }));
                        setShowDischargeModal(true);
                      }}
                    >
                      💳 Collect Payment &amp; Discharge
                    </Button>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => {
                        fetchVisitDetails(selectedPatient);
                        setShowViewModal(true);
                      }}
                    >
                      🔍 View Full Details
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Collect Payment &amp; Discharge</h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700 font-medium">{selectedPatient.visit.patient.name}</p>
              <p className="text-xs text-blue-600">{selectedPatient.wardName} • Bed {selectedPatient.bedNumber}</p>
              {billingForm.hasInsurance && billingForm.insuranceProvider && (
                <p className="text-xs text-green-700 mt-1">🏥 Insurance: {billingForm.insuranceProvider} {billingForm.insuranceMemberNo && `(${billingForm.insuranceMemberNo})`}</p>
              )}
            </div>

            <div className="p-3 bg-gray-50 border rounded-lg mb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ward Total</span>
                <span>KES {computedTotal.toLocaleString()}</span>
              </div>
              {insurancePays > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Insurance covers (50%)</span>
                  <span className="text-green-700">- KES {insurancePays.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-1 font-bold">
                <span>Patient pays</span>
                <span className="text-blue-700">KES {patientOwes.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleDischargePatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Summary (optional)</label>
                <textarea
                  rows={2}
                  value={dischargeForm.dischargeSummary}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })}
                  placeholder="Brief discharge notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Collect (KES)</label>
                <input
                  type="number"
                  min="1"
                  value={dischargeForm.totalCharges}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, totalCharges: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Pre-filled from billing. Edit if needed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDischargeForm({ ...dischargeForm, paymentMethod: 'CASH' })}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${dischargeForm.paymentMethod === 'CASH' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    💵 Cash
                  </button>
                  <button type="button" onClick={() => setDischargeForm({ ...dischargeForm, paymentMethod: 'MPESA' })}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${dischargeForm.paymentMethod === 'MPESA' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    📱 M-Pesa
                  </button>
                </div>
              </div>

              {dischargeForm.paymentMethod === 'MPESA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payer's M-Pesa Number</label>
                  <p className="text-xs text-gray-500 mb-1">Enter the number that will receive the STK push (can differ from patient's registered number)</p>
                  <input type="tel" value={dischargeForm.mpesaPhone}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, mpesaPhone: e.target.value })}
                    placeholder="e.g. 254712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setShowDischargeModal(false); setDischargeForm({ dischargeSummary: '', totalCharges: patientOwes, paymentMethod: 'CASH', mpesaPhone: '' }); }} className="flex-1">Cancel</Button>
                <Button type="submit" variant="danger" className="flex-1" disabled={isProcessingDischarge}>
                  {isProcessingDischarge ? 'Processing...' : dischargeForm.paymentMethod === 'CASH' ? '✅ Pay Cash & Discharge' : '📱 Send M-Pesa & Discharge'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Patient Details: {(viewingAdmission || selectedPatient)?.visit.patient.name}
                </h2>
                <button onClick={() => { setShowViewModal(false); setViewingAdmission(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {loadingDetails ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-gray-500">Loading patient records...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Patient Info */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Phone:</span> <strong>{(viewingAdmission || selectedPatient)?.visit.patient.phone}</strong></div>
                      <div><span className="text-gray-500">Ward:</span> <strong>{(viewingAdmission || selectedPatient)?.wardName}</strong></div>
                      <div><span className="text-gray-500">Bed:</span> <strong>{(viewingAdmission || selectedPatient)?.bedNumber}</strong></div>
                      <div><span className="text-gray-500">Admitted:</span> <strong>{formatDate((viewingAdmission || selectedPatient)?.admittedAt || '')}</strong></div>
                    </div>
                  </div>

                  {/* Doctor Notes & Diagnosis */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">🩺 Doctor Notes &amp; Diagnosis</h3>
                    {(!viewingAdmission?.visit.consultations || viewingAdmission.visit.consultations.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No consultation records</p>
                    ) : (
                      viewingAdmission.visit.consultations.map((c) => (
                        <div key={c.id} className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{formatDate(c.createdAt)} • {c.doctor?.name}</p>
                          <p className="text-sm font-semibold text-gray-900">Diagnosis: {c.diagnosis || '—'}</p>
                          <p className="text-sm text-gray-700 mt-1">{c.notes || '—'}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Prescriptions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">💊 Prescriptions</h3>
                    {(!viewingAdmission?.visit.prescriptions || viewingAdmission.visit.prescriptions.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No prescriptions</p>
                    ) : (
                      viewingAdmission.visit.prescriptions.map((rx) => (
                        <div key={rx.id} className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-gray-500">{formatDate(rx.createdAt)} • {rx.doctor?.name}</p>
                            <Badge variant={rx.status === 'DISPENSED' ? 'success' : 'warning'}>{rx.status}</Badge>
                          </div>
                          {(rx.items || (rx.itemsJson ? JSON.parse(rx.itemsJson) : [])).map((item: any, i: number) => (
                            <p key={i} className="text-sm text-gray-700">• {item.medicine || item.name} — {item.dosage}{item.quantity ? ` × ${item.quantity}` : ''}</p>
                          ))}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Lab Results */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">🔬 Lab Orders &amp; Results</h3>
                    {(!viewingAdmission?.visit.labOrders || viewingAdmission.visit.labOrders.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No lab orders</p>
                    ) : (
                      viewingAdmission.visit.labOrders.map((order: any) => (
                        <div key={order.id} className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-gray-500">Tests: {(typeof order.testsJson === 'string' ? JSON.parse(order.testsJson) : order.testsJson || []).join(', ')}</p>
                            <Badge variant={order.status === 'COMPLETED' ? 'success' : 'info'}>{order.status}</Badge>
                          </div>
                          {(order.labResults || []).length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Results pending</p>
                          ) : (
                            (order.labResults || []).flatMap((res: any, i: number) => {
                              const items: any[] = typeof res.resultsJson === 'string' ? JSON.parse(res.resultsJson) : (res.resultsJson || []);
                              return items.map((item: any, j: number) => (
                                <p key={`${i}-${j}`} className="text-sm text-gray-700">• {item.testName}: <strong>{item.value}{item.unit ? ` ${item.unit}` : ''}</strong>{item.referenceRange ? ` (Ref: ${item.referenceRange})` : ''}</p>
                              ));
                            })
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
