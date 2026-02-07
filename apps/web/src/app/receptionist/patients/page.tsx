'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';

const navItems = [
  { label: 'Dashboard', href: '/receptionist', icon: '📊' },
  { label: 'Patients', href: '/receptionist/patients', icon: '👥' },
  { label: 'Queue', href: '/receptionist/queue', icon: '📋' },
  { label: 'Payments', href: '/receptionist/payments', icon: '💳' },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  const handleViewDetails = (patient: any) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  return (
    <DashboardLayout navItems={navItems} userName="Receptionist" userRole="Reception">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Patient Records</h1>
          <p className="text-gray-600 mt-1">Search and manage patient information</p>
        </div>

        <Card>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by name, phone, or ID number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">ID Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Gender</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient: any) => (
                  <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{patient.name}</td>
                    <td className="py-3 px-4">{patient.phone}</td>
                    <td className="py-3 px-4">{patient.idNumber}</td>
                    <td className="py-3 px-4">{patient.gender}</td>
                    <td className="py-3 px-4">
                      <Button size="sm" onClick={() => handleViewDetails(patient)}>View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Patient Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPatient.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Gender</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPatient.gender}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPatient.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">ID Number</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPatient.idNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Address</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPatient.address || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Next of Kin Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Name</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.nextOfKinName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.nextOfKinPhone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-600">Patient ID</label>
                <p className="text-xs font-mono text-gray-500">{selectedPatient.id}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
