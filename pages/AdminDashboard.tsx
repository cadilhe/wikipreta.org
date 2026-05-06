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
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchTopics(page);
    }, [isAuthenticated, page, navigate]);

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
        // Navigate to home with topic selected
        navigate(`/?topic=${encodeURIComponent(topicName)}`);
    };

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 p-8">
            <div className="max-w-4xl mx-auto">
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
                                    <th className="p-4 font-semibold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-stone-500">Carregando...</td>
                                    </tr>
                                ) : topics.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-stone-500">Nenhum verbete encontrado.</td>
                                    </tr>
                                ) : (
                                    topics.map((topic) => (
                                        <tr key={topic.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                                            <td className="p-4 text-stone-500 dark:text-stone-400 font-mono text-sm">#{topic.id}</td>
                                            <td className="p-4 font-medium">{topic.title}</td>
                                            <td className="p-4">
                                                <span className={`text-xs px-2 py-1 rounded-full ${topic.source === 'gemini'
                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    }`}>
                                                    {topic.source}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-stone-500 dark:text-stone-400">
                                                {new Date(topic.updated_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(topic.title)}
                                                    className="mr-2 text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-300 font-medium text-sm"
                                                >
                                                    Editar
                                                </button>
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
