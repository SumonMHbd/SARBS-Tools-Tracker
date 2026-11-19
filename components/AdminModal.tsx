import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { X, Lock, User as UserIcon, Building2, Briefcase, Key, ShieldCheck, Plus, ListFilter } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (admin: User) => void;
  initialData?: User | null;
  departments: string[];
}

const AdminModal: React.FC<AdminModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  departments
}) => {
  const [formData, setFormData] = useState<User>({
    id: '',
    name: '',
    password: '',
    role: 'dept_admin',
    department: '',
    designation: ''
  });

  const [isCreatingNewDept, setIsCreatingNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          id: '',
          name: '',
          password: '',
          role: 'dept_admin',
          department: departments[0] || '',
          designation: ''
        });
      }
      setIsCreatingNewDept(false);
      setNewDeptName('');
    }
  }, [initialData, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalDept = isCreatingNewDept ? newDeptName.trim() : formData.department;
    
    if (!finalDept) {
      setValidationError("Please select or enter a department/unit.");
      return;
    }
    setValidationError('');

    onSave({
      ...formData,
      department: finalDept
    });
  };

  const updateField = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSuperAdminEditing = initialData && (initialData.role === 'super_admin' || initialData.role === 'super_admin' as any);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-900 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-300" />
              {initialData ? 'Update Administrator' : 'Grant New Access'}
            </h2>
            <p className="text-[10px] text-indigo-300/60 font-bold uppercase mt-1">G-Sheet Admin Protocol</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Access ID</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  required
                  type="text"
                  disabled={!!initialData}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-black text-sm transition-all disabled:opacity-50"
                  placeholder="EMP-ID-01"
                  value={formData.id}
                  onChange={e => updateField('id', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Security Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  required
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-black text-sm transition-all"
                  placeholder="••••••••"
                  value={formData.password || ''}
                  onChange={e => updateField('password', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Full Name</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-black text-sm transition-all"
              placeholder="Administrator Name"
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Access Level</label>
              <input
                type="text"
                readOnly
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-black text-sm text-slate-500 cursor-not-allowed"
                value={isSuperAdminEditing ? "Super Admin" : "Admin"}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Unit</label>
                <button 
                  type="button" 
                  onClick={() => setIsCreatingNewDept(!isCreatingNewDept)}
                  className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:text-indigo-800 transition-colors"
                >
                  {isCreatingNewDept ? <><ListFilter className="w-3 h-3" /> Existing</> : <><Plus className="w-3 h-3" /> New</>}
                </button>
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                {isCreatingNewDept ? (
                  <input
                    required
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-indigo-500 rounded-xl outline-none font-black text-sm transition-all shadow-sm"
                    placeholder="Enter Unit Name..."
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <select
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-black text-sm transition-all cursor-pointer"
                    value={formData.department}
                    onChange={e => updateField('department', e.target.value)}
                  >
                    <option value="">Choose Unit...</option>
                    <option value="All">Global (All)</option>
                    {departments.filter(d => d !== 'All').map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Official Designation</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                required
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-black text-sm transition-all"
                placeholder="Manager, Supervisor, etc."
                value={formData.designation || ''}
                onChange={e => updateField('designation', e.target.value)}
              />
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
              onClick={onClose}
              className="px-6 py-3 text-xs text-slate-400 hover:text-slate-600 font-black transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-indigo-900 text-white hover:bg-indigo-700 rounded-2xl font-black shadow-xl transition-all active:scale-[0.98] text-xs uppercase tracking-widest"
            >
              {initialData ? 'Update Record' : 'Create Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminModal;