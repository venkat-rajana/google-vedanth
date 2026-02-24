import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { authService } from '../../services/authService';
import { LogOut, User as UserIcon, Activity } from 'lucide-react';
import { Button } from '../ui/Button';

export function Navbar() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-teal-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Vedanth Clinic</span>
            </Link>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span className="font-medium">{user.name}</span>
                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium text-gray-800">
                  {user.role}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
