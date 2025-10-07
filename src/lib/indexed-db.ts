// IndexedDB for better local storage (unlimited size)
import Dexie, { type Table } from 'dexie';

export interface IRevenue {
  id?: string;
  date: string;
  branch: string;
  totalRevenue: number;
  cash: number;
  card: number;
  distribution: any[];
  status: string;
  discrepancyReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpense {
  id?: string;
  date: string;
  branch: string;
  category: string;
  amount: number;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GasahDatabase extends Dexie {
  revenue!: Table<IRevenue>;
  expenses!: Table<IExpense>;
  users!: Table<IUser>;

  constructor() {
    super('GasahDB');
    
    this.version(1).stores({
      revenue: '++id, date, branch, status, createdBy',
      expenses: '++id, date, branch, category, createdBy',
      users: 'id, uid, email, role, branch'
    });
  }

  // Export all data for backup
  async exportData() {
    const revenue = await this.revenue.toArray();
    const expenses = await this.expenses.toArray();
    const users = await this.users.toArray();
    
    return {
      revenue,
      expenses,
      users,
      exportDate: new Date().toISOString()
    };
  }

  // Import data from backup
  async importData(data: any) {
    await this.transaction('rw', this.revenue, this.expenses, this.users, async () => {
      if (data.revenue) {
        await this.revenue.clear();
        await this.revenue.bulkAdd(data.revenue);
      }
      if (data.expenses) {
        await this.expenses.clear();
        await this.expenses.bulkAdd(data.expenses);
      }
      if (data.users) {
        await this.users.clear();
        await this.users.bulkAdd(data.users);
      }
    });
  }

  // Sync with remote database (when available)
  async syncWithRemote(apiUrl: string, token: string) {
    try {
      // Get local data
      const localData = await this.exportData();
      
      // Send to remote
      const response = await fetch(`${apiUrl}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localData)
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      const remoteData = await response.json();
      
      // Merge remote data
      await this.importData(remoteData);
      
      return { success: true };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error };
    }
  }
}

// Create database instance
export const db = new GasahDatabase();