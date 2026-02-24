import { useDbStore } from '../store/db';
import { useAuthStore } from '../store/auth';
import { Role, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const userService = {
  async getUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Unauthorized');
    
    // Only Admin can view all users, others can only see doctors for booking
    if (user.role === Role.Admin) {
      return useDbStore.getState().users;
    } else {
      return useDbStore.getState().users.filter(u => u.role === Role.Doctor);
    }
  },

  async addUser(data: Omit<User, 'id' | 'createdAt' | 'isActive'>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const state = useDbStore.getState();
    const currentUser = useAuthStore.getState().user;
    
    if (!currentUser || currentUser.role !== Role.Admin) {
      throw new Error('Unauthorized');
    }

    if (state.users.some(u => u.email === data.email)) {
      throw new Error('Email already in use');
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
