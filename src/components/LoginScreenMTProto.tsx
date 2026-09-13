import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, QrCode, ArrowLeft, ShieldCheck } from 'lucide-react';
import { mtprotoService } from '../services/mtproto';
import QRCode from 'qrcode';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [step, setStep] = useState<'method' | 'phone' | 'code' | 'qr'>('method');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) { setError('Please enter your phone number'); return; }
    setLoading(true); setError('');
    try {
      const result = await mtprotoService.loginWithPhone(phoneNumber);
      setPhoneCodeHash(result.phoneCodeHash);
      setStep('code');
    } catch (err: any) { setError(err.message || 'Failed to send code'); }
    finally { setLoading(false); }
  };

  const handleCodeVerification = async () => {
    if (!code.trim()) { setError('Please enter the verification code'); return; }
    setLoading(true); setError('');
    try {
      await mtprotoService.verifyPhoneCode(phoneNumber, code, phoneCodeHash);
      onLoginSuccess();
    } catch (err: any) { setError(err.message || 'Invalid code'); }
    finally { setLoading(false); }
  };

  const handleQRLogin = async () => {
    setLoading(true); setError(''); setStep('qr');
    try {
      await mtprotoService.loginWithQR(async (url: string) => {
        const image = await QRCode.toDataURL(url);
        setQrImage(image);
      });
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'QR login failed');
      setStep('method');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-base)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }} className="w-full max-w-[420px]">
        <div className="surface-card rounded-[32px] p-8 md:p-10 shadow-2xl shadow-black/40">
          {/* Brand */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-[24px] flex items-center justify-center shadow-xl shadow-[rgba(99,102,241,0.15)]" style={{ background: 'var(--accent)' }}>
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69-.01-.03-.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/></svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>TeleCloud</h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Unlimited storage powered by Telegram</p>
          </div>

          {step === 'method' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <button onClick={() => setStep('phone')} className="btn btn-primary w-full rounded-2xl py-4 text-sm font-extrabold shadow-lg shadow-[rgba(99,102,241,0.15)]">
                <Phone className="w-4 h-4" /> Login with Phone
              </button>
              <button onClick={handleQRLogin} disabled={loading} className="btn btn-secondary w-full rounded-2xl py-4 text-sm font-extrabold">
                <QrCode className="w-4 h-4" /> {loading ? 'Generating...' : 'Login with QR'}
              </button>
              <div className="pt-3 surface-card rounded-2xl p-4 border border-[var(--border-subtle)]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="text-xs font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>End-to-End Secure</p>
                    <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>Your files stay in your Telegram channel. Nothing touches external servers.</p>
                  </div>
                </div>
              </div>
              {error && <div className="p-3.5 rounded-2xl border border-[rgba(244,63,94,0.2)]" style={{ background: 'rgba(244,63,94,0.06)' }}><p className="text-xs font-bold" style={{ color: 'var(--error)' }}>{error}</p></div>}
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button onClick={() => setStep('method')} className="btn btn-ghost text-xs font-extrabold -ml-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
              <label className="text-xs font-extrabold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
              <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1 555 019 2834" className="input rounded-2xl py-3.5 text-base" autoFocus onKeyDown={e => e.key === 'Enter' && handlePhoneLogin()} />
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-disabled)' }}>Include country code</p>
              {error && <div className="p-3 rounded-2xl border border-[rgba(244,63,94,0.2)]" style={{ background: 'rgba(244,63,94,0.06)' }}><p className="text-xs font-bold" style={{ color: 'var(--error)' }}>{error}</p></div>}
              <button onClick={handlePhoneLogin} disabled={loading} className="btn btn-primary w-full rounded-2xl py-4 text-sm font-extrabold shadow-lg shadow-[rgba(99,102,241,0.15)]">Send Code</button>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button onClick={() => setStep('phone')} className="btn btn-ghost text-xs font-extrabold -ml-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
              <div className="surface-card p-4 rounded-2xl border border-[rgba(34,197,94,0.2)]" style={{ background: 'rgba(34,197,94,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg className="w-4 h-4" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold" style={{ color: 'var(--success)' }}>Code sent</p>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{phoneNumber}</p>
                  </div>
                </div>
              </div>
              <label className="text-xs font-extrabold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>Verification Code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="• • • • •" maxLength={5} className="input rounded-2xl py-3.5 text-center text-xl tracking-[0.25em] font-mono" autoFocus onKeyDown={e => e.key === 'Enter' && handleCodeVerification()} />
              {error && <div className="p-3 rounded-2xl border border-[rgba(244,63,94,0.2)]" style={{ background: 'rgba(244,63,94,0.06)' }}><p className="text-xs font-bold" style={{ color: 'var(--error)' }}>{error}</p></div>}
              <button onClick={handleCodeVerification} disabled={loading || code.length < 5} className="btn btn-primary w-full rounded-2xl py-4 text-sm font-extrabold shadow-lg shadow-[rgba(99,102,241,0.15)]">Verify & Login</button>
            </motion.div>
          )}

          {step === 'qr' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button onClick={() => setStep('method')} className="btn btn-ghost text-xs font-extrabold -ml-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
              <div className="text-center">
                <p className="text-sm font-extrabold mb-5" style={{ color: 'var(--text-secondary)' }}>Scan with Telegram</p>
                {qrImage && <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} className="inline-block p-4 bg-white rounded-[24px] shadow-2xl shadow-black/20"><img src={qrImage} alt="QR" className="w-56 h-56 rounded-xl" /></motion.div>}
                {loading && <div className="flex items-center justify-center gap-2 mt-5"><span className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /><span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Waiting for scan...</span></div>}
              </div>
              <div className="surface-card p-4 rounded-2xl border border-[rgba(56,189,248,0.15)]" style={{ background: 'rgba(56,189,248,0.05)' }}>
                <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>How to scan:</strong> Telegram → Settings → Devices → Scan QR Code</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
