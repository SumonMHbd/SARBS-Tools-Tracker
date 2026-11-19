
export enum ToolStatus {
  AVAILABLE = 'Available',
  IN_USE = 'In Use',
  MAINTENANCE = 'Maintenance',
  BROKEN = 'Broken',
  LOST = 'Lost',
  RETURNED = 'Returned'
}

export type UserRole = 'super_admin' | 'dept_admin' | 'employee';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  passwordRequest?: string;
  // Employee Details
  designation?: string;
  department: string; // Required for filtering logic
  teamLeader?: string;
  typeOfEmployee?: 'Running' | 'Resigned' | 'Discontinue';
  avatar?: string;
}

// Represents a Catalog Item
export interface ToolDefinition {
  name: string;
  brand?: string;
  department?: string;
  purchasePrice?: number;
}

// Represents an Inventory Item Summary
export interface Tool {
  name: string;
  purchase?: number;
  distributed?: number;
  returned?: number;
  faulty?: number;
  damage?: number;
  lost?: number;
  stockNow?: number;
  remarks?: string;
  [key: string]: any;
}

export type EntryType = 'Distribute' | 'Return' | 'Faulty Return' | 'Damage' | 'Lost' | 'Stock IN';

// Represents a row in the "Daily Entry" sheet
export interface Transaction {
  id: string; 
  date: string;
  employeeId?: string;
  employeeName?: string;
  designation?: string;
  department?: string;
  typeOfEmployee?: string;
  toolName: string;
  entryType: EntryType;
  quantity: number;
  condition: 'New' | 'Used';
  remarks?: string;
}

/**
 * Interface for AI Chat Messages
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
