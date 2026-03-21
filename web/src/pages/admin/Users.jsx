import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getSessionHeaders } from '../../utils/authHeaders';
import { Shield, Ban, Trash2, CreditCard, Search, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const safeText = (value, fallback = '') => String(value ?? fallback);

const safeNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNumber = (value, fallback = '0') => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString() : fallback;
};

export default function Users() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [banReason, setBanReason] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = () => {
        if (!user?.token) return;
        setLoading(true);
        axios.get('/api/admin/users', { headers: getSessionHeaders(user) })
            .then((res) => {
                setUsers(res.data.data || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
                showToast('Failed to fetch users', 'error');
            });
    };

    useEffect(() => {
        fetchUsers();
    }, [user]);

    const handleBan = async (username) => {
        if (!user?.token) return;
        setActionLoading(true);
        try {
            await axios.post('/api/admin/users/ban', { username, reason: banReason }, { headers: getSessionHeaders(user) });
            showToast(`${username} has been banned`);
            setSelectedUser(null);
            setBanReason('');
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to ban user', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnban = async (username) => {
        if (!user?.token) return;
        setActionLoading(true);
        try {
            await axios.post('/api/admin/users/unban', { username }, { headers: getSessionHeaders(user) });
            showToast(`${username} has been unbanned`);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to unban user', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (username) => {
        if (!user?.token) return;
        if (!confirm(`Are you sure you want to delete ${username}? This action cannot be undone.`)) return;
        setActionLoading(true);
        try {
            await axios.post('/api/admin/users/delete', { username }, { headers: getSessionHeaders(user) });
            showToast(`${username} has been deleted`);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete user', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateCredits = async (username) => {
        if (!user?.token) return;
        setActionLoading(true);
        try {
            const data = {};
            if (creditAmount !== '') data.credits = parseInt(creditAmount, 10);
            if (creditLimit !== '') data.creditLimit = parseInt(creditLimit, 10);

            await axios.post('/api/admin/users/credits', { username, ...data }, { headers: getSessionHeaders(user) });
            showToast(`Credits updated for ${username}`);
            setCreditAmount('');
            setCreditLimit('');
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to update credits', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredUsers = users.filter((entry) =>
        safeText(entry.username).toLowerCase().includes(search.toLowerCase()) ||
        safeText(entry.email).toLowerCase().includes(search.toLowerCase()) ||
        safeText(entry.name).toLowerCase().includes(search.toLowerCase())
    );

    if (!user || user.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                <Shield size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Admin access required</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage users, ban accounts, and control credits.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="btn-primary flex items-center gap-2"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="glass-panel mb-6">
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:border-purple-500 outline-none text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-white/5">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Credits</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((entry) => {
                                    const credits = safeNumber(entry.credits, 1000);
                                    const limit = safeNumber(entry.creditLimit, -1);

                                    return (
                                        <tr key={entry.id || entry.username} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-white">{safeText(entry.name, 'Unknown User')}</p>
                                                    <p className="text-xs text-slate-500">@{safeText(entry.username, 'unknown')}</p>
                                                    <p className="text-xs text-slate-600">{safeText(entry.email, 'No email')}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${entry.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                    {entry.role === 'admin' && <Shield size={12} />}
                                                    {safeText(entry.role, 'user')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <span className="text-white">{formatNumber(credits, '1,000')}</span>
                                                    {limit > 0 && (
                                                        <span className="text-slate-500"> / {formatNumber(limit)}</span>
                                                    )}
                                                    {limit === -1 && (
                                                        <span className="text-emerald-500 ml-1">Unlimited</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {entry.banned ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                                        <Ban size={12} /> Banned
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                                        <Check size={12} /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(entry);
                                                            setCreditAmount(String(credits));
                                                            setCreditLimit(String(limit));
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                        title="Manage Credits"
                                                    >
                                                        <CreditCard size={16} />
                                                    </button>
                                                    {entry.banned ? (
                                                        <button
                                                            onClick={() => handleUnban(entry.username)}
                                                            disabled={actionLoading}
                                                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                                            title="Unban User"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(entry);
                                                                setBanReason('');
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Ban User"
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                    )}
                                                    {entry.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleDelete(entry.username)}
                                                            disabled={actionLoading}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedUser && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-40"
                            onClick={() => setSelectedUser(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel p-6 z-50"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Manage User</h3>
                                <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-black/20 rounded-lg">
                                <p className="text-white font-medium">{safeText(selectedUser.name, 'Unknown User')}</p>
                                <p className="text-slate-500 text-sm">@{safeText(selectedUser.username, 'unknown')}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Set Credits</label>
                                    <input
                                        type="number"
                                        value={creditAmount}
                                        onChange={(e) => setCreditAmount(e.target.value)}
                                        placeholder="Current credits"
                                        className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Credit Limit (-1 for unlimited)</label>
                                    <input
                                        type="number"
                                        value={creditLimit}
                                        onChange={(e) => setCreditLimit(e.target.value)}
                                        placeholder="Max credits (-1 = unlimited)"
                                        className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white"
                                    />
                                </div>

                                <button
                                    onClick={() => handleUpdateCredits(selectedUser.username)}
                                    disabled={actionLoading || (!creditAmount && !creditLimit)}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50"
                                >
                                    Update Credits
                                </button>

                                {!selectedUser.banned && selectedUser.role !== 'admin' && (
                                    <div className="border-t border-white/5 pt-4 mt-4">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Ban Reason (optional)</label>
                                        <input
                                            type="text"
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            placeholder="Reason for ban..."
                                            className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-red-500 outline-none text-white mb-3"
                                        />
                                        <button
                                            onClick={() => handleBan(selectedUser.username)}
                                            disabled={actionLoading}
                                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Ban size={16} /> Ban User
                                        </button>
                                    </div>
                                )}

                                {selectedUser.role !== 'admin' && (
                                    <button
                                        onClick={() => handleDelete(selectedUser.username)}
                                        disabled={actionLoading}
                                        className="w-full py-2 bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-400 rounded font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Delete User
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
                            toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
                        }`}
                    >
                        {toast.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
