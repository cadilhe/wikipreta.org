import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';

interface NewsFeed {
    id: string;
    name: string;
    url: string;
    active: boolean;
    created_at?: string;
}

const AdminNewsFeeds: React.FC = () => {
    const [feeds, setFeeds] = useState<NewsFeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form states
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFeed, setEditingFeed] = useState<NewsFeed | null>(null);
    const [formName, setFormName] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formActive, setFormActive] = useState(true);

    // Delete confirmation modal states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [feedToDelete, setFeedToDelete] = useState<NewsFeed | null>(null);

    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Fetch authorization headers
    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        return headers;
    };

    // Load news feeds
    const fetchFeeds = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/news-feeds', { headers });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Falha ao buscar feeds de notícias.');
            }
            
            const data = await response.json();
            setFeeds(data);
        } catch (err: any) {
            console.error('Error fetching feeds:', err);
            setError(err.message || 'Erro ao carregar a lista de feeds.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login');
            return;
        }
        if (isAuthenticated) {
            fetchFeeds();
        }
    }, [isAuthenticated, authLoading, navigate]);

    const openCreateModal = () => {
        setEditingFeed(null);
        setFormName('');
        setFormUrl('');
        setFormActive(true);
        setError(null);
        setModalOpen(true);
    };

    const openEditModal = (feed: NewsFeed) => {
        setEditingFeed(feed);
        setFormName(feed.name);
        setFormUrl(feed.url);
        setFormActive(feed.active);
        setError(null);
        setModalOpen(true);
    };

    const openDeleteModal = (feed: NewsFeed) => {
        setFeedToDelete(feed);
        setDeleteModalOpen(true);
    };

    // Handle Form Submit (Create / Edit)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !formUrl.trim()) {
            setError('Nome e URL são campos obrigatórios.');
            return;
        }

        setActionLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const payload = {
                name: formName.trim(),
                url: formUrl.trim(),
                active: formActive
            };

            let response;
            if (editingFeed) {
                // Update
                response = await fetch(`/api/admin/news-feeds/${editingFeed.id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                response = await fetch('/api/admin/news-feeds', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao salvar o feed.');
            }

            const savedFeed = await response.json();

            if (editingFeed) {
                setFeeds(prev => prev.map(f => f.id === savedFeed.id ? savedFeed : f));
                setSuccessMessage('Feed de notícias atualizado com sucesso!');
            } else {
                setFeeds(prev => [...prev, savedFeed].sort((a, b) => a.name.localeCompare(b.name)));
                setSuccessMessage('Novo feed de notícias cadastrado com sucesso!');
            }

            setModalOpen(false);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error saving feed:', err);
            setError(err.message || 'Erro ao salvar as informações do feed.');
        } finally {
            setActionLoading(false);
        }
    };

    // Toggle Feed Status (Quick Active/Inactive toggle)
    const handleToggleStatus = async (feed: NewsFeed) => {
        setActionLoading(true);
        try {
            const headers = await getAuthHeaders();
            const updatedActive = !feed.active;
            
            const response = await fetch(`/api/admin/news-feeds/${feed.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ active: updatedActive })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao alternar o status do feed.');
            }

            const updatedFeed = await response.json();
            setFeeds(prev => prev.map(f => f.id === updatedFeed.id ? updatedFeed : f));
            setSuccessMessage(`Feed "${feed.name}" ${updatedActive ? 'ativado' : 'desativado'} com sucesso!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error toggling feed status:', err);
            setError(err.message || 'Erro ao alternar status do feed.');
        } finally {
            setActionLoading(false);
        }
    };

    // Confirm Delete
    const handleDeleteConfirm = async () => {
        if (!feedToDelete) return;
        setActionLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/admin/news-feeds/${feedToDelete.id}`, {
                method: 'DELETE',
                headers
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao excluir o feed.');
            }

            setFeeds(prev => prev.filter(f => f.id !== feedToDelete.id));
            setSuccessMessage(`Feed "${feedToDelete.name}" excluído com sucesso!`);
            setDeleteModalOpen(false);
            setFeedToDelete(null);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error deleting feed:', err);
            setError(err.message || 'Erro ao excluir o feed.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-100">
                            Feeds de Notícias
                        </h1>
                        <p className="text-stone-500 dark:text-stone-400 mt-1">
                            Gerencie os portais de notícias RSS/Atom que alimentam a seção "Notícias Pretas".
                        </p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg shadow-sm transition-all text-sm flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Adicionar Feed
                    </button>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm flex justify-between items-center shadow-sm">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md text-sm flex justify-between items-center shadow-sm animate-in fade-in duration-200">
                        <span>{successMessage}</span>
                        <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-750">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                )}

                {/* Table list */}
                <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-850 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                            <svg className="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Carregando feeds de notícias...
                        </div>
                    ) : feeds.length === 0 ? (
                        <div className="p-16 text-center text-stone-450 dark:text-stone-500">
                            <svg className="h-12 w-12 text-stone-300 dark:text-stone-700 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 0 1 7 7m-7 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0z" />
                            </svg>
                            <h3 className="text-lg font-serif font-semibold text-stone-700 dark:text-stone-300">Nenhum feed cadastrado</h3>
                            <p className="text-stone-500 dark:text-stone-450 mt-1 max-w-md mx-auto text-sm">
                                Cadastre fontes de notícias de cultura negra para que a enciclopédia possa importá-las e incorporá-las no RAG.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                                        <th className="py-4 px-6">Nome do Feed</th>
                                        <th className="py-4 px-6">URL do Feed RSS</th>
                                        <th className="py-4 px-6 text-center">Status</th>
                                        <th className="py-4 px-6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-stone-850 text-sm text-stone-700 dark:text-stone-350">
                                    {feeds.map((feed) => (
                                        <tr key={feed.id} className="hover:bg-stone-50/30 dark:hover:bg-stone-900/30 transition-colors">
                                            <td className="py-4 px-6 font-semibold text-stone-800 dark:text-stone-250">
                                                {feed.name}
                                            </td>
                                            <td className="py-4 px-6 font-mono text-xs max-w-md truncate text-stone-450 dark:text-stone-400" title={feed.url}>
                                                {feed.url}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(feed)}
                                                    disabled={actionLoading}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all ${
                                                        feed.active
                                                            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                                                            : 'bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-500 border border-stone-200 dark:border-stone-800'
                                                    }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${feed.active ? 'bg-green-500' : 'bg-stone-400'}`}></span>
                                                    {feed.active ? 'Ativo' : 'Inativo'}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <div className="inline-flex gap-2">
                                                    <button
                                                        onClick={() => openEditModal(feed)}
                                                        disabled={actionLoading}
                                                        className="p-2 text-stone-450 hover:text-amber-500 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-lg transition-all"
                                                        title="Editar Feed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(feed)}
                                                        disabled={actionLoading}
                                                        className="p-2 text-stone-450 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/15 rounded-lg transition-all"
                                                        title="Excluir Feed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-lg border border-stone-200 dark:border-stone-850 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-serif font-bold text-stone-850 dark:text-stone-100 mb-6">
                            {editingFeed ? 'Editar Feed de Notícias' : 'Novo Feed de Notícias'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                                    Nome do Portal
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ex: Mundo Negro"
                                    required
                                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-4 py-3 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 focus:border-amber-500 focus:outline-none transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                                    URL do Feed RSS
                                </label>
                                <input
                                    type="url"
                                    value={formUrl}
                                    onChange={(e) => setFormUrl(e.target.value)}
                                    placeholder="Ex: https://portal.com.br/feed/"
                                    required
                                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-4 py-3 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 focus:border-amber-500 focus:outline-none transition-all text-sm font-mono"
                                />
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="formActive"
                                    checked={formActive}
                                    onChange={(e) => setFormActive(e.target.checked)}
                                    className="w-4 h-4 text-amber-500 rounded border-stone-300 focus:ring-amber-500 focus:ring-opacity-25"
                                />
                                <label htmlFor="formActive" className="text-sm font-medium text-stone-700 dark:text-stone-305 select-none cursor-pointer">
                                    Ativar feed para sincronizações futuras
                                </label>
                            </div>

                            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="py-2.5 px-4 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    {actionLoading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && feedToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md border border-stone-200 dark:border-stone-850 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        
                        <h3 className="text-lg font-serif font-bold text-stone-850 dark:text-stone-100 mb-2">Excluir Feed de Notícias</h3>
                        <p className="text-stone-500 dark:text-stone-400 text-sm mb-6 leading-relaxed">
                            Tem certeza que deseja excluir o feed <strong>"{feedToDelete.name}"</strong>?<br/>
                            Isso não removerá os artigos já importados por ele, mas impedirá que novas notícias sejam sincronizadas.
                        </p>

                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="py-2.5 px-4 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={actionLoading}
                                className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-all text-sm disabled:opacity-50"
                            >
                                {actionLoading ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminNewsFeeds;
