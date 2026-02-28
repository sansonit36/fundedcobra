import { AdminModel } from '../models/AdminModel';

export class AdminController {
  static async signIn(email: string, password: string) {
    // Validate input
    if (!email || !password) {
      return { error: new Error('Email and password are required') };
    }

    // Attempt sign in
    const { data, error } = await AdminModel.signIn(email, password);
    
    if (error) {
      return { error };
    }

    return { data, error: null };
  }

  static async createAdmin(email: string, password: string) {
    // Validate input
    if (!email || !password) {
      return { error: new Error('Email and password are required') };
    }

    // Validate password strength
    if (password.length < 6) {
      return { error: new Error('Password must be at least 6 characters') };
    }

    // Create admin account
    const { data, error } = await AdminModel.createAdmin(email, password);
    
    if (error) {
      return { error };
    }

    return { data, error: null };
  }
}