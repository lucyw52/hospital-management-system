'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', href: '/ward', icon: '🏥' },
  { label: 'Admissions', href: '/ward/admissions', icon: '📋' },
  { label: 'Inpatients', href: '/ward/inpatients', icon: '🛏️' },
  { label: 'Discharge', href: '/ward/discharge', icon: '✅' },
  { label: 'Reports', href: '/ward/reports', icon: '📊' },
];

const formatDate = (dateStr: string) =>
  dateStr ? new Date(dateStr).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function InpatientsPage() {
  const { isChecking } = useAuthGuard(['WARD_CLERK']);
  const user = useAuthStore((state) => state.user);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAdmission, setViewingAdmission] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!isChecking) {
      fetchInpatients();
    }
  }, [isChecking]);

  const fetchInpatients = async () => {
    try {
      const response = await apiClient.get('/admissions/active');
      setInpatients(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('Access denied: Check authentication token and user permissions', error);
        toast.error('❌ Access denied. Please login again.');
      } else {
        console.error('Failed to fetch inpatients:', error);
      }
    }
  };

  const handleView = async (admission: any) => {
    setViewingAdmission(admission);
    setShowViewModal(true);
    setLoadingDetails(true);
    try {
      const visitId = admission.visit.id;
      const [consultRes, labRes] = await Promise.all([
        apiClient.get(`/consultations/visit/${visitId}`).catch(() => ({ data: [] })),
        apiClient.get(`/lab/results/visit/${visitId}`).catch(() => ({ data: [] })),
      ]);
      setViewingAdmission({
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
      });
    } catch (error) {
      console.error('Failed to fetch visit details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Current Inpatients</h1>
          <p className="text-gray-600 mt-1">Admitted patients</p>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Ward</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Bed</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Admitted</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inpatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">No current inpatients</td>
                  </tr>
                ) : (
                  inpatients.map((admission: any) => (
                    <tr key={admission.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{admission.visit?.patient?.name}</td>
                      <td className="py-3 px-4">{admission.wardName}</td>
                      <td className="py-3 px-4">{admission.bedNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(admission.admittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success">ADMITTED</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button size="sm" onClick={() => handleView(admission)}>🔍 View</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* View Details Modal */}
      {showViewModal && viewingAdmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Patient Details: {viewingAdmission.visit.patient.name}
                </h2>
                <button
                  onClick={() => { setShowViewModal(false); setViewingAdmission(null); }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >&times;</button>
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
                      <div><span className="text-gray-500">Phone:</span> <strong>{viewingAdmission.visit.patient.phone}</strong></div>
                      <div><span className="text-gray-500">Ward:</span> <strong>{viewingAdmission.wardName}</strong></div>
                      <div><span className="text-gray-500">Bed:</span> <strong>{viewingAdmission.bedNumber}</strong></div>
                      <div><span className="text-gray-500">Admitted:</span> <strong>{formatDate(viewingAdmission.admittedAt)}</strong></div>
                    </div>
                  </div>

                  {/* Doctor Notes & Diagnosis */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">🩺 Doctor Notes &amp; Diagnosis</h3>
                    {(!viewingAdmission.visit.consultations || viewingAdmission.visit.consultations.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No consultation records</p>
                    ) : (
                      viewingAdmission.visit.consultations.map((c: any) => (
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
                    {(!viewingAdmission.visit.prescriptions || viewingAdmission.visit.prescriptions.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No prescriptions</p>
                    ) : (
                      viewingAdmission.visit.prescriptions.map((rx: any) => (
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
                    {(!viewingAdmission.visit.labOrders || viewingAdmission.visit.labOrders.length === 0) ? (
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
