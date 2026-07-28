import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import ReactMarkdown from 'react-markdown';

interface DocItem {
    path: string;
    title: string;
    category: string;
}

interface DocContent {
    frontmatter: Record<string, any>;
    content: string;
}

export const AdminDocsPage: React.FC = () => {
    const [docsList, setDocsList] = useState<DocItem[]>([]);
    const [activeDocPath, setActiveDocPath] = useState<string>('INDEX.md');
    const [docContent, setDocContent] = useState<DocContent | null>(null);
    const [loadingList, setLoadingList] = useState<boolean>(true);
    const [loadingContent, setLoadingContent] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch the list of documents on mount
    useEffect(() => {
        const fetchDocsList = async () => {
            setLoadingList(true);
            setError(null);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const response = await fetch('/api/admin/docs', { headers });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Falha ao buscar lista de documentos');
                }
                const data = await response.json();
                setDocsList(data);
                
                // Se a lista não estiver vazia e tiver INDEX.md, mantemos ela, senão colocamos o primeiro arquivo
                if (data.length > 0) {
                    const hasIndex = data.some((d: DocItem) => d.path === 'INDEX.md');
                    if (!hasIndex) {
                        setActiveDocPath(data[0].path);
                    }
                }
            } catch (err: any) {
                console.error('Failed to fetch admin docs:', err);
                setError(err.message || 'Erro ao carregar lista de documentação.');
            } finally {
                setLoadingList(false);
            }
        };

        fetchDocsList();
    }, []);

    // Fetch active document content when activeDocPath changes
    useEffect(() => {
        if (!activeDocPath) return;

        const fetchDocContent = async () => {
            setLoadingContent(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const response = await fetch(`/api/admin/docs/content?path=${encodeURIComponent(activeDocPath)}`, { headers });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Falha ao buscar conteúdo do documento');
                }
                const data = await response.json();
                setDocContent(data);
            } catch (err: any) {
                console.error('Failed to fetch doc content:', err);
                setDocContent({
                    frontmatter: {},
                    content: `### Erro ao carregar documento\n\nNão foi possível obter o conteúdo de \`${activeDocPath}\`.\n\nDetalhe: ${err.message}`
                });
            } finally {
                setLoadingContent(false);
            }
        };

        fetchDocContent();
    }, [activeDocPath]);

    // Agrupa os documentos por categoria
    const categories = docsList.reduce<Record<string, DocItem[]>>((acc, doc) => {
        const catName = doc.category || 'Geral';
        if (!acc[catName]) {
            acc[catName] = [];
        }
        acc[catName].push(doc);
        return acc;
    }, {});

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                    Documentação Técnica
                </h1>
                <p className="text-stone-500 mt-2">
                    Manuais de arquitetura, guias de desenvolvimento e notas de operação do Wikipreta.org.
                </p>
            </div>

            {error ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400">
                    <p className="font-semibold">Erro</p>
                    <p>{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Menu Lateral Esquerdo - Tópicos */}
                    <div className="lg:col-span-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm h-[calc(100vh-250px)] overflow-y-auto sticky top-8">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-4 px-2">
                            Tópicos Disponíveis
                        </h3>
                        {loadingList ? (
                            <div className="space-y-2 p-2">
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-3/4"></div>
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-5/6"></div>
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-2/3"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.keys(categories).map(cat => (
                                    <div key={cat} className="space-y-1">
                                        <h4 className="text-xs font-bold font-serif text-amber-500 dark:text-amber-500/80 uppercase tracking-widest px-2 mb-2">
                                            {cat === 'Geral' || cat === '.' ? 'Geral' : cat.replace(/[-_]/g, ' ')}
                                        </h4>
                                        <div className="space-y-0.5">
                                            {categories[cat].map(doc => {
                                                const isActive = activeDocPath === doc.path;
                                                return (
                                                    <button
                                                        key={doc.path}
                                                        onClick={() => setActiveDocPath(doc.path)}
                                                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors block truncate ${
                                                            isActive
                                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                                                                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-white'
                                                        }`}
                                                        title={doc.title}
                                                    >
                                                        {doc.title}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Área Principal Direita - Visualizador de Markdown */}
                    <div className="lg:col-span-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 lg:p-8 shadow-sm min-h-[calc(100vh-250px)]">
                        {loadingContent ? (
                            <div className="space-y-4">
                                <div className="h-8 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-1/3"></div>
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-full"></div>
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-full"></div>
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-5/6"></div>
                                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded animate-pulse w-2/3"></div>
                            </div>
                        ) : docContent ? (
                            <div className="prose prose-stone dark:prose-invert max-w-none 
                                prose-headings:font-serif prose-headings:font-bold prose-headings:text-stone-900 dark:prose-headings:text-white
                                prose-a:text-[#B8860B] dark:prose-a:text-[#D4AF37] hover:prose-a:underline
                                prose-strong:text-stone-900 dark:prose-strong:text-white
                                prose-code:text-amber-600 dark:prose-code:text-amber-400 prose-code:bg-stone-100 dark:prose-code:bg-stone-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                                prose-pre:bg-stone-50 dark:prose-pre:bg-stone-950 prose-pre:border prose-pre:border-stone-200 dark:prose-pre:border-stone-800 prose-pre:rounded-lg prose-pre:p-4
                                prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:italic prose-blockquote:text-stone-600 dark:prose-blockquote:text-stone-400
                                prose-img:rounded-lg prose-img:shadow-sm"
                            >
                                <ReactMarkdown>{docContent.content}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-stone-400">
                                Selecione um documento na barra lateral para começar a leitura.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminDocsPage;
