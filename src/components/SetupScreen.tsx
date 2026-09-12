import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, Check } from 'lucide-react';

export default function SetupScreen() {
  const steps = [
    { num: 1, title: 'Get API Credentials', desc: 'Visit my.telegram.org and login with your phone number', link: 'https://my.telegram.org' },
    { num: 2, title: 'Create an Application', desc: 'Click "API development tools" and create a new app' },
    { num: 3, title: 'Copy Your Credentials', desc: 'Copy your api_id and api_hash values' },
    { num: 4, title: 'Configure Environment', desc: 'Add VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH to your hosting' },
    { num: 5, title: 'Rebuild & Deploy', desc: 'Run npm run build and redeploy your app' },
  ];

  return (
    <div className="h-screen flex items-center justify-center mesh-gradient relative overflow-hidden p-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/4 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full relative z-10"
      >
        <div className="glass-strong rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Setup Required</h1>
            <p className="text-zinc-400 text-sm">Configure Telegram API credentials to continue</p>
          </div>

          <div className="space-y-3 mb-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="flex items-start gap-4 p-4 rounded-xl border"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.num}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{step.title}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {step.desc}
                    {step.link && (
                      <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1 inline-flex items-center gap-0.5">
                        {step.link} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl p-4 mb-4 border" style={{ background: 'rgba(59, 130, 246, 0.06)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
            <p className="text-blue-300 text-xs leading-relaxed">
              <strong>Environment Variables:</strong><br />
              <code className="bg-black/30 px-1.5 py-0.5 rounded text-[11px] font-mono text-green-300">VITE_TELEGRAM_API_ID</code><br />
              <code className="bg-black/30 px-1.5 py-0.5 rounded text-[11px] font-mono text-green-300">VITE_TELEGRAM_API_HASH</code>
            </p>
          </div>

          <p className="text-center text-zinc-500 text-xs">
            After configuring, refresh this page to continue
          </p>
        </div>
      </motion.div>
    </div>
  );
}
