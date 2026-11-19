
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  LogOut, Search, Plus, FileSpreadsheet, Users, Package, RefreshCw, 
  ShieldCheck, ChevronRight, ChevronLeft, Edit2, UserPlus, Trash2, 
  History, Wrench, X, FileDown, Filter, Edit
} from 'lucide-react';
import { User, Transaction, ToolDefinition } from './types';
import ToolModal from './components/ToolModal';
import AdminModal from './components/AdminModal';
import EmployeeModal from './components/EmployeeModal';
import ToolCatalogModal from './components/ToolCatalogModal';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AIChat from './components/AIChat';
import { LOGO_URL, USERS, TOOL_CATALOG } from './constants';
import { 
  fetchSheetData, saveTransactionToSheet, saveAdminToSheet, deleteAdminFromSheet, 
  saveEmployeeToSheet, deleteEmployeeFromSheet, updateToolInCatalog, saveToolToCatalog 
} from './services/sheetService';
import { generateEmployeePDF } from './services/pdfService';
import { safeStorage } from './utils';

type Tab = 'employee' | 'directory' | 'daily' | 'stock' | 'admins' | 'catalog';

const CACHE_KEY = 'sarbs_inventory_cache_v5';
const USER_SESSION_KEY = 'sarbs_auth_session_v5';
const LOGS_PER_PAGE = 20;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = safeStorage.getItem(USER_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [fullEmployeeDirectory, setFullEmployeeDirectory] = useState<any[]>(() => USERS.filter(u => u.role === 'employee'));
  const [toolCatalog, setToolCatalog] = useState<ToolDefinition[]>(() => TOOL_CATALOG);
  const [sheetAdmins, setSheetAdmins] = useState<User[]>(() => USERS.filter(u => u.role !== 'employee'));
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [lookupViewMode, setLookupViewMode] = useState<'summary' | 'history'>('summary');
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');
  const [directoryDeptFilter, setDirectoryDeptFilter] = useState<string>('');
  const [directorySearchQuery, setDirectorySearchQuery] = useState<string>('');
  const [showBulkLogsOnly, setShowBulkLogsOnly] = useState(false);
  const [currentLogsPage, setCurrentLogsPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null);
  const [isOnline, setIsOnline] = useState(() => {
    try {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    } catch {
      return true;
    }
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const hasInitializedRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsSyncing(true);
    try {
      const data = await fetchSheetData();
      if (data) {
        if (Array.isArray(data.transactions)) setAllTransactions(data.transactions);
        if (Array.isArray(data.employees) && data.employees.length > 0) setFullEmployeeDirectory(data.employees);
        if (Array.isArray(data.catalog) && data.catalog.length > 0) setToolCatalog(data.catalog);
        if (Array.isArray(data.admins) && data.admins.length > 0) setSheetAdmins(data.admins);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (data.isFromSheet) {
          setLastSync(timeStr);
        }
      }
    } catch (e) { 
      console.warn("Sync Failed:", e); 
    } finally { 
      setIsLoading(false); 
      setIsSyncing(false); 
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const cached = safeStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.transactions)) setAllTransactions(parsed.transactions);
            if (Array.isArray(parsed.employees) && parsed.employees.length > 0) setFullEmployeeDirectory(parsed.employees);
            if (Array.isArray(parsed.catalog) && parsed.catalog.length > 0) setToolCatalog(parsed.catalog);
            if (Array.isArray(parsed.admins) && parsed.admins.length > 0) setSheetAdmins(parsed.admins);
          }
        } catch {
          // Ignore parse errors
        }
      }
      loadData(true);
    }

    return () => { 
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
    };
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const uid = String(user.id || '').trim().toUpperCase();
    if (!uid) return;
    const matchedAdmin = sheetAdmins.find(a => a && String(a.id || '').trim().toUpperCase() === uid);
    if (matchedAdmin && (user.role !== matchedAdmin.role || user.department !== matchedAdmin.department || user.name !== matchedAdmin.name)) {
      if (String(user.role || '').toLowerCase() !== 'super_admin') {
        const updated: User = { ...matchedAdmin, role: (matchedAdmin.role as any) || 'admin' };
        setUser(updated);
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
      }
      return;
    }
    if (user.role === 'employee') {
      const matchedEmp = fullEmployeeDirectory.find(e => e && String(e.id || '').trim().toUpperCase() === uid);
      if (matchedEmp && (user.name !== matchedEmp.name || user.department !== matchedEmp.department || user.designation !== matchedEmp.designation)) {
        const updated: User = { ...matchedEmp, role: 'employee' };
        setUser(updated);
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
      }
    }
  }, [sheetAdmins, fullEmployeeDirectory, user]);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const roleClean = String(user.role || '').toLowerCase();
    const isGlobalUnit = user.department === 'All' || user.department === 'Global (All)';
    return roleClean.includes('super') || isGlobalUnit;
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const roleClean = String(user.role || '').toLowerCase();
    const userIdUpper = String(user.id || '').trim().toUpperCase();
    const isInAdminList = sheetAdmins.some(a => a && String(a.id || '').trim().toUpperCase() === userIdUpper);
    return roleClean.includes('admin') || isSuperAdmin || isInAdminList;
  }, [user, isSuperAdmin, sheetAdmins]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    fullEmployeeDirectory.forEach(e => { if (e?.department) depts.add(e.department); });
    toolCatalog.forEach(t => { if (t) depts.add(t.department || 'All'); });
    return Array.from(depts).filter(d => d && d !== 'All' && d !== 'Global (All)').sort();
  }, [fullEmployeeDirectory, toolCatalog]);

  const navigationTabs = useMemo(() => [
    { id: 'employee', label: 'LOOKUP', icon: Search },
    { id: 'directory', label: 'DIR', icon: Users },
    { id: 'catalog', label: 'CATALOG', icon: Wrench, adminOnly: true },
    { id: 'daily', label: 'LOGS', icon: FileSpreadsheet },
    { id: 'stock', label: 'STOCK', icon: Package },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'ADMIN', icon: ShieldCheck }] : [])
  ].filter(tab => !tab.adminOnly || isAdmin), [isAdmin, isSuperAdmin]);

  const visibleEmployees = useMemo(() => 
    isSuperAdmin ? fullEmployeeDirectory : fullEmployeeDirectory.filter(e => e?.department === user?.department),
  [isSuperAdmin, fullEmployeeDirectory, user]);

  const filteredToolsForEntry = useMemo(() => {
    const currentDept = user?.department;
    return toolCatalog
      .filter(t => t && (isSuperAdmin || !t.department || t.department === 'All' || t.department === currentDept))
      .map(t => t.name)
      .filter(Boolean);
  }, [isSuperAdmin, toolCatalog, user]);

  const filteredDirectory = useMemo(() => {
    let list = visibleEmployees;
    if (isSuperAdmin && directoryDeptFilter) list = list.filter(e => e?.department === directoryDeptFilter);
    if (directorySearchQuery.trim()) {
      const q = directorySearchQuery.toLowerCase();
      list = list.filter(e => String(e?.id || '').toLowerCase().includes(q) || String(e?.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [visibleEmployees, isSuperAdmin, directoryDeptFilter, directorySearchQuery]);

  const visibleTransactions = useMemo(() => {
    let list = isSuperAdmin ? allTransactions : allTransactions.filter(t => t?.department === user?.department);
    if (logsSearchQuery.trim()) {
      const q = logsSearchQuery.toLowerCase().trim();
      list = list.filter(t => 
        String(t?.toolName || '').toLowerCase().includes(q) || 
        (t?.employeeName && String(t.employeeName).toLowerCase().includes(q)) ||
        (t?.employeeId && String(t.employeeId).toLowerCase().includes(q))
      );
    }
    if (showBulkLogsOnly) list = list.filter(t => Number(t?.quantity) >= 2);
    return list;
  }, [isSuperAdmin, allTransactions, user, showBulkLogsOnly, logsSearchQuery]);

  const paginatedLogs = useMemo(() => {
    const sorted = [...visibleTransactions].reverse();
    return sorted.slice((currentLogsPage - 1) * LOGS_PER_PAGE, currentLogsPage * LOGS_PER_PAGE);
  }, [visibleTransactions, currentLogsPage]);

  const totalLogsPages = useMemo(() => Math.ceil(visibleTransactions.length / LOGS_PER_PAGE), [visibleTransactions]);

  const stockSummaryData = useMemo(() => {
    const map = new Map<string, any>();
    const activeDeptFilter = isSuperAdmin ? selectedDeptFilter : user?.department;
    
    const catalogForView = toolCatalog.filter(t => {
      if (!t?.name) return false;
      if (!activeDeptFilter || activeDeptFilter === '' || activeDeptFilter === 'All') return true;
      return t.department === activeDeptFilter || t.department === 'All';
    });

    catalogForView.forEach(t => {
      map.set(t.name, { name: t.name, purchase: 0, distributed: 0, returned: 0, faulty: 0, damage: 0, lost: 0 });
    });

    let baseTrx = allTransactions;
    if (activeDeptFilter && activeDeptFilter !== 'All' && activeDeptFilter !== '') {
      baseTrx = allTransactions.filter(t => t?.department === activeDeptFilter);
    } else if (!isSuperAdmin) {
      baseTrx = allTransactions.filter(t => t?.department === user?.department);
    }

    baseTrx.forEach(t => {
      if (!t?.toolName) return;
      let row = map.get(t.toolName);
      if (!row) return; 
      const q = Number(t.quantity) || 0;
      if (t.entryType === 'Stock IN') row.purchase += q;
      else if (t.entryType === 'Distribute') row.distributed += q;
      else if (t.entryType === 'Return') row.returned += q;
      else if (t.entryType === 'Faulty Return') row.faulty += q;
      else if (t.entryType === 'Damage') row.damage += q;
      else if (t.entryType === 'Lost') row.lost += q;
    });

    let results = Array.from(map.values()).map(r => ({ 
      ...r, 
      stockNow: (r.purchase + r.returned) - (r.distributed + r.faulty + r.damage + r.lost) 
    }));
    
    if (stockSearchQuery.trim()) results = results.filter(r => String(r.name || '').toLowerCase().includes(stockSearchQuery.toLowerCase()));
    return results.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [allTransactions, toolCatalog, isSuperAdmin, user, stockSearchQuery, selectedDeptFilter]);

  const stockSubtotals = useMemo(() => {
    return stockSummaryData.reduce((acc, curr) => ({
      purchase: acc.purchase + (Number(curr.purchase) || 0),
      distributed: acc.distributed + (Number(curr.distributed) || 0),
      returned: acc.returned + (Number(curr.returned) || 0),
      faulty: acc.faulty + (Number(curr.faulty) || 0),
      damage: acc.damage + (Number(curr.damage) || 0),
      lost: acc.lost + (Number(curr.lost) || 0),
      stockNow: acc.stockNow + (Number(curr.stockNow) || 0),
    }), { purchase: 0, distributed: 0, returned: 0, faulty: 0, damage: 0, lost: 0, stockNow: 0 });
  }, [stockSummaryData]);

  const employeeToolsData = useMemo(() => {
    if (!selectedEmployee) return [];
    const map = new Map<string, any>();
    allTransactions.filter(t => t?.employeeId === selectedEmployee.id).forEach(t => {
      if (!t?.toolName) return;
      let row = map.get(t.toolName);
      if (!row) { row = { name: t.toolName, distributed: 0, returned: 0, faulty: 0, damage: 0, lost: 0, remarks: '' }; map.set(t.toolName, row); }
      const q = Number(t.quantity) || 0;
      if (t.entryType === 'Distribute') row.distributed += q;
      else if (t.entryType === 'Return') row.returned += q;
      else if (t.entryType === 'Faulty Return') row.faulty += q;
      else if (t.entryType === 'Damage') row.damage += q;
      else if (t.entryType === 'Lost') row.lost += q;
      if (t.remarks) row.remarks = t.remarks;
    });
    return Array.from(map.values()).sort((a, b) => String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase()));
  }, [selectedEmployee, allTransactions]);

  const employeeHistory = useMemo(() => {
    if (!selectedEmployee) return [];
    return allTransactions.filter(t => t?.employeeId === selectedEmployee.id).reverse();
  }, [selectedEmployee, allTransactions]);

  const handleExportStock = () => {
    const totalRow = [
      '"Total Filtered Tools"', 
      '=SUBTOTAL(9,B3:B1000)',   
      '=SUBTOTAL(9,C3:C1000)',   
      '=SUBTOTAL(9,D3:D1000)',   
      '=SUBTOTAL(9,E3:E1000)',   
      '=SUBTOTAL(9,F3:F1000)',   
      '=SUBTOTAL(9,G3:G1000)',   
      '=SUBTOTAL(9,H3:H1000)'    
    ].join(',');

    const headers = ['Tool Name', 'Stock IN', 'Distributed', 'Returned', 'Faulty', 'Damage', 'Lost', 'Current Stock'];
    const headerRow = headers.map(h => `"${h}"`).join(',');
    
    const dataRows = stockSummaryData.map(r => [
      `"${String(r.name || '').replace(/"/g, '""')}"`, 
      r.purchase, 
      r.distributed, 
      r.returned, 
      r.faulty, 
      r.damage, 
      r.lost, 
      r.stockNow
    ].join(','));

    const csvContent = "\uFEFF" + [totalRow, headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SARBS_Stock_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportLogs = () => {
    if (!visibleTransactions || visibleTransactions.length === 0) {
      showToast("No operational logs available to export.", "error");
      return;
    }

    const headers = ['Timestamp', 'Employee ID', 'Employee Name', 'Department', 'Designation', 'Asset Description', 'Entry Type', 'Quantity', 'Condition', 'Remarks'];
    const headerRow = headers.map(h => `"${h}"`).join(',');

    const dataRows = visibleTransactions.map(t => [
      `"${String(t.date || '').replace(/"/g, '""')}"`,
      `"${String(t.employeeId || '').replace(/"/g, '""')}"`,
      `"${String(t.employeeName || '').replace(/"/g, '""')}"`,
      `"${String(t.department || '').replace(/"/g, '""')}"`,
      `"${String(t.designation || '').replace(/"/g, '""')}"`,
      `"${String(t.toolName || '').replace(/"/g, '""')}"`,
      `"${String(t.entryType || '').replace(/"/g, '""')}"`,
      String(t.quantity || '0'),
      `"${String(t.condition || '').replace(/"/g, '""')}"`,
      `"${String(t.remarks || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "\uFEFF" + [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SARBS_Operational_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveEmployee = async (data: any) => {
    setIsSyncing(true);
    if (await saveEmployeeToSheet(data)) {
      showToast("Profile Committed.");
      setIsEmployeeModalOpen(false);
      setEditingEmployee(null);
      if (selectedEmployee && selectedEmployee.id === data.id) {
        setSelectedEmployee({ ...selectedEmployee, ...data });
      }
      await loadData(true);
    } else { showToast("Failed to save profile.", "error"); setIsSyncing(false); }
  };

  const handleDeleteEmployee = (id: string) => {
    setConfirmDialog({
      message: "Permanently archive this personnel?",
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        if (await deleteEmployeeFromSheet(id)) {
          showToast("Personnel Archived.");
          if (selectedEmployee?.id === id) {
            setSelectedEmployee(null);
            setSearchQuery('');
          }
          await loadData(true);
        } else { showToast("Error archiving personnel.", "error"); setIsSyncing(false); }
      }
    });
  };

  const handleDeleteAdmin = (id: string, role: string) => {
    if (String(role || '').toLowerCase().includes('super')) {
      showToast("Super Admin accounts cannot be removed via this interface.", "error");
      return;
    }
    setConfirmDialog({
      message: "Revoke administrative access for this user?",
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        if (await deleteAdminFromSheet(id)) {
          showToast("Access Revoked.");
          await loadData(true);
        } else { 
          showToast("Error revoking access.", "error"); 
          setIsSyncing(false); 
        }
      }
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center animate-fade-in">
      <img src={LOGO_URL} alt="Logo" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-48 h-48 object-contain" />
      <h1 className="text-slate-900 font-black text-2xl uppercase mt-8">SARBS HUB</h1>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse mt-4">Administrative Authentication In Progress...</p>
    </div>
  );

  if (!user) return <Login 
    onLogin={(u) => {
      const rawId = String(u.id || '').trim();
      const rawPass = String(u.password || '').trim();
      const inputIdUpper = rawId.toUpperCase();
      const inputIdLower = rawId.toLowerCase();
      const inputPassLower = rawPass.toLowerCase();

      // Clear any previous error
      setLoginError(null);

      // If nothing entered
      if (!rawId) {
        setLoginError("Please enter your Official ID or Name to continue.");
        return;
      }

      // 1. Direct super-admin built-in shortcut & Owner bypass
      const isSuperAdminId = 
        inputIdLower === 'admin' ||
        inputIdLower === 'superadmin' ||
        inputIdLower === 'administrator' ||
        inputIdLower === 'sarbs administrator' ||
        inputIdLower === 'sarbs' ||
        inputIdLower === 'root' ||
        inputIdLower === 'mhsumon' ||
        inputIdLower === 'sumon' ||
        inputIdLower === 'mhsumon670@gmail.com' ||
        inputIdUpper === 'ADMIN' ||
        inputIdUpper === 'MHSUMON';

      if (isSuperAdminId) {
        const superAdmin: User = {
          id: inputIdUpper === 'ADMIN' ? 'ADMIN' : (rawId.includes('@') ? 'ADMIN' : inputIdUpper),
          name: inputIdLower.includes('sumon') ? 'MH Sumon (Administrator)' : 'SARBS Administrator',
          role: 'super_admin',
          password: rawPass || 'admin',
          department: 'Global (All)',
          typeOfEmployee: 'Running'
        };
        setUser(superAdmin);
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(superAdmin));
        return;
      }

      // 2. Check sheet admins
      const admin = sheetAdmins.find(a => {
        const aId = String(a.id || '').trim().toUpperCase();
        const aName = String(a.name || '').trim().toLowerCase();
        return aId === inputIdUpper || aName === inputIdLower || (inputIdLower.length >= 3 && aName.includes(inputIdLower));
      });
      if (admin) {
        const storedPass = String(admin.password || 'admin').trim();
        if (!rawPass || storedPass === rawPass || storedPass.toLowerCase() === inputPassLower || inputPassLower === 'admin' || inputPassLower === '12345') {
          const adminUser: User = { ...admin, role: (admin.role as any) || 'admin' };
          setUser(adminUser);
          safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(adminUser));
          return;
        }
      }

      // 3. Check default/fallback admins from USERS
      const defaultAdmin = USERS.find(a => {
        if (a.role === 'employee') return false;
        const aId = String(a.id || '').trim().toUpperCase();
        const aName = String(a.name || '').trim().toLowerCase();
        return aId === inputIdUpper || aName === inputIdLower || (inputIdLower.length >= 3 && aName.includes(inputIdLower));
      });
      if (defaultAdmin) {
        const storedPass = String(defaultAdmin.password || 'admin').trim();
        if (!rawPass || storedPass === rawPass || storedPass.toLowerCase() === inputPassLower || inputPassLower === 'admin' || inputPassLower === '12345') {
          setUser(defaultAdmin);
          safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(defaultAdmin));
          return;
        }
      }

      // 4. Check sheet employee directory (by ID or Name)
      const emp = fullEmployeeDirectory.find(e => {
        const eId = String(e.id || '').trim().toUpperCase();
        const eName = String(e.name || '').trim().toLowerCase();
        return eId === inputIdUpper || eName === inputIdLower || (inputIdLower.length >= 3 && eName.includes(inputIdLower));
      });
      if (emp) {
        const storedPass = String(emp.password || '12345').trim();
        if (!rawPass || storedPass === rawPass || storedPass.toLowerCase() === inputPassLower || rawPass === '12345' || inputPassLower === 'admin') {
          const uObj: User = { ...emp, role: 'employee' };
          setUser(uObj);
          safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(uObj));
          return;
        }
      }

      // 5. Check transactions history for employee
      const trxEmp = allTransactions.find(t => {
        const tId = String(t.employeeId || '').trim().toUpperCase();
        const tName = String(t.employeeName || '').trim().toLowerCase();
        return tId === inputIdUpper || tName === inputIdLower || (inputIdLower.length >= 3 && tName.includes(inputIdLower));
      });
      if (trxEmp) {
        const uObj: User = {
          id: trxEmp.employeeId,
          name: trxEmp.employeeName || trxEmp.employeeId,
          role: 'employee',
          designation: trxEmp.designation || 'Technician',
          department: trxEmp.department || 'Operations',
          typeOfEmployee: (trxEmp.typeOfEmployee as any) || 'Running',
          password: rawPass || '12345'
        };
        setUser(uObj);
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(uObj));
        return;
      }

      // 6. Check default/fallback employees from USERS (e.g. RESCUE, EMP-01)
      const defaultEmp = USERS.find(e => {
        if (e.role !== 'employee') return false;
        const eId = String(e.id || '').trim().toUpperCase();
        const eName = String(e.name || '').trim().toLowerCase();
        return eId === inputIdUpper || eName === inputIdLower;
      });
      if (defaultEmp) {
        const uObj: User = { ...defaultEmp, role: 'employee' };
        setUser(uObj);
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(uObj));
        return;
      }

      // 7. General fallback: if password is standard SARBS employee password '12345' or 'admin' or if any ID is provided
      if (rawPass === '12345' || inputPassLower === 'admin' || !rawPass || inputIdUpper.startsWith('EMP') || /^\d+$/.test(rawId)) {
        const dynamicUser: User = {
          id: inputIdUpper,
          name: rawId,
          role: 'employee',
          designation: 'Staff',
          department: 'Operations',
          typeOfEmployee: 'Running',
          password: rawPass || '12345'
        };
        setUser(dynamicUser);
        safeStorage.setItem(USER_SESSION_KEY, JSON.stringify(dynamicUser));
        return;
      }

      // If all failed, provide helpful error
      setLoginError("Invalid Credentials. Please verify your Official ID and Password (default admin: ADMIN / admin; default employee: RESCUE / 12345).");
    }} 
    isSyncing={isSyncing} 
    lastSync={lastSync} 
    onRefresh={() => loadData(true)} 
    isOnline={isOnline} 
    installPrompt={null} 
    onInstall={() => {}} 
    isStandalone={false}
    errorMessage={loginError}
    onClearError={() => setLoginError(null)}
  />;

  if (user.role === 'employee') return <EmployeeDashboard user={user} transactions={allTransactions} onLogout={() => { setUser(null); safeStorage.removeItem(USER_SESSION_KEY); }} isSyncing={isSyncing} />;

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-24 md:pb-6">
      {/* Responsive Header: Visible on both mobile and desktop */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex items-center justify-between px-4 md:px-8 h-16 md:h-20">
        <div className="flex items-center gap-2 md:gap-3">
          <img src={LOGO_URL} alt="Logo" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
          <div>
            <h1 className="text-xs md:text-sm font-black text-slate-900 uppercase leading-tight">SARBS Inventory</h1>
            <p className="text-[8px] md:text-[9px] text-blue-600 font-bold uppercase tracking-wider">{user.department} Unit</p>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          {navigationTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] font-black text-slate-800 uppercase leading-none">{user.name}</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">ID: {user.id}</span>
          </div>
          <button onClick={() => loadData(true)} className={`p-2 rounded-full hover:bg-slate-100 ${isSyncing ? 'animate-spin text-blue-500' : 'text-slate-400'}`} title="Refresh System"><RefreshCw className="w-5 h-5" /></button>
          <button onClick={() => { setUser(null); safeStorage.removeItem(USER_SESSION_KEY); }} className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Logout"><LogOut className="w-5 h-5 md:w-6 md:h-6" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {activeTab === 'employee' && (
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center" ref={searchRef}>
              <div className="w-full max-w-md relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Personnel Lookup</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:border-blue-500 shadow-inner" placeholder="Personnel ID or Name..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }} />
                </div>
                {showSearchResults && searchQuery && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                    {visibleEmployees.filter(e => String(e?.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(e?.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(e => (
                      <button key={e.id} onClick={() => { setSelectedEmployee(e); setShowSearchResults(false); setSearchQuery(`${e.id} - ${e.name}`); }} className="w-full px-5 py-4 text-left border-b last:border-0 hover:bg-blue-50 flex items-center justify-between group">
                        <div><p className="text-sm font-black text-slate-900">{e.id} - {e.name}</p><p className="text-[9px] text-slate-400 uppercase font-bold">{e.department}</p></div>
                        <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto shrink-0">
                  <button onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }} className="w-full md:w-auto bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-slate-200 hover:bg-slate-200 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm min-w-fit whitespace-nowrap">
                    <UserPlus className="w-4 h-4" /> New Personnel
                  </button>
                  <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-3 transition-all active:scale-95 min-w-fit whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Commit Tools Entry
                  </button>
                </div>
              )}
            </div>

            {selectedEmployee ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 border-b">
                  <div className="bg-white p-6 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Name</p><p className="font-black text-slate-900">{selectedEmployee.name}</p></div>
                  <div className="bg-white p-6 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unit</p><p className="font-black text-blue-600 uppercase text-[11px]">{selectedEmployee.department}</p></div>
                  <div className="bg-white p-6 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Rank</p><p className="font-bold text-slate-500">{selectedEmployee.designation}</p></div>
                  <div className="bg-white p-6 flex items-center justify-center gap-3">
                    <button onClick={() => setLookupViewMode(prev => prev === 'summary' ? 'history' : 'summary')} className={`p-3 rounded-xl border ${lookupViewMode === 'history' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}><History className="w-5 h-5" /></button>
                    <button onClick={() => generateEmployeePDF(selectedEmployee, employeeToolsData)} className="bg-slate-100 hover:bg-blue-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all">PDF Report</button>
                  </div>
                </div>
                {lookupViewMode === 'summary' ? (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs text-left min-w-[900px]">
                      <thead className="bg-[#F8FAFC] border-b text-slate-500 uppercase font-black tracking-widest">
                        <tr><th className="px-8 py-5">Tool Name</th><th className="px-5 py-5 text-center">Dist..</th><th className="px-5 py-5 text-center">Ret.</th><th className="px-5 py-5 text-center text-amber-600">Faulty</th><th className="px-5 py-5 text-center text-red-500">Dmg</th><th className="px-5 py-5 text-center text-red-700">Lost</th><th className="px-6 py-5 text-center bg-green-50 text-green-900">Balance</th><th className="px-8 py-5">Remarks</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {employeeToolsData.map(r => (
                          <tr key={r.name} className="hover:bg-slate-50">
                            <td className="px-8 py-4 font-black text-slate-800 text-sm">{r.name}</td>
                            <td className="px-5 py-4 text-center font-bold">{r.distributed}</td>
                            <td className="px-5 py-4 text-center font-bold">{r.returned}</td>
                            <td className="px-5 py-4 text-center text-amber-600 font-bold">{r.faulty}</td>
                            <td className="px-5 py-4 text-center text-red-500 font-bold">{r.damage}</td>
                            <td className="px-5 py-4 text-center text-red-700 font-bold">{r.lost}</td>
                            <td className="px-6 py-4 text-center font-black bg-green-50/50 text-green-700 text-base">{r.distributed - r.returned - r.faulty - r.damage - r.lost}</td>
                            <td className="px-8 py-4 text-slate-400 italic text-[10px] truncate max-w-[200px]">{r.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-[10px] text-left min-w-[800px]">
                      <thead className="bg-[#F8FAFC] border-b text-slate-500 uppercase font-black">
                        <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Description</th><th className="px-5 py-5 text-center">Type</th><th className="px-5 py-5 text-center">Qty</th><th className="px-8 py-5">Remarks</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {employeeHistory.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="px-8 py-4 font-mono text-slate-400">{h.date}</td>
                            <td className="px-8 py-4 font-black text-slate-800">{h.toolName}</td>
                            <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase ${h.entryType === 'Distribute' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{h.entryType}</span></td>
                            <td className="px-5 py-4 text-center font-black text-slate-900">{h.quantity}</td>
                            <td className="px-8 py-4 text-slate-400 italic">{h.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-300 font-black uppercase tracking-[0.3em] text-xs">Enter ID or Name to Access Profile Data</div>
            )}
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="w-full max-w-md"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Search Directory</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-inner focus:border-blue-500" placeholder="Names or IDs..." value={directorySearchQuery} onChange={e => setDirectorySearchQuery(e.target.value)} /></div>
              
              {isAdmin && (
                <button onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all active:scale-95 min-w-fit whitespace-nowrap">
                  <UserPlus className="w-4 h-4" /> New Personnel
                </button>
              )}
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-xs text-left min-w-[1000px]">
                <thead className="bg-[#F8FAFC] border-b text-slate-500 uppercase font-black tracking-widest">
                  <tr><th className="px-8 py-6">ID / Security Key</th><th className="px-8 py-6">Full Name</th><th className="px-8 py-6">Designation</th><th className="px-8 py-6">Unit</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredDirectory.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 group">
                      <td className="px-8 py-5"><div className="font-mono font-black text-slate-400 text-[11px] mb-1">ID: {e.id}</div><div className="flex items-center gap-1.5"><span className="bg-blue-50 px-2 py-0.5 rounded text-[10px] font-black text-blue-700 uppercase border border-blue-100">{e.password || '12345'}</span></div></td>
                      <td className="px-8 py-5 font-black text-slate-900 text-base">{e.name}</td>
                      <td className="px-8 py-5 font-bold text-slate-500">{e.designation}</td>
                      <td className="px-8 py-5 text-blue-600 font-black uppercase text-[10px]">{e.department}</td>
                      <td className="px-8 py-5 text-center"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${e.typeOfEmployee === 'Running' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{e.typeOfEmployee}</span></td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <button onClick={() => { setEditingEmployee(e); setIsEmployeeModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200"><Edit className="w-4 h-4" /></button>
                        {isSuperAdmin && <button onClick={() => handleDeleteEmployee(e.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6">
              <div className="w-full flex-1 space-y-4">
                <div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-blue-500" /> Operational Log</h2><button onClick={() => setShowBulkLogsOnly(!showBulkLogsOnly)} className={`text-[9px] font-black uppercase flex items-center gap-1.5 ${showBulkLogsOnly ? 'text-amber-600' : 'text-slate-400'}`}><Filter className="w-3 h-3" /> Bulk Filter: {showBulkLogsOnly ? 'ACTIVE' : 'OFF'}</button></div>
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all focus:border-blue-500 shadow-inner" placeholder="Filter by tool or name..." value={logsSearchQuery} onChange={e => {setLogsSearchQuery(e.target.value); setCurrentLogsPage(1);}} /></div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <button 
                  onClick={handleExportLogs} 
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95 whitespace-nowrap"
                  title="Export filtered logs to CSV file"
                >
                  <FileDown className="w-4 h-4" /> Export CSV
                </button>
                {isAdmin && (
                  <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 whitespace-nowrap">
                    <Plus className="w-4 h-4" /> New Log Entry
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-[11px] text-left min-w-[900px]">
                <thead className="bg-[#F8FAFC] border-b text-slate-500 uppercase font-black tracking-widest">
                  <tr><th className="px-8 py-5">Timestamp</th><th className="px-8 py-5">Personnel</th><th className="px-8 py-5">Asset Description</th><th className="px-5 py-5 text-center">Type</th><th className="px-5 py-5 text-center">Qty</th><th className="px-8 py-5">Remarks</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedLogs.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 font-mono text-[10px] text-slate-400">{t.date}</td>
                      <td className="px-8 py-4 font-black text-slate-900">{t.employeeName}<span className="block text-[9px] text-slate-400 font-bold uppercase">ID: {t.employeeId}</span></td>
                      <td className="px-8 py-4 font-bold text-slate-600">{t.toolName}</td>
                      <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${t.entryType === 'Distribute' ? 'bg-green-500 text-white border-green-600' : 'bg-blue-600 text-white border-blue-700'}`}>{t.entryType}</span></td>
                      <td className="px-5 py-4 text-center font-black">{t.quantity}</td>
                      <td className="px-8 py-4 text-slate-400 italic text-[10px] truncate max-w-[200px]">{t.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalLogsPages > 1 && (
                <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex items-center justify-center gap-2">
                  <button onClick={() => setCurrentLogsPage(p => Math.max(1, p - 1))} disabled={currentLogsPage === 1} className="p-3 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                  {Array.from({ length: Math.min(5, totalLogsPages) }, (_, i) => i + 1).map(n => <button key={n} onClick={() => setCurrentLogsPage(n)} className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${currentLogsPage === n ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>{n}</button>)}
                  <button onClick={() => setCurrentLogsPage(p => Math.min(totalLogsPages, p + 1))} disabled={currentLogsPage === totalLogsPages} className="p-3 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between gap-6 items-end">
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="flex-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Inventory Search</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold shadow-inner focus:border-blue-500 outline-none" placeholder="Tool name..." value={stockSearchQuery} onChange={e => setStockSearchQuery(e.target.value)} /></div>
                {isSuperAdmin && <div className="w-full md:w-80"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit Reconciliation</label><select className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)}><option value="">ALL UNITS CONSOLIDATED</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>}
              </div>
              <button onClick={handleExportStock} className="w-full lg:w-auto bg-green-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-green-700 transition-all"><FileDown className="w-5 h-5" /> Export Stock CSV</button>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-[11px] text-center min-w-[950px] border-collapse">
                <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                  <tr className="bg-slate-800 border-b border-slate-700"><th className="px-10 py-5 text-left bg-slate-100 text-slate-900">Total Filtered Tools</th><th className="px-5 py-5">{stockSubtotals.purchase}</th><th className="px-5 py-5 text-green-400">{stockSubtotals.distributed}</th><th className="px-5 py-5 text-blue-400">{stockSubtotals.returned}</th><th className="px-5 py-5 text-amber-400">{stockSubtotals.faulty}</th><th className="px-5 py-5 text-red-400">{stockSubtotals.damage}</th><th className="px-5 py-5 text-red-500">{stockSubtotals.lost}</th><th className="px-10 py-5 bg-blue-700 text-white">{stockSubtotals.stockNow}</th></tr>
                  <tr><th className="px-10 py-5 text-left">Asset Name</th><th className="px-5 py-5">Stock IN</th><th className="px-5 py-5">Distributed</th><th className="px-5 py-5">Returned</th><th className="px-5 py-5 text-amber-400">Faulty</th><th className="px-5 py-5 text-red-400">Damaged</th><th className="px-5 py-5 text-red-500">Lost</th><th className="px-10 py-5 bg-blue-600">Now</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockSummaryData.map(r => (
                    <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-4 text-left font-black text-slate-800 text-sm">{r.name}</td>
                      <td className="px-5 py-4 text-slate-500 font-black">{r.purchase}</td>
                      <td className="px-5 py-4 text-slate-500 font-black">{r.distributed}</td>
                      <td className="px-5 py-4 text-slate-500 font-black">{r.returned}</td>
                      <td className="px-5 py-4 text-amber-600 font-black bg-amber-50/30">{r.faulty}</td>
                      <td className="px-5 py-4 text-red-500 font-black bg-red-50/30">{r.damage}</td>
                      <td className="px-5 py-4 text-red-700 font-black bg-red-100/30">{r.lost}</td>
                      <td className="px-10 py-4 bg-blue-50 text-base font-black text-blue-900">{r.stockNow}</td>
                    </tr>
                  ))}
                  {stockSummaryData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-20 text-slate-400 font-black uppercase text-center italic tracking-widest">No tools registered for this unit.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto no-scrollbar">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-500" /> {isSuperAdmin ? 'Asset Master Catalog' : `${user?.department} Asset List`}</h2>
              {isAdmin && <button onClick={() => { setEditingTool(null); setIsCatalogModalOpen(true); }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Register New Item</button>}
            </div>
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-[#F8FAFC] text-slate-400 uppercase font-black tracking-widest border-b">
                <tr><th className="px-10 py-6">Official Name</th><th className="px-10 py-6">Brand / Model</th><th className="px-10 py-6">Unit Permissions</th><th className="px-10 py-6 text-right">Update</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(isSuperAdmin ? toolCatalog : toolCatalog.filter(t => t.department === user?.department || t.department === 'All')).map(t => (
                  <tr key={t.name} className="hover:bg-slate-50">
                    <td className="px-10 py-5 font-black text-slate-900 text-sm">{t.name}</td>
                    <td className="px-10 py-5 font-bold text-slate-400 italic text-xs">{t.brand}</td>
                    <td className="px-10 py-5"><span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border border-blue-100">{t.department}</span></td>
                    <td className="px-10 py-5 text-right"><button onClick={() => { setEditingTool(t); setIsCatalogModalOpen(true); }} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200"><Edit2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'admins' && isSuperAdmin && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto no-scrollbar">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-50/30">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-indigo-900"><ShieldCheck className="w-6 h-6" /> Access Control Matrix</h2>
              <button onClick={() => { setEditingAdmin(null); setIsAdminModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Grant New Privileges</button>
            </div>
            <table className="w-full text-xs text-left min-w-[850px]">
              <thead className="bg-[#F8FAFC] text-slate-400 uppercase font-black tracking-widest">
                <tr><th className="px-10 py-6">Unique Access ID</th><th className="px-10 py-6">Admin Name</th><th className="px-10 py-6">Role</th><th className="px-10 py-6">Managed Unit</th><th className="px-10 py-6 text-center">Protocol</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sheetAdmins.map(a => (
                  <tr key={a.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="px-10 py-5 font-mono font-black text-slate-500 text-sm">{a.id}</td>
                    <td className="px-10 py-5 font-black text-slate-900 text-base">{a.name}</td>
                    <td className="px-10 py-5"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${String(a.role || '').toLowerCase().includes('super') ? 'bg-indigo-900 text-white border-indigo-950' : 'bg-white text-amber-600 border-amber-200'}`}>{a.role}</span></td>
                    <td className="px-10 py-5 font-black text-slate-600 uppercase text-[11px]">{a.department}</td>
                    <td className="px-10 py-5 text-center space-x-3">
                      <button onClick={() => { setEditingAdmin(a); setIsAdminModalOpen(true); }} className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteAdmin(a.id, a.role)} className="p-3 bg-white text-slate-300 hover:text-red-600 rounded-xl border border-slate-100 transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Mobile Footer Navigation */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] safe-bottom h-16">
        {navigationTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
            <span className="text-[8px] font-black uppercase tracking-tight">{tab.label}</span>
          </button>
        ))}
      </footer>

      <ToolModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
        onSave={async (trx, details) => { 
          setIsSyncing(true); 
          for(const t of trx) { 
            const isStockIn = t.entryType === 'Stock IN';
            // If it's a Stock IN, we use the logged-in admin's info instead of an employee
            const contextUser = isStockIn ? user : details;
            
            const payload = { 
              ...t, 
              employeeId: isStockIn ? user?.id : t.employeeId,
              department: isSuperAdmin ? (contextUser?.department || user?.department) : user?.department 
            };
            await saveTransactionToSheet(payload, contextUser); 
          }
          await loadData(true); setIsModalOpen(false); 
        }} 
        employees={visibleEmployees} availableTools={filteredToolsForEntry} 
      />
      <EmployeeModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSave={handleSaveEmployee} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} userDepartment={user?.department || ''} allDepartments={departments} initialData={editingEmployee} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} onSave={async (data) => { setIsSyncing(true); await saveAdminToSheet(data); await loadData(true); setIsAdminModalOpen(false); }} initialData={editingAdmin} departments={departments} />
      <ToolCatalogModal isOpen={isCatalogModalOpen} onClose={() => setIsCatalogModalOpen(false)} onSave={async (data) => { setIsSyncing(true); data.oldName ? await updateToolInCatalog(data as any) : await saveToolToCatalog(data); await loadData(true); setIsCatalogModalOpen(false); }} departments={departments} isSyncing={isSyncing} initialData={editingTool} />
      
      {isAdmin && <AIChat inventory={stockSummaryData} />}

      {toast && (
        <div className={`fixed top-20 right-6 z-[200] px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.message}
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Confirm Action</h3>
            <p className="text-xs font-bold text-slate-600">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
