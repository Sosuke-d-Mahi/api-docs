import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Globe, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-panel p-6 hover:bg-white/5 transition-colors"
    >
        <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed">{desc}</p>
    </motion.div>
);

export default function Home() {
    return (
        <div className="max-w-5xl mx-auto pt-10">
            <div className="text-center mb-20">
                <motion.h1
                    className="text-6xl md:text-7xl font-bold mb-6 tracking-tight text-black"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    Easir API Infrastructure
                </motion.h1>

                <motion.p
                    className="text-xl text-purple-200 max-w-2xl mx-auto mb-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Premium high-performance endpoints for ambitious developers.
                    Secured, scalable, and beautifully documented.
                </motion.p>

                <motion.div
                    className="flex justify-center gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Link to="/docs" className="btn-primary flex items-center gap-2">
                        Explore Docs <ArrowRight size={18} />
                    </Link>
                    <a
                        href="https://github.com/Sosuke-d-Mahi/Easir-docs.git"
                        target="_blank"
                        rel="noreferrer"
                        className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-medium flex items-center gap-2"
                    >
                        <Github size={18} /> Source Code
                    </a>
                </motion.div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                    icon={Zap}
                    title="High Performance"
                    desc="Engineered for millisecond latency responses using advanced caching and optimized logic."
                    delay={0.4}
                />
                <FeatureCard
                    icon={Shield}
                    title="Secure by Default"
                    desc="Enterprise-grade security middleware protecting your endpoints from abuse and attacks."
                    delay={0.5}
                />
                <FeatureCard
                    icon={Globe}
                    title="Global Edge"
                    desc="Ready for global deployment with simplified CORS and proxy configuration."
                    delay={0.6}
                />
            </div>
        </div>
    );
}
