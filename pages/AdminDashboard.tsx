import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

interface Topic {
    id: string;
    title: string;
    slug: string;
    source: string;
    updated_at: string;
}

const AdminDashboard: React.FC = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchTopics(page, limit);
    }, [isAuthenticated, authLoading, page, limit, navigate]);

    const fetchTopics = async (pageNum: number, currentLimit: number) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/topics?page=${pageNum}&limit=${currentLimit}`);
            const data = await response.json();
            setTopics(data.topics);
            setTotalPages(data.pagination.pages);
            setTotalItems(data.pagination.total);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLimit = parseInt(e.target.value);
        setLimit(newLimit);
        setPage(1); // Reset to first page when changing limit
    };

    const handleEdit = (topicName: string) => {
        // Navigate to home with topic selected and edit mode active
        navigate(`/?topic=${encodeURIComponent(topicName)}&edit=true`);
    };

    const handleDelete = async (slug: string, title: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir o verbete "${title}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/topics/${slug}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Remove from local state
                setTopics(topics.filter(t => t.slug !== slug));
                alert('Verbete excluído com sucesso.');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao excluir');
            }
        } catch (error: any) {
            console.error('Failed to delete topic:', error);
            alert(`Erro: ${error.message}`);
        }
    };

    const rangeStart = (page - 1) * limit + 1;
    const rangeEnd = Math.min(page * limit, totalItems);

    return (
        <AdminLayout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                        Verbetes
                    </h1>
                    <p className="text-stone-500 mt-2">
                        Gerencie todos os verbetes da enciclopédia Wikipreta.
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

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-950/20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label htmlFor="limit" className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                                Itens por página:
                            </label>
                            <select
                                id="limit"
                                value={limit}
                                onChange={handleLimitChange}
                                className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        {!loading && totalItems > 0 && (
                            <span className="text-sm text-stone-500">
                                <span className="font-bold text-stone-900 dark:text-stone-100">{rangeStart}</span> a <span className="font-bold text-stone-900 dark:text-stone-100">{rangeEnd}</span> de <span className="font-bold text-stone-900 dark:text-stone-100">{totalItems}</span>
                            </span>
                        )}
                    </div>

                    {!loading && totalPages > 1 && (
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-stone-500 uppercase font-semibold tracking-widest">Página {page} de {totalPages}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                                    title="Anterior"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                                    title="Próxima"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 text-xs uppercase tracking-widest border-bottom border-stone-200 dark:border-stone-800">
                                <th className="p-6 font-semibold">ID</th>
                                <th className="p-6 font-semibold">Título</th>
                                <th className="p-6 font-semibold">Fonte</th>
                                <th className="p-6 font-semibold">Atualizado em</th>
                                <th className="p-6 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {authLoading || loading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-stone-500 italic">Carregando verbetes...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : topics.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-stone-500">Nenhum verbete encontrado.</td>
                                </tr>
                            ) : (
                                topics.map((topic) => (
                                    <tr key={topic.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                                        <td className="p-6 text-stone-400 font-mono text-[10px]">#{topic.id.substring(0, 8)}</td>
                                        <td className="p-6">
                                            <span className="font-serif text-lg text-stone-900 dark:text-white font-bold group-hover:text-amber-600 transition-colors">
                                                {topic.title}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider ${topic.source === 'gemini'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : topic.source === 'deepseek'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                {topic.source}
                                            </span>
                                        </td>
                                        <td className="p-6 text-sm text-stone-500">
                                            {new Date(topic.updated_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(topic.title)}
                                                    className="p-2 text-stone-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(topic.slug, topic.title)}
                                                    className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && totalPages > 1 && (
                    <div className="p-6 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-950/20">
                        <span className="text-sm text-stone-500">Exibindo <span className="font-bold">{topics.length}</span> verbetes nesta página</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-stone-800 transition-colors text-sm font-medium"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-stone-800 transition-colors text-sm font-medium"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
