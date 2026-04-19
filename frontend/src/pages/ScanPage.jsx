import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedLayout } from "../components/ProtectedLayout";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import api from "../lib/api";
import { toast } from "sonner";
import { ScanLine, Camera, StopCircle, Keyboard, ExternalLink, AlertTriangle } from "lucide-react";

const READER_ID = "qr-reader";

const isInIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  useEffect(() => {
    // Detect if we're in an iframe without camera permission policy
    if (isInIframe()) setIframeBlocked(true);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount — guard against double-stop
      const s = scannerRef.current;
      if (s) {
        try {
          const state = s.getState();
          if (
            state === Html5QrcodeScannerState.SCANNING ||
            state === Html5QrcodeScannerState.PAUSED
          ) {
            s.stop().then(() => s.clear()).catch(() => {});
          } else {
            try { s.clear(); } catch {}
          }
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const safeStop = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const state = s.getState();
      if (
        state === Html5QrcodeScannerState.SCANNING ||
        state === Html5QrcodeScannerState.PAUSED
      ) {
        await s.stop();
      }
      try { s.clear(); } catch {}
    } catch {}
    scannerRef.current = null;
  };

  const parseAndRoute = async (decoded) => {
    if (handledRef.current) return;
    handledRef.current = true;
    let batchId = (decoded || "").trim();
    if (batchId.startsWith("SB|")) batchId = batchId.split("|")[1];
    else if (batchId.includes("/trace/")) batchId = batchId.split("/trace/")[1].split(/[?#]/)[0];
    if (!batchId) {
      toast.error("Could not read QR");
      handledRef.current = false;
      return;
    }
    try {
      const { data } = await api.get(`/batches/${batchId}`);
      if (data.stage === 1) navigate(`/batch/${batchId}/stage2`);
      else if (data.stage === 2) navigate(`/batch/${batchId}/stage3`);
      else navigate(`/batch/${batchId}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Batch not found");
      handledRef.current = false;
    }
  };

  const startScan = async () => {
    if (scanning) return;
    handledRef.current = false;

    // Pre-flight: explicitly request camera permission to trigger browser prompt.
    // This gives a clearer error than html5-qrcode's internal failure.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Camera API not supported in this browser");
      return;
    }
    try {
      const preStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Stop the preflight stream immediately — html5-qrcode will open its own
      preStream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        if (iframeBlocked) {
          toast.error("This preview blocks the camera. Tap ‘Open in new tab’ above to scan.", { duration: 6000 });
        } else {
          toast.error("Camera permission denied. Enable camera access in browser settings.", { duration: 6000 });
        }
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        toast.error("No camera found. Use manual entry below.");
      } else if (name === "NotReadableError") {
        toast.error("Camera is in use by another app.");
      } else {
        toast.error("Could not access camera: " + (err?.message || name));
      }
      return;
    }

    setScanning(true);
    // Wait a tick so React renders the empty reader div before html5-qrcode grabs it
    await new Promise((r) => setTimeout(r, 50));
    try {
      const instance = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          await safeStop();
          setScanning(false);
          parseAndRoute(decoded);
        },
        () => {}
      );
    } catch (err) {
      await safeStop();
      setScanning(false);
      toast.error("Could not start scanner: " + (err?.message || String(err)));
    }
  };

  const stopScan = async () => {
    await safeStop();
    setScanning(false);
  };

  const manualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) parseAndRoute(manualId);
  };

  return (
    <ProtectedLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#F28C28] font-semibold mb-2">
            <ScanLine size={14} /> QR Scanner
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1A4331] tracking-tight">Scan Batch QR</h1>
          <p className="text-[#56675B] mt-1 text-sm">Point your camera at a batch QR to continue production</p>
        </div>

        {iframeBlocked && (
          <div className="mb-4 bg-[#FFF8E7] border border-[#F28C28]/40 rounded-xl p-4 flex items-start gap-3" data-testid="iframe-warning">
            <AlertTriangle className="text-[#D97B20] flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-[#1A4331]">Camera blocked in preview</div>
              <p className="text-[#56675B] mt-0.5">
                This page is embedded in a preview that blocks the camera. Open it in a new tab (or on your phone) to enable scanning.
              </p>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="scan-open-new-tab"
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-[#F28C28] hover:text-[#D97B20]"
              >
                Open in new tab <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}

        <div className="bg-white border border-[#D8E0D9] rounded-2xl p-6 card-elevate">
          <div className="relative rounded-xl overflow-hidden bg-[#F3F5F1] min-h-[280px]">
            {/* Reader container must remain empty so html5-qrcode can own the DOM safely */}
            <div id={READER_ID} data-testid="qr-reader-container" className="w-full" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                <Camera className="text-[#4C8A53] mb-2" size={48} />
                <p className="text-sm text-[#56675B]">Tap “Start Camera” to scan a QR code</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 justify-center">
            {!scanning ? (
              <button
                onClick={startScan}
                data-testid="scan-start-button"
                className="flex-1 bg-[#1A4331] text-white hover:bg-[#245A42] rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2"
              >
                <Camera size={18} /> Start Camera
              </button>
            ) : (
              <button
                onClick={stopScan}
                data-testid="scan-stop-button"
                className="flex-1 bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2"
              >
                <StopCircle size={18} /> Stop
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#56675B] font-semibold mb-2">
            <Keyboard size={14} /> Or enter manually
          </div>
          <form onSubmit={manualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="e.g. BM20260215143022-110001"
              data-testid="scan-manual-input"
              className="flex-1 border border-[#D8E0D9] rounded-lg p-3 bg-white focus:ring-2 focus:ring-[#4C8A53] outline-none"
            />
            <button
              type="submit"
              data-testid="scan-manual-submit"
              className="bg-[#F28C28] text-white hover:bg-[#D97B20] rounded-xl px-5 py-3 font-medium"
            >
              Go
            </button>
          </form>
        </div>
      </div>
    </ProtectedLayout>
  );
}
