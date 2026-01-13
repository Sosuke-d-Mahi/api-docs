import { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Lock, Layout, Globe, Bell, Link as LinkIcon, Plus, Trash2, Image as ImageIcon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const TabButton = ({ active, icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
        <Icon size={18} />
        {label}
    </button>
);

const InputGroup = ({ label, desc, children }) => (
    <div className="mb-6 border-b border-white/5 pb-6 last:border-0">
        <label className="block text-sm font-bold text-slate-200 mb-1">{label}</label>
        <div className="mt-2">{children}</div>
        {desc && <p className="mt-2 text-xs text-slate-500">{desc}</p>}
    </div>
);

const SecurityTab = () => {
    const { user } = useAuth();
    const [bannedIps, setBannedIps] = useState([]);
    const [newBan, setNewBan] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchBans = () => {
        if (!user || !user.apikey) return;
        axios.get('/api/admin/banned-ips', { headers: { 'Authorization': user.apikey } })
            .then(res => setBannedIps(res.data.data))
            .catch(console.error);
    };

    useEffect(() => {
        fetchBans();
    }, [user]);

    const handleBan = async () => {
        if (!newBan || !user || !user.apikey) return;
        setProcessing(true);
        try {
            await axios.post('/api/admin/ban-ip', { ip: newBan }, { headers: { 'Authorization': user.apikey } });
            setNewBan("");
            fetchBans();
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    const handleUnban = async (ip) => {
        if (!user || !user.apikey) return;
        try {
            await axios.post('/api/admin/unban-ip', { ip: ip }, { headers: { 'Authorization': user.apikey } });
            fetchBans();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b border-white/10 text-black">Security Center</h2>

            <div className="bg-black/20 p-6 rounded-lg border border-white/5">
                <h3 className="font-bold mb-4 text-red-500 flex items-center gap-2">
                    <Shield size={20} /> Ban an IP Address
                </h3>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={newBan}
                        onChange={(e) => setNewBan(e.target.value)}
                        placeholder="e.g. 192.168.1.100"
                        className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-red-500 outline-none text-white font-mono"
                    />
                    <button
                        onClick={handleBan}
                        disabled={processing || !newBan}
                        className="px-4 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {processing ? "Banning..." : "Ban IP"}
                    </button>
                </div>
            </div>

            <div>
                <h3 className="font-bold mb-4">Banned IPs ({bannedIps ? bannedIps.length : 0})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {(!bannedIps || bannedIps.length === 0) && <p className="text-slate-500 italic">No IPs are currently banned.</p>}
                    {bannedIps && bannedIps.map((ip, i) => (
                        <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                            <span className="font-mono text-slate-300">{ip}</span>
                            <button
                                onClick={() => handleUnban(ip)}
                                className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors"
                            >
                                Unban
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function Settings() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [status, setStatus] = useState('');
    const [locked, setLocked] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || !user.apikey) return;

        axios.get('/api/admin/settings', { headers: { 'Authorization': user.apikey } })
            .then(res => setData(res.data.data))
            .catch((err) => {
                console.error(err);
                setLocked(true);
            });
    }, [user]);

    const handleSave = () => {
        if (locked || !user || !user.apikey) return;
        setSaving(true);

        axios.post('/api/admin/settings', data, { headers: { 'Authorization': user.apikey } })
            .then(() => {
                setStatus('Settings saved successfully.');
                setTimeout(() => setStatus(''), 3000);
            })
            .catch(() => setStatus('Error saving settings.'))
            .finally(() => setSaving(false));
    };

    const updateField = (path, value) => {
        setData(prev => {
            const newData = { ...prev };
            const keys = path.split('.');
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    if (!data && !locked) return <div className="p-8 text-center text-slate-500">Loading Configuration...</div>;
    if (locked) return <div className="p-8 text-center text-red-400">Access Denied. Please Login as Admin.</div>;

    return (
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 min-h-[80vh]">
            <div className="w-full md:w-64 flex-shrink-0">
                <h1 className="text-2xl font-bold gradient-text mb-6 pl-2">Settings</h1>
                <div className="glass-panel p-2 space-y-1">
                    <TabButton active={activeTab === 'general'} icon={Globe} label="General" onClick={() => setActiveTab('general')} />
                    <TabButton active={activeTab === 'appearance'} icon={Layout} label="Appearance" onClick={() => setActiveTab('appearance')} />
                    <TabButton active={activeTab === 'links'} icon={LinkIcon} label="Links" onClick={() => setActiveTab('links')} />
                    <TabButton active={activeTab === 'notifications'} icon={Bell} label="Notifications" onClick={() => setActiveTab('notifications')} />
                    <TabButton active={activeTab === 'security'} icon={Shield} label="Security" onClick={() => setActiveTab('security')} />
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || locked}
                    className={`mt-6 w-full py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-lg ${saving ? 'bg-purple-600/50 cursor-wait' : 'btn-primary'}`}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>

                {status && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 text-center text-sm p-2 rounded ${status.includes('Error') ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}>
                        {status}
                    </motion.div>
                )}
            </div>

            <div className="flex-1 glass-panel p-8 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'general' && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold mb-6 pb-4 border-b border-white/10">General Settings</h2>
                                <InputGroup label="Site Title" desc="The name of your API service displayed in the header.">
                                    <input
                                        type="text"
                                        className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white"
                                        value={data.name}
                                        onChange={e => updateField('name', e.target.value)}
                                    />
                                </InputGroup>
                                <InputGroup label="Description" desc="In a few words, explain what this site is about.">
                                    <input
                                        type="text"
                                        className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white"
                                        value={data.description}
                                        onChange={e => updateField('description', e.target.value)}
                                    />
                                </InputGroup>
                                <InputGroup label="Version" desc="Current version string (e.g., v2.0.0).">
                                    <input
                                        type="text"
                                        className="w-full md:w-1/2 bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white font-mono"
                                        value={data.version}
                                        onChange={e => updateField('version', e.target.value)}
                                    />
                                </InputGroup>
                                <InputGroup label="Operator Name" desc="The name displayed in the footer and meta tags.">
                                    <input
                                        type="text"
                                        className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white"
                                        value={data.apiSettings.operator}
                                        onChange={e => updateField('apiSettings.operator', e.target.value)}
                                    />
                                </InputGroup>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold mb-6 pb-4 border-b border-white/10">Appearance Options</h2>
                                <InputGroup label="Header Image" desc="URL of the main hero image.">
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white mb-2"
                                                value={data.header.imageSrc[0]}
                                                onChange={e => {
                                                    const newArr = [...data.header.imageSrc];
                                                    newArr[0] = e.target.value;
                                                    updateField('header.imageSrc', newArr);
                                                }}
                                            />
                                            <div className="h-32 w-full bg-black/50 rounded overflow-hidden relative border border-white/5">
                                                <img src={data.header.imageSrc[0]} alt="Preview" className="w-full h-full object-cover opacity-50" />
                                                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Preview</div>
                                            </div>
                                        </div>
                                    </div>
                                </InputGroup>
                                <InputGroup label="Status Text" desc="Operational status displayed on the homepage.">
                                    <select
                                        className="bg-black/30 border border-white/10 rounded px-4 py-2 focus:border-purple-500 outline-none text-white"
                                        value={data.header.status}
                                        onChange={e => updateField('header.status', e.target.value)}
                                    >
                                        <option value="Operational">Operational</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Issues Detected">Issues Detected</option>
                                    </select>
                                </InputGroup>
                            </div>
                        )}

                        {activeTab === 'links' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                                    <h2 className="text-xl font-bold">Footer Links</h2>
                                    <button
                                        onClick={() => setData(prev => ({ ...prev, links: [...prev.links, { name: "New Link", url: "https://" }] }))}
                                        className="text-sm bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={14} /> Add New
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {data.links.map((link, i) => (
                                        <div key={i} className="flex gap-2 items-start bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-purple-500 outline-none text-white"
                                                    value={link.name}
                                                    placeholder="Link Name"
                                                    onChange={e => {
                                                        const newLinks = [...data.links];
                                                        newLinks[i].name = e.target.value;
                                                        updateField('links', newLinks);
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-purple-500 outline-none text-slate-400 font-mono"
                                                    value={link.url}
                                                    placeholder="URL"
                                                    onChange={e => {
                                                        const newLinks = [...data.links];
                                                        newLinks[i].url = e.target.value;
                                                        updateField('links', newLinks);
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newLinks = data.links.filter((_, idx) => idx !== i);
                                                    updateField('links', newLinks);
                                                }}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {data.links.length === 0 && <p className="text-slate-500 italic text-sm">No links found.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                                    <h2 className="text-xl font-bold">Global Notifications</h2>
                                    <button
                                        onClick={() => setData(prev => ({ ...prev, notifications: [...prev.notifications, { title: "New Alert", message: "Enter message here..." }] }))}
                                        className="text-sm bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={14} /> Add New
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {data.notifications.map((notif, i) => (
                                        <div key={i} className="flex gap-2 items-start bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-purple-500 outline-none text-white font-bold"
                                                    value={notif.title}
                                                    placeholder="Title"
                                                    onChange={e => {
                                                        const newArr = [...data.notifications];
                                                        newArr[i].title = e.target.value;
                                                        updateField('notifications', newArr);
                                                    }}
                                                />
                                                <textarea
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-purple-500 outline-none text-slate-300 resize-none h-20"
                                                    value={notif.message}
                                                    placeholder="Message content"
                                                    onChange={e => {
                                                        const newArr = [...data.notifications];
                                                        newArr[i].message = e.target.value;
                                                        updateField('notifications', newArr);
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newArr = data.notifications.filter((_, idx) => idx !== i);
                                                    updateField('notifications', newArr);
                                                }}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {data.notifications.length === 0 && <p className="text-slate-300 italic text-sm">No active notifications.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <SecurityTab />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
