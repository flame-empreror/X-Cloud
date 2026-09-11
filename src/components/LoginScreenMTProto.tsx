import { useState, useRef, useEffect } from 'react';
import { telegramMTProto } from '../services/telegram-mtproto';
import { QrCode, Phone, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone' | 'phone-code' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize MTProto client
    telegramMTProto.initialize().then(() => {
      // Check if already logged in
      telegramMTProto.isLoggedIn().then((loggedIn) => {
        if (loggedIn) {
          onLoginSuccess();
        }
      });
    });
  }, [onLoginSuccess]);

  const handleQRLogin = async () => {
    if (!qrCodeRef.current) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await telegramMTProto.connect();
      await telegramMTProto.startQRCodeLogin(qrCodeRef.current);
      
      // Wait for login to complete (polling happens in the service)
      // The promise will resolve when login is successful
      setTimeout(async () => {
        const loggedIn = await telegramMTProto.isLoggedIn();
        if (loggedIn) {
          onLoginSuccess();
        }
      }, 30000); // Check after 30 seconds
    } catch (err: any) {
      setError(err.message || 'QR code login failed');
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await telegramMTProto.connect();
      const result = await telegramMTProto.startPhoneLogin(phoneNumber);
      setPhoneCodeHash(result.phoneCodeHash);
      setLoginMethod('phone-code');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phoneCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await telegramMTProto.verifyPhoneCode(phoneNumber, phoneCode, phoneCodeHash);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setLoginMethod(null);
    setError('');
    setPhoneCode('');
    setPhoneCodeHash('');
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
            <p className="text-gray-400">Login with your Telegram account</p>
          </div>

          {!loginMethod && (
            <div className="space-y-4">
              <button
                onClick={() => setLoginMethod('qr')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-3"
              >
                <QrCode className="w-5 h-5" />
                Login with QR Code
              </button>
              
              <button
                onClick={() => setLoginMethod('phone')}
                className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <Phone className="w-5 h-5" />
                Login with Phone Number
              </button>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-300 text-sm">
                  <strong>Why login with Telegram?</strong><br />
                  This gives us full access to read your chat history, so your files and folders will persist across all devices without needing local storage.
                </p>
              </div>
            </div>
          )}

          {loginMethod === 'qr' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <p className="text-white mb-4">Scan this QR code with your Telegram app</p>
                
                <div 
                  ref={qrCodeRef}
                  className="bg-white rounded-xl p-4 inline-block mb-4"
                />
                
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for scan...</span>
                  </div>
                )}

                <button
                  onClick={handleQRLogin}
                  disabled={isLoading}
                  className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50"
                >
                  Generate QR Code
                </button>
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

          {loginMethod === 'phone' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
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
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </div>
          )}

          {loginMethod === 'phone-code' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-300 text-sm">
                  Verification code sent to <strong>{phoneNumber}</strong>
                </p>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Verification Code</label>
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-2xl tracking-widest"
                />
                <p className="text-gray-400 text-xs mt-2">
                  Enter the 5-digit code from Telegram
                </p>
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
