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
                      <Button size="sm">View History</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
