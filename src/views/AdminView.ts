import { AdminController } from '../controllers/AdminController';

export class AdminView {
  static async initialize() {
    try {
      // Create default admin account if it doesn't exist
      const { error } = await AdminController.createAdmin('admin@admin.com', 'admin');
      
      if (error) {
        // Ignore error if admin already exists
        if (!error.message.includes('already exists')) {
          console.error('Error creating admin:', error);
        }
      } else {
        console.log('Admin account created successfully');
      }
    } catch (err) {
      console.error('Error initializing admin view:', err);
    }
  }

  static async handleSignIn(email: string, password: string) {
    const { data, error } = await AdminController.signIn(email, password);
    
    if (error) {
      return { error };
    }

    return { data, error: null };
  }
}