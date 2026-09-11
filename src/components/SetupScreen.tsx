import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function SetupScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/50">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Setup Required</h1>
            <p className="text-gray-400">Telegram API credentials need to be configured</p>
          </div>

          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">What You Need to Do</h2>
              
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Get API Credentials from Telegram</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Go to <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">
                        my.telegram.org <ExternalLink className="w-3 h-3" />
                      </a> and login with your phone number
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Create an Application</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Click "API development tools" and create a new app (any name works)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Copy Your Credentials</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Copy your <code className="bg-white/10 px-2 py-0.5 rounded">api_id</code> and <code className="bg-white/10 px-2 py-0.5 rounded">api_hash</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-white">Configure Environment Variables</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add these to your hosting platform's environment variables:
                    </p>
                    <div className="mt-2 bg-black/30 rounded-lg p-3 font-mono text-xs">
                      <p className="text-green-400">VITE_TELEGRAM_API_ID=<span className="text-gray-400">your_api_id</span></p>
                      <p className="text-green-400">VITE_TELEGRAM_API_HASH=<span className="text-gray-400">your_api_hash</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    5
                  </div>
                  <div>
                    <p className="font-semibold text-white">Rebuild and Deploy</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Run <code className="bg-white/10 px-2 py-0.5 rounded">npm run build</code> and redeploy your app
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-blue-300 text-sm">
                <strong>Why is this needed?</strong><br />
                TeleCloud uses Telegram's MTProto API to access your chat history directly. 
                This requires API credentials tied to your Telegram account. 
                The credentials are free to obtain and only take a few minutes to set up.
              </p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <p className="text-purple-300 text-sm">
                <strong>For Vercel Users:</strong><br />
                Go to your project settings → Environment Variables → Add the two variables above → Redeploy
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-sm">
                After configuring the credentials, refresh this page to continue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
