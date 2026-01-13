import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Cpu, Database, Clock, Server, Activity, Key, Copy, Terminal, Play, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Card = ({ title, value, sub, icon: Icon, trend }) => (
    <div className="glass-panel p-5 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-slate-400 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
            </div>
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                <Icon size={20} />
            </div>
        </div>
        <div>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
            {trend && (
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-400">
                    <span>+{trend}%</span>
                    <span className="text-slate-500 ml-1">from last month</span>
                </div>
            )}
        </div>
    </div>
);

const UserDashboard = ({ user }) => {
    const [copied, setCopied] = useState(false);
    const [logs, setLogs] = useState([]);
    const [reqCount, setReqCount] = useState(0);
    const [testing, setTesting] = useState(false);
    const logsEndRef = useRef(null);

    const copyKey = () => {
        navigator.clipboard.writeText(user.apikey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const runTest = async () => {
        setTesting(true);
        try {
            await axios.get(`/api/stats?apikey=${user.apikey}`);
        } catch (e) {
            console.error(e);
        }
        setTimeout(() => setTesting(false), 500);
    };

    useEffect(() => {
        const socket = io('/', { path: '/socket.io' });

        socket.on('connect', () => {
            console.log("User Socket Connected");
            socket.emit('join_room', user.apikey);
        });

        socket.on('api_usage', (data) => {
            const time = new Date(data.timestamp).toLocaleTimeString();
            const newLog = `[${time}] ${data.method} ${data.path} [${data.ip || 'Unknown'}] - ${data.status}`;

            setLogs(prev => [...prev.slice(-19), newLog]);
            setReqCount(prev => prev + 1);
        });

        return () => socket.disconnect();
    }, [user.apikey]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome, {user.name}</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage your API keys and monitor usage.</p>
                </div>
                <button
                    onClick={runTest}
                    disabled={testing}
                    className="btn-primary flex items-center gap-2"
                >
                    <Play size={16} className={testing ? "animate-pulse" : ""} />
                    Test Request
                </button>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div
                    className="glass-panel p-5 cursor-pointer relative group flex flex-col justify-between"
                    onClick={copyKey}
                    title="Click to copy API Key"
                >
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-400 text-sm font-medium">Master Key</p>
                            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-amber-400 transition-colors">
                                {copied ? <Shield size={20} /> : <Key size={20} />}
                            </div>
                        </div>
                        <div className="font-mono text-lg font-bold text-white truncate mb-1">
                            {copied ? "COPIED!" : (user.apikey ? `${user.apikey.substring(0, 16)}...` : "Loading")}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors mt-4">
                        {copied ? "Copied to clipboard" : "Click to copy key"}
                    </p>
                </div>

                <Card title="Requests" value={reqCount} sub="Current Session" icon={Activity} />
                <Card title="Current Plan" value="Free Tier" sub="Up to 1000 reqs/hr" icon={Database} />
                <Card title="System Status" value="Active" sub="All systems operational" icon={Server} />
            </div>

            <div className="glass-panel flex flex-col h-[500px]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-lg">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-slate-300">
                        <Terminal size={16} className="text-slate-500" /> Live Request Log
                    </h3>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/30"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center border border-green-500/30"></div>
                    </div>
                </div>
                <div className="flex-1 bg-[#0d1117] p-4 font-mono text-sm overflow-y-auto custom-scrollbar">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600">
                            <Activity className="mb-4 opacity-20" size={48} />
                            <p>Waiting for incoming requests...</p>
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-2 text-slate-300 border-l-2 border-slate-700 pl-3 py-1 hover:bg-white/5 rounded-r transition-colors">
                            <span className="text-emerald-500 mr-2">➜</span>
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

import TrafficMap from './TrafficMap';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [status, setStatus] = useState('Connecting...');

    if (user && user.role !== 'admin') {
        return <UserDashboard user={user} />;
    }

    useEffect(() => {
        const socket = io('/', { path: '/socket.io' });

        socket.on('connect_error', (err) => {
            console.error(err);
            setStatus('Retrying...');
        });

        socket.on('connect', () => {
            setStatus('Live');
        });

        socket.on('disconnect', () => {
            setStatus('Offline');
        });

        socket.on('stats', (data) => {
            setStats(data);
            setHistory(prev => {
                const newHistory = [...prev, { name: '', cpu: parseFloat(data.cpu) }];
                if (newHistory.length > 30) newHistory.shift();
                return newHistory;
            });
        });

        return () => socket.disconnect();
    }, []);

    if (!stats) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
            <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
            </div>
            <p className="text-sm font-medium animate-pulse">{status}</p>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Overview</h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time server performance metrics.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Live Connected
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
                <Card title="CPU Load" value={`${stats.cpu}%`} sub="8 Core Processor" icon={Cpu} />
                <Card title="Memory Usage" value={stats.ram.used} sub={`Total: ${stats.ram.total}`} icon={Database} />
                <Card title="System Uptime" value={`${(stats.uptime / 3600).toFixed(1)}h`} sub="Since last reboot" icon={Clock} />
                <Card title="Server Status" value="Online" sub="v2.1.0 Stable" icon={Server} />
            </div>

            <div className="mb-8">
                <TrafficMap />
            </div>
        </div>
    );
}
