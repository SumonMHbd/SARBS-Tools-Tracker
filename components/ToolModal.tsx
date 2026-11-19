

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Transaction, EntryType } from '../types';
import { X, Calendar, Wrench, Plus, Trash2, Hash, Zap, Search, ChevronRight, CheckCircle2, MessageSquareText } from 'lucide-react';

interface ToolItem {
  toolName: string;
  quantity: number;
  condition: 'New' | 'Used';
  remarks: string; // Per-item remarks
  searchQuery: string;
  showDropdown: boolean;
}

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactions: Transaction[], employeeDetails?: any) => void;
  initialTransaction?: Transaction | null;
  employees: any[]; 
  availableTools: string[];
}

const ToolModal: React.FC<ToolModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTransaction, 
  employees = [], 
  availableTools = [] 
}) => {
  
  const [date, setDate] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('Distribute');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeResults, setShowEmployeeResults] = useState(false);
  const [globalRemarks, setGlobalRemarks] = useState('');
  const [validationError, setValidationError] = useState('');
  const [toolItems, setToolItems] = useState<ToolItem[]>([
    { toolName: '', quantity: 1, condition: 'New', remarks: '', searchQuery: '', showDropdown: false }
  ]);

  const searchRef = useRef<HTMLDivElement>(null);
  const toolRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Master list is now strictly derived from the availableTools prop (which is the cloud catalog)
  const masterToolList = useMemo(() => {
    const tools = availableTools || [];
    return Array.from(new Set(tools.map(t => String(t || '').trim()))).filter(t => t !== '').sort();
  }, [availableTools]);

  const entryTypes: EntryType[] = ['Distribute', 'Return', 'Faulty Return', 'Damage', 'Lost', 'Stock IN'];

  const selectedEmployee = useMemo(() => 
    (employees || []).find(e => e && String(e.id || '').trim() === String(employeeId || '').trim()),
    [employees, employeeId]
  );

  useEffect(() => {
    if (initialTransaction) {
      setDate(initialTransaction.date);
      setEntryType(initialTransaction.entryType);
      setEmployeeId(initialTransaction.employeeId || '');
      const emp = employees.find(e => e.id === initialTransaction.employeeId);
      setEmployeeSearchQuery(emp ? `${emp.id} - ${emp.name}` : initialTransaction.employeeId || '');
      setGlobalRemarks(initialTransaction.remarks || '');
      setToolItems([{
        toolName: initialTransaction.toolName,
        quantity: initialTransaction.quantity,
        condition: initialTransaction.condition as any,
        remarks: initialTransaction.remarks || '',
        searchQuery: initialTransaction.toolName,
        showDropdown: false
      }]);
    } else {
      setDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-'));
      setEntryType('Distribute');
      setEmployeeId('');
      setEmployeeSearchQuery('');
      setGlobalRemarks('');
      setToolItems([{ toolName: '', quantity: 1, condition: 'New', remarks: '', searchQuery: '', showDropdown: false }]);
    }
  }, [initialTransaction, isOpen, employees]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowEmployeeResults(false);
      }
      toolRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node)) {
          updateToolItem(index, { showDropdown: false });
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return [];
    const q = employeeSearchQuery.toLowerCase().trim();
    return employees.filter(emp => 
      String(emp.id).toLowerCase().includes(q) || 
      String(emp.name).toLowerCase().includes(q)
    ).slice(0, 5);
  }, [employeeSearchQuery, employees]);

  const getFilteredTools = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return masterToolList;
    return masterToolList.filter(t => t.toLowerCase().includes(q));
  };

  const updateToolItem = (index: number, updates: Partial<ToolItem>) => {
    setToolItems(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const selectTool = (index: number, name: string) => {
    updateToolItem(index, { 
      toolName: name, 
      searchQuery: name, 
      showDropdown: false 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = toolItems.every(item => item.toolName.trim() !== '');
    if (!isValid) {
      setValidationError("Please select a valid tool name from the catalog list for all entries.");
      return;
    }
    setValidationError('');

    const transactions: Transaction[] = toolItems.map((item, idx) => ({
      id: initialTransaction && idx === 0 ? initialTransaction.id : `${Date.now()}-${idx}`,
      date,
      entryType,
      employeeId,
      remarks: item.remarks ? `${globalRemarks} [${item.remarks}]`.trim() : globalRemarks,
      toolName: item.toolName,
      quantity: item.quantity,
      condition: item.condition
    } as Transaction));

    onSave(transactions, selectedEmployee);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              {initialTransaction ? 'Edit Log Entry' : 'Log New Transaction'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">SARBS Communications Ltd.</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Entry Date</label>
                  <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                     <input
                      required
                      type="text"
                      className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all"
                      placeholder="12-May-24"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Transaction Type</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm cursor-pointer"
                    value={entryType}
                    onChange={e => setEntryType(e.target.value as EntryType)}
                  >
                    {entryTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
               </div>
            </div>

            {entryType !== 'Stock IN' && (
               <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="relative" ref={searchRef}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Target Personnel (ID or Name)</label>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                       <input
                          type="text"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all"
                          placeholder="Type Employee ID or Name..."
                          value={employeeSearchQuery}
                          onChange={e => {
                            setEmployeeSearchQuery(e.target.value);
                            setShowEmployeeResults(true);
                            if (!e.target.value) setEmployeeId('');
                          }}
                          onFocus={() => setShowEmployeeResults(true)}
                          autoComplete="off"
                        />
                        {showEmployeeResults && filteredEmployees.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1">
                            {filteredEmployees.map(emp => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => {
                                  setEmployeeId(emp.id);
                                  setEmployeeSearchQuery(`${emp.id} - ${emp.name}`);
                                  setShowEmployeeResults(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between border-b last:border-0 border-slate-100 group transition-colors"
                              >
                                <div>
                                  <p className="text-xs font-black text-slate-900 group-hover:text-blue-700">{emp.id} — {emp.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{emp.department} • {emp.designation}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500" />
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
               </div>
            )}

            <div className="space-y-4">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Material(s)</label>

               <div className="space-y-4">
                  {toolItems.map((item, index) => (
                    <div 
                      key={index} 
                      // Fixed ref callback to return void
                      ref={el => { toolRefs.current[index] = el; }}
                      className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm group relative space-y-4"
                    >
                       <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 sm:col-span-6">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Search Tools Catalog</label>
                              <div className="relative">
                                <Wrench className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                  type="text"
                                  required
                                  autoComplete="off"
                                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold transition-all"
                                  placeholder="Start typing tool name..."
                                  value={item.searchQuery}
                                  onFocus={() => updateToolItem(index, { showDropdown: true })}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const match = masterToolList.find(t => t.toLowerCase() === val.toLowerCase());
                                    updateToolItem(index, { 
                                      searchQuery: val, 
                                      showDropdown: true,
                                      toolName: match || ''
                                    });
                                  }}
                                />
                                
                                {item.showDropdown && (
                                  <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-150">
                                    {getFilteredTools(item.searchQuery).length > 0 ? (
                                      getFilteredTools(item.searchQuery).map(toolName => (
                                        <button
                                          key={toolName}
                                          type="button"
                                          onClick={() => selectTool(index, toolName)}
                                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 border-b last:border-0 border-slate-100 flex items-center justify-between group transition-colors"
                                        >
                                          <span className="text-[11px] font-black text-slate-700 group-hover:text-blue-700">{toolName}</span>
                                          <ChevronRight className="w-3 h-3 text-slate-200 group-hover:text-blue-500" />
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-4 py-3 text-center">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase italic">No items found</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {item.toolName && (
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded text-[8px] font-black text-green-600 border border-green-100 uppercase">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                                  </div>
                                )}
                              </div>
                          </div>

                          <div className="col-span-6 sm:col-span-3">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Qty</label>
                              <div className="relative">
                                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-black text-xs"
                                  value={item.quantity}
                                  onChange={e => updateToolItem(index, { quantity: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                          </div>

                          <div className="col-span-6 sm:col-span-3">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Condition</label>
                              <select
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold cursor-pointer"
                                value={item.condition}
                                onChange={e => updateToolItem(index, { condition: e.target.value as any })}
                              >
                                <option value="New">New</option>
                                <option value="Used">Used</option>
                              </select>
                          </div>
                       </div>

                       <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Item Specific Remarks (Short)</label>
                          <div className="relative">
                             <MessageSquareText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                             <input
                               type="text"
                               className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-[10px] font-bold italic"
                               placeholder="e.g. Serial #1234, Scratched handle..."
                               value={item.remarks}
                               onChange={e => updateToolItem(index, { remarks: e.target.value })}
                             />
                          </div>
                       </div>

                       {toolItems.length > 1 && !initialTransaction && (
                         <button 
                           type="button"
                           onClick={() => setToolItems(prev => prev.filter((_, i) => i !== index))}
                           className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full border border-white shadow-xl hover:bg-red-700 transition-all scale-0 group-hover:scale-100 z-10"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                  ))}
               </div>

               {!initialTransaction && (
                 <div className="pt-2">
                   <button 
                    type="button" 
                    onClick={() => setToolItems([...toolItems, { toolName: '', quantity: 1, condition: 'New', remarks: '', searchQuery: '', showDropdown: false }])}
                    className="w-full text-[11px] font-black text-blue-600 hover:text-white hover:bg-blue-600 border-2 border-blue-600 border-dashed py-3 rounded-2xl flex items-center gap-2 transition-all justify-center bg-white"
                   >
                     <Plus className="w-4 h-4" /> ADD ADDITIONAL MATERIAL ROW
                   </button>
                 </div>
               )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Global Administrative Remarks</label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none resize-none text-xs font-bold italic"
                placeholder="Log general session details here..."
                value={globalRemarks}
                onChange={e => setGlobalRemarks(e.target.value)}
              />
            </div>

            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                {validationError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-4 text-[10px] text-slate-400 hover:text-slate-600 font-black transition-all uppercase tracking-widest text-center"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-12 py-4 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl font-black shadow-2xl transition-all active:scale-[0.98] text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3"
              >
                <Zap className="w-4 h-4" />
                Commit Tools Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ToolModal;
