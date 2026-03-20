import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { Cpu, Database, Clock, Server, Activity, Key, Copy, Terminal, Play, Shield, Book } from 'lucide-react';
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {user.name}</h1>
                    <p className="text-slate-400 text-sm mt-1">Monitor your API performance and usage metrics in real-time.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/docs" className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-white/5 transition-all text-sm font-medium flex items-center gap-2">
                        <Book size={16} /> Documentation
                    </Link>
                    <button
                        onClick={runTest}
                        disabled={testing}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Play size={16} className={testing ? "animate-pulse" : ""} />
                        Send Test Request
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div
                    className="glass-panel p-5 cursor-pointer relative group flex flex-col justify-between overflow-hidden"
                    onClick={copyKey}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Key size={80} />
                    </div>
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Your API Key</p>
                            <div className="text-slate-400 group-hover:text-amber-400 transition-colors">
                                {copied ? <Shield size={18} className="text-amber-400" /> : <Copy size={18} />}
                            </div>
                        </div>
                        <div className="font-mono text-lg font-bold text-white truncate pr-8">
                            {copied ? "COPIED!" : (user.apikey ? `${user.apikey.substring(0, 18)}...` : "Loading...")}
                        </div>
                    </div>
                </div>

                <Card 
                    title="API Credits" 
                    value={user.credits === -1 ? "∞" : user.credits} 
                    sub={user.creditLimit === -1 ? "Unlimited Access" : `Limit: ${user.creditLimit}`} 
                    icon={Database} 
                />
                
                <Card 
                    title="Service Plan" 
                    value={user.role === 'admin' ? "Lifetime Admin" : "Free Tier"} 
                    sub={user.role === 'admin' ? "All capabilities unlocked" : "1,000 requests per hour"} 
                    icon={Shield} 
                />

                <Card 
                    title="API Status" 
                    value="Active" 
                    sub="Latency: 24ms (Excellent)" 
                    icon={Activity} 
                />
            </div>

            <div className="glass-panel flex flex-col h-[520px] shadow-2xl shadow-black/20 border-white/5">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-lg shadow-red-500/20"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-lg shadow-amber-500/20"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-lg shadow-emerald-500/20"></div>
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-2">
                            Live Request Terminal
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        LISTENING ON PORT 6969
                    </div>
                </div>
                
                <div className="flex-1 bg-[#090b10] p-6 font-mono text-[13px] overflow-y-auto custom-scrollbar relative">
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
                    
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700 animate-pulse">
                            <Terminal size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Ready for transmission. Send a request to begin.</p>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        {logs.map((log, i) => {
                            const isError = log.includes(' - 4') || log.includes(' - 5');
                            const isSuccess = log.includes(' - 2');
                            
                            return (
                                <div key={i} className="flex gap-4 group">
                                    <span className="text-slate-600 shrink-0">[{i+1}]</span>
                                    <div className={`flex-1 border-l-2 ${isError ? 'border-red-500/40 bg-red-500/5' : isSuccess ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-blue-500/40 bg-blue-500/5'} pl-4 py-2 rounded-r-lg transition-all group-hover:bg-white/5`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isError ? 'bg-red-500/20 text-red-400' : isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {log.split(' ').slice(1, 3).join(' ')}
                                            </span>
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{log.split(' ')[0]}</span>
                                        </div>
                                        <div className="text-slate-300 break-all leading-relaxed">
                                            {log.split(' - ').slice(1).join(' - ')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
