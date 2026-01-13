import { useState } from 'react';
import { User, Mail, Shield, Key, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InfoCard = ({ icon: Icon, label, value, color }) => (
    <div className="glass-panel p-4 flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
            <Icon size={24} />
        </div>
        <div className="overflow-hidden">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{label}</p>
            <p className="text-white font-medium truncate">{value}</p>
        </div>
    </div>
);

export default function Profile() {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    const copyKey = () => {
        if (!user.apikey) return;
        navigator.clipboard.writeText(user.apikey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold gradient-text mb-8">My Profile</h1>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="col-span-1 md:col-span-1 space-y-6">
                    <div className="glass-panel p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-xl shadow-purple-500/20">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-white">{user.name}</h2>
                        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {user.role}
                        </span>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-4">
                    <InfoCard icon={User} label="Username" value={`@${user.username}`} color="text-blue-400" />
                    <InfoCard icon={Mail} label="Email Address" value={user.email || "No email linked"} color="text-green-400" />

                    <div className="glass-panel p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Key className="text-purple-400" size={20} />
                                <h3 className="font-bold text-black">API Credentials</h3>
                            </div>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-4">
                            <code className="text-purple-300 font-mono text-sm truncate flex-1">
                                {user.apikey}
                            </code>
                            <button
                                onClick={copyKey}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-purple-300 hover:text-white"
                                title="Copy API Key"
                            >
                                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-300 mt-4">
                            Keep this key secret. Do not share it with others or expose it in client-side code.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
