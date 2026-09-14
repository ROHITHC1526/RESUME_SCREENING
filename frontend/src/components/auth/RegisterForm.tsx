import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, Shield, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export const RegisterForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'recruiter' | 'admin'>('recruiter');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // Password strength logic
  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role
      });
      const { user, access_token, refresh_token } = res.data;
      setAuth(user, access_token, refresh_token);
      navigate('/jobs');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start gap-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-paper-200 uppercase tracking-wider mb-1 font-mono">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-paper-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Jenkins"
              className="w-full pl-10 pr-4 py-2.5 bg-ink-900/90 border border-ink-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand text-white text-xs placeholder:text-gray-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-paper-200 uppercase tracking-wider mb-1 font-mono">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-paper-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="s.jenkins@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-ink-900/90 border border-ink-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand text-white text-xs placeholder:text-gray-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-paper-200 uppercase tracking-wider mb-1 font-mono">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-paper-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-ink-900/90 border border-ink-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand text-white text-xs placeholder:text-gray-500 transition-all shadow-inner"
            />
          </div>

          {/* Strength Indicator */}
          {password && (
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    strength >= level
                      ? level <= 1
                        ? 'bg-red-400'
                        : level <= 2
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-ink-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-paper-200 uppercase tracking-wider mb-1 font-mono">
            Organization Role
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                role === 'recruiter'
                  ? 'bg-amber-brand/20 border-amber-brand text-amber-300 shadow-sm'
                  : 'bg-ink-900/60 border-ink-700 text-gray-400 hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" /> Recruiter
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                role === 'admin'
                  ? 'bg-amber-brand/20 border-amber-brand text-amber-300 shadow-sm'
                  : 'bg-ink-900/60 border-ink-700 text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 py-3 px-6 bg-gradient-to-r from-amber-brand to-amber-hover hover:from-amber-500 hover:to-amber-brand text-ink-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-amber-brand/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-ink-900" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Recruiter Account</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-ink-700/60 text-center text-xs text-paper-300">
        Already have an account?{' '}
        <Link to="/login" className="text-amber-brand hover:text-amber-300 font-bold transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
};
