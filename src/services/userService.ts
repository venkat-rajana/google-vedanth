import { useDbStore } from '../store/db';
import { useAuthStore } from '../store/auth';
import { Role, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const userService = {
  async getUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Unauthorized');
    
    // Admin and Staff can view all users, others can only see doctors for booking
    if (user.role === Role.Admin || user.role === Role.Staff) {
      return useDbStore.getState().users;
    } else {
      return useDbStore.getState().users.filter(u => u.role === Role.Doctor);
    }
  },

  async addUser(data: Omit<User, 'id' | 'createdAt' | 'isActive'>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const state = useDbStore.getState();
    const currentUser = useAuthStore.getState().user;
    
    if (!currentUser || (currentUser.role !== Role.Admin && currentUser.role !== Role.Staff)) {
      throw new Error('Unauthorized');
    }

    // Staff can only add Patients
    if (currentUser.role === Role.Staff && data.role !== Role.Patient) {
      throw new Error('Staff can only add patients');
    }

    if (state.users.some(u => u.email === data.email)) {
      throw new Error('Email already in use');
    }

    if (data.aadharNumber && state.users.some(u => u.aadharNumber === data.aadharNumber)) {
      throw new Error('A patient with this Aadhar number already exists');
    }

    const newUser: User = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    state.setUsers([...state.users, newUser]);
    
    state.addAuditLog({
      userId: currentUser.id,
      action: 'ADD_USER',
      targetId: newUser.id,
      targetType: 'User',
      ipNote: '127.0.0.1'
    });

    return newUser;
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = useDbStore.getState();
    const currentUser = useAuthStore.getState().user;
    
    if (!currentUser || (currentUser.role !== Role.Admin && currentUser.role !== Role.Staff)) {
      throw new Error('Unauthorized');
    }

    const userIndex = state.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');

    const targetUser = state.users[userIndex];

    // Staff can only update Patients
    if (currentUser.role === Role.Staff && targetUser.role !== Role.Patient) {
      throw new Error('Staff can only update patients');
    }

    if (data.email && data.email !== targetUser.email && state.users.some(u => u.email === data.email)) {
      throw new Error('Email already in use');
    }

    if (data.aadharNumber && data.aadharNumber !== targetUser.aadharNumber && state.users.some(u => u.aadharNumber === data.aadharNumber)) {
      throw new Error('A patient with this Aadhar number already exists');
    }

    const updatedUser = { ...targetUser, ...data };
    const updatedUsers = [...state.users];
    updatedUsers[userIndex] = updatedUser;
    
    state.setUsers(updatedUsers);

    state.addAuditLog({
      userId: currentUser.id,
      action: 'UPDATE_USER',
      targetId: id,
      targetType: 'User',
      ipNote: '127.0.0.1'
    });

    return updatedUser;
  },

  async deactivateUser(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = useDbStore.getState();
    const currentUser = useAuthStore.getState().user;
    
    if (!currentUser || currentUser.role !== Role.Admin) {
      throw new Error('Unauthorized');
    }

    const userIndex = state.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');

    const updatedUsers = [...state.users];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], isActive: false };
    
    state.setUsers(updatedUsers);

    state.addAuditLog({
      userId: currentUser.id,
      action: 'DEACTIVATE_USER',
      targetId: id,
      targetType: 'User',
      ipNote: '127.0.0.1'
    });
  }
};
