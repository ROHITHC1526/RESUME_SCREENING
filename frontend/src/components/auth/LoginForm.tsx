import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
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
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-2">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@company.com"
              className="w-full pl-11 pr-4 py-3 bg-paper-50 border border-paper-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand focus:border-amber-brand text-ink-900 text-sm transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs text-amber-brand hover:underline font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-11 pr-11 py-3 bg-paper-50 border border-paper-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand focus:border-amber-brand text-ink-900 text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink-900"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 bg-ink-900 hover:bg-ink-800 text-paper-50 font-medium text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : (
            <>
              Sign In to Intelligence Portal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-paper-200 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-amber-brand hover:underline font-semibold">
          Create Recruiter Account
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-paper-300 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-ink-900 mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your registered email address and we'll send instructions to reset your password.
            </p>
            {forgotEmailSent ? (
              <div className="p-3 bg-emerald-light border border-emerald-brand text-emerald-brand rounded-xl text-sm mb-4">
                Password reset instructions sent to your email.
              </div>
            ) : (
              <input
                type="email"
                placeholder="recruiter@company.com"
                className="w-full p-3 bg-paper-50 border border-paper-300 rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand"
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForgotModal(false); setForgotEmailSent(false); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-ink-900"
              >
                Close
              </button>
              {!forgotEmailSent && (
                <button
                  type="button"
                  onClick={() => setForgotEmailSent(true)}
                  className="px-4 py-2 text-sm bg-amber-brand text-white rounded-xl font-medium"
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
