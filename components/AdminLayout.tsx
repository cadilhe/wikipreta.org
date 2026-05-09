import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const menuItems = [
        { label: 'Wikipreta', path: '/', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
        { label: 'Verbetes', path: '/admin', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> },
        { label: 'Imagens', path: '/admin/imagens', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> },
        { label: 'Usuários', path: '/admin/usuarios', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    ];

    return (
        <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950">
            {/* Sidebar */}
            <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col fixed h-full transition-all duration-300 ease-in-out z-20">
                <div className="p-6">
                    <h2 className="text-xl font-serif font-bold text-amber-500 tracking-wider">
                        WIKIPRETA
                    </h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mt-1">
                        Painel Admin
                    </p>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isActive
                                        ? 'bg-amber-500 text-stone-900'
                                        : 'hover:bg-stone-800 hover:text-white'
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-stone-800">
                    <div className="flex items-center gap-3 px-3 py-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-stone-900 font-bold text-xs">
                            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.username || 'Administrador'}</p>
                            <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 min-h-screen">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
