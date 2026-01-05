import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Code } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Docs() {
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('');

    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get('/api/docs')
            .then(res => setData(res.data))
            .catch(err => {
                console.error(err);
                setError(err.message || "Failed to load API Spec");
            });
    }, []);

    if (error) return <div className="text-center p-20 text-red-500">Error: {error}</div>;
    if (!data) return <div className="text-center p-20 text-purple-200 animate-pulse">Loading API Spec...</div>;

    const categories = Object.keys(data.categories);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-bold mb-2">API Reference</h1>
                    <p className="text-purple-200">Total Endpoints: <span className="text-purple-400">{data.total}</span></p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search endpoints..."
                        className="bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-purple-500 text-sm text-white"
                        onChange={e => setFilter(e.target.value.toLowerCase())}
                    />
                </div>
            </div>

            {categories.map(cat => {
                const modules = data.categories[cat].filter(m =>
                    m.name.toLowerCase().includes(filter) ||
                    m.path.toLowerCase().includes(filter) ||
                    m.description.toLowerCase().includes(filter)
                );

                if (modules.length === 0) return null;

                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={cat} className="mb-12">
                        <h2 className="text-xl font-bold mb-6 text-black border-b border-black/10 pb-2 inline-block capitalize">{cat}</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {modules.map(mod => (
                                <div key={mod.path} className="glass-panel p-5 group relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg ${mod.method === 'get' ? 'bg-green-500/20 text-green-400' :
                                        mod.method === 'post' ? 'bg-blue-500/20 text-blue-400' :
                                            mod.method === 'delete' ? 'bg-red-500/20 text-red-400' :
                                                mod.method === 'put' ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {mod.method.toUpperCase()}
                                    </div>

                                    <h3 className="font-bold text-lg mb-2 pr-8">{mod.name}</h3>
                                    <p className="text-slate-300 text-sm mb-4 line-clamp-2 h-10">{mod.description}</p>

                                    <div className="bg-black/30 p-2 rounded border border-white/5 flex items-center justify-between group-hover:border-purple-500/30 transition-colors">
                                        <code className="text-xs text-purple-300 font-mono truncate">{mod.path}</code>
                                        <a href={mod.path} target="_blank" className="p-1 hover:bg-white/10 rounded">
                                            <Code size={14} className="text-slate-400" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
