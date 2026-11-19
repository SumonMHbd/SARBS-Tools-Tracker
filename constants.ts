
import { User, ToolDefinition, Transaction } from './types';

export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw-m7LY1VoIqlo1U4mIbhRBTy259z-ixlLAyv8J_sn29V5SPTJYU36EQe5FHbm8LdZt/exec'; 

// Official Company Logo - Using a CORS-friendly host for PDF generation support
export const LOGO_URL = 'https://sarbs.net/frontend/img/logo.png';

// Fallback users for initial setup and offline resilience. 
// Production credentials can also be managed in the "Admins" tab of your Google Sheet.
export const USERS: User[] = [
  {
    id: 'ADMIN',
    name: 'SARBS Administrator',
    role: 'super_admin',
    password: 'admin',
    department: 'Global (All)',
    typeOfEmployee: 'Running'
  },
  {
    id: 'MHSUMON',
    name: 'MH Sumon (Administrator)',
    role: 'super_admin',
    password: 'admin',
    department: 'Global (All)',
    typeOfEmployee: 'Running'
  },
  {
    id: 'RESCUE',
    name: 'Rescue Account',
    role: 'employee', 
    password: '12345',
    department: 'IT',
    typeOfEmployee: 'Running'
  },
  {
    id: 'EMP-01',
    name: 'SARBS Staff Member',
    role: 'employee', 
    password: '12345',
    department: 'Operations',
    typeOfEmployee: 'Running'
  }
];

export const TOOL_CATALOG: ToolDefinition[] = [
  { name: 'Adjustable wrench 6"', purchasePrice: 250 },
  { name: 'Adjustable wrench 8"', purchasePrice: 260 },
  { name: 'Adjustable wrench 10"', purchasePrice: 350 },
  { name: 'Adjustable wrench 12"', purchasePrice: 480 },
  { name: 'Adjustable wrench 15"', purchasePrice: 600 },
  { name: 'Cable Cutter (Small)', purchasePrice: 550 },
  { name: 'Cable Cutter (Medium)', purchasePrice: 850 },
  { name: 'Cable Cutter (Big)', purchasePrice: 1200 },
  { name: 'Center Punch', purchasePrice: 150 },
  { name: 'Charger Light', purchasePrice: 450 },
  { name: 'Clipon Meter', purchasePrice: 12500 },
  { name: 'Compass', purchasePrice: 550 },
  { name: 'Crane Scale', purchasePrice: 3500 },
  { name: 'Dally 6"', purchasePrice: 80 },
  { name: 'Dally 8"', purchasePrice: 120 },
  { name: 'Dally 9"', purchasePrice: 110 },
  { name: 'Dally 10"', purchasePrice: 150 },
  { name: 'Dally 12"', purchasePrice: 150 },
  { name: 'Hammer (Iron)', purchasePrice: 300 },
  { name: 'Hot Air gun', purchasePrice: 1500 },
  { name: 'Hand Puncher (Normal)', purchasePrice: 450 },
  { name: 'File(Flat)', purchasePrice: 120 }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
