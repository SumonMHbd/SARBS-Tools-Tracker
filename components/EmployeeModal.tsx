import React, { useState, useEffect } from 'react';
import { X, UserPlus, Building2, Briefcase, BadgeCheck, ShieldAlert, Edit, Plus, ListFilter } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: any) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userDepartment: string;
  allDepartments: string[];
  initialData?: any | null;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isSuperAdmin, 
  userDepartment,
  allDepartments,
  initialData = null
}) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    designation: '',
    department: '',
    typeOfEmployee: 'Running'
  });

  const [isCreatingNewDept, setIsCreatingNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          id: initialData.id,
          name: initialData.name,
          designation: initialData.designation || '',
          department: initialData.department || '',
          typeOfEmployee: initialData.typeOfEmployee || 'Running'
        });
      } else {
        setFormData({
          id: '',
          name: '',
          designation: '',
          department: isSuperAdmin ? (allDepartments[0] || '') : userDepartment,
          typeOfEmployee: 'Running'
        });
      }
      setIsCreatingNewDept(false);
      setNewDeptName('');
    }
  }, [isOpen, isSuperAdmin, userDepartment, allDepartments, initialData]);

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

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isEditMode = !!initialData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase flex items-center gap-2">
              {isEditMode ? <Edit className="w-4 h-4 text-blue-400" /> : <UserPlus className="w-4 h-4 text-blue-400" />}
              {isEditMode ? 'Modify Personnel' : 'Add New Personnel'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Data Validation Protocol</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Personnel ID</label>
              <input
                required
                type="text"
                readOnly={isEditMode}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                placeholder="ID-001"
                value={formData.id}
                onChange={e => updateField('id', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Status</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm cursor-pointer"
                value={formData.typeOfEmployee}
                onChange={e => updateField('typeOfEmployee', e.target.value)}
              >
                <option value="Running">Running</option>
                <option value="Discontinue">Discontinue</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Full Name</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Designation</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                required
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all"
                placeholder="Job Role"
                value={formData.designation}
                onChange={e => updateField('designation', e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Unit / Department</label>
              {isSuperAdmin && (
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
              {isSuperAdmin ? (
                isCreatingNewDept ? (
                  <input
                    required
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-blue-500 rounded-xl outline-none font-black text-sm transition-all shadow-sm"
                    placeholder="Enter New Department Name..."
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <select
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-sm transition-all cursor-pointer"
                    value={formData.department}
                    onChange={e => updateField('department', e.target.value)}
                  >
                    <option value="">Select Unit...</option>
                    {allDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )
              ) : (
                <input
                  type="text"
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-black text-sm text-slate-500 cursor-not-allowed"
                  value={userDepartment}
                />
              )}
            </div>
            {!isSuperAdmin && (
              <p className="mt-1.5 text-[9px] text-amber-600 font-bold uppercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Unit locked to your administration
              </p>
            )}
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
              className="px-8 py-3 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl font-black shadow-xl transition-all active:scale-[0.98] text-xs uppercase tracking-widest"
            >
              {isEditMode ? 'Update Personnel' : 'Commit to Hub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;