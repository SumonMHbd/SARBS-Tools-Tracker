import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, RefreshCw, Smartphone, Share, Info, ChevronDown, ChevronUp, DownloadCloud, Plus, AlertCircle, Settings, Check, ExternalLink } from 'lucide-react';
import { LOGO_URL } from '../constants';
import { getScriptUrl, setCustomScriptUrl } from '../services/sheetService';

interface LoginProps {
  onLogin: (credentials: { id: string, password?: string }) => void;
  isSyncing: boolean;
  lastSync: string;
  onRefresh: () => void;
  isOnline: boolean;
  installPrompt: any;
  onInstall: () => void;
  isStandalone: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
  syncSuccess?: boolean;
}

const Login: React.FC<LoginProps> = ({ 
  onLogin, 
  isSyncing, 
  lastSync, 
  onRefresh, 
  isOnline,
  installPrompt,
  onInstall,
  isStandalone,
  errorMessage,
  onClearError,
  syncSuccess
}) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(getScriptUrl());
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  useEffect(() => {
    try {
      const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '';
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    } catch {
      setIsIOS(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ id: id.trim(), password: password.trim() });
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomScriptUrl(customUrl);
    setSavedUrlSuccess(true);
    setTimeout(() => {
      setSavedUrlSuccess(false);
      setShowConfig(false);
      onRefresh();
    }, 800);
  };

  const handleQuickFillAdmin = (autoSubmit = false) => {
    setId('ADMIN');
    setPassword('admin');
    if (onClearError) onClearError();
    if (autoSubmit) {
      onLogin({ id: 'ADMIN', password: 'admin' });
    }
  };

  const handleQuickFillEmployee = (autoSubmit = false) => {
    setId('RESCUE');
    setPassword('12345');
    if (onClearError) onClearError();
    if (autoSubmit) {
      onLogin({ id: 'RESCUE', password: '12345' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Top Branding Section (Premium Dark Theme) */}
        <div className="bg-slate-900 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            title="Google Sheet Settings"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1 border border-slate-700"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white p-5 rounded-full shadow-2xl mb-5 border-4 border-slate-800 ring-8 ring-slate-800/10 transition-transform hover:scale-105">
              <img src={LOGO_URL} alt="SARBS" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-xl font-black text-white mb-1 uppercase tracking-tight text-center">SARBS Communications Ltd.</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Tools Inventory System</p>
          </div>
        </div>
        
        {/* Sync & Connectivity Status */}
        <div className="bg-slate-50 px-8 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {isOnline ? (lastSync ? `Synced (${lastSync})` : 'Cloud Active') : 'Offline Mode'}
            </span>
          </div>
          <button 
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50 px-2.5 py-1 rounded-md transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud'}
          </button>
        </div>

        {/* Google Sheet URL Config drawer if toggled */}
        {showConfig && (
          <div className="bg-slate-900 text-white p-6 border-b border-slate-800 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider">Google Sheet Web App URL</span>
              </div>
              <button 
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveUrl} className="space-y-3">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  {savedUrlSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                  {savedUrlSuccess ? 'Saved & Syncing' : 'Save & Reconnect'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-8 sm:p-10 pt-6">
          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs w-full">
                <p className="font-bold text-red-900">{errorMessage}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFillAdmin(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95"
                  >
                    Login as Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFillEmployee(true)}
                    className="px-3 py-1.5 bg-white border border-red-300 hover:bg-red-50 text-red-800 rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95"
                  >
                    Login as Employee
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Official ID / Name</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-800 text-sm"
                  placeholder="e.g. ADMIN or EMP ID"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    if (onClearError) onClearError();
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Security Key / Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-800 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (onClearError) onClearError();
                  }}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 sm:py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
            >
              {isSyncing && <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />}
              {isSyncing ? 'Access Portal (Syncing...)' : 'Access Portal'}
            </button>
          </form>

          {/* Quick Credential Helpers */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuickFillAdmin(false)}
                className="text-slate-600 hover:text-blue-600 font-bold transition-colors underline decoration-slate-300 hover:decoration-blue-500"
              >
                Admin (ADMIN/admin)
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleQuickFillEmployee(false)}
                className="text-slate-600 hover:text-blue-600 font-bold transition-colors underline decoration-slate-300 hover:decoration-blue-500"
              >
                Employee (RESCUE/12345)
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-blue-600 hover:text-blue-800 font-bold transition-colors flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" /> Sheet URL
            </button>
          </div>

          {/* Installation Zone */}
          {!isStandalone && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              {installPrompt ? (
                <button 
                  onClick={onInstall}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] animate-pulse hover:animate-none border border-blue-400 ring-4 ring-blue-500/10"
                >
                  <DownloadCloud className="w-5 h-5" />
                  Install SARBS Tools App
                </button>
              ) : (
                <div className="bg-slate-50 rounded-3xl p-4 border border-slate-200 group">
                  <button 
                    onClick={() => setShowInstallGuide(!showInstallGuide)}
                    className="w-full flex items-center justify-between text-slate-600"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Setup Official App</span>
                    </div>
                    {showInstallGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showInstallGuide && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed text-center px-2 italic">
                        Install the application to your home screen for offline access and native behavior.
                      </p>
                      {isIOS ? (
                        <div className="space-y-2">
                          <span className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl text-[10px] font-black text-slate-800 border border-slate-100 shadow-sm">
                            <div className="bg-blue-50 p-1 rounded-md"><Share className="w-3 h-3 text-blue-600" /></div>
                            1. Tap Share in Safari
                          </span>
                          <span className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl text-[10px] font-black text-slate-800 border border-slate-100 shadow-sm">
                            <div className="bg-blue-50 p-1 rounded-md"><Plus className="w-3 h-3 text-blue-600" /></div>
                            2. 'Add to Home Screen'
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl text-[10px] font-black text-slate-800 border border-slate-100 shadow-sm">
                            <Info className="w-4 h-4 text-blue-600" /> 1. Tap Menu (⋮) top right
                          </span>
                          <span className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl text-[10px] font-black text-slate-800 border border-slate-100 shadow-sm">
                            <Smartphone className="w-4 h-4 text-blue-600" /> 2. 'Install App' or 'Add'
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-[9px] text-slate-300 font-black uppercase tracking-tighter">
              © {new Date().getFullYear()} SARBS Communications Ltd. 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;