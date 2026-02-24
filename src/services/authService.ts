import { useDbStore } from '../store/db';
import { useAuthStore } from '../store/auth';
import { Role, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const authService = {
  async login(email: string, password?: string): Promise<User> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const users = useDbStore.getState().users;
    const user = users.find(u => u.email === email && u.isActive);
    
    if (!user) {
      throw new Error('Invalid credentials or inactive account');
    }
    
    // In a real app, verify password here
    if (password && user.password !== password) {
      throw new Error('Invalid credentials');
    }

    useAuthStore.getState().login(user);
    
    useDbStore.getState().addAuditLog({
      userId: user.id,
      action: 'LOGIN',
      targetId: user.id,
      targetType: 'User',
      ipNote: '127.0.0.1'
    });

    return user;
  },

  async registerPatient(data: Omit<User, 'id' | 'role' | 'createdAt' | 'isActive'>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const state = useDbStore.getState();
    if (state.users.some(u => u.email === data.email)) {
      throw new Error('Email already in use');
    }
    if (data.aadharNumber && state.users.some(u => u.aadharNumber === data.aadharNumber)) {
      throw new Error('A patient with this Aadhar number already exists');
    }

    const newUser: User = {
      ...data,
      id: uuidv4(),
      role: Role.Patient,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    state.setUsers([...state.users, newUser]);
    
    state.addAuditLog({
      userId: newUser.id,
      action: 'REGISTER',
      targetId: newUser.id,
      targetType: 'User',
      ipNote: '127.0.0.1'
    });

    return newUser;
  },

  logout() {
    const user = useAuthStore.getState().user;
    if (user) {
      useDbStore.getState().addAuditLog({
        userId: user.id,
        action: 'LOGOUT',
        targetId: user.id,
        targetType: 'User',
        ipNote: '127.0.0.1'
      });
    }
    useAuthStore.getState().logout();
  }
};
