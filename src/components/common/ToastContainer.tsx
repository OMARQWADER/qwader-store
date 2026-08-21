import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-notification-container"
      className="fixed bottom-5 end-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        let borderClass = 'border-violet-500/40 bg-slate-900/90 text-slate-100';
        let icon = <Info className="w-5 h-5 text-violet-400 flex-shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/40 bg-[#091b15]/95 text-emerald-100 shadow-emerald-950/50';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/40 bg-[#1c1608]/95 text-amber-100 shadow-amber-950/50';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/40 bg-[#1e0a0d]/95 text-rose-100 shadow-rose-950/50';
          icon = <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${borderClass} transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5`}
          >
            <div className="pt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold leading-tight mb-0.5">{toast.title}</h4>
              {toast.message && <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>}
            </div>
            <button
              id={`close-toast-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
