import React, { useMemo, useState } from 'react';
import { User, Transaction } from '../types';
import { Package, Clock, AlertCircle, CheckCircle, Download, Key, X, Send, Loader2, History } from 'lucide-react';
import { generateEmployeePDF } from '../services/pdfService';
import { LOGO_URL } from '../constants';
import { requestEmployeePasswordChange } from '../services/sheetService';

interface EmployeeDashboardProps {
  user: User;
  transactions: Transaction[]; 
  onLogout: () => void;
  isSyncing?: boolean;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user, transactions, onLogout, isSyncing = false }) => {
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const employeeToolsData = useMemo(() => {
    const empTrx = (transactions || []).filter(t => t && t.employeeId === user?.id);
    const toolsMap = new Map<string, any>();

    empTrx.forEach(t => {
      const tName = String(t.toolName || '').trim();
      if (!tName) return;
      let tool = toolsMap.get(tName);
      if (!tool) {
         tool = { name: tName, distributed: 0, returned: 0, faulty: 0, damage: 0, lost: 0, remarks: '' };
         toolsMap.set(tName, tool);
      }
      const qty = Number(t.quantity) || 0;
      if (t.entryType === 'Distribute') tool.distributed += qty;
      if (t.entryType === 'Return') tool.returned += qty;
      if (t.entryType === 'Faulty Return') tool.faulty += qty;
      if (t.entryType === 'Damage') tool.damage += qty;
      if (t.entryType === 'Lost') tool.lost += qty;
      if (t.remarks) tool.remarks = t.remarks;
    });

    return Array.from(toolsMap.values()).filter(t => (t.distributed - t.returned - t.faulty - t.damage - t.lost) !== 0);
  }, [user, transactions]);

  const recentHistory = useMemo(() => {
    return (transactions || [])
      .filter(t => t && user && t.employeeId === user.id)
      .reverse()
      .slice(0, 10);
  }, [user, transactions]);

  const handlePasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPassword.trim();
    if (!cleanPass) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const result = await requestEmployeePasswordChange(user.id, cleanPass);
      
      if (result.success) {
        setSuccessMsg('Request sent! Super Admin approval is required for activation.');
        setNewPassword('');
        setTimeout(() => {
          setIsPassModalOpen(false);
          setSuccessMsg('');
        }, 3000);
      } else {
        setErrorMsg(`Communication Failed: ${result.message || 'The script did not acknowledge the request.'}`);
      }
    } catch {
      setErrorMsg("System could not reach the Cloud Hub.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex items-center justify-center">
               <img src={LOGO_URL} alt="SARBS" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-10 h-10 object-contain" />
             </div>
             <div>
               <h1 className="text-lg font-bold text-slate-900">Inventory Hub</h1>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Personnel Portal</p>
             </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="text-right hidden sm:block">
               <div className="text-sm font-black text-slate-800">{user.name}</div>
               <div className="text-[10px] text-slate-400 font-bold">{user.id}</div>
             </div>
             <button onClick={() => setIsPassModalOpen(true)} className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-100">
               <Key className="w-3 h-3" /> Security
             </button>
             <button onClick={onLogout} className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors border border-red-100">
               Sign Out
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl flex justify-between items-center flex-wrap gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Name: {user.name}</h2>
            <p className="text-slate-400 text-sm font-medium">
              Department: <span className="text-white font-black">{user.department}</span> • Position: <span className="text-white font-black">{user.designation}</span>
            </p>
          </div>
          <button onClick={() => generateEmployeePDF(user, employeeToolsData)} className="relative z-10 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest shadow-xl active:scale-95">
             <Download className="w-4 h-4" /> Export Tools Report (PDF)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                 <div className="bg-green-100 p-2 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Current Inventory Summary</h3>
               </div>
               
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-[11px] text-center border-collapse min-w-[900px]">
                    <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black">
                      <tr>
                        <th className="px-8 py-5 text-left">Tools Name</th>
                        <th className="px-4 py-5 border-l border-slate-100">Dist. Qty</th>
                        <th className="px-4 py-5 border-l border-slate-100">Ret. Qty</th>
                        <th className="px-4 py-5 border-l border-slate-100 text-amber-500">Faulty Ret.</th>
                        <th className="px-4 py-5 border-l border-slate-100 text-red-500">Damage</th>
                        <th className="px-4 py-5 border-l border-slate-100 text-red-600">Lost</th>
                        <th className="px-6 py-5 border-l border-slate-100 bg-green-50 text-green-900">Balance Qty</th>
                        <th className="px-6 py-5 border-l border-slate-100 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeToolsData.length > 0 ? employeeToolsData.map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 text-left font-black text-slate-800 text-sm">{row.name}</td>
                          <td className="px-4 py-5 border-l border-slate-100 font-bold text-slate-500">{row.distributed || '0'}</td>
                          <td className="px-4 py-5 border-l border-slate-100 font-bold text-slate-500">{row.returned || '0'}</td>
                          <td className="px-4 py-5 border-l border-slate-100 font-bold text-amber-500">{row.faulty || '0'}</td>
                          <td className="px-4 py-5 border-l border-slate-100 font-bold text-red-500">{row.damage || '0'}</td>
                          <td className="px-4 py-5 border-l border-slate-100 font-bold text-red-600">{row.lost || '0'}</td>
                          <td className="px-6 py-5 border-l border-slate-100 font-black bg-green-50 text-green-700 text-base">
                            {(row.distributed - row.returned - row.faulty - row.damage - row.lost)}
                          </td>
                          <td className="px-6 py-5 border-l border-slate-100 text-left text-slate-400 italic font-medium truncate max-w-[200px]">{row.remarks || '-'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={8} className="py-20 text-slate-400 font-black uppercase italic tracking-widest text-sm text-center">No active assets in possession.</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-900 text-white">
                <History className="w-5 h-5 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-widest">Recent Activity Log</h3>
              </div>
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {recentHistory.length > 0 ? recentHistory.map((trx) => (
                  <div key={trx.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 relative group hover:bg-white transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{trx.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                        trx.entryType === 'Distribute' ? 'bg-green-100 text-green-700 border-green-200' :
                        trx.entryType === 'Return' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {trx.entryType}
                      </span>
                    </div>
                    <div className="font-black text-xs text-slate-800">{trx.toolName}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-bold italic truncate max-w-[70%]">{trx.remarks || 'No remarks'}</span>
                      <span className="font-black text-xs">Qty: {trx.quantity}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-slate-300 font-black uppercase text-[10px]">No recent transactions</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Password Request Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                 <div className="flex items-center gap-2">
                    <div className="bg-blue-500 p-1.5 rounded-lg"><Key className="w-4 h-4 text-white" /></div>
                    <h2 className="text-xs font-black uppercase tracking-widest">Security Protocol</h2>
                 </div>
                 <button onClick={() => setIsPassModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-8">
                 {successMsg ? (
                    <div className="bg-green-50 text-green-700 p-8 rounded-3xl border border-green-200 text-center animate-in fade-in duration-300">
                       <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                       <p className="font-black text-sm uppercase tracking-tight">{successMsg}</p>
                    </div>
                 ) : (
                    <form onSubmit={handlePasswordRequest} className="space-y-6">
                       <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-[10px] text-blue-700 font-black uppercase tracking-widest leading-relaxed">
                          SUBMIT A NEW PASSWORD. REQUESTS REQUIRE APPROVAL BY GLOBAL ADMINISTRATION BEFORE ACTIVATION.
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">New Security Password</label>
                          <input type="text" required minLength={4} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-sm transition-all shadow-inner focus:border-blue-500" placeholder="MIN 4 CHARACTERS" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                       </div>
                       {errorMsg && (
                         <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                           <AlertCircle className="w-4 h-4 shrink-0" />
                           <span>{errorMsg}</span>
                         </div>
                       )}
                       <button type="submit" disabled={isSubmitting || !newPassword} className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95">
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {isSubmitting ? 'TRANSMITTING...' : 'COMMIT REQUEST'}
                       </button>
                    </form>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;