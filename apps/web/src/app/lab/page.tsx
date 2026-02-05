'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface LabOrder {
  id: string;
  visit: {
    id: string;
    patient: {
      id: string;
      name: string;
      phone: string;
    };
  };
  tests: string[];
  status: string;
  createdAt: string;
}

interface LabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'NORMAL' | 'HIGH' | 'LOW';
}

const navItems = [
  { label: 'Dashboard', href: '/lab', icon: '🔬' },
  { label: 'Lab Queue', href: '/lab/queue', icon: '📋' },
  { label: 'Result Entry', href: '/lab/results', icon: '📝' },
  { label: 'Reports', href: '/lab/reports', icon: '📈' },
];

export default function LabTechPage() {
  const [labQueue, setLabQueue] = useState<LabOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [results, setResults] = useState<LabResult[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetchLabQueue();
  }, []);

  const fetchLabQueue = async () => {
    try {
      const response = await apiClient.get('/lab/orders?status=ORDERED,SAMPLE_TAKEN');
      setLabQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch lab queue:', error);
    }
  };

  const handleCaptureSample = async (orderId: string) => {
    try {
      await apiClient.patch(`/lab/orders/${orderId}`, { status: 'SAMPLE_TAKEN' });
      fetchLabQueue();
      toast.success('✅ Sample captured successfully!');
    } catch (error) {
      console.error('Failed to capture sample:', error);
      toast.error('❌ Failed to capture sample');
    }
  };

  const handleEnterResults = (order: LabOrder) => {
    setSelectedOrder(order);
    // Initialize result fields based on tests
    const initialResults: LabResult[] = order.tests.map((test) => ({
      testName: test,
      value: '',
      unit: '',
      referenceRange: '',
      status: 'NORMAL',
    }));
    setResults(initialResults);
    setShowResultForm(true);
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const formData = new FormData();
      formData.append('labOrderId', selectedOrder.id);
      formData.append('results', JSON.stringify(results));
      
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      await apiClient.post('/lab/results', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update order status to RESULTS_READY
      await apiClient.patch(`/lab/orders/${selectedOrder.id}`, { status: 'RESULTS_READY' });

      setShowResultForm(false);
      setSelectedOrder(null);
      setResults([]);
      setAttachments([]);
      fetchLabQueue();
      toast.success('✅ Results submitted successfully!');
    } catch (error) {
      console.error('Failed to submit results:', error);
      toast.error('❌ Failed to submit results');
    }
  };

  const updateResult = (index: number, field: keyof LabResult, value: string) => {
    const newResults = [...results];
    newResults[index] = { ...newResults[index], [field]: value };
    setResults(newResults);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const testCategories = [
    {
      name: 'Blood Tests',
      tests: [
        { name: 'CBC', status: 'Pending', color: 'blue' },
        { name: 'Lipid Profile', status: 'Done', color: 'green' },
      ],
    },
    {
      name: 'Urine Tests',
      tests: [{ name: 'Urinalysis', status: 'In Test', color: 'yellow' }],
    },
    {
      name: 'Imaging',
      tests: [{ name: 'X-Ray', status: 'Pending', color: 'blue' }],
    },
    {
      name: 'Microbiology',
      tests: [{ name: 'Culture', status: 'In Test', color: 'yellow' }],
    },
  ];

  return (
    <DashboardLayout navItems={navItems} userName="Lab Tech, John D." userRole="Laboratory Technician">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Welcome, Lab Tech.</h1>
          <p className="text-gray-600 mt-1">Laboratory sample processing and result entry</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Sample</p>
                <p className="text-3xl font-bold text-blue-600">
                  {labQueue.filter((o) => o.status === 'ORDERED').length}
                </p>
              </div>
              <span className="text-3xl">🧪</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Test</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {labQueue.filter((o) => o.status === 'SAMPLE_TAKEN').length}
                </p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Done</p>
                <p className="text-3xl font-bold text-green-600">
                  {labQueue.filter((o) => o.status === 'RESULTS_READY').length}
                </p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Today</p>
                <p className="text-3xl font-bold text-purple-600">{labQueue.length}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lab Queue */}
          <div className="lg:col-span-2">
            <Card
              title="Lab Queue"
              action={
                <Button size="sm" variant="secondary">
                  + Capture Sample
                </Button>
              }
            >
              <div className="space-y-4">
                {labQueue.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No lab orders in queue</div>
                ) : (
                  labQueue.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{order.visit.patient.name}</p>
                              <p className="text-sm text-gray-600">{order.visit.patient.phone}</p>
                            </div>
                            <Badge
                              variant={
                                order.status === 'ORDERED'
                                  ? 'primary'
                                  : order.status === 'SAMPLE_TAKEN'
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Test Type</p>
                            <p className="text-sm text-gray-600">{order.tests.join(', ')}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Requested: {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'ORDERED' && (
                            <Button size="sm" onClick={() => handleCaptureSample(order.id)}>
                              + Capture Sample
                            </Button>
                          )}
                          {order.status === 'SAMPLE_TAKEN' && (
                            <>
                              <Button size="sm" onClick={() => handleEnterResults(order)}>
                                Enter Results
                              </Button>
                              <Button size="sm" variant="secondary">
                                Send to Doctor
                              </Button>
                            </>
                          )}
                          {order.status === 'RESULTS_READY' && (
                            <Badge variant="success">Done</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Test Categories Panel */}
          <div>
            <Card title="Test Categories Panel">
              <div className="space-y-4">
                {testCategories.map((category) => (
                  <div key={category.name}>
                    <h4 className="font-semibold text-gray-900 mb-2">{category.name}</h4>
                    <div className="space-y-2">
                      {category.tests.map((test) => (
                        <div key={test.name} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{test.name}</span>
                          <Badge
                            variant={
                              test.color === 'blue'
                                ? 'primary'
                                : test.color === 'yellow'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {test.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Result Entry Modal */}
      {showResultForm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Result Entry</h2>

            {/* Patient Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Test Name</p>
                  <p className="font-semibold text-blue-900">{selectedOrder.tests.join(', ')}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Sample ID</p>
                  <p className="font-semibold text-blue-900">#{selectedOrder.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Patient Name</p>
                  <p className="font-semibold text-blue-900">{selectedOrder.visit.patient.name}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitResults} className="space-y-6">
              {/* Result Fields */}
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{result.testName}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fasting Blood Sugar
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Value"
                          value={result.value}
                          onChange={(e) => updateResult(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="mg/dL"
                          value={result.unit}
                          onChange={(e) => updateResult(index, 'unit', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">(70 - 99 mg/dL)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={result.status}
                        onChange={(e) => updateResult(index, 'status', e.target.value as 'NORMAL' | 'HIGH' | 'LOW')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Range
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 70-99 mg/dL"
                        value={result.referenceRange}
                        onChange={(e) => updateResult(index, 'referenceRange', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    {result.status === 'HIGH' && (
                      <div className="col-span-2">
                        <Badge variant="danger">HIGH</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments Upload
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-2">📎</span>
                      <span className="text-sm text-gray-600">Click to upload files</span>
                    </div>
                  </label>
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="text-sm text-gray-700">
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowResultForm(false);
                    setSelectedOrder(null);
                    setResults([]);
                  }}
                >
                  Save Draft
                </Button>
                <Button type="submit" className="flex-1">
                  Submit Results
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
