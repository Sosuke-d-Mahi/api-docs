import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Key, User, ArrowRight, Mail, CheckCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Register() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: ''
    });
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email.endsWith('@gmail.com')) {
            setError("Only @gmail.com addresses are allowed.");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post('/api/auth/send-otp', formData);
            if (res.data.status) {
                setStep(2);
                setError('');
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send verification code.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/api/auth/register', {
                email: formData.email,
                code: otp
            });

            if (res.data.status) {
                alert(`Account Created! Your API Key: ${res.data.apikey}`);
                navigate('/login');
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Verification Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md z-10 glass-panel p-8 md:p-10 border border-white/10 shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                        <Shield className="text-purple-500" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                    <p className="text-slate-400">Join Easir API Infrastructure</p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleSendOtp}
                            className="space-y-4"
                        >
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Gmail Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-slate-600"
                                        placeholder="user@gmail.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Username</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        name="username"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-slate-600"
                                        placeholder="Choose a username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-white/80"
                                        placeholder="Your Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        name="password"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-slate-600"
                                        placeholder="Secure password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button disabled={loading} type="submit" className="w-full btn-primary flex justify-center items-center gap-2 group mt-2">
                                {loading ? 'Sending Code...' : 'Verify Gmail'} <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleVerify}
                            className="space-y-6"
                        >
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-2">
                                    <Mail size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-black">Check your Inbox</h3>
                                <p className="text-sm text-slate-300">We sent a 6-digit code to <span className="text-white">{formData.email}</span></p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Verification Code</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                                    <input
                                        type="text"
                                        maxLength="6"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 text-white placeholder-slate-600 text-center tracking-[0.5em] font-mono text-xl uppercase"
                                        placeholder="------"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button disabled={loading} type="submit" className="w-full btn-primary flex justify-center items-center gap-2 group">
                                {loading ? 'Verifying...' : 'Complete Registration'} <CheckCircle size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-slate-500 hover:text-white transition-colors"
                            >
                                Back to Details
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="mt-8 text-center text-sm">
                    <span className="text-slate-400">Already have an account? </span>
                    <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign In</Link>
                </div>
            </motion.div>
        </div>
    );
}
