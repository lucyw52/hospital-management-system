'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';

const navItems = [
  { label: 'Dashboard', href: '/doctor', icon: '👨‍⚕️' },
  { label: 'Doctor Queue', href: '/doctor/queue', icon: '📋' },
  { label: 'Lab Results', href: '/doctor/lab-results', icon: '🔬' },
  { label: 'Patients', href: '/doctor/patients', icon: '👥' },
];

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await apiClient.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      fetchPatients();
      return;
    }
    try {
      const response = await apiClient.get(`/patients/search?q=${searchQuery}`);
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to search patients:', error);
    }
  };

  const viewPatientHistory = async (patient: any) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    try {
      const response = await apiClient.get(`/patients/${patient.id}/visits`);
      setPatientHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch patient history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout navItems={navItems} userName="Dr. Smith" userRole="Doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Patient Records</h1>
          <p className="text-gray-600 mt-1">Search and view patient history</p>
        </div>

        <Card>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Gender</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient: any) => (
                  <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{patient.name}</td>
                    <td className="py-3 px-4">{patient.phone}</td>
                    <td className="py-3 px-4">{patient.gender}</td>
                    <td className="py-3 px-4">
                      <Button size="sm" onClick={() => viewPatientHistory(patient)}>
                        View History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Patient History Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-gray-600">
                    {selectedPatient.phone} • {selectedPatient.gender}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientHistory([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loadingHistory ? (
                  <p className="text-center text-gray-600">Loading history...</p>
                ) : patientHistory.length === 0 ? (
                  <p className="text-center text-gray-600">No visit history found.</p>
                ) : (
                  <div className="space-y-4">
                    {patientHistory.map((visit: any) => (
                      <Card key={visit.id}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg text-gray-800">
                                {visit.visitType.replace('_', ' ')}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {formatDate(visit.createdAt)} • Status: {visit.status}
                              </p>
                            </div>
                          </div>

                          {/* Consultations */}
                          {visit.consultations && visit.consultations.length > 0 && (
                            <div className="border-t pt-3">
                              <h4 className="font-semibold text-gray-700 mb-2">Consultations</h4>
                              {visit.consultations.map((consultation: any) => (
                                <div key={consultation.id} className="bg-gray-50 p-3 rounded mb-2">
                                  <p className="text-sm">
                                    <span className="font-medium">Doctor:</span> {consultation.doctor.name}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Diagnosis:</span> {consultation.diagnosis}
                                  </p>
                                  {consultation.notes && (
                                    <p className="text-sm mt-1">
                                      <span className="font-medium">Notes:</span> {consultation.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Prescriptions */}
                          {visit.prescriptions && visit.prescriptions.length > 0 && (
                            <div className="border-t pt-3">
                              <h4 className="font-semibold text-gray-700 mb-2">Prescriptions</h4>
                              {visit.prescriptions.map((prescription: any) => {
                                let items = [];
                                try {
                                  items = JSON.parse(prescription.itemsJson || '[]');
                                } catch (e) {
                                  console.error('Failed to parse prescription items:', e);
                                }
                                return (
                                  <div key={prescription.id} className="bg-blue-50 p-3 rounded mb-2">
                                    <p className="text-xs text-gray-600 mb-2">
                                      Prescribed by: {prescription.doctor?.name || 'Unknown'}
                                    </p>
                                    {items.length > 0 && (
                                      <ul className="list-disc list-inside text-sm">
                                        {items.map((med: any, idx: number) => (
                                          <li key={idx}>
                                            {med.medicine} - {med.dosage} (Qty: {med.quantity})
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Lab Orders */}
                          {visit.labOrders && visit.labOrders.length > 0 && (
                            <div className="border-t pt-3">
                              <h4 className="font-semibold text-gray-700 mb-2">Lab Tests</h4>
                              {visit.labOrders.map((order: any) => {
                                let tests = [];
                                try {
                                  tests = JSON.parse(order.testsJson || '[]');
                                } catch (e) {
                                  console.error('Failed to parse lab tests:', e);
                                }
                                return (
                                  <div key={order.id} className="bg-purple-50 p-3 rounded mb-2">
                                    <p className="text-sm">
                                      <span className="font-medium">Tests:</span> {tests.join(', ') || 'N/A'}
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Status:</span> {order.status}
                                    </p>
                                    {order.labResults && order.labResults.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-sm font-medium">Results:</p>
                                        {order.labResults.map((result: any) => {
                                          let results = {};
                                          try {
                                            results = JSON.parse(result.resultsJson || '{}');
                                          } catch (e) {
                                            console.error('Failed to parse lab results:', e);
                                          }
                                          return (
                                            <div key={result.id} className="text-sm ml-2 mt-1">
                                              {Object.entries(results).map(([key, value]) => (
                                                <p key={key}>
                                                  {key}: {String(value)}
                                                </p>
                                              ))}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Admissions */}
                          {visit.admissions && visit.admissions.length > 0 && (
                            <div className="border-t pt-3">
                              <h4 className="font-semibold text-gray-700 mb-2">Admissions</h4>
                              {visit.admissions.map((admission: any) => (
                                <div key={admission.id} className="bg-red-50 p-3 rounded mb-2">
                                  <p className="text-sm">
                                    <span className="font-medium">Ward:</span> {admission.wardName}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Bed:</span> {admission.bedNumber}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Status:</span> {admission.status}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Admitted:</span>{' '}
                                    {formatDate(admission.admittedAt)}
                                  </p>
                                  {admission.dischargedAt && (
                                    <p className="text-sm">
                                      <span className="font-medium">Discharged:</span>{' '}
                                      {formatDate(admission.dischargedAt)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
