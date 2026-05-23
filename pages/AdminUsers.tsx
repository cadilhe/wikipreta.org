import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { listUsers, updateUserRole, toggleUserBan, AdminUser } from '../services/databaseService';

interface ConfirmModalConfig {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'danger';
}

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Estado para o modal de confirmação estilizado
    const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Segurança extra local além do ProtectedRoute
        if (currentUser?.role !== 'admin') {
            navigate('/admin');
            return;
        }

        fetchUsers();
    }, [isAuthenticated, authLoading, currentUser, navigate]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listUsers();
            setUsers(data);
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
            setError(err.message || 'Falha ao carregar a lista de usuários.');
        } finally {
            setLoading(false);
        }
    };

    const showConfirm = (config: Omit<ConfirmModalConfig, 'isOpen' | 'onCancel'>) => {
        setConfirmModal({
            isOpen: true,
            title: config.title,
            message: config.message,
            confirmText: config.confirmText,
            cancelText: config.cancelText,
            type: config.type,
            onConfirm: () => {
                config.onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleRoleChange = (userId: string, currentRole: string, email: string) => {
        const newRole = currentRole === 'admin' ? 'editor' : 'admin';
        const roleLabel = newRole === 'admin' ? 'Administrador' : 'Colaborador';
        
        showConfirm({
            title: 'Alterar Papel de Acesso',
            message: `Tem certeza que deseja alterar o papel de ${email} para ${roleLabel}?`,
            confirmText: 'Alterar Papel',
            type: 'info',
            onConfirm: async () => {
                setActionLoading(userId);
                setError(null);
                try {
                    const updatedUser = await updateUserRole(userId, newRole);
                    setUsers(users.map(u => u.id === userId ? updatedUser : u));
                } catch (err: any) {
                    console.error('Failed to update role:', err);
                    setError(err.message || 'Falha ao atualizar o papel do usuário.');
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleToggleBan = (userId: string, isCurrentlyBanned: boolean, email: string) => {
        const actionLabel = isCurrentlyBanned ? 'reativar' : 'desativar';
        const modalTitle = isCurrentlyBanned ? 'Reativar Conta' : 'Desativar Conta';
        
        showConfirm({
            title: modalTitle,
            message: `Tem certeza que deseja ${actionLabel} a conta de ${email}? Ao desativar, o usuário perderá o acesso à plataforma.`,
            confirmText: isCurrentlyBanned ? 'Reativar' : 'Desativar',
            type: isCurrentlyBanned ? 'info' : 'danger',
            onConfirm: async () => {
                setActionLoading(userId);
                setError(null);
                try {
                    const updatedUser = await toggleUserBan(userId, !isCurrentlyBanned);
                    setUsers(users.map(u => u.id === userId ? updatedUser : u));
                } catch (err: any) {
                    console.error('Failed to toggle ban status:', err);
                    setError(err.message || 'Falha ao alterar o status da conta do usuário.');
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isUserBanned = (bannedUntil?: string) => {
        if (!bannedUntil) return false;
        return new Date(bannedUntil) > new Date();
    };

    return (
        <AdminLayout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                        Usuários
                    </h1>
                    <p className="text-stone-500 mt-2">
                        Gerencie os administradores, colaboradores e permissões da plataforma.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 dark:bg-stone-800 text-white rounded-lg hover:bg-stone-800 dark:hover:bg-stone-700 transition-all font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Ver Site
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-stone-50/50 dark:bg-stone-950/20">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar usuário por e-mail..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>
                    
                    {!loading && (
                        <span className="text-sm text-stone-500 whitespace-nowrap">
                            Total: <span className="font-bold text-stone-900 dark:text-stone-100">{filteredUsers.length}</span> usuários
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 text-xs uppercase tracking-widest border-b border-stone-200 dark:border-stone-800">
                                <th className="p-6 font-semibold">Usuário</th>
                                <th className="p-6 font-semibold">Papel</th>
                                <th className="p-6 font-semibold">Status</th>
                                <th className="p-6 font-semibold">Criado em</th>
                                <th className="p-6 font-semibold">Último acesso</th>
                                <th className="p-6 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-stone-500 italic">Carregando usuários...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-stone-500">Nenhum usuário encontrado.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const isSelf = currentUser?.id === u.id;
                                    const isBanned = isUserBanned(u.banned_until);
                                    const isPending = actionLoading === u.id;

                                    return (
                                        <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold border border-stone-200 dark:border-stone-700">
                                                        {u.email.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-stone-900 dark:text-white">
                                                            {u.email}
                                                        </span>
                                                        {isSelf && (
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                                Você (Sessão Atual)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider ${u.role === 'admin'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                                                }`}>
                                                    {u.role === 'admin' ? 'Administrador' : 'Colaborador'}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider ${isBanned
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                    {isBanned ? 'Inativo' : 'Ativo'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-sm text-stone-500">
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td className="p-6 text-sm text-stone-500">
                                                {formatDate(u.last_sign_in_at)}
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-3 items-center">
                                                    {isPending ? (
                                                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleRoleChange(u.id, u.role, u.email)}
                                                                disabled={isSelf}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${u.role === 'admin'
                                                                    ? 'text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                                                                    : 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:border-amber-500 dark:text-black dark:hover:bg-amber-400'
                                                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                                title={isSelf ? "Você não pode alterar seu próprio papel" : u.role === 'admin' ? "Rebaixar para Colaborador" : "Promover a Administrador"}
                                                            >
                                                                {u.role === 'admin' ? 'Tornar Colaborador' : 'Tornar Admin'}
                                                            </button>

                                                            <button
                                                                onClick={() => handleToggleBan(u.id, isBanned, u.email)}
                                                                disabled={isSelf}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isBanned
                                                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 dark:bg-green-500 dark:border-green-500 dark:text-black dark:hover:bg-green-400'
                                                                    : 'text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/20'
                                                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                                title={isSelf ? "Você não pode banir a si mesmo" : isBanned ? "Ativar conta" : "Desativar conta"}
                                                            >
                                                                {isBanned ? 'Ativar' : 'Desativar'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Confirmação customizado para o Design System */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className={`p-2.5 rounded-full ${
                                confirmModal.type === 'danger'
                                    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}>
                                {confirmModal.type === 'danger' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">
                                    {confirmModal.title}
                                </h3>
                                <p className="text-stone-600 dark:text-stone-400 text-sm mt-1.5 leading-relaxed">
                                    {confirmModal.message}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={confirmModal.onCancel}
                                className="px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm font-semibold"
                            >
                                {confirmModal.cancelText || 'Cancelar'}
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-semibold ${
                                    confirmModal.type === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 dark:text-black'
                                        : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-450 dark:text-black'
                                }`}
                            >
                                {confirmModal.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminUsers;
