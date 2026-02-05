'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Badge, Button } from '@/components/UI/Card';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Staff Management', href: '/admin/staff', icon: '👥' },
  { label: 'Reports', href: '/admin/reports', icon: '📈' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export default function StaffManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'RECEPTIONIST',
    password: '',
    confirmPassword: '',
  });

  const roles = [
    { value: 'RECEPTIONIST', label: 'Receptionist' },
    { value: 'DOCTOR', label: 'Doctor' },
    { value: 'LAB_TECH', label: 'Lab Technician' },
    { value: 'PHARMACIST', label: 'Pharmacist' },
    { value: 'WARD_CLERK', label: 'Ward Clerk' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      const { confirmPassword, ...dataToSubmit } = formData;
      await apiClient.post('/users', dataToSubmit);
      setShowAddUserModal(false);
      setFormData({ name: '', email: '', phone: '', role: 'RECEPTIONIST', password: '', confirmPassword: '' });
      setShowPassword(false);
      setShowConfirmPassword(false);
      fetchUsers();
      toast.success('✅ Staff member created successfully!');
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/users/${userId}`, { isActive: !isActive });
      fetchUsers();
      toast.success(isActive ? 'Staff member deactivated' : 'Staff member activated');
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update staff member');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newPassword) {
      toast.error('Password is required');
      return;
    }

    try {
      await apiClient.patch(`/users/${selectedUserId}`, { password: newPassword });
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSelectedUserId(null);
      fetchUsers();
      toast.success('✅ Password reset successfully!');
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      try {
        await apiClient.delete(`/users/${userId}`);
        fetchUsers();
        toast.success('Staff member removed');
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Failed to delete staff member');
      }
    }
  };

  const getRoleBadgeVariant = (role: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
      ADMIN: 'danger',
      DOCTOR: 'primary',
      RECEPTIONIST: 'info',
      LAB_TECH: 'warning',
      PHARMACIST: 'success',
      WARD_CLERK: 'primary',
    };
    return variants[role] || 'info';
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || (filterStatus === 'ACTIVE' ? user.isActive : !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <DashboardLayout navItems={navItems} userName="Admin" userRole="Administrator">
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-600">Staff Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage hospital staff members and their roles</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Total Staff</p>
                <p className="text-xl md:text-3xl font-bold text-blue-600">{users.length}</p>
              </div>
              <span className="text-2xl md:text-4xl flex-shrink-0">👥</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Active</p>
                <p className="text-xl md:text-3xl font-bold text-green-600">{users.filter((u) => u.isActive).length}</p>
              </div>
              <span className="text-2xl md:text-4xl flex-shrink-0">✅</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Doctors</p>
                <p className="text-xl md:text-3xl font-bold text-purple-600">{users.filter((u) => u.role === 'DOCTOR').length}</p>
              </div>
              <span className="text-2xl md:text-4xl flex-shrink-0">👨‍⚕️</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Support</p>
                <p className="text-xl md:text-3xl font-bold text-orange-600">
                  {users.filter((u) => ['RECEPTIONIST', 'LAB_TECH', 'PHARMACIST', 'WARD_CLERK'].includes(u.role)).length}
                </p>
              </div>
              <span className="text-2xl md:text-4xl flex-shrink-0">🏥</span>
            </div>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card>
          <div className="flex flex-col gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-2 md:px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-2 md:px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 md:invisible">Add Staff</label>
                <Button 
                  onClick={() => setShowAddUserModal(true)} 
                  className="w-full h-10 md:h-auto text-xs md:text-sm"
                >
                  + Add Staff
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Staff Table */}
        <Card title={`Staff Members (${filteredUsers.length})`}>
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 hidden lg:table-cell">Phone</th>
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 hidden sm:table-cell">Password</th>
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 hidden md:table-cell">Status</th>
                  <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      Loading staff members...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 md:px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs md:text-sm font-medium">{user.name.charAt(0)}</span>
                          </div>
                          <span className="font-medium text-gray-900 truncate">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 md:px-4 text-gray-600 hidden md:table-cell truncate text-xs md:text-sm">{user.email}</td>
                      <td className="py-3 px-3 md:px-4 text-gray-600 hidden lg:table-cell text-xs md:text-sm">{user.phone}</td>
                      <td className="py-3 px-3 md:px-4">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          <span className="text-xs md:text-sm">{user.role.replace('_', ' ')}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-3 md:px-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 truncate">
                            🔒 Secured
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 md:px-4 hidden md:table-cell">
                        <Badge variant={user.isActive ? 'success' : 'danger'}>
                          <span className="text-xs md:text-sm">{user.isActive ? 'Active' : 'Inactive'}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowResetPasswordModal(true);
                            }}
                            className="px-2 py-1 text-xs md:text-sm bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                          >
                            🔑
                          </button>
                          <Button
                            variant={user.isActive ? 'danger' : 'success'}
                            size="sm"
                            onClick={() => handleToggleActive(user.id, user.isActive)}
                            className="text-xs md:text-sm px-2 py-1"
                          >
                            {user.isActive ? 'Off' : 'On'}
                          </Button>
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Add New Staff Member</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@hms.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+254 712 345 678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Staff Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">🔑 Reset Password</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4">Set a new password for this staff member</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showResetPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setNewPassword('');
                    setSelectedUserId(null);
                    setShowResetPassword(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
