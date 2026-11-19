
import React, { useState, useEffect } from 'react';
import { X, Wrench, Building2, Tags, Zap, Plus, ListFilter, Loader2 } from 'lucide-react';
import { ToolDefinition } from '../types';

interface ToolCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tool: ToolDefinition & { oldName?: string }) => void;
  departments: string[];
  isSyncing?: boolean;
  initialData?: ToolDefinition | null;
}

const ToolCatalogModal: React.FC<ToolCatalogModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  departments,
  isSyncing = false,
  initialData = null
}) => {
  const [formData, setFormData] = useState<ToolDefinition>({
    name: '',
    brand: '',
    department: 'All'
  });
  const [isCreatingNewDept, setIsCreatingNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          brand: initialData.brand || '',
          department: initialData.department || 'All'
        });
      } else {
        setFormData({
          name: '',
          brand: '',
          department: 'All'
        });
      }
      setIsCreatingNewDept(false);
      setNewDeptName('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalDept = isCreatingNewDept ? newDeptName.trim() : formData.department;
    
    if (!formData.name.trim()) {
      setValidationError("Please enter a tool name.");
      return;
    }

    if (!finalDept) {
      setValidationError("Please specify a department name.");
      return;
    }
    setValidationError('');

    const finalData: ToolDefinition & { oldName?: string } = {
      ...formData,
      department: finalDept
    };

    if (initialData) {
      finalData.oldName = initialData.name;
    }

    onSave(finalData);
  };

  const updateField = (field: keyof ToolDefinition, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              {initialData ? 'Edit Catalog Tool' : 'Add Master Tool'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Catalog Entry Protocol</p>
          </div>
          <button onClick={onClose} disabled={isSyncing} className="hover:bg-white/10 p-2 rounded-xl transition-colors disabled:opacity-30">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-[10px] text-blue-700 font-black uppercase tracking-widest leading-relaxed">
            REGISTERED ITEMS ARE VISIBLE TO ADMINS BASED ON DEPARTMENT ASSIGNMENT. ENSURE BRAND NAMES ARE ACCURATE.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tool Nomenclature (Name)</label>
              <div className="relative">
                <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  required
                  disabled={isSyncing}
                  type="text"
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all disabled:opacity-50"
                  placeholder="e.g., Adjustable Wrench 10 inch"
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Manufacturer / Brand</label>
              <div className="relative">
                <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  required
                  disabled={isSyncing}
                  type="text"
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all disabled:opacity-50"
                  placeholder="e.g., Stanley, DeWalt, N/A"
                  value={formData.brand || ''}
                  onChange={e => updateField('brand', e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Department Access</label>
                {!isSyncing && (
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingNewDept(!isCreatingNewDept)}
                    className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 hover:text-blue-800 transition-colors"
                  >
                    {isCreatingNewDept ? <><ListFilter className="w-3 h-3" /> Use Existing</> : <><Plus className="w-3 h-3" /> Create New</>}
                  </button>
                )}
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                {isCreatingNewDept ? (
                  <input
                    required
                    disabled={isSyncing}
                    type="text"
                    className="w-full pl-10 pr-4 py-4 bg-white border-2 border-blue-500 rounded-2xl outline-none font-black text-sm transition-all shadow-sm disabled:opacity-50"
                    placeholder="Enter New Department Name..."
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <select
                    required
                    disabled={isSyncing}
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all cursor-pointer disabled:opacity-50"
                    value={formData.department}
                    onChange={e => updateField('department', e.target.value)}
                  >
                    <option value="All">Global (All Units)</option>
                    {departments.filter(d => d !== 'All').map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
              {validationError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onClose}
              className="px-6 py-4 text-[10px] text-slate-400 hover:text-slate-600 font-black transition-all uppercase tracking-widest disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSyncing}
              className="px-10 py-4 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl font-black shadow-xl transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:bg-slate-500 disabled:shadow-none"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  Transmitting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-blue-400" />
                  {initialData ? 'UPDATE CATALOG' : 'COMMIT TO CATALOG'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolCatalogModal;
