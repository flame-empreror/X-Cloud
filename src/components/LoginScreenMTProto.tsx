import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, QrCode, ArrowLeft, Shield, Zap } from 'lucide-react';
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
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (mtprotoService.isLoggedIn()) onLoginSuccess();
      } catch (err: any) { console.error('[LoginScreen] Auth check failed:', err); }
    };
    checkAuth();
  }, [onLoginSuccess]);

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
        setQrCodeUrl(url);
        const qrImage = await QRCode.toDataURL(url);
        setQrCodeImage(qrImage);
      });
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'QR login failed');
      setStep('method');
    } finally { setLoading(false); }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.25 } }
  };

  return (
    <div className="h-screen flex items-center justify-center mesh-gradient relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[150px] animate-float" />
      <div className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/4 rounded-full blur-[180px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-md w-full relative z-10 px-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-14 h-14 mx-auto mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-30 animate-glow-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69-.01-.03-.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">TeleCloud</h1>
          <p className="text-zinc-400 text-sm">Unlimited cloud storage via Telegram</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* ── Method Selection ── */}
            {step === 'method' && (
              <motion.div key="method" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                <button
                  onClick={() => setStep('phone')}
                  className="btn btn-primary w-full py-4 text-base"
                >
                  <Phone className="w-5 h-5" />
                  Login with Phone Number
                </button>
                <button
                  onClick={handleQRLogin}
                  disabled={loading}
                  className="btn btn-secondary w-full py-4 text-base disabled:opacity-50"
                >
                  <QrCode className="w-5 h-5" />
                  {loading ? 'Generating QR...' : 'Login with QR Code'}
                </button>

                <div className="divider my-6" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-2 border border-[var(--border-subtle)] rounded-xl p-4 text-center" style={{ background: 'var(--surface-2)' }}>
                    <Shield className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-white text-xs font-medium">End-to-End</p>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Encrypted</p>
                  </div>
                  <div className="border rounded-xl p-4 text-center" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}>
                    <Zap className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                    <p className="text-white text-xs font-medium">Unlimited</p>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Storage</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Phone Input ── */}
            {step === 'phone' && (
              <motion.div key="phone" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <button onClick={() => setStep('method')} className="btn btn-ghost text-sm -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div>
                  <label className="text-zinc-300 text-sm font-medium mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="input text-lg py-3"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneLogin()}
                  />
                  <p className="text-zinc-500 text-xs mt-2">Include country code</p>
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                <button
                  onClick={handlePhoneLogin}
                  disabled={loading}
                  className="btn btn-primary w-full py-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending code...
                    </>
                  ) : 'Send Verification Code'}
                </button>
              </motion.div>
            )}

            {/* ── Code Verification ── */}
            {step === 'code' && (
              <motion.div key="code" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <button onClick={() => setStep('phone')} className="btn btn-ghost text-sm -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-300 text-sm font-medium">Code sent</p>
                  <p className="text-green-400/70 text-xs mt-0.5">{phoneNumber}</p>
                </div>

                <div>
                  <label className="text-zinc-300 text-sm font-medium mb-2 block">Verification Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • •"
                    maxLength={5}
                    className="input text-center text-2xl tracking-[0.5em] py-4 font-mono"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeVerification()}
                  />
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleCodeVerification}
                  disabled={loading || code.length < 5}
                  className="btn btn-primary w-full py-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : 'Verify & Login'}
                </button>
              </motion.div>
            )}

            {/* ── QR Code ── */}
            {step === 'qr' && (
              <motion.div key="qr" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <button onClick={() => setStep('method')} className="btn btn-ghost text-sm -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="text-center">
                  <p className="text-zinc-300 text-sm mb-4">Scan with your Telegram app</p>
                  {qrCodeImage && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-block p-4 bg-white rounded-2xl shadow-xl"
                    >
                      <img src={qrCodeImage} alt="QR Code" className="w-56 h-56" />
                    </motion.div>
                  )}
                  {loading && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Waiting for scan...</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-4" style={{ background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                  <p className="text-blue-300 text-xs leading-relaxed">
                    <strong>How to scan:</strong><br />
                    Telegram → Settings → Devices → Scan QR Code
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Your data stays on your Telegram channel
        </p>
      </motion.div>
    </div>
  );
}
