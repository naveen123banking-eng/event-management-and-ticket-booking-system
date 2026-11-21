import React, { useState } from 'react';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  ShieldCheck, 
  RefreshCw,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ScannerPage() {
  const { showToast } = useAuth();
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [history, setHistory] = useState([]);

  const handleValidate = async (codeToTest = qrCodeInput) => {
    const code = codeToTest.trim();
    if (!code) {
      showToast('Please enter or scan a QR code.', 'error');
      return;
    }

    try {
      setScanning(true);
      const res = await api.validateTicketQR(code);
      setScanResult(res);
      setHistory((prev) => [{ ...res, code, timestamp: new Date() }, ...prev.slice(0, 9)]);

      if (res.result === 'VALID') {
        showToast('Ticket VALID! Access granted.', 'success');
      } else if (res.result === 'ALREADY_USED') {
        showToast('Ticket ALREADY USED! Duplicate entry prevented.', 'error');
      }
    } catch (err) {
      const errRes = {
        result: 'INVALID',
        message: err.message || 'Ticket code not recognized in system database.',
      };
      setScanResult(errRes);
      setHistory((prev) => [{ ...errRes, code, timestamp: new Date() }, ...prev.slice(0, 9)]);
      showToast('Ticket INVALID!', 'error');
    } finally {
      setScanning(false);
    }
  };

  const sampleTickets = [
    { label: 'Arijit Concert Ticket (Valid)', code: 'TKT-ESH-261220-ARJ789-01' },
    { label: 'Tech Summit Pass (Valid)', code: 'TKT-ESH-261227-TCH441-01' },
    { label: 'Counterfeit / Random Code', code: 'TKT-FAKE-INVALID-999' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <QrCode className="w-7 h-7 text-[#7047EB]" />
          <span>Gate Entrance QR Ticket Validator</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Scan attendee QR codes to verify authenticity, prevent duplicate entry, and grant venue admission.
        </p>
      </div>

      {/* Main Scanner Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Scanner Viewfinder (7 cols) */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-600" />
              <span>Camera Viewfinder</span>
            </span>
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              {cameraActive ? 'Pause Camera' : 'Resume Camera'}
            </button>
          </div>

          {/* Simulated Active Scanner Camera Frame */}
          <div className="relative h-64 md:h-72 rounded-2xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800">
            {cameraActive ? (
              <>
                {/* Target scanning reticle */}
                <div className="relative w-48 h-48 border-2 border-purple-500/80 rounded-2xl flex items-center justify-center">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-400" />

                  {/* Laser Scanning Line Animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_#a855f7] animate-bounce" />
                </div>
                <span className="text-[11px] text-purple-300 font-mono mt-3">
                  Align attendee QR code inside frame
                </span>
              </>
            ) : (
              <div className="text-center text-slate-500 text-xs">
                Camera paused. Use manual input or quick test below.
              </div>
            )}
          </div>

          {/* Manual Input Bar */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Manual QR Code Input / Barcode Scanner
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Paste or type TKT-..."
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={() => handleValidate()}
                disabled={scanning}
                className="px-5 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4ec2] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate Pass'}
              </button>
            </div>
          </div>

          {/* Quick 1-Click Test Scans */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block mb-2">
              Quick Test Seeded Tickets (1-Click Simulation):
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleTickets.map((st, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQrCodeInput(st.code);
                    handleValidate(st.code);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scan Result Feedback (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Active Result Card */}
          {scanResult ? (
            <div
              className={`rounded-3xl p-6 border-2 shadow-lg transition-all text-center space-y-4 ${
                scanResult.result === 'VALID'
                  ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950'
                  : scanResult.result === 'ALREADY_USED'
                  ? 'bg-amber-50/70 border-amber-400 text-amber-950'
                  : 'bg-rose-50/70 border-rose-400 text-rose-950'
              }`}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md">
                {scanResult.result === 'VALID' && (
                  <div className="w-full h-full rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                )}
                {scanResult.result === 'ALREADY_USED' && (
                  <div className="w-full h-full rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                )}
                {scanResult.result === 'INVALID' && (
                  <div className="w-full h-full rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <XCircle className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div>
                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                  scanResult.result === 'VALID'
                    ? 'bg-emerald-200 text-emerald-900'
                    : scanResult.result === 'ALREADY_USED'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-rose-200 text-rose-900'
                }`}>
                  {scanResult.result.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-black mt-2">
                  {scanResult.message}
                </h3>
              </div>

              {scanResult.attendee_name && (
                <div className="bg-white/80 p-4 rounded-2xl text-left space-y-1.5 text-xs text-slate-800 shadow-xs border border-black/5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attendee:</span>
                    <span className="font-bold">{scanResult.attendee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tier / Pass:</span>
                    <span className="font-bold">{scanResult.ticket_type}</span>
                  </div>
                  {scanResult.seat && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Seat:</span>
                      <span className="font-bold font-mono">{scanResult.seat}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Event:</span>
                    <span className="font-bold truncate max-w-[180px]">{scanResult.event_title}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Gate Scanner Ready</h4>
              <p className="text-xs text-slate-500">
                Scan attendee QR ticket to see verification results, seating access, and check-in status.
              </p>
            </div>
          )}

          {/* Recent Scans Log */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Recent Scans Log ({history.length})
            </h4>

            {history.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {h.attendee_name || h.code}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      h.result === 'VALID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : h.result === 'ALREADY_USED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {h.result}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-4">No scans logged this session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
