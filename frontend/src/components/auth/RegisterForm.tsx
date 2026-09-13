import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, Shield, ArrowRight, AlertCircle, Check } from 'lucide-react';
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
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Jenkins"
              className="w-full pl-11 pr-4 py-2.5 bg-paper-50 border border-paper-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand text-ink-900 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1.5">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="s.jenkins@company.com"
              className="w-full pl-11 pr-4 py-2.5 bg-paper-50 border border-paper-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand text-ink-900 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1.5">
            Role Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                role === 'recruiter'
                  ? 'bg-amber-light border-amber-brand text-amber-brand shadow-sm font-semibold'
                  : 'bg-paper-50 border-paper-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <UserIcon className="w-4 h-4" /> Technical Recruiter
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                role === 'admin'
                  ? 'bg-ink-900 border-ink-900 text-paper-50 shadow-sm font-semibold'
                  : 'bg-paper-50 border-paper-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <Shield className="w-4 h-4" /> Hiring Admin
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-11 pr-4 py-2.5 bg-paper-50 border border-paper-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-brand text-ink-900 text-sm"
            />
          </div>

          {/* Password Strength Meter */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${strength >= 1 ? 'w-1/4 bg-red-400' : ''}`} />
                <div className={`h-full transition-all ${strength >= 2 ? 'w-1/4 bg-amber-400' : ''}`} />
                <div className={`h-full transition-all ${strength >= 3 ? 'w-1/4 bg-blue-400' : ''}`} />
                <div className={`h-full transition-all ${strength >= 4 ? 'w-1/4 bg-emerald-brand' : ''}`} />
              </div>
              <p className="text-[11px] text-gray-500 font-mono">
                Strength: {['Weak', 'Fair', 'Good', 'Strong'][Math.max(0, strength - 1)] || 'Weak'}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-6 bg-amber-brand hover:bg-amber-hover text-white font-medium text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : (
            <>
              Register Recruiter Profile
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-paper-200 text-center text-sm text-gray-600">
        Already registered?{' '}
        <Link to="/login" className="text-ink-900 hover:underline font-semibold">
          Sign In
        </Link>
      </div>
    </div>
  );
};
