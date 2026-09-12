import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function SetupScreen() {
  const steps = [
    { num: 1, title: 'Get API Credentials', desc: 'Visit my.telegram.org and login with your phone number', link: 'https://my.telegram.org' },
    { num: 2, title: 'Create an Application', desc: 'Click "API development tools" and create a new app' },
    { num: 3, title: 'Copy Your Credentials', desc: 'Copy your api_id and api_hash values' },
    { num: 4, title: 'Configure Environment', desc: 'Add VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH to your hosting' },
    { num: 5, title: 'Rebuild & Deploy', desc: 'Run npm run build and redeploy your app' },
  ];

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full mx-4"
      >
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-5 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <AlertCircle className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Setup Required</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure Telegram API credentials to continue</p>
          </div>

          <div className="space-y-3 mb-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="card p-4 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>
                  <span className="text-sm font-bold">{step.num}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{step.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {step.desc}
                    {step.link && (
                      <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-1" style={{ color: 'var(--accent)' }}>
                        {step.link} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="card p-4 mb-4" style={{ borderColor: 'rgba(56, 189, 248, 0.2)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong>Environment Variables:</strong><br />
              <code className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--success)' }}>VITE_TELEGRAM_API_ID</code><br />
              <code className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--success)' }}>VITE_TELEGRAM_API_HASH</code>
            </p>
          </div>

          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            After configuring, refresh this page to continue
          </p>
        </div>
      </motion.div>
    </div>
  );
}
