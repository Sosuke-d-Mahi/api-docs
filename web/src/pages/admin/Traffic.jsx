import { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Shield, History, Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getSessionHeaders } from '../../utils/authHeaders';

export default function Traffic() {
    const { user } = useAuth();
    const [traffic, setTraffic] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [banningIp, setBanningIp] = useState(null);
    const [activeTab, setActiveTab] = useState('live');
    const [range, setRange] = useState('24h');
    const [method, setMethod] = useState('ALL');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [currentCursor, setCurrentCursor] = useState(null);
    const [cursorHistory, setCursorHistory] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [total, setTotal] = useState(0);

    const fetchLiveTraffic = async () => {
        if (!user?.token) {
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get('/api/admin/traffic?limit=20', {
                headers: getSessionHeaders(user)
            });
            if (res.data.status && Array.isArray(res.data.data)) {
                setTraffic(res.data.data);
                setTotal(res.data.pagination?.total || res.data.data.length);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryTraffic = async (cursor = null, appliedSearch = search, appliedRange = range, appliedMethod = method) => {
        if (!user?.token) {
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '50',
                range: appliedRange,
                method: appliedMethod
            });

            if (cursor) {
                params.set('cursor', cursor);
            }

            if (appliedSearch) {
                params.set('search', appliedSearch);
            }

            const res = await axios.get(`/api/admin/traffic?${params.toString()}`, {
                headers: getSessionHeaders(user)
            });

            if (res.data.status && Array.isArray(res.data.data)) {
                setTraffic(res.data.data);
                setNextCursor(res.data.pagination?.nextCursor || null);
                setTotal(res.data.pagination?.total || res.data.data.length);
                setExpandedId(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.token || activeTab !== 'live') {
            return undefined;
        }

        fetchLiveTraffic();

        const socket = io('/', {
            path: '/socket.io',
            auth: { token: user.token }
        });

        socket.on('connect', () => {
            socket.emit('subscribe_admin_traffic');
        });

        socket.on('traffic:entry', (entry) => {
            setTraffic((prev) => [entry, ...prev.filter((item) => item._id !== entry._id)].slice(0, 20));
            setTotal((prev) => prev + 1);
        });

        return () => socket.disconnect();
    }, [activeTab, user?.token]);

    useEffect(() => {
        if (!user?.token || activeTab !== 'history') {
            return;
        }

        fetchHistoryTraffic(currentCursor, search, range, method);
    }, [activeTab, user?.token]);

    const applyFilters = () => {
        const nextSearch = searchInput.trim();
        setCursorHistory([]);
        setCurrentCursor(null);
        setNextCursor(null);
        setSearch(nextSearch);
        if (activeTab === 'history') {
            fetchHistoryTraffic(null, nextSearch, range, method);
        }
    };

    const handleOlder = () => {
        if (!nextCursor) {
            return;
        }
        const targetCursor = nextCursor;
        setCursorHistory((prev) => [...prev, currentCursor]);
        setCurrentCursor(targetCursor);
        fetchHistoryTraffic(targetCursor, search, range, method);
    };

    const handleNewer = () => {
        if (cursorHistory.length === 0) {
            return;
        }

        const previous = cursorHistory[cursorHistory.length - 1];
        setCursorHistory((prev) => prev.slice(0, -1));
        setCurrentCursor(previous);
        fetchHistoryTraffic(previous, search, range, method);
    };

    const handleBan = async (ip) => {
        if (!confirm(`Are you sure you want to ban ${ip}?`)) {
            return;
        }

        setBanningIp(ip);
        try {
            await axios.post('/api/admin/ban-ip', { ip }, {
                headers: getSessionHeaders(user)
            });
            setTraffic((prev) => prev.filter((item) => item.ip !== ip));
        } catch (error) {
            alert('Failed to ban IP');
        } finally {
            setBanningIp(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{activeTab === 'live' ? 'Live Traffic' : 'Traffic History'}</h1>
                    <p className="text-slate-400">
                        {activeTab === 'live'
                            ? 'Streaming the latest requests as they arrive.'
                            : `Filtered history with cursor pagination. Matching records: ${total}`}
                    </p>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'live'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Activity size={16} /> Live Traffic
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'history'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <History size={16} /> History
                    </button>
                </div>
            </div>

            {activeTab === 'history' && (
                <div className="glass-panel p-4 mb-6">
                    <div className="grid md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        applyFilters();
                                    }
                                }}
                                placeholder="Search IP, path, country, city, ISP..."
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 outline-none text-white"
                            />
                        </div>
                        <select
                            value={range}
                            onChange={(e) => setRange(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 outline-none text-white"
                        >
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="all">All time</option>
                        </select>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 outline-none text-white"
                        >
                            <option value="ALL">All methods</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                        <button onClick={applyFilters} className="btn-primary">
                            Apply
                        </button>
                    </div>
                </div>
            )}

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
                                <tr><td colSpan="6" className="p-8 text-center text-purple-200">Loading data...</td></tr>
                            ) : traffic.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-purple-200">No records found.</td></tr>
                            ) : (
                                traffic.map((entry, index) => (
                                    <Fragment key={entry._id || `${entry.ip}-${index}`}>
                                        <tr
                                            onClick={() => setExpandedId((prev) => prev === entry._id ? null : entry._id)}
                                            className="hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            <td className="p-4 text-slate-300 text-sm whitespace-nowrap">
                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Just now'}
                                            </td>
                                            <td className="p-4 font-mono text-white font-medium">
                                                {entry.ip}
                                            </td>
                                            <td className="p-4 text-sm text-slate-300">
                                                {entry.city || 'Unknown'}, {entry.country || 'Unknown'}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-emerald-400 truncate max-w-[240px]">
                                                {entry.path}
                                            </td>
                                            <td className="p-4 text-xs text-slate-400">
                                                {entry.isp || 'Unknown'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleBan(entry.ip);
                                                    }}
                                                    disabled={banningIp === entry.ip}
                                                    className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                                                >
                                                    {banningIp === entry.ip ? 'Banning...' : 'Ban'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === entry._id && (
                                            <tr>
                                                <td colSpan="6" className="p-0">
                                                    <div className="bg-slate-900/50 p-6 border-y border-slate-800">
                                                        <div className="grid md:grid-cols-2 gap-6">
                                                            <div>
                                                                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                                                    <Shield size={16} className="text-purple-500" /> IP Intelligence
                                                                </h4>
                                                                <div className="space-y-2 text-sm">
                                                                    <div className="flex justify-between border-b border-white/5 pb-2 gap-4">
                                                                        <span className="text-slate-400">ISP / Org</span>
                                                                        <span className="text-white text-right">{entry.isp || '-'} / {entry.org || '-'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-white/5 pb-2 gap-4">
                                                                        <span className="text-slate-400">Location</span>
                                                                        <span className="text-white text-right">{entry.city || '-'}, {entry.region || '-'}, {entry.country || '-'} {entry.postal || ''}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-white/5 pb-2 gap-4">
                                                                        <span className="text-slate-400">Timezone</span>
                                                                        <span className="text-white text-right">{entry.timezone || 'UTC'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-white/5 pb-2 gap-4">
                                                                        <span className="text-slate-400">User Agent</span>
                                                                        <span className="text-white truncate max-w-[300px]" title={entry.userAgent}>{entry.userAgent || '-'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between pt-2 gap-4">
                                                                        <span className="text-slate-400">Method</span>
                                                                        <span className="font-mono text-emerald-400">{entry.method || 'GET'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-lg overflow-hidden border border-slate-700 h-[250px] bg-slate-800 relative">
                                                                {entry.lat && entry.lon ? (
                                                                    <iframe
                                                                        width="100%"
                                                                        height="100%"
                                                                        frameBorder="0"
                                                                        style={{ border: 0, opacity: 0.8, filter: 'invert(90%) hue-rotate(180deg)' }}
                                                                        src={`https://www.google.com/maps?q=${entry.lat},${entry.lon}&output=embed`}
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
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {activeTab === 'history' && (
                    <div className="p-4 border-t border-white/5 flex justify-between items-center bg-slate-900/30">
                        <span className="text-sm text-slate-400">
                            Showing {traffic.length} records
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleNewer}
                                disabled={cursorHistory.length === 0}
                                className="p-2 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={handleOlder}
                                disabled={!nextCursor}
                                className="p-2 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
