'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
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
  findings?: string;
  remarks?: string;
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
      const response = await apiClient.get('/lab/queue');
      setLabQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch lab queue:', error);
    }
  };

  const handleCaptureSample = async (orderId: string) => {
    try {
      await apiClient.patch(`/lab/orders/${orderId}/status`, { status: 'SAMPLE_TAKEN' });
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
    const initialResults: LabResult[] = order.tests?.map((test) => ({
      testName: test || 'Unknown Test',
      value: '',
      unit: '',
      referenceRange: '',
      status: 'NORMAL',
      findings: '',
      remarks: '',
    })) || [];
    setResults(initialResults);
    setShowResultForm(true);
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Validate that all tests have names
    const hasEmptyTestNames = results.some(r => !r.testName || r.testName.trim() === '');
    if (hasEmptyTestNames) {
      toast.error('❌ Test names cannot be empty');
      return;
    }

    // Validate that all tests have values
    const hasEmptyValues = results.some(r => !r.value || r.value.trim() === '');
    if (hasEmptyValues) {
      toast.error('❌ Please enter values for all tests');
      return;
    }

    try {
      // Clean up results - remove empty optional fields
      const cleanedResults = results.map(result => ({
        testName: result.testName,
        value: result.value,
        unit: result.unit?.trim() || undefined,
        referenceRange: result.referenceRange?.trim() || undefined,
        status: result.status,
        findings: result.findings?.trim() || undefined,
        remarks: result.remarks?.trim() || undefined,
      }));

      // Submit results directly (no file upload for now)
      await apiClient.post('/lab/results', {
        labOrderId: selectedOrder.id,
        results: cleanedResults,
      });

      setShowResultForm(false);
      setSelectedOrder(null);
      setResults([]);
      setAttachments([]);
      fetchLabQueue();
      toast.success('✅ Results submitted! Patient re-queued to doctor with priority.');
    } catch (error: any) {
      console.error('Failed to submit results:', error);
      const errorMsg = error.response?.data?.message || 'Failed to submit results';
      toast.error(`❌ ${errorMsg}`);
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

  // Generate dynamic test category statistics from lab queue
  const getTestCategoryStats = () => {
    const categories: Record<string, { tests: string[], counts: { pending: number, inProgress: number, done: number } }> = {
      'Blood Tests': { tests: ['CBC', 'Blood Count', 'Hemoglobin', 'Blood Sugar', 'Lipid Profile', 'Blood Culture'], counts: { pending: 0, inProgress: 0, done: 0 } },
      'Urine Tests': { tests: ['Urinalysis', 'Urine Culture', 'Urine Microscopy'], counts: { pending: 0, inProgress: 0, done: 0 } },
      'Imaging': { tests: ['X-Ray', 'CT Scan', 'Ultrasound', 'MRI'], counts: { pending: 0, inProgress: 0, done: 0 } },
      'Microbiology': { tests: ['Culture', 'Sensitivity', 'Gram Stain', 'AFB'], counts: { pending: 0, inProgress: 0, done: 0 } },
      'Chemistry': { tests: ['Liver Function', 'Kidney Function', 'Electrolytes', 'Glucose'], counts: { pending: 0, inProgress: 0, done: 0 } },
      'Serology': { tests: ['HIV', 'Hepatitis', 'Pregnancy Test', 'Malaria'], counts: { pending: 0, inProgress: 0, done: 0 } },
    };

    labQueue.forEach(order => {
      const tests = order.tests || [];
      tests.forEach(test => {
        const testLower = test.toLowerCase();
        let matched = false;

        Object.entries(categories).forEach(([categoryName, category]) => {
          if (category.tests.some(t => testLower.includes(t.toLowerCase()) || t.toLowerCase().includes(testLower))) {
            matched = true;
            if (order.status === 'ORDERED') {
              category.counts.pending++;
            } else if (order.status === 'SAMPLE_TAKEN') {
              category.counts.inProgress++;
            } else if (order.status === 'RESULTS_READY') {
              category.counts.done++;
            }
          }
        });

        // If no category matched, add to "Other Tests"
        if (!matched) {
          if (!categories['Other Tests']) {
            categories['Other Tests'] = { tests: [], counts: { pending: 0, inProgress: 0, done: 0 } };
          }
          if (order.status === 'ORDERED') {
            categories['Other Tests'].counts.pending++;
          } else if (order.status === 'SAMPLE_TAKEN') {
            categories['Other Tests'].counts.inProgress++;
          } else if (order.status === 'RESULTS_READY') {
            categories['Other Tests'].counts.done++;
          }
        }
      });
    });

    return Object.entries(categories)
      .filter(([_, data]) => data.counts.pending + data.counts.inProgress + data.counts.done > 0)
      .map(([name, data]) => ({ name, ...data }));
  };

  const testCategoryStats = getTestCategoryStats();
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout navItems={navItems} userName={user?.name || 'Lab Technician'} userRole="Laboratory Technician">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-blue-600">Welcome, {user?.name || 'Lab Technician'}</h1>
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
                            <p className="text-sm text-gray-600">{order.tests?.join(', ') || 'No tests specified'}</p>
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

          {/* Test Categories Panel - Live Statistics */}
          <div>
            <Card title="Test Categories - Live Stats">
              <div className="space-y-4">
                {testCategoryStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl block mb-2">📊</span>
                    <p className="text-sm">No tests in queue</p>
                  </div>
                ) : (
                  testCategoryStats.map((category) => (
                    <div key={category.name} className="border-b border-gray-100 pb-3 last:border-0">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-lg">
                          {category.name === 'Blood Tests' ? '🩸' : 
                           category.name === 'Urine Tests' ? '💧' :
                           category.name === 'Imaging' ? '📷' :
                           category.name === 'Microbiology' ? '🦠' :
                           category.name === 'Chemistry' ? '⚗️' :
                           category.name === 'Serology' ? '🧬' : '🔬'}
                        </span>
                        {category.name}
                      </h4>
                      <div className="space-y-2">
                        {category.counts.pending > 0 && (
                          <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded">
                            <span className="text-sm font-medium text-blue-900">Pending Sample</span>
                            <Badge variant="primary">{category.counts.pending}</Badge>
                          </div>
                        )}
                        {category.counts.inProgress > 0 && (
                          <div className="flex items-center justify-between bg-yellow-50 px-3 py-2 rounded">
                            <span className="text-sm font-medium text-yellow-900">In Test</span>
                            <Badge variant="warning">{category.counts.inProgress}</Badge>
                          </div>
                        )}
                        {category.counts.done > 0 && (
                          <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded">
                            <span className="text-sm font-medium text-green-900">Done</span>
                            <Badge variant="success">{category.counts.done}</Badge>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600">
                          Total: <span className="font-semibold text-gray-900">
                            {category.counts.pending + category.counts.inProgress + category.counts.done}
                          </span> tests
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Result Entry Modal */}
      {showResultForm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg z-10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Laboratory Result Entry Form</h2>
                <p className="text-blue-100 text-sm mt-1">Enter test results and clinical findings</p>
              </div>
              <button
                onClick={() => setShowResultForm(false)}
                className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
                type="button"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6">
              {/* Patient & Order Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 rounded-lg p-5 mb-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Patient Name</p>
                    <p className="font-bold text-gray-900 mt-1">{selectedOrder.visit.patient.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lab Order ID</p>
                    <p className="font-bold text-gray-900 mt-1 font-mono">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tests Ordered</p>
                    <p className="font-bold text-gray-900 mt-1">{selectedOrder.tests?.join(', ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Order Date</p>
                    <p className="font-bold text-gray-900 mt-1">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

            <form onSubmit={handleSubmitResults} className="space-y-6">
              {/* Result Fields */}
              {results.map((result, index) => (
                <div key={index} className="border-2 border-blue-200 rounded-xl p-6 bg-white shadow-md hover:shadow-lg transition-shadow">
                  {/* Test Header */}
                  <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                        {index + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">{result.testName}</h3>
                    </div>
                    <Badge variant={result.status === 'HIGH' ? 'danger' : result.status === 'LOW' ? 'warning' : 'success'}>
                      {result.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Test Value */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Result Value <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter value"
                          required
                          value={result.value}
                          onChange={(e) => updateResult(index, 'value', e.target.value)}
                          className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                        <input
                          type="text"
                          placeholder="Unit"
                          required
                          value={result.unit}
                          onChange={(e) => updateResult(index, 'unit', e.target.value)}
                          className="w-28 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 ml-1">💡 e.g., 85 mg/dL</p>
                    </div>

                    {/* Reference Range */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Reference Range
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 70-100 mg/dL"
                        value={result.referenceRange}
                        onChange={(e) => updateResult(index, 'referenceRange', e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1.5 ml-1">📊 Normal range for this test</p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={result.status}
                        onChange={(e) => updateResult(index, 'status', e.target.value as 'NORMAL' | 'HIGH' | 'LOW')}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold bg-white"
                      >
                        <option value="NORMAL">✅ Normal</option>
                        <option value="HIGH">⚠️ High (Above Range)</option>
                        <option value="LOW">⚠️ Low (Below Range)</option>
                      </select>
                    </div>

                    {/* Findings */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🔬 Laboratory Findings
                      </label>
                      <textarea
                        placeholder="Describe test findings, observations, morphology..."
                        value={result.findings || ''}
                        onChange={(e) => updateResult(index, 'findings', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1.5 ml-1">📝 Detailed observations from the test</p>
                    </div>

                    {/* Remarks */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        💬 Clinical Remarks / Comments
                      </label>
                      <textarea
                        placeholder="Additional notes, recommendations, clinical significance..."
                        value={result.remarks || ''}
                        onChange={(e) => updateResult(index, 'remarks', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1.5 ml-1">💡 Recommendations or correlations</p>
                    </div>
                  </div>

                  {/* Alert for abnormal results */}
                  {(result.status === 'HIGH' || result.status === 'LOW') && (
                    <div className={`mt-5 p-4 rounded-lg border-2 ${
                      result.status === 'HIGH' 
                        ? 'bg-red-50 border-red-300' 
                        : 'bg-yellow-50 border-yellow-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {result.status === 'HIGH' ? '🚨' : '⚠️'}
                        </span>
                        <div>
                          <p className={`text-sm font-bold mb-1 ${
                            result.status === 'HIGH' ? 'text-red-900' : 'text-yellow-900'
                          }`}>
                            {result.status} Result Detected
                          </p>
                          <p className={`text-xs ${
                            result.status === 'HIGH' ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            Please ensure findings and clinical remarks are thoroughly documented for this abnormal result.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Attachments */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attachments <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-6 text-center bg-gray-50 hover:bg-blue-50 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <span className="text-5xl mb-2">📎</span>
                      <span className="text-sm font-medium text-gray-700">Click to upload files</span>
                      <span className="text-xs text-gray-500 mt-1">Images, PDFs, or documents</span>
                    </div>
                  </label>
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                          <span>📄</span>
                          <span className="font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 mt-8 rounded-b-lg flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowResultForm(false);
                    setSelectedOrder(null);
                    setResults([]);
                  }}
                  className="flex-1"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span>💾</span>
                    Save Draft
                  </span>
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <span className="flex items-center justify-center gap-2">
                    <span>✓</span>
                    Submit Results
                  </span>
                </Button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
