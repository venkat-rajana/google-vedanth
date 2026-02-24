import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useDbStore } from '../store/db';
import { Appointment, User, Role, AppointmentStatus } from '../types';
import { userService } from '../services/userService';
import { appointmentService } from '../services/appointmentService';
import { exportService } from '../services/exportService';
import { Users, Calendar, Download, Upload, Activity, TrendingUp, UserPlus, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { AuditLogViewer } from '../components/feature/AuditLogViewer';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: Role.Doctor,
    specialization: ''
  });

  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    aadharNumber: '',
    specialization: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedUsers, fetchedAppointments] = await Promise.all([
          userService.getUsers(),
          appointmentService.getAppointments()
        ]);
        setUsers(fetchedUsers);
        setAppointments(fetchedAppointments);
      } catch (error) {
        toast('Failed to load dashboard data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleExportCSV = async () => {
    try {
      await exportService.exportAppointmentsCSV();
      toast('Appointments exported successfully', 'success');
    } catch (error) {
      toast('Failed to export appointments', 'error');
    }
  };

  const handleExportJSON = async () => {
    try {
      await exportService.exportFullBackupJSON();
      toast('Full backup exported successfully', 'success');
    } catch (error) {
      toast('Failed to export backup', 'error');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const addedUser = await userService.addUser(newUser);
      setUsers(prev => [...prev, addedUser]);
      setIsAddUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: Role.Doctor, specialization: '' });
      toast('User added successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to add user', 'error');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await userService.deactivateUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: false } : u));
      toast('User deactivated', 'success');
    } catch (error) {
      toast('Failed to deactivate user', 'error');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      aadharNumber: user.aadharNumber || '',
      specialization: user.specialization || ''
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updatedUser = await userService.updateUser(editingUser.id, editUserData);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      toast('User updated successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to update user', 'error');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === today);
  const completedToday = todayAppointments.filter(a => a.status === AppointmentStatus.Completed).length;
  const activePatients = users.filter(u => u.role === Role.Patient && u.isActive).length;
  const activeDoctors = users.filter(u => u.role === Role.Doctor && u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Overview and management of clinic operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Backup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{todayAppointments.length}</h3>
              </div>
              <div className="bg-teal-100 p-3 rounded-xl">
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> {completedToday}</span>
              <span className="text-gray-500 ml-2">completed</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Patients</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{activePatients}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Doctors</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{activeDoctors}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Staff & Doctors</CardTitle>
              <CardDescription>Manage clinic personnel</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddUserModalOpen(true)} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add User
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.filter(u => u.role === Role.Doctor || u.role === Role.Staff).map(u => (
                    <tr key={u.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === Role.Doctor ? 'info' : 'secondary'}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 mr-2">
                          Edit
                        </Button>
                        {u.isActive && u.id !== user?.id && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Patients</CardTitle>
              <CardDescription>Manage patient records</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.filter(u => u.role === Role.Patient).map(u => (
                    <tr key={u.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 mr-2">
                          Edit
                        </Button>
                        {u.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AuditLogViewer />

      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title="Add New User">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value={Role.Doctor}>Doctor</option>
              <option value={Role.Staff}>Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <Input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          </div>
          {newUser.role === Role.Doctor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <Input required value={newUser.specialization} onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })} />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add User</Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Edit User">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input required value={editUserData.name} onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input type="email" required value={editUserData.email} onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input type="tel" value={editUserData.phone} onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <Input type="text" value={editUserData.address} onChange={(e) => setEditUserData({ ...editUserData, address: e.target.value })} />
          </div>
          {editingUser?.role === Role.Patient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
              <Input type="text" value={editUserData.aadharNumber} onChange={(e) => setEditUserData({ ...editUserData, aadharNumber: e.target.value })} />
            </div>
          )}
          {editingUser?.role === Role.Doctor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <Input required value={editUserData.specialization} onChange={(e) => setEditUserData({ ...editUserData, specialization: e.target.value })} />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditUserModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
