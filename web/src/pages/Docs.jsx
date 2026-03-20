import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Code, ChevronDown, ChevronUp, Terminal, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CodeExample from '../components/CodeExample';
import ApiTester from '../components/ApiTester';

export default function Docs() {
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('');
    const [expandedModules, setExpandedModules] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get('/api/docs')
            .then(res => setData(res.data))
            .catch(err => {
                console.error(err);
                setError(err.message || "Failed to load API Spec");
            });
    }, []);

    const toggleExpand = (path) => {
        setExpandedModules(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    if (error) return <div className="text-center p-20 text-red-500">Error: {error}</div>;
    if (!data) return <div className="text-center p-20 text-purple-200 animate-pulse">Loading API Spec...</div>;

    const categories = Object.keys(data.categories);

    return (
        <div className="max-w-6xl mx-auto px-4 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">API Reference</h1>
                    <p className="text-slate-400 font-medium">Explore and test our endpoints. Total count: <span className="text-purple-400">{data.total}</span></p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search endpoints..."
                        className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-full focus:outline-none focus:border-purple-500/50 transition-all text-sm text-white placeholder:text-slate-600 shadow-2xl"
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
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={cat} className="mb-16">
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-bold text-white capitalize">{cat}</h2>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {modules.map(mod => {
                                const isExpanded = expandedModules[mod.path];
                                return (
                                    <div key={mod.path} className={`glass-panel overflow-hidden transition-all duration-300 border ${isExpanded ? 'border-purple-500/30' : 'border-white/5 hover:border-white/10'}`}>
                                        <div 
                                            className="p-6 cursor-pointer flex items-start justify-between gap-4"
                                            onClick={() => toggleExpand(mod.path)}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                                        mod.method === 'get' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        mod.method === 'post' ? 'bg-blue-500/20 text-blue-400' :
                                                        mod.method === 'delete' ? 'bg-rose-500/20 text-rose-400' :
                                                        mod.method === 'put' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                        {mod.method}
                                                    </span>
                                                    <code className="text-sm font-mono text-purple-300/80">{mod.path}</code>
                                                </div>
                                                <h3 className="font-bold text-xl mb-2 text-white">{mod.name}</h3>
                                                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{mod.description}</p>
                                            </div>
                                            <div className="text-slate-500 mt-1">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <div className="px-6 pb-8 border-t border-white/5 bg-black/20">
                                                        <div className="grid lg:grid-cols-2 gap-10 pt-8">
                                                            {/* Left Column: Details & Tester */}
                                                            <div className="space-y-8">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-4 text-slate-300">
                                                                        <Activity size={16} className="text-purple-400" />
                                                                        <h4 className="text-sm font-bold uppercase tracking-wider">Try it Out</h4>
                                                                    </div>
                                                                    <ApiTester method={mod.method} path={mod.path} params={mod.params} />
                                                                </div>
                                                            </div>

                                                            {/* Right Column: Code Examples */}
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-4 text-slate-300">
                                                                    <Terminal size={16} className="text-purple-400" />
                                                                    <h4 className="text-sm font-bold uppercase tracking-wider">Code Examples</h4>
                                                                </div>
                                                                <CodeExample method={mod.method} path={mod.path} params={mod.params} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

