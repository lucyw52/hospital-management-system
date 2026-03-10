'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

interface QueueItem {
  id: string;
  visit: {
    id: string;
    patient: {
      id: string;
      name: string;
      phone: string;
      dob: string;
    };
    visitType: string;
  };
  status: string;
  priority: number;
}

interface Consultation {
  id: string;
  notes: string;
  diagnosis: string;
}

const navItems = [
  { label: 'Dashboard', href: '/doctor', icon: '👨‍⚕️' },
  { label: 'Doctor Queue', href: '/doctor/queue', icon: '📋' },
  { label: 'Lab Results', href: '/doctor/lab-results', icon: '🔬' },
  { label: 'Patients', href: '/doctor/patients', icon: '👥' },
];

const calculateAge = (dob: string | null | undefined): number | string => {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 'N/A';
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return age > 0 ? age : 'N/A';
};

export default function DoctorPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<QueueItem | null>(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [consultationForm, setConsultationForm] = useState({
    notes: '',
    diagnosis: '',
    action: '',
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    medications: [{ medicine: '', dosage: '', quantity: 1 }],
  });
  const [stockMedicines, setStockMedicines] = useState<Array<{ id: string; name: string; quantity: number }>>([]);
  const [medicineSearch, setMedicineSearch] = useState<string[]>(['']);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [labOrderForm, setLabOrderForm] = useState({
    tests: [''],
  });

  const [admissionForm, setAdmissionForm] = useState({
    wardName: '',
    bedNumber: '',
    reason: '',
  });

  useEffect(() => {
    fetchQueue();
    fetchStockMedicines();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await apiClient.get('/queue/DOCTOR');
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchStockMedicines = async () => {
    try {
      const response = await apiClient.get('/pharmacy/stock');
      setStockMedicines(response.data);
    } catch (error) {
      console.error('Failed to fetch stock medicines:', error);
    }
  };

  const handleJumpQueue = async (queueId: string) => {
    try {
      await apiClient.patch(`/queue/${queueId}/jump`);
      toast.success('✅ Patient moved to front of queue');
      fetchQueue();
    } catch (error) {
      console.error('Failed to jump queue:', error);
      toast.error('❌ Failed to jump queue');
    }
  };

  const handleStartConsultation = (patient: QueueItem) => {
    setSelectedPatient(patient);
    setShowConsultationForm(true);
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      await apiClient.post('/consultations', {
        visitId: selectedPatient.visit.id,
        notes: consultationForm.notes,
        diagnosis: consultationForm.diagnosis,
      });

      // Handle next action based on selection
      if (consultationForm.action === 'prescription') {
        await handleCreatePrescription();
      } else if (consultationForm.action === 'lab') {
        await handleCreateLabOrder();
      } else if (consultationForm.action === 'admission') {
        await handleCreateAdmission();
      }

      // Mark queue item as done
      await apiClient.patch(`/queue/${selectedPatient.id}/status`, { status: 'DONE' });

      setShowConsultationForm(false);
      setSelectedPatient(null);
      resetForms();
      fetchQueue();
      toast.success('✅ Consultation saved successfully!');
    } catch (error) {
      console.error('Failed to save consultation:', error);
      toast.error('❌ Failed to save consultation');
    }
  };

  const handleCreatePrescription = async () => {
    if (!selectedPatient) return;
    try {
      await apiClient.post('/pharmacy/prescriptions', {
        visitId: selectedPatient.visit.id,
        items: prescriptionForm.medications,
      });
    } catch (error) {
      console.error('Failed to create prescription:', error);
    }
  };

  const handleCreateLabOrder = async () => {
    if (!selectedPatient) return;
    try {
      await apiClient.post('/lab/orders', {
        visitId: selectedPatient.visit.id,
        tests: labOrderForm.tests,
      });
    } catch (error) {
      console.error('Failed to create lab order:', error);
    }
  };

  const handleCreateAdmission = async () => {
    if (!selectedPatient) return;
    try {
      // Refer patient to ward queue (WAITING). Ward clerk will do the formal admission.
      const notesParts = [`Ward referral: ${admissionForm.wardName || 'General Ward'}`];
      if (admissionForm.bedNumber) notesParts.push(`Bed ${admissionForm.bedNumber}`);
      if (admissionForm.reason) notesParts.push(`Reason: ${admissionForm.reason}`);
      await apiClient.post('/queue', {
        visitId: selectedPatient.visit.id,
        stage: 'WARD',
        notes: notesParts.join(', '),
      });
    } catch (error) {
      console.error('Failed to refer patient to ward:', error);
    }
  };

  const resetForms = () => {
    setConsultationForm({ notes: '', diagnosis: '', action: '' });
    setPrescriptionForm({ medications: [{ medicine: '', dosage: '', quantity: 1 }] });
    setMedicineSearch(['']);
    setLabOrderForm({ tests: [''] });
    setAdmissionForm({ wardName: '', bedNumber: '', reason: '' });
  };

  const addMedication = () => {
    setPrescriptionForm({
      ...prescriptionForm,
      medications: [
        ...prescriptionForm.medications,
        { medicine: '', dosage: '', quantity: 1 },
      ],
    });
    setMedicineSearch([...medicineSearch, '']);
  };

  const addTest = () => {
    setLabOrderForm({
      ...labOrderForm,
      tests: [...labOrderForm.tests, ''],
    });
  };

  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout navItems={navItems} userName={user?.name || 'Doctor'} userRole="Doctor">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Welcome, {user?.name || 'Doctor'}</h1>
          <p className="text-gray-600 mt-1">Consultation workspace and patient care</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waiting</p>
                <p className="text-3xl font-bold text-blue-600">{queue.filter(q => q.status === 'WAITING').length}</p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-green-600">{queue.filter(q => q.status === 'IN_PROGRESS').length}</p>
              </div>
              <span className="text-3xl">🏥</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-purple-600">{queue.filter(q => q.status === 'DONE').length}</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <p className="text-3xl font-bold text-orange-600">{queue.filter(q => q.priority > 1).length}</p>
              </div>
              <span className="text-3xl">🚨</span>
            </div>
          </Card>
        </div>

        {/* Doctor Queue */}
        <Card title="Doctor Queue">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Queue #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Age</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Visit Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
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
                        {calculateAge(item.visit.patient.dob)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="info">{item.visit.visitType}</Badge>
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
                      <td className="py-3 px-4">
                        {item.priority > 50 ? (
                          <Badge variant="danger">🔴 Lab Return</Badge>
                        ) : item.priority > 1 ? (
                          <Badge variant="warning">High</Badge>
                        ) : (
                          <Badge variant="info">Normal</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleStartConsultation(item)}>
                            {item.priority > 50 ? '📋 Review Results' : 'Start'}
                          </Button>
                          {item.status === 'WAITING' && (
                            <Button 
                              size="sm" 
                              variant="primary"
                              onClick={() => handleJumpQueue(item.id)}
                            >
                              ⬆️
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Consultation Modal */}
      {showConsultationForm && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Consultation - {selectedPatient.visit.patient.name}
            </h2>
            
            <form onSubmit={handleSaveConsultation} className="space-y-6">
              {/* Patient Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Patient Name</p>
                  <p className="font-semibold text-blue-900">{selectedPatient.visit.patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Phone</p>
                  <p className="font-semibold text-blue-900">{selectedPatient.visit.patient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Age</p>
                  <p className="font-semibold text-blue-900">
                    {calculateAge(selectedPatient.visit.patient.dob)} years
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Visit Type</p>
                  <p className="font-semibold text-blue-900">{selectedPatient.visit.visitType}</p>
                </div>
              </div>

              {/* Consultation Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes *</label>
                <textarea
                  required
                  rows={4}
                  value={consultationForm.notes}
                  onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                  placeholder="Patient complaints, history, examination findings..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={consultationForm.diagnosis}
                  onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                  placeholder="Primary diagnosis"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Next Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Action *</label>
                <select
                  required
                  value={consultationForm.action}
                  onChange={(e) => setConsultationForm({ ...consultationForm, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select action...</option>
                  <option value="prescription">Send to Pharmacy (Prescription)</option>
                  <option value="lab">Send to Lab (Lab Tests)</option>
                  <option value="admission">Admit to Ward</option>
                  <option value="discharge">Discharge Patient</option>
                </select>
              </div>

              {/* Prescription Form */}
              {consultationForm.action === 'prescription' && (
                <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Prescription</h3>
                    <Button type="button" size="sm" onClick={addMedication}>
                      + Add Medication
                    </Button>
                  </div>
                  <div ref={dropdownRef}>
                  {prescriptionForm.medications.map((med, index) => {
                    const filteredMeds = stockMedicines.filter((s) =>
                      s.name.toLowerCase().includes((medicineSearch[index] || '').toLowerCase())
                    );
                    return (
                    <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                      {/* Medicine search with dropdown */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search medicine..."
                          value={medicineSearch[index] ?? med.medicine}
                          onChange={(e) => {
                            const newSearch = [...medicineSearch];
                            newSearch[index] = e.target.value;
                            setMedicineSearch(newSearch);
                            const newMeds = [...prescriptionForm.medications];
                            newMeds[index].medicine = e.target.value;
                            setPrescriptionForm({ ...prescriptionForm, medications: newMeds });
                            setOpenDropdown(index);
                          }}
                          onFocus={() => setOpenDropdown(index)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {openDropdown === index && filteredMeds.length > 0 && (
                          <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                            {filteredMeds.map((stock) => (
                              <li
                                key={stock.id}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const newMeds = [...prescriptionForm.medications];
                                  newMeds[index].medicine = stock.name;
                                  setPrescriptionForm({ ...prescriptionForm, medications: newMeds });
                                  const newSearch = [...medicineSearch];
                                  newSearch[index] = stock.name;
                                  setMedicineSearch(newSearch);
                                  setOpenDropdown(null);
                                }}
                              >
                                <span className="font-medium text-gray-900">{stock.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  stock.quantity <= 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {stock.quantity <= 0 ? 'Out of stock' : `${stock.quantity} in stock`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {openDropdown === index && filteredMeds.length === 0 && (medicineSearch[index] || '').length > 0 && (
                          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-3 py-2 text-sm text-gray-500">
                            No medicines found in stock
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 500mg twice daily"
                        value={med.dosage}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].dosage = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medications: newMeds });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="e.g. 1"
                        min={1}
                        value={med.quantity}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].quantity = parseInt(e.target.value) || 1;
                          setPrescriptionForm({ ...prescriptionForm, medications: newMeds });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Lab Order Form */}
              {consultationForm.action === 'lab' && (
                <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Lab Tests</h3>
                    <Button type="button" size="sm" onClick={addTest}>
                      + Add Test
                    </Button>
                  </div>
                  {labOrderForm.tests.map((test, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder="Test name (e.g., Complete Blood Count)"
                      value={test}
                      onChange={(e) => {
                        const newTests = [...labOrderForm.tests];
                        newTests[index] = e.target.value;
                        setLabOrderForm({ ...labOrderForm, tests: newTests });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Admission Form */}
              {consultationForm.action === 'admission' && (
                <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                  <h3 className="font-semibold text-gray-900">Admission Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Ward Name"
                      value={admissionForm.wardName}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, wardName: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Bed Number"
                      value={admissionForm.bedNumber}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, bedNumber: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Reason for admission"
                    value={admissionForm.reason}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowConsultationForm(false);
                    setSelectedPatient(null);
                    resetForms();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Consultation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
