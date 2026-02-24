import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useAuthStore } from '../../store/auth';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';
import { AIAssistant } from '../feature/AIAssistant';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes

export function Layout() {
  const { user, lastActiveAt, updateActivity } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const checkSession = setInterval(() => {
      const now = Date.now();
      const timeElapsed = now - lastActiveAt;

      if (timeElapsed > SESSION_TIMEOUT) {
        authService.logout();
        toast('Your session has expired for security reasons.', 'error');
        navigate('/login');
      } else if (timeElapsed > SESSION_TIMEOUT - WARNING_TIME && timeElapsed < SESSION_TIMEOUT - WARNING_TIME + 1000) {
        toast('Your session will expire in 5 minutes due to inactivity.', 'warning');
      }
    }, 1000);

    return () => clearInterval(checkSession);
  }, [user, lastActiveAt, navigate, toast]);

  useEffect(() => {
    if (user) {
      updateActivity();
    }
  }, [location.pathname, updateActivity, user]);

  const handleActivity = () => {
    if (user) {
      updateActivity();
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-gray-50"
      onMouseMove={handleActivity}
      onKeyDown={handleActivity}
      onClick={handleActivity}
    >
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
      {user && <AIAssistant />}
    </div>
  );
}
