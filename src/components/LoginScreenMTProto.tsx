import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, QrCode, ArrowLeft } from 'lucide-react';
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
    // Check if already logged in (MTProto is already initialized in App.tsx)
    const checkAuth = async () => {
      try {
        console.log('[LoginScreen] Checking if user is logged in...');
        if (mtprotoService.isLoggedIn()) {
          console.log('[LoginScreen] User is logged in, redirecting...');
          onLoginSuccess();
        } else {
          console.log('[LoginScreen] User is not logged in, showing login screen');
        }
      } catch (err: any) {
        console.error('[LoginScreen] Auth check failed:', err);
      }
    };
    checkAuth();
  }, [onLoginSuccess]);

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await mtprotoService.loginWithPhone(phoneNumber);
      setPhoneCodeHash(result.phoneCodeHash);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async () => {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await mtprotoService.verifyPhoneCode(phoneNumber, code, phoneCodeHash);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleQRLogin = async () => {
    setLoading(true);
    setError('');
    setStep('qr');

    try {
      await mtprotoService.loginWithQR(async (url, expires) => {
        setQrCodeUrl(url);
        // Generate QR code image
        const qrImage = await QRCode.toDataURL(url);
        setQrCodeImage(qrImage);
      });
      
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'QR login failed');
      setStep('method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">TeleCloud</h1>
            <p className="text-gray-400 mb-4">Login with your Telegram account</p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {step === 'method' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('phone')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-3"
              >
                <Phone className="w-5 h-5" />
                Login with Phone Number
              </button>
              
              <button
                onClick={handleQRLogin}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <QrCode className="w-5 h-5" />
                {loading ? 'Generating QR...' : 'Login with QR Code'}
              </button>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-300 text-sm">
                  <strong>Why login with Telegram?</strong><br />
                  This gives us full access to read your chat history, so your files and folders will persist across all devices automatically.
                </p>
              </div>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('method')}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div>
                <label className="text-white text-sm mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-gray-400 text-xs mt-2">
                  Include country code (e.g., +1 for US, +44 for UK)
                </p>
              </div>

              <button
                onClick={handlePhoneLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('phone')}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-300 text-sm">
                  Code sent to <strong>{phoneNumber}</strong>
                </p>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-2xl tracking-widest"
                />
              </div>

              <button
                onClick={handleCodeVerification}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </div>
          )}

          {step === 'qr' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('method')}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <p className="text-white mb-4">Scan this QR code with your Telegram app</p>
                
                {qrCodeImage && (
                  <div className="bg-white rounded-xl p-4 inline-block mb-4">
                    <img src={qrCodeImage} alt="QR Code" className="w-64 h-64" />
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>Waiting for scan...</span>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-xs">
                  <strong>How to scan:</strong><br />
                  1. Open Telegram on your phone<br />
                  2. Go to Settings → Devices → Scan QR<br />
                  3. Point your camera at the QR code above
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
