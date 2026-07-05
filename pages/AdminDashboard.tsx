import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';

interface Topic {
    id: string;
    title: string;
    slug: string;
    source: string;
    updated_at: string;
    image_url?: string | null;
}

const getFallbackImage = (topicId: string) => {
    const staticFallback = [
        'hu-chen-60XLoOgwkfA-unsplash.jpg',
        'ian-kiragu-GSh_PwsZsPQ-unsplash.jpg',
        'ian-macharia-7k91OUDYAQ0-unsplash.jpg',
        'james-wiseman-IebZAH6kaNw-unsplash.jpg',
        'jeff-ackley-YwDo_HwORXs-unsplash.jpg',
        'ninno-jackjr-CG6Gd__QIOY-unsplash.jpg',
        'random1.png',
        'random2.png',
        'random3.png',
        'random4.png',
        'random5.png',
        'seth-doyle-zf9_yiAekJs-unsplash.jpg'
    ];
    let hash = 0;
    for (let i = 0; i < topicId.length; i++) {
        hash = topicId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % staticFallback.length;
    return `/assets/images/random/${staticFallback[index]}`;
};

const AdminDashboard: React.FC = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('updated_at');
    const [order, setOrder] = useState('desc');
    const [dateFilter, setDateFilter] = useState('all');
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; slug: string; title: string }>({
        isOpen: false,
        slug: '',
        title: ''
    });

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        
        // Debounce search and filter updates to avoid overloading backend
        const timeoutId = setTimeout(() => {
            fetchTopics(page, limit, search, sortBy, order, dateFilter);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [isAuthenticated, authLoading, page, limit, search, sortBy, order, dateFilter, navigate]);

    const fetchTopics = async (
        pageNum: number, 
        currentLimit: number, 
        searchTerm: string = '', 
        sortColumn: string = 'updated_at', 
        sortOrder: string = 'desc', 
        dateVal: string = 'all'
    ) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/topics?page=${pageNum}&limit=${currentLimit}&search=${encodeURIComponent(searchTerm)}&sortBy=${sortColumn}&order=${sortOrder}&dateFilter=${dateVal}`);
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

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page when searching
    };

    const handleEdit = (topicName: string) => {
        // Navigate to home with topic selected and edit mode active
        navigate(`/?topic=${encodeURIComponent(topicName)}&edit=true`);
    };

    const handleDeleteClick = (slug: string, title: string) => {
        setConfirmModal({
            isOpen: true,
            slug,
            title
        });
    };

    const handleConfirmDelete = async () => {
        const { slug, title } = confirmModal;
        setConfirmModal({ isOpen: false, slug: '', title: '' });
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};

            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(`/api/topics/${slug}`, {
                method: 'DELETE',
                headers,
            });

            if (response.ok) {
                // Remove from local state
                setTopics(topics.filter(t => t.slug !== slug));
                setSuccessMessage('Verbete excluído com sucesso.');
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao excluir');
            }
        } catch (err: any) {
            console.error('Failed to delete topic:', err);
            setError(err.message || 'Falha ao excluir o verbete.');
        } finally {
            setLoading(false);
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

            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-lg text-green-700 dark:text-green-400 flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex flex-col xl:flex-row justify-between items-center gap-4 bg-stone-50/50 dark:bg-stone-950/20">
                    <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full lg:w-64">
                            <input
                                type="text"
                                placeholder="Buscar verbete..."
                                value={search}
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <div className="flex items-center gap-2">
                                <label htmlFor="limit" className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                                    Mostrar:
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

                            <div className="flex items-center gap-2">
                                <label htmlFor="sort" className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                                    Ordenar por:
                                </label>
                                <select
                                    id="sort"
                                    value={`${sortBy}:${order}`}
                                    onChange={(e) => {
                                        const [newSortBy, newOrder] = e.target.value.split(':');
                                        setSortBy(newSortBy);
                                        setOrder(newOrder);
                                        setPage(1);
                                    }}
                                    className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                >
                                    <option value="updated_at:desc">Atualizado (Mais recente)</option>
                                    <option value="updated_at:asc">Atualizado (Mais antigo)</option>
                                    <option value="title:asc">Título (A-Z)</option>
                                    <option value="title:desc">Título (Z-A)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <label htmlFor="dateFilter" className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                                    Período:
                                </label>
                                <select
                                    id="dateFilter"
                                    value={dateFilter}
                                    onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                >
                                    <option value="all">Qualquer data</option>
                                    <option value="7d">Últimos 7 dias</option>
                                    <option value="30d">Últimos 30 dias</option>
                                    <option value="90d">Últimos 90 dias</option>
                                </select>
                            </div>

                            {!loading && totalItems > 0 && (
                                <span className="text-sm text-stone-500 whitespace-nowrap">
                                    <span className="font-bold text-stone-900 dark:text-stone-100">{rangeStart}</span> a <span className="font-bold text-stone-900 dark:text-stone-100">{rangeEnd}</span> de <span className="font-bold text-stone-900 dark:text-stone-100">{totalItems}</span>
                                </span>
                            )}
                        </div>
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
                                <th className="p-6 font-semibold">Imagem</th>
                                <th className="p-6 font-semibold">Título</th>
                                <th className="p-6 font-semibold">Fonte</th>
                                <th className="p-6 font-semibold">Atualizado em</th>
                                <th className="p-6 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {authLoading || loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-stone-500 italic">Carregando verbetes...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : topics.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-stone-500">Nenhum verbete encontrado.</td>
                                </tr>
                            ) : (
                                topics.map((topic) => (
                                    <tr key={topic.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                                        <td className="p-6 text-stone-400 font-mono text-[10px]">#{topic.id.substring(0, 8)}</td>
                                        <td className="p-6">
                                            <img 
                                                src={topic.image_url || getFallbackImage(topic.id)} 
                                                alt={topic.title} 
                                                className="w-12 h-12 object-cover rounded-lg border border-stone-200 dark:border-stone-700" 
                                            />
                                        </td>
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
                                                    onClick={() => handleDeleteClick(topic.slug, topic.title)}
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
            {/* Custom confirmation modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-2.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">
                                    Excluir Verbete
                                </h3>
                                <p className="text-stone-600 dark:text-stone-400 text-sm mt-1.5 leading-relaxed">
                                    Tem certeza que deseja excluir permanentemente o verbete <strong>"{confirmModal.title}"</strong>? Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, slug: '', title: '' })}
                                className="px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-semibold bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 dark:text-black"
                            >
                                Confirmar e Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminDashboard;
