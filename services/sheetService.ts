
import { Transaction, User, ToolDefinition } from '../types';
import { GOOGLE_SCRIPT_URL as RAW_URL, INITIAL_TRANSACTIONS, USERS, TOOL_CATALOG } from '../constants';
import { safeStorage } from '../utils';

export const getScriptUrl = (): string => {
  const custom = safeStorage.getItem('sarbs_custom_script_url');
  if (custom && custom.trim().startsWith('http')) {
    return custom.trim();
  }
  return (RAW_URL || '').trim();
};

export const setCustomScriptUrl = (url: string) => {
  if (url && url.trim().startsWith('http')) {
    safeStorage.setItem('sarbs_custom_script_url', url.trim());
  } else {
    safeStorage.removeItem('sarbs_custom_script_url');
  }
};

const HEADERS = {
  'Content-Type': 'text/plain;charset=utf-8', 
};

export interface SheetData {
  transactions: Transaction[];
  employees: any[];
  tools: string[];
  catalog: ToolDefinition[];
  admins: User[];
  isFromSheet?: boolean;
}

const getCachedOrFallback = (): SheetData => {
  try {
    const cached = safeStorage.getItem('sarbs_inventory_cache_v5');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        const emps = Array.isArray(parsed.employees) && parsed.employees.length > 0
          ? parsed.employees
          : USERS.filter(u => u.role === 'employee');
        const adms = Array.isArray(parsed.admins) && parsed.admins.length > 0
          ? parsed.admins
          : USERS.filter(u => u.role !== 'employee');
        const cat = Array.isArray(parsed.catalog) && parsed.catalog.length > 0
          ? parsed.catalog
          : TOOL_CATALOG;
        return {
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_TRANSACTIONS,
          employees: emps,
          tools: Array.isArray(parsed.tools) && parsed.tools.length > 0 ? parsed.tools : cat.map((t: any) => t.name),
          catalog: cat,
          admins: adms,
          isFromSheet: false
        };
      }
    }
  } catch (e) {
    console.warn("Could not read local cache fallback", e);
  }
  return { 
    transactions: INITIAL_TRANSACTIONS, 
    employees: USERS.filter(u => u.role === 'employee'), 
    tools: TOOL_CATALOG.map(t => t.name),
    catalog: TOOL_CATALOG,
    admins: USERS.filter(u => u.role !== 'employee'),
    isFromSheet: false
  };
};

export const fetchSheetData = async (): Promise<SheetData> => {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) {
    return getCachedOrFallback();
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${scriptUrl}?action=getFullData&t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return getCachedOrFallback();
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return getCachedOrFallback();
    }

    if (!data || data.status === 'error') {
      return getCachedOrFallback();
    }

    const fallback = getCachedOrFallback();

    const transactions = Array.isArray(data.transactions) ? data.transactions : fallback.transactions;
    const employees = Array.isArray(data.employees) && data.employees.length > 0 ? data.employees : fallback.employees;
    const catalog = Array.isArray(data.catalog) && data.catalog.length > 0 ? data.catalog : fallback.catalog;
    const tools = Array.isArray(data.tools) && data.tools.length > 0 ? data.tools : catalog.map((c: any) => c.name);
    const admins = Array.isArray(data.admins) && data.admins.length > 0 ? data.admins : fallback.admins;

    const result: SheetData = {
      transactions,
      employees,
      tools,
      catalog,
      admins,
      isFromSheet: true
    };

    try {
      safeStorage.setItem('sarbs_inventory_cache_v5', JSON.stringify(result));
    } catch {
      // Ignore storage errors
    }

    return result;
  } catch {
    if (timeoutId) clearTimeout(timeoutId);
    return getCachedOrFallback();
  }
};

const postToSheet = async (payload: Record<string, any>): Promise<any> => {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return { status: 'success' };

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload),
      redirect: 'follow',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return { status: 'error', message: `Server error: ${response.status}` };
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { status: 'error', message: 'Invalid response format from server.' };
    }
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn("Sheet POST warning:", error);
    return { status: 'error', message: 'Connection interrupted.' };
  }
};

export const saveTransactionToSheet = async (transaction: Transaction, user?: any): Promise<boolean> => {
  const result = await postToSheet({
    action: 'addTransaction',
    payload: {
      ...transaction,
      employeeName: user?.name,
      designation: user?.designation,
      department: user?.department,
      typeOfEmployee: user?.typeOfEmployee
    }
  });
  return result?.status === 'success';
};

export const saveEmployeeToSheet = async (employee: any): Promise<boolean> => {
  const result = await postToSheet({
    action: 'addEmployee',
    payload: employee
  });
  return result?.status === 'success';
};

export const deleteEmployeeFromSheet = async (empId: string): Promise<boolean> => {
  const result = await postToSheet({
    action: 'deleteEmployee',
    payload: { id: empId }
  });
  return result?.status === 'success';
};

export const saveToolToCatalog = async (tool: ToolDefinition): Promise<boolean> => {
  const result = await postToSheet({
    action: 'addToolToCatalog',
    payload: tool
  });
  return result?.status === 'success';
};

export const updateToolInCatalog = async (tool: ToolDefinition & { oldName: string }): Promise<boolean> => {
  const result = await postToSheet({
    action: 'updateToolInCatalog',
    payload: tool
  });
  return result?.status === 'success';
};

export const updateEmployeeStatusInSheet = async (empId: string, status: string): Promise<boolean> => {
  const result = await postToSheet({
    action: 'updateEmployeeStatus',
    payload: { id: empId, status }
  });
  return result?.status === 'success';
};

export const requestEmployeePasswordChange = async (empId: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return { success: false, message: "Server URL Not Configured" };

  const result = await postToSheet({
    action: 'requestPasswordChange',
    payload: { id: empId, newPassword }
  });

  return {
    success: result?.status === 'success',
    message: result?.message || (result?.status === 'success' ? 'Sent' : 'Rejected')
  };
};

export const approveEmployeePasswordChange = async (empId: string): Promise<boolean> => {
  const result = await postToSheet({
    action: 'approvePasswordChange',
    payload: { id: empId }
  });
  return result?.status === 'success';
};

export const saveAdminToSheet = async (admin: User): Promise<boolean> => {
  const result = await postToSheet({
    action: 'upsertAdmin',
    payload: admin
  });
  return result?.status === 'success';
};

export const deleteAdminFromSheet = async (adminId: string): Promise<boolean> => {
  const result = await postToSheet({
    action: 'deleteAdmin',
    payload: { id: adminId }
  });
  return result?.status === 'success';
};
