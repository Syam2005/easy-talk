import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("et_install_dismissed") === "1"
  );

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari never fires beforeinstallprompt — show manual steps instead
    if (isIOS()) setShowIOSInstructions(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem("et_install_dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (dismissed || isStandalone() || (!deferredPrompt && !showIOSInstructions)) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-midnight-800 border border-midnight-600 rounded-xl p-4 shadow-2xl">
      <button onClick={dismiss} className="absolute top-2 right-2 text-mist/40 hover:text-white">
        <X size={14} />
      </button>

      {deferredPrompt ? (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-signal-500/20 flex items-center justify-center shrink-0">
            <Download size={18} className="text-signal-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Install Easy Talk</p>
            <p className="text-xs text-mist/50">Get the full app experience on your phone.</p>
          </div>
          <button
            onClick={install}
            className="text-xs font-semibold bg-signal-500 hover:bg-signal-400 text-white px-3 py-1.5 rounded-md shrink-0"
          >
            Install
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-signal-500/20 flex items-center justify-center shrink-0">
            <Share size={16} className="text-signal-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Add Easy Talk to your Home Screen</p>
            <p className="text-xs text-mist/50 mt-0.5">
              Tap the Share button, then "Add to Home Screen."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
