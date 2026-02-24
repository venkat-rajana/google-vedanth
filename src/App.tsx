import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { PrivateRoute } from './components/layout/PrivateRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { PatientDashboard } from './pages/PatientDashboard';
import { Role } from './types';
import { JoinBanner } from './components/feature/JoinBanner';

function App() {
  return (
    <>
      <JoinBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/login" replace />} />
          
          <Route path="admin" element={
            <PrivateRoute allowedRoles={[Role.Admin]}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          <Route path="doctor" element={
            <PrivateRoute allowedRoles={[Role.Doctor]}>
              <DoctorDashboard />
            </PrivateRoute>
          } />
          
          <Route path="staff" element={
            <PrivateRoute allowedRoles={[Role.Staff]}>
              <StaffDashboard />
            </PrivateRoute>
          } />
          
          <Route path="patient" element={
            <PrivateRoute allowedRoles={[Role.Patient]}>
              <PatientDashboard />
            </PrivateRoute>
          } />
          
          <Route path="unauthorized" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">403 - Unauthorized</h1>
              <p className="text-gray-600">You do not have permission to access this page.</p>
            </div>
          } />
          
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Not Found</h1>
              <p className="text-gray-600">The page you are looking for does not exist.</p>
            </div>
          } />
        </Route>
      </Routes>
    </>
  );
}

export default App;
