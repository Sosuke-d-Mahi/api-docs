import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Book, LayoutDashboard, Settings, Shield, Menu, X, User, LogOut, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import RainBackground from './components/RainBackground';


const SidebarItem = ({ to, icon: Icon, label, active, onClick }) => (
    <Link to={to} style={{ textDecoration: 'none' }} onClick={onClick}>
        <div
            className={`flex items-center gap-3 px-3 py-2 rounded-md mb-1 cursor-pointer transition-colors text-sm font-medium ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </div>
    </Link>
);

export default function Layout({ children }) {
    const location = useLocation();
    const p = location.pathname;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();

    // useEffect(() => {
    //     // Frontend tracking removed in favor of Server-Side TrafficLogger to avoid CORS and Adblockers.
    // }, []);

    if (p === '/login') return children;

    const SidebarContent = () => (
        <>
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-[var(--bg-sidebar)]">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs">E</div>
                    Easir API
                </h1>
                <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}>
                    <X size={20} />
                </button>
            </div>

            <nav className="flex-1 px-3 py-4 overflow-y-auto bg-[var(--bg-sidebar)]">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3 px-3 tracking-wider">Overview</p>
                <SidebarItem to="/" icon={Home} label="Overview" active={p === '/'} onClick={() => setMobileMenuOpen(false)} />
                <SidebarItem to="/docs" icon={Book} label="Documentation" active={p === '/docs'} onClick={() => setMobileMenuOpen(false)} />

                <p className="text-xs font-semibold text-slate-500 uppercase mt-6 mb-3 px-3 tracking-wider">Admin</p>
                <SidebarItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" active={p.includes('/admin/dashboard')} onClick={() => setMobileMenuOpen(false)} />
                <SidebarItem to="/profile" icon={User} label="Profile" active={p === '/profile'} onClick={() => setMobileMenuOpen(false)} />

                {user && user.role === 'admin' && (
                    <>
                        <SidebarItem to="/admin/traffic" icon={Activity} label="Live Traffic" active={p === '/admin/traffic'} onClick={() => setMobileMenuOpen(false)} />
                        <SidebarItem to="/admin/settings" icon={Settings} label="Settings" active={p.includes('/admin/settings')} onClick={() => setMobileMenuOpen(false)} />
                    </>
                )}
            </nav>

            <div className="p-3 border-t border-slate-800 bg-[var(--bg-sidebar)]">
                {user ? (
                    <div
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors group"
                        onClick={logout}
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-medium text-xs">
                            {user.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">Sign out</p>
                        </div>
                        <LogOut size={16} className="text-slate-500 group-hover:text-slate-300" />
                    </div>
                ) : (
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                <User size={16} className="text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-300">Guest</p>
                                <p className="text-xs text-slate-500">Login</p>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen text-[var(--text-main)] font-sans relative">
            <RainBackground />
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-[var(--bg-sidebar)] border-b border-slate-800 z-40 px-4 py-3 flex justify-between items-center">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs">E</div>
                    Easir API
                </h1>
                <button onClick={() => setMobileMenuOpen(true)}>
                    <Menu className="text-slate-400" />
                </button>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r border-slate-800 bg-[var(--bg-sidebar)] z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="fixed inset-y-0 left-0 w-72 bg-[var(--bg-sidebar)] border-r border-slate-800 z-50 flex flex-col md:hidden"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 pt-20 md:p-8 md:pt-8 w-full">
                {children || <Outlet />}
            </main>
        </div>
    );
}
