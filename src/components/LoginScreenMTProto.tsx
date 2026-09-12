import { useState } from 'react';
import { motion } from 'framer-motion';
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

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-4"
      >
        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-5 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69-.01-.03-.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>TeleCloud</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Unlimited cloud storage via Telegram</p>
          </div>

          {/* Method Selection */}
          {step === 'method' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <button
                onClick={() => setStep('phone')}
                className="btn btn-primary w-full py-3"
              >
                <Phone className="w-4 h-4" />
                Login with Phone Number
              </button>
              <button
                onClick={handleQRLogin}
                disabled={loading}
                className="btn btn-secondary w-full py-3"
              >
                <QrCode className="w-4 h-4" />
                {loading ? 'Generating QR...' : 'Login with QR Code'}
              </button>

              <div className="pt-4">
                <div className="card p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>End-to-End Encrypted</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your data stays on your Telegram channel</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="card p-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Phone Input */}
          {step === 'phone' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button onClick={() => setStep('method')} className="btn btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneLogin()}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Include country code</p>
              </div>
              {error && (
                <div className="card p-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
                </div>
              )}
              <button
                onClick={handlePhoneLogin}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-base)', borderTopColor: 'transparent' }} />
                    Sending code...
                  </>
                ) : 'Send Verification Code'}
              </button>
            </motion.div>
          )}

          {/* Code Verification */}
          {step === 'code' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button onClick={() => setStep('phone')} className="btn btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="card p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
                    <svg className="w-4 h-4" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>Code sent</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{phoneNumber}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • •"
                  maxLength={5}
                  className="input text-center text-xl tracking-widest"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeVerification()}
                />
              </div>
              {error && (
                <div className="card p-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
                </div>
              )}
              <button
                onClick={handleCodeVerification}
                disabled={loading || code.length < 5}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-base)', borderTopColor: 'transparent' }} />
                    Verifying...
                  </>
                ) : 'Verify & Login'}
              </button>
            </motion.div>
          )}

          {/* QR Code */}
          {step === 'qr' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button onClick={() => setStep('method')} className="btn btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Scan with your Telegram app</p>
                {qrCodeImage && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block p-4 bg-white rounded-xl"
                  >
                    <img src={qrCodeImage} alt="QR Code" className="w-56 h-56" />
                  </motion.div>
                )}
                {loading && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Waiting for scan...</span>
                  </div>
                )}
              </div>

              <div className="card p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <strong>How to scan:</strong> Telegram → Settings → Devices → Scan QR Code
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
