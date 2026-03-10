'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

interface Patient {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
}

interface Visit {
  id: string;
  patient: Patient;
  visitType: string;
  status: string;
  createdAt: string;
}

interface QueueItem {
  id: string;
  visit: Visit;
  stage: string;
  status: string;
  priority: number;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
}

const navItems = [
  { label: 'Dashboard', href: '/receptionist', icon: '📊' },
  { label: 'Patients', href: '/receptionist/patients', icon: '👥' },
  { label: 'Queue', href: '/receptionist/queue', icon: '📋' },
  { label: 'Payments', href: '/receptionist/payments', icon: '💳' },
];

export default function ReceptionistPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [showCreateVisit, setShowCreateVisit] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  const [patientForm, setPatientForm] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: 'MALE',
    idNumber: '',
    address: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
  });

  const [visitForm, setVisitForm] = useState({
    patientId: '',
    visitType: 'CONSULTATION',
  });

  // Visit creation payment flow
  const [visitPaymentStep, setVisitPaymentStep] = useState<'FORM' | 'PAYMENT' | 'MPESA_WAITING'>('FORM');
  const [visitPaymentMethod, setVisitPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [visitMpesaPhone, setVisitMpesaPhone] = useState('');
  const [visitInvoiceId, setVisitInvoiceId] = useState<string | null>(null);
  const [visitCheckoutRequestId, setVisitCheckoutRequestId] = useState<string | null>(null);
  const [isProcessingVisit, setIsProcessingVisit] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await apiClient.get('/queue');
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const handleSearchPatient = async () => {
    if (!searchQuery) return;
    try {
      const response = await apiClient.get(`/patients/search?q=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search patients:', error);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/patients', patientForm);
      setSelectedPatient(response.data);
      setShowCreatePatient(false);
      setPatientForm({
        name: '',
        phone: '',
        dob: '',
        gender: 'MALE',
        idNumber: '',
        address: '',
        nextOfKinName: '',
        nextOfKinPhone: '',
      });
      toast.success('✅ Patient registered successfully!');
    } catch (error) {
      console.error('Failed to create patient:', error);
      toast.error('❌ Failed to create patient');
    }
  };

  const closeAndResetVisitModal = () => {
    setShowCreateVisit(false);
    setVisitPaymentStep('FORM');
    setVisitPaymentMethod('CASH');
    setVisitMpesaPhone('');
    setVisitInvoiceId(null);
    setVisitCheckoutRequestId(null);
    setIsProcessingVisit(false);
    setVisitForm({ patientId: '', visitType: 'CONSULTATION' });
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || isProcessingVisit) return;
    setIsProcessingVisit(true);

    try {
      const response = await apiClient.post('/visits', {
        ...visitForm,
        patientId: selectedPatient.id,
      });
      const visitId = response.data.id;

      if (visitForm.visitType === 'INJECTION_FOLLOWUP') {
        toast.success('✅ Visit created! Patient queued directly to doctor (follow-up — no fee).');
        closeAndResetVisitModal();
        fetchQueue();
      } else {
        // Fetch the consultation invoice created by the backend
        const invoicesRes = await apiClient.get(`/invoices/visit/${visitId}`);
        const consultInvoice = (invoicesRes.data as any[]).find((inv: any) => inv.type === 'CONSULTATION');
        setVisitInvoiceId(consultInvoice?.id ?? null);
        setVisitMpesaPhone(selectedPatient.phone);
        setVisitPaymentStep('PAYMENT');
      }
    } catch (error) {
      console.error('Failed to create visit:', error);
      toast.error('❌ Failed to create visit');
    } finally {
      setIsProcessingVisit(false);
    }
  };

  const handleVisitPayment = async () => {
    if (!visitInvoiceId || isProcessingVisit) {
      if (!visitInvoiceId) toast.error('Invoice not found. Please restart the visit.');
      return;
    }
    if (visitPaymentMethod === 'MPESA' && !visitMpesaPhone) {
      toast.error('Please enter the M-Pesa phone number');
      return;
    }
    setIsProcessingVisit(true);
    try {
      if (visitPaymentMethod === 'CASH') {
        await apiClient.post('/payments', {
          invoiceId: visitInvoiceId,
          method: 'CASH',
          amount: 100,
        });
        toast.success('✅ Cash payment recorded. Patient queued to doctor!');
        closeAndResetVisitModal();
        fetchQueue();
      } else {
        const res = await apiClient.post('/payments', {
          invoiceId: visitInvoiceId,
          method: 'MPESA',
          amount: 100,
          phoneNumber: visitMpesaPhone,
        });
        setVisitCheckoutRequestId(res.data.checkoutRequestId);
        setVisitPaymentStep('MPESA_WAITING');
        toast.success('📱 STK push sent! Ask patient to check phone.');
        pollVisitPayment(res.data.checkoutRequestId);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Payment failed';
      toast.error(`❌ ${msg}`);
    } finally {
      setIsProcessingVisit(false);
    }
  };

  const pollVisitPayment = (checkoutId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await apiClient.get(`/payments/mpesa/query/${checkoutId}`);
        const status = res.data?.payment?.status || res.data?.status;
        if (status === 'SUCCESS' || res.data?.status === 'paid') {
          clearInterval(interval);
          toast.success('✅ M-Pesa payment confirmed! Patient queued to doctor.');
          closeAndResetVisitModal();
          fetchQueue();
        } else if (status === 'FAILED') {
          clearInterval(interval);
          toast.error('❌ M-Pesa payment failed. Please try again.');
          setVisitPaymentStep('PAYMENT');
        }
      } catch {}
      if (attempts >= 20) {
        clearInterval(interval);
        toast.error('⏰ Payment timeout. Verify if payment was received.');
        setVisitPaymentStep('PAYMENT');
      }
    }, 3000);
  };

  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout navItems={navItems} userName={user?.name || 'Receptionist'} userRole="Reception">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Welcome, {user?.name || 'Receptionist'}</h1>
          <p className="text-gray-600 mt-1">Patient registration and queue management</p>
        </div>


        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setShowCreatePatient(true)}
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <span className="text-3xl">➕</span>
            <span>Register New Patient</span>
          </Button>

          <Button
            onClick={() => setShowCreateVisit(true)}
            variant="success"
            className="h-24 flex flex-col items-center justify-center gap-2"
            disabled={!selectedPatient}
          >
            <span className="text-3xl">📋</span>
            <span>Create Visit</span>
          </Button>

          <Button
            variant="secondary"
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <span className="text-3xl">💳</span>
            <span>Payment Panel</span>
          </Button>
        </div>

        {/* Patient Search */}
        <Card title="Patient Search">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by phone, ID number, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleSearchPatient}>Search</Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPatient?.id === patient.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-600">
                          {patient.phone} • ID: {patient.idNumber}
                        </p>
                      </div>
                      {selectedPatient?.id === patient.id && (
                        <Badge variant="primary">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPatient && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">Selected Patient:</p>
                <p className="text-lg font-semibold text-green-900">{selectedPatient.name}</p>
                <p className="text-sm text-green-700">{selectedPatient.phone}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Queue View */}
        <Card title="Current Queue">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Queue #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Visit Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Stage</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No patients in queue
                    </td>
                  </tr>
                ) : (
                  queue.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-blue-600">#{index + 1}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.visit.patient.name}</p>
                          <p className="text-sm text-gray-600">{item.visit.patient.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="info">{item.visit.visitType}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="primary">{item.stage}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            item.status === 'DONE'
                              ? 'success'
                              : item.status === 'IN_PROGRESS'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(item.visit.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create Patient Modal */}
      {showCreatePatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Register New Patient</h2>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={patientForm.dob}
                    onChange={(e) => setPatientForm({ ...patientForm, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    required
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.idNumber}
                    onChange={(e) => setPatientForm({ ...patientForm, idNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Name</label>
                  <input
                    type="text"
                    value={patientForm.nextOfKinName}
                    onChange={(e) => setPatientForm({ ...patientForm, nextOfKinName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone</label>
                  <input
                    type="tel"
                    value={patientForm.nextOfKinPhone}
                    onChange={(e) => setPatientForm({ ...patientForm, nextOfKinPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreatePatient(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Register Patient
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Visit Modal */}
      {showCreateVisit && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">

            {/* STEP 1: Visit Type Form */}
            {visitPaymentStep === 'FORM' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create Visit</h2>
                <form onSubmit={handleCreateVisit} className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Patient:</p>
                    <p className="text-lg font-semibold text-blue-900">{selectedPatient.name}</p>
                    <p className="text-sm text-blue-700">{selectedPatient.phone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
                    <select
                      required
                      value={visitForm.visitType}
                      onChange={(e) => setVisitForm({ ...visitForm, visitType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CONSULTATION">Consultation (KSh 100)</option>
                      <option value="INJECTION_FOLLOWUP">Injection / Follow-up (Free)</option>
                      <option value="REVIEW">Review (KSh 100)</option>
                    </select>
                  </div>

                  {visitForm.visitType !== 'INJECTION_FOLLOWUP' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      💡 A consultation fee of <strong>KSh 100</strong> will be collected in the next step.
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={closeAndResetVisitModal} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isProcessingVisit}>
                      {isProcessingVisit ? 'Creating...' : visitForm.visitType === 'INJECTION_FOLLOWUP' ? 'Create Visit' : 'Next: Collect Fee →'}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {/* STEP 2: Payment */}
            {visitPaymentStep === 'PAYMENT' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Collect Consultation Fee</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Patient:</p>
                    <p className="text-lg font-semibold text-blue-900">{selectedPatient.name}</p>
                    <p className="text-sm text-blue-700">{selectedPatient.phone}</p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <span className="text-green-800 font-semibold">Consultation Fee</span>
                    <span className="text-2xl font-bold text-green-900">KSh 100</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setVisitPaymentMethod('CASH')}
                        className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${
                          visitPaymentMethod === 'CASH'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        💵 Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisitPaymentMethod('MPESA')}
                        className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${
                          visitPaymentMethod === 'MPESA'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        📱 M-Pesa
                      </button>
                    </div>
                  </div>

                  {visitPaymentMethod === 'MPESA' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
                      <input
                        type="tel"
                        value={visitMpesaPhone}
                        onChange={(e) => setVisitMpesaPhone(e.target.value)}
                        placeholder="254712345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">STK push will be sent to this number</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={closeAndResetVisitModal} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleVisitPayment} className="flex-1" disabled={isProcessingVisit}>
                      {isProcessingVisit
                        ? 'Processing...'
                        : visitPaymentMethod === 'CASH'
                        ? '✅ Confirm Cash (KSh 100)'
                        : '📱 Send M-Pesa Request'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: M-Pesa Waiting */}
            {visitPaymentStep === 'MPESA_WAITING' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Waiting for M-Pesa Payment</h2>
                <div className="space-y-6 text-center py-4">
                  <div className="text-6xl animate-pulse">📱</div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">STK Push Sent!</p>
                    <p className="text-gray-600 mt-1">
                      A payment prompt of <strong>KSh 100</strong> was sent to:
                    </p>
                    <p className="text-xl font-bold text-blue-600 mt-2">{visitMpesaPhone}</p>
                  </div>
                  <p className="text-sm text-gray-500">Waiting for confirmation — up to 60 seconds.</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={closeAndResetVisitModal} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setVisitPaymentStep('PAYMENT')}
                      className="flex-1"
                    >
                      Try Different Method
                    </Button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
