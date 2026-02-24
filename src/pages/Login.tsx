import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/auth';
import { Role } from '../types';
import { Activity, Lock, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();

  React.useEffect(() => {
    if (user) {
      redirectUser(user.role);
    }
  }, [user]);

  const redirectUser = (role: Role) => {
    const from = (location.state as any)?.from?.pathname || '/';
    if (from !== '/') {
      navigate(from, { replace: true });
      return;
    }

    switch (role) {
      case Role.Admin: navigate('/admin'); break;
      case Role.Doctor: navigate('/doctor'); break;
      case Role.Staff: navigate('/staff'); break;
      case Role.Patient: navigate('/patient'); break;
      default: navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      toast(`Welcome back, ${loggedInUser.name}`, 'success');
      redirectUser(loggedInUser.role);
    } catch (error: any) {
      toast(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (role: Role) => {
    switch (role) {
      case Role.Admin: setEmail('admin@vedanth.com'); setPassword('Admin@123'); break;
      case Role.Doctor: setEmail('doctor@vedanth.com'); setPassword('Doctor@123'); break;
      case Role.Staff: setEmail('staff@vedanth.com'); setPassword('Staff@123'); break;
      case Role.Patient: setEmail('patient@vedanth.com'); setPassword('Patient@123'); break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Activity className="h-10 w-10 text-white transform rotate-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            Vedanth Clinic
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center py-3"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Demo Accounts</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" onClick={() => fillDemoCredentials(Role.Admin)} className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border-gray-300">
              Admin
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemoCredentials(Role.Doctor)} className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border-gray-300">
              Doctor
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemoCredentials(Role.Staff)} className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border-gray-300">
              Staff
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemoCredentials(Role.Patient)} className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border-gray-300">
              Patient
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New patient?{' '}
            <Link to="/register" className="font-medium text-teal-600 hover:text-teal-500">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
