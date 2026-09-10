import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 shadow-lg text-sm text-white border backdrop-blur-sm animate-in ${
              t.type === "error"
                ? "bg-red-500/15 border-red-500/30"
                : t.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30"
                : "bg-midnight-800 border-midnight-600"
            }`}
          >
            {t.type === "error" && <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />}
            {t.type === "success" && <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info size={16} className="text-signal-400 shrink-0 mt-0.5" />}
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-white/40 hover:text-white shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
