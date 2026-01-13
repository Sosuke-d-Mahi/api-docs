import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, User, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/admin/dashboard";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (result.success) {
            navigate(from, { replace: true });
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md z-10 glass-panel p-8 md:p-10 border border-white/10 shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                        <Shield className="text-purple-500" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-black">Welcome Back</h2>
                    <p className="text-purple-200">Sign in to Easir API Control Center</p>
                </div>

                {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm mb-6">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Username or Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                            <input
                                type="text"
                                name="username"
                                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-white/80"
                                placeholder="Username or Email"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                            <input
                                type="password"
                                name="password"
                                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-white/80"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full btn-primary flex items-center justify-center gap-2"
                        disabled={loading}
                    >
                        {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
                    </button>

                    <div className="text-center text-sm">
                        <span className="text-slate-300">Don't have an account? </span>
                        <Link to="/register" className="text-purple-400 hover:text-purple-300 font-bold">Create Account</Link>
                    </div>
                </form>

                <p className="mt-8 text-center text-xs text-slate-300">
                    &copy; 2026 Easir API. Secure Infrastructure.
                </p>
            </motion.div>
        </div>
    );
}
