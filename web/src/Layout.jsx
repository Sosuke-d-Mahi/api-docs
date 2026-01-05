import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Book, LayoutDashboard, Settings, Shield, Menu, X, User, LogOut, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import RainBackground from './components/RainBackground';

const SidebarItem = ({ to, icon: Icon, label, active, onClick }) => (
    <Link to={to} style={{ textDecoration: 'none' }} onClick={onClick}>
        <motion.div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 cursor-pointer transition-colors ${active ? 'bg-purple-500/10 text-white shadow-sm shadow-purple-500/20' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
            whileHover={{ x: 5 }}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
            {active && <motion.div layoutId="active" className="absolute left-0 w-1 h-8 bg-purple-500 rounded-r-full" />}
        </motion.div>
    </Link>
);

export default function Layout({ children }) {
    const location = useLocation();
    const p = location.pathname;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();

    if (p === '/login') return children;

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h1 className="text-xl font-bold text-black flex items-center gap-2 drop-shadow-sm">
                    <Shield className="text-purple-500" /> Easir API
                </h1>
                <button className="md:hidden text-purple-200" onClick={() => setMobileMenuOpen(false)}>
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto">
                <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase mb-4 px-2 tracking-widest drop-shadow-sm">Menu</p>
                <SidebarItem to="/" icon={Home} label="Overview" active={p === '/'} onClick={() => setMobileMenuOpen(false)} />
                <SidebarItem to="/docs" icon={Book} label="Documentation" active={p === '/docs'} onClick={() => setMobileMenuOpen(false)} />

                <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase mt-6 mb-4 px-2 tracking-widest drop-shadow-sm">Admin</p>
                <SidebarItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" active={p.includes('/admin/dashboard')} onClick={() => setMobileMenuOpen(false)} />
                <SidebarItem to="/profile" icon={User} label="Profile" active={p === '/profile'} onClick={() => setMobileMenuOpen(false)} />

                {user && user.role === 'admin' && (
                    <>
                        <SidebarItem to="/admin/traffic" icon={Activity} label="Live Traffic" active={p === '/admin/traffic'} onClick={() => setMobileMenuOpen(false)} />
                        <SidebarItem to="/admin/settings" icon={Settings} label="Settings" active={p.includes('/admin/settings')} onClick={() => setMobileMenuOpen(false)} />
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-white/5">
                {user ? (
                    <div
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all group"
                        onClick={logout}
                    >
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <User size={16} className="text-white" />
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-red-400 truncate group-hover:text-red-300 transition-colors">Sign Out</p>
                        </div>
                        <LogOut size={16} className="text-red-400 group-hover:text-red-300 transition-colors" />
                    </div>
                ) : (
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <div
                            className="flex items-center gap-3 p-2 rounded-lg bg-black/20 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">Guest User</p>
                                <p className="text-xs text-purple-200 truncate">Click to Login</p>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen relative">
            <RainBackground />

            <div className="md:hidden fixed top-0 w-full glass-panel z-40 px-6 py-4 flex justify-between items-center m-0 rounded-none border-x-0 border-t-0">
                <h1 className="text-xl font-bold text-black flex items-center gap-2 drop-shadow-sm">
                    <Shield className="text-purple-500" /> Easir API
                </h1>
                <button onClick={() => setMobileMenuOpen(true)}>
                    <Menu className="text-white" />
                </button>
            </div>

            <aside className="hidden md:flex w-64 glass-panel m-4 flex-col fixed h-[calc(100vh-2rem)] z-50 rounded-2xl border-white/5">
                <SidebarContent />
            </aside>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className="fixed inset-y-0 left-0 w-64 bg-dark-900 border-r border-white/10 z-50 flex flex-col md:hidden"
                    >
                        <SidebarContent />
                    </motion.div>
                )}
            </AnimatePresence>

            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <main className="flex-1 md:ml-[calc(16rem+2rem)] p-4 pt-20 md:p-8 md:pt-8 w-full overflow-x-hidden">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {children || <Outlet />}
                </motion.div>
            </main>
        </div>
    );
}
