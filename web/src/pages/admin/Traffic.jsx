import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, RefreshCw, AlertTriangle, Eye, Clock, Hash } from 'lucide-react';
import io from 'socket.io-client';

export default function Traffic() {
    const [traffic, setTraffic] = useState({});
    const [loading, setLoading] = useState(true);
    const [banning, setBanning] = useState(null);

    const fetchTraffic = () => {
        const key = localStorage.getItem("adminKey") || "easir-secret-key-123";
        axios.get('/api/admin/traffic', { headers: { 'x-admin-key': key } })
            .then(res => {
                setTraffic(res.data.data);
                setLoading(false);
            })
            .catch(console.error);
    };

    useEffect(() => {
        fetchTraffic();

        const socket = io();

        socket.on('traffic_update', (data) => {
            setTraffic(prev => ({
                ...prev,
                [data.ip]: data
            }));
        });

        return () => socket.disconnect();
    }, []);

    const handleBan = async (ip) => {
        if (!confirm(`Are you sure you want to ban ${ip}?`)) return;
        setBanning(ip);
        const key = localStorage.getItem("adminKey") || "easir-secret-key-123";
        try {
            await axios.post('/api/admin/ban-ip', { ip }, { headers: { 'x-admin-key': key } });
        } catch (e) {
            alert('Failed to ban IP');
        } finally {
            setBanning(null);
        }
    };

    const sortedTraffic = Object.values(traffic).sort((a, b) => b.lastSeen - a.lastSeen);

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-black mb-2">Live Traffic Monitor</h1>
            <p className="text-slate-400 mb-8">Real-time tracking of all IP addresses accessing the API.</p>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-purple-300 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold">IP Address</th>
                                <th className="p-4 font-bold">Requests</th>
                                <th className="p-4 font-bold">Last Seen</th>
                                <th className="p-4 font-bold">Recent Activity</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-purple-200">Loading traffic data...</td></tr>
                            ) : sortedTraffic.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-purple-200">No traffic recorded yet.</td></tr>
                            ) : (
                                sortedTraffic.map((t) => (
                                    <tr key={t.ip} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-white font-medium flex items-center gap-2">
                                            {t.ip}
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs font-bold">
                                                {t.count}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300 text-sm">
                                            {new Date(t.lastSeen).toLocaleTimeString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                {t.paths.slice(0, 2).map((p, i) => (
                                                    <span key={i} className="text-xs text-purple-200 truncate max-w-[200px] block font-mono">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleBan(t.ip)}
                                                disabled={banning === t.ip}
                                                className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded transition-colors"
                                            >
                                                {banning === t.ip ? "Banning..." : "Ban IP"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
