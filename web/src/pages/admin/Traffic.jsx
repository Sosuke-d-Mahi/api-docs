import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Traffic() {
    const { user } = useAuth();
    const [traffic, setTraffic] = useState([]);
    const [loading, setLoading] = useState(true);
    const [banning, setBanning] = useState(null);

    const fetchTraffic = async () => {
        if (!user || !user.apikey) return;

        try {
            const res = await axios.get('/api/admin/traffic', {
                headers: { 'Authorization': user.apikey }
            });
            if (res.data.status && Array.isArray(res.data.data)) {
                setTraffic(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTraffic();
        const interval = setInterval(fetchTraffic, 2000); // Poll every 2s for live feel
        return () => clearInterval(interval);
    }, [user]);

    const handleBan = async (ip) => {
        if (!confirm(`Are you sure you want to ban ${ip}?`)) return;
        setBanning(ip);

        try {
            await axios.post('/api/admin/ban-ip', { ip }, {
                headers: { 'Authorization': user.apikey }
            });
        } catch (e) {
            alert('Failed to ban IP');
        } finally {
            setBanning(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Live Traffic Log</h1>
            <p className="text-slate-400 mb-8">Real-time usage history (Last 50 requests).</p>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-purple-300 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold">Time</th>
                                <th className="p-4 font-bold">IP Address</th>
                                <th className="p-4 font-bold">Location</th>
                                <th className="p-4 font-bold">Path</th>
                                <th className="p-4 font-bold">ISP</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && traffic.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-purple-200">Loading live traffic...</td></tr>
                            ) : traffic.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-purple-200">No traffic recorded yet.</td></tr>
                            ) : (
                                traffic.map((t, i) => (
                                    <>
                                        <tr key={t._id || i}
                                            onClick={() => setBanning(banning === t._id ? null : t._id)} // Toggle detail view
                                            className="hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            <td className="p-4 text-slate-300 text-sm whitespace-nowrap">
                                                {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Just now'}
                                            </td>
                                            <td className="p-4 font-mono text-white font-medium">
                                                {t.ip}
                                            </td>
                                            <td className="p-4 text-sm text-slate-300">
                                                {t.city || 'Unknown'}, {t.country || 'Unknown'}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-emerald-400 truncate max-w-[200px]">
                                                {t.path}
                                            </td>
                                            <td className="p-4 text-xs text-slate-400">
                                                {t.isp || 'Unknown'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleBan(t.ip); }}
                                                    className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded transition-colors"
                                                >
                                                    Ban
                                                </button>
                                            </td>
                                        </tr>
                                        {banning === t._id && ( // Expand for details (using banning state var for expansion ID temporarily to save lines or rename it)
                                            <tr>
                                                <td colSpan="6" className="p-0">
                                                    <div className="bg-slate-900/50 p-6 border-y border-slate-800 animate-in fade-in slide-in-from-top-2">
                                                        <div className="grid md:grid-cols-2 gap-6">
                                                            <div>
                                                                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                                                    <Shield size={16} className="text-purple-500" /> IP Intelligence
                                                                </h4>
                                                                <div className="space-y-2 text-sm">
                                                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                                                        <span className="text-slate-400">ISP / Org</span>
                                                                        <span className="text-white">{t.isp} / {t.org || '-'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                                                        <span className="text-slate-400">Location</span>
                                                                        <span className="text-white">{t.city}, {t.region}, {t.country} {t.postal}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                                                        <span className="text-slate-400">Timezone</span>
                                                                        <span className="text-white">{t.timezone || 'UTC'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                                                        <span className="text-slate-400">User Agent</span>
                                                                        <span className="text-white truncate max-w-[300px]" title={t.userAgent}>{t.userAgent}</span>
                                                                    </div>
                                                                    <div className="flex justify-between pt-2">
                                                                        <span className="text-slate-400">Method</span>
                                                                        <span className="font-mono text-emerald-400">{t.method || 'GET'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-lg overflow-hidden border border-slate-700 h-[250px] bg-slate-800 relative">
                                                                {t.lat ? (
                                                                    <iframe
                                                                        width="100%"
                                                                        height="100%"
                                                                        frameBorder="0"
                                                                        style={{ border: 0, opacity: 0.8, filter: 'invert(90%) hue-rotate(180deg)' }}
                                                                        src={`https://www.google.com/maps?q=${t.lat},${t.lon}&output=embed`}
                                                                        allowFullScreen
                                                                    ></iframe>
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-slate-500">
                                                                        No Geo-Coordinates
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
