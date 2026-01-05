import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cpu, Database, Clock, Server, Activity, Key, Copy, Terminal, Play, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Card = ({ title, value, sub, icon: Icon, color }) => (
    <div className="glass-panel p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${color}`} />
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold">{value}</h3>
                {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
            </div>
            <div className={`p-3 rounded-lg bg-white/5 ${color.replace('bg-', 'text-')}`}>
                <Icon size={24} />
            </div>
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
        <div className="relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">Welcome, {user.name}</h1>
                    <p className="text-slate-400">Manage your API credentials.</p>
                </div>
                <button
                    onClick={runTest}
                    disabled={testing}
                    className="btn-primary flex items-center gap-2"
                >
                    <Play size={18} className={testing ? "animate-pulse" : ""} />
                    Test Request
                </button>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div
                    className="glass-panel p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                    onClick={copyKey}
                    title="Click to copy API Key"
                >
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-purple-500" />
                    <div className="flex justify-between items-start">
                        <div className="overflow-hidden w-full mr-2">
                            <div className="flex items-center gap-3">
                                <Key className="text-purple-400" size={20} />
                                <div>
                                    <p className="text-purple-200 text-sm font-medium mb-1">Master Key</p>
                                    <h3 className="text-lg font-bold truncate font-mono text-black">
                                        {copied ? "COPIED!" : (user.apikey ? `${user.apikey.substring(0, 12)}...` : "Loading")}
                                    </h3>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 group-hover:text-white transition-colors">
                                {copied ? "Copied to clipboard" : "Click to copy"}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-purple-500">
                            {copied ? <Shield size={24} /> : <Key size={24} />}
                        </div>
                    </div>
                </div>

                <Card title="Requests" value={reqCount} sub="This Session" icon={Activity} color="bg-blue-500" />
                <Card title="Plan" value="Free" sub="Basic Tier" icon={Database} color="bg-green-500" />
                <Card title="Status" value="Active" sub="No Issues" icon={Server} color="bg-pink-500" />
            </div>

            <div className="glass-panel p-6 h-96 flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Terminal size={18} className="text-purple-400" /> Live Request Log
                </h3>
                <div className="flex-1 bg-black/40 rounded-lg p-4 font-mono text-xs overflow-y-auto custom-scrollbar border border-white/5">
                    {logs.length === 0 && <span className="text-purple-300 italic">Listening for incoming requests...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 text-green-400 border-l-2 border-green-500/30 pl-2">
                            <span className="text-purple-400 opacity-80 mr-2">$</span>
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

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
                if (newHistory.length > 20) newHistory.shift();
                return newHistory;
            });
        });

        return () => socket.disconnect();
    }, []);

    if (!stats) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
            <Activity className="animate-spin mb-4 text-purple-500" size={40} />
            <p>{status}</p>
        </div>
    );

    return (
        <div className="relative">

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-black drop-shadow-sm">System Overview</h1>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    Real-Time
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card title="CPU Load" value={`${stats.cpu}%`} sub="8 Cores" icon={Cpu} color="bg-blue-500" />
                <Card title="Memory" value={stats.ram.used} sub={`of ${stats.ram.total}`} icon={Database} color="bg-purple-500" />
                <Card title="Uptime" value={`${(stats.uptime / 3600).toFixed(1)}h`} sub="Since last restart" icon={Clock} color="bg-green-500" />
                <Card title="Status" value="Online" sub="v2.0.0" icon={Server} color="bg-pink-500" />
            </div>

            <div className="glass-panel p-6 h-96">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Activity size={18} className="text-purple-400" /> Live CPU Usage
                </h3>
                <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={history}>
                        <defs>
                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => [`${value}%`, 'CPU']}
                        />
                        <Area
                            type="monotone"
                            dataKey="cpu"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCpu)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
