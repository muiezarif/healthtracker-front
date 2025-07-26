import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PatientDashboard from '@/views/PatientDashboard';
import ProviderPortal from '@/views/ProviderPortal';
import AdminPortal from '@/views/AdminPortal';
import Home from '@/views/Home';
import Login from '@/views/Login';
import SignUp from '@/views/SignUp';
import PatientSymptomTracker from '@/views/PatientSymptomTracker';
import { motion } from 'framer-motion';
import ManageUsers from '@/views/admin/ManageUsers';
import SystemSettings from '@/views/admin/SystemSettings';
import AddUser from '@/views/admin/AddUser';

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  console.log("RoleBasedRedirect user:", user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-t-emerald-500 border-slate-200 rounded-full"
        />
      </div>
    );
  }
  
  if (user?.role === 'provider') {
    return <Navigate to="/provider" replace />;
  }
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/patient" replace />;
};

const PrivateRoute = ({ allowedRoles }) => {
  const { user, loading, token } = useAuth();
  console.log("PrivateRoute user:", user);
  console.log("PrivateRoute user token:", token);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-t-emerald-500 border-slate-200 rounded-full"
        />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

function App() {
  const { token } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={token ? <RoleBasedRedirect /> : <Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route element={<PrivateRoute allowedRoles={['patient', 'provider', 'admin']} />}>
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/patient/tracker" element={<PatientSymptomTracker />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={['provider', 'admin']} />}>
          <Route path="/provider" element={<ProviderPortal />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/users/add" element={<AddUser />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;