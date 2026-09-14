import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = res.data;
      setAuth(user, access_token, refresh_token);
      navigate('/jobs');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to authenticate. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start gap-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-paper-200 uppercase tracking-wider mb-1.5 font-mono">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-paper-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-ink-900/90 border border-ink-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand focus:border-amber-brand text-white text-xs placeholder:text-gray-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-paper-200 uppercase tracking-wider font-mono">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs text-amber-brand hover:text-amber-300 transition-colors font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-paper-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-ink-900/90 border border-ink-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand focus:border-amber-brand text-white text-xs placeholder:text-gray-500 transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-paper-100"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-amber-brand to-amber-hover hover:from-amber-500 hover:to-amber-brand text-ink-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-amber-brand/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-ink-900" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Intelligence Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-ink-700/60 text-center text-xs text-paper-300">
        Don't have an account?{' '}
        <Link to="/register" className="text-amber-brand hover:text-amber-300 font-bold transition-colors">
          Create Recruiter Account
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white">
            <h3 className="font-serif text-xl font-bold text-white mb-2">Reset Password</h3>
            <p className="text-xs text-paper-300 mb-4">
              Enter your registered email address and we'll send instructions to reset your password.
            </p>
            {forgotEmailSent ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs mb-4">
                Password reset instructions sent to your email.
              </div>
            ) : (
              <input
                type="email"
                placeholder="recruiter@company.com"
                className="w-full p-2.5 bg-ink-900 border border-ink-600 rounded-xl mb-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-brand"
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForgotModal(false); setForgotEmailSent(false); }}
                className="px-4 py-2 text-xs text-paper-300 hover:text-white"
              >
                Close
              </button>
              {!forgotEmailSent && (
                <button
                  type="button"
                  onClick={() => setForgotEmailSent(true)}
                  className="px-4 py-2 text-xs bg-amber-brand text-ink-900 font-bold rounded-xl"
                >
                  Send Reset Link
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
