import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Globe, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:bg-slate-800 transition-colors"
    >
        <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 text-blue-500">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
);

export default function Home() {
    return (
        <div className="max-w-6xl mx-auto pt-16 px-6">
            <div className="text-center mb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-500/20"
                >
                    <Zap size={12} className="fill-blue-400" />
                    Next Gen Infrastructure
                </motion.div>

                <motion.h1
                    className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Build faster with <span className="text-blue-500">Easir API</span>
                </motion.h1>

                <motion.p
                    className="text-lg text-slate-400 max-w-2xl mx-auto mb-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Premium high-performance endpoints for ambitious developers.
                    Secured, scalable, and beautifully documented for modern applications.
                </motion.p>

                <motion.div
                    className="flex justify-center gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link to="/docs" className="btn-primary flex items-center gap-2 px-8 py-3 text-base">
                        Start Building <ArrowRight size={18} />
                    </Link>
                    <a
                        href="https://github.com/Sosuke-d-Mahi/Easir-docs.git"
                        target="_blank"
                        rel="noreferrer"
                        className="px-8 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-medium flex items-center gap-2"
                    >
                        <Github size={18} /> Source Code
                    </a>
                </motion.div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-20">
                <FeatureCard
                    icon={Zap}
                    title="Ultra Low Latency"
                    desc="Engineered for millisecond latency using advanced edge caching and optimized serverless functions."
                    delay={0.5}
                />
                <FeatureCard
                    icon={Shield}
                    title="Enterprise Security"
                    desc="Bank-grade encryption and DDoS protection standard on all endpoints to keep your data safe."
                    delay={0.6}
                />
                <FeatureCard
                    icon={Globe}
                    title="Global Edge Network"
                    desc="Deploy globally with a single click. Our smart routing ensures your users always hit the nearest node."
                    delay={0.7}
                />
            </div>

            <div className="border-t border-slate-800 pt-10 pb-10 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
                <p>&copy; 2026 Easir API. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">Twitter</a>
                </div>
            </div>
        </div>
    );
}
