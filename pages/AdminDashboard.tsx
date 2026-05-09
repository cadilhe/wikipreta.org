import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    const [totalPages, setTotalPages] = useState(1);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchTopics(page);
    }, [isAuthenticated, authLoading, page, navigate]);

    const fetchTopics = async (pageNum: number) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:4000/api/topics?page=${pageNum}&limit=20`);
            const data = await response.json();
            setTopics(data.topics);
            setTotalPages(data.pagination.pages);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        } finally {
            setLoading(false);
        }
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
            const response = await fetch(`http://localhost:4000/api/topics/${slug}`, {
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

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 p-8">
            <div className="max-w-5xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-amber-600 dark:text-amber-500">
                        Painel Administrativo
                    </h1>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm px-4 py-2 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                    >
                        Voltar ao Site
                    </button>
                </header>

                <div className="bg-white dark:bg-stone-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-200 dark:bg-stone-950 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-semibold">ID</th>
                                    <th className="p-4 font-semibold">Título</th>
                                    <th className="p-4 font-semibold">Fonte</th>
                                    <th className="p-4 font-semibold">Atualizado em</th>
                                    <th className="p-4 font-semibold text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                                {authLoading || loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-stone-500 italic">Validando acesso...</td>
                                    </tr>
                                ) : topics.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-stone-500">Nenhum verbete encontrado.</td>
                                    </tr>
                                ) : (
                                    topics.map((topic) => (
                                        <tr key={topic.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                                            <td className="p-4 text-stone-500 dark:text-stone-400 font-mono text-xs">#{topic.id.substring(0, 8)}...</td>
                                            <td className="p-4 font-medium">{topic.title}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${topic.source === 'gemini'
                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                        : topic.source === 'deepseek'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    }`}>
                                                    {topic.source}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-stone-500 dark:text-stone-400">
                                                {new Date(topic.updated_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        onClick={() => handleEdit(topic.title)}
                                                        className="text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-300 font-bold text-xs uppercase tracking-tighter"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(topic.slug, topic.title)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold text-xs uppercase tracking-tighter"
                                                    >
                                                        Excluir
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
                        <div className="p-4 border-t border-stone-200 dark:border-stone-700 flex justify-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 rounded disabled:opacity-50 hover:bg-stone-100 dark:hover:bg-stone-700"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1">Página {page} de {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 rounded disabled:opacity-50 hover:bg-stone-100 dark:hover:bg-stone-700"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
