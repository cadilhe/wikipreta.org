import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNews, syncNews, ingestNewsToKB, NewsArticle } from '../services/databaseService';
import ThemeSwitcher from '../components/ThemeSwitcher';

const SOURCES = ['Todos', 'Guia Negro', 'Mundo Negro', 'Alma Preta', 'Geledés', 'Notícia Preta'];

const NewsFeedPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [ingesting, setIngesting] = useState<boolean>(false);
  
  const [source, setSource] = useState<string>('Todos');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
      }
    } catch (e) {
      console.warn('Could not access localStorage to get theme.');
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Handle theme changes
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      console.warn('Could not access localStorage to set theme.');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const fetchNews = useCallback(async (pageNum: number, activeSource: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await getNews(pageNum, 9, activeSource);
      setArticles(data.articles);
      setTotalPages(data.pagination.pages || 1);
      setTotalItems(data.pagination.total || 0);
    } catch (error) {
      console.error('Error fetching news:', error);
      setFeedback({ type: 'error', message: 'Falha ao carregar as notícias. Tente novamente mais tarde.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(page, source);
  }, [page, source, fetchNews]);

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    setPage(1);
  };

  const handleSync = async () => {
    if (!isAuthenticated) return;
    setSyncing(true);
    setFeedback(null);
    try {
      const result = await syncNews();
      setFeedback({ type: 'success', message: result.message });
      fetchNews(1, source);
      setPage(1);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao sincronizar feeds.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleIngest = async () => {
    if (!isAuthenticated) return;
    setIngesting(true);
    setFeedback(null);
    try {
      const result = await ingestNewsToKB();
      setFeedback({ type: 'success', message: result.message });
      fetchNews(page, source);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao indexar no RAG.' });
    } finally {
      setIngesting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const isEditor = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className="max-w-[65ch] mx-auto pt-8 px-8 pb-20 text-[#2C2C2C] dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
          aria-label="Voltar para a página inicial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Início
        </button>
        <h1 className="tracking-widest uppercase text-2xl text-center">
          WIKIPRETA.ORG
        </h1>
        <div className="flex items-center gap-4">
          <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>

      <main className="pb-12">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
            <span className="w-1.5 h-6 bg-[#B8860B] dark:bg-[#D4AF37] rounded"></span>
            Feed de Notícias
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            Atualizações recentes dos principais portais da cultura negra no Brasil.
          </p>
        </header>

        {/* Admin Dashboard Integration (Sync and Ingest) */}
        {isAuthenticated && isEditor && (
          <div className="mb-8 p-4 border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-3">
              Curadoria de Notícias (RAG)
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || ingesting}
                className="flex items-center gap-2 py-2 px-4 text-xs rounded-md bg-[#B8860B] dark:bg-[#D4AF37] text-white dark:text-black font-semibold hover:bg-opacity-95 disabled:opacity-50 transition-all"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-current" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                    Sincronizar Feeds
                  </>
                )}
              </button>

              <button
                onClick={handleIngest}
                disabled={syncing || ingesting}
                className="flex items-center gap-2 py-2 px-4 text-xs rounded-md bg-stone-800 dark:bg-stone-200 text-white dark:text-black font-semibold hover:bg-stone-750 dark:hover:bg-stone-100 disabled:opacity-50 transition-all"
              >
                {ingesting ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-current" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Indexando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    Integrar no RAG
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {feedback && (
          <div className={`mb-6 p-3 border rounded-md text-sm flex justify-between items-center animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
              : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
          }`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        {/* Feed Source Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {SOURCES.map((src) => {
            const isSelected = source === src;
            return (
              <button
                key={src}
                onClick={() => handleSourceChange(src)}
                className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#B8860B] dark:bg-[#D4AF37] border-[#B8860B] dark:border-[#D4AF37] text-white dark:text-black font-semibold'
                    : 'border-stone-300 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 text-stone-700 dark:text-stone-300'
                }`}
              >
                {src}
              </button>
            );
          })}
        </div>

        {/* News Feed Grid */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-5 border border-stone-200 dark:border-stone-850 rounded-xl bg-gray-50/50 dark:bg-stone-900/20 space-y-3">
                <div className="h-4 bg-stone-300 dark:bg-stone-800 rounded w-1/3"></div>
                <div className="h-6 bg-stone-300 dark:bg-stone-800 rounded w-3/4"></div>
                <div className="h-4 bg-stone-300 dark:bg-stone-800 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl">
            <svg className="mx-auto h-12 w-12 text-stone-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3M14 4h6m-3 0v6" />
            </svg>
            <h3 className="text-lg font-serif font-semibold text-gray-800 dark:text-gray-200">Sem notícias</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Nenhuma notícia encontrada para esta fonte.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <article
                key={article.id}
                className="group p-6 border border-stone-250 dark:border-stone-800/80 rounded-xl bg-white dark:bg-stone-900/10 hover:shadow-lg hover:border-[#B8860B]/50 dark:hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Article Metadata */}
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-3 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-stone-150 dark:bg-stone-800 font-semibold text-[#B8860B] dark:text-[#D4AF37]">
                      {article.source_name}
                    </span>
                    <span>·</span>
                    <time dateTime={article.pub_date}>{formatDate(article.pub_date)}</time>
                    {article.creator && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[15ch]">Por {article.creator}</span>
                      </>
                    )}
                    {article.ingested_to_kb && (
                      <span className="ml-auto inline-flex items-center text-[10px] uppercase font-bold text-green-600 dark:text-green-500" title="Indexado no RAG para consultas da IA">
                        <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                        RAG
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white leading-snug mb-3 group-hover:text-[#B8860B] dark:group-hover:text-[#D4AF37] transition-colors">
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {article.title}
                    </a>
                  </h3>

                  {/* Description */}
                  {article.description && (
                    <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3">
                      {article.description}
                    </p>
                  )}
                </div>

                {/* Read more */}
                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-850 flex items-center justify-between">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#B8860B] dark:text-[#D4AF37] hover:opacity-80 transition-opacity"
                  >
                    Ler matéria original
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Paginator */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-12 border-t border-stone-200 dark:border-stone-800 pt-6">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="py-2 px-4 rounded-md border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-850 disabled:opacity-40 disabled:hover:bg-transparent text-sm transition-all"
            >
              Anterior
            </button>
            <span className="text-sm text-stone-500 dark:text-stone-400">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="py-2 px-4 rounded-md border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-850 disabled:opacity-40 disabled:hover:bg-transparent text-sm transition-all"
            >
              Próxima
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky-footer border-t border-stone-200 dark:border-stone-800 pt-8 mt-16 text-center">
        <nav className="mb-4" aria-label="Footer navigation">
          <ul className="flex justify-center items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <button onClick={() => navigate('/')} className="px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                Home
              </button>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <button onClick={() => navigate('/noticias')} className="px-2 py-1 font-bold text-[#B8860B] dark:text-[#D4AF37]">
                Notícias Pretas
              </button>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              {isAuthenticated ? (
                <>
                  <button onClick={() => navigate('/admin')} className="mr-3 px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                    Admin
                  </button>
                  <button onClick={logout} className="px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                    Sair ({user?.username})
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('/login')} className="px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                  Login
                </button>
              )}
            </li>
          </ul>
        </nav>
        <p className="footer-text text-stone-500 dark:text-stone-400 text-xs">
          Wikipreta.org · Valorizando e difundindo a história preta.
        </p>
      </footer>
    </div>
  );
};

export default NewsFeedPage;
