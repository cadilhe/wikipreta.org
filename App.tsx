/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard'; // Import AdminDashboard
import { generateImageForTopic, generateTopicContent } from './services/geminiService';



// --- Components ---

import { getTopicContent, saveTopicContent, getHistory, addToHistory, clearHistory } from './services/databaseService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import ThemeSwitcher from './components/ThemeSwitcher';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';
import HistoryPanel from './components/HistoryPanel';

// A curated list of important figures, events, and concepts for Wikipreta.org
const PREDEFINED_WORDS = [
  'Moçambique', 'Kanimambo', 'Zumbi dos Palmares', 'Machado de Assis', 'Carolina Maria de Jesus', 'Milton Santos', 'Abdias do Nascimento', 'Lélia Gonzalez', 'Marielle Franco', 'Quilombo', 'Capoeira', 'Samba', 'Candomblé', 'Revolta dos Malês', 'Luiz Gama', 'Antonieta de Barros', 'Aqualtune', 'Dandara', 'Nelson Mandela', 'Martin Luther King Jr.', 'Rosa Parks', 'Malcom X', 'Angela Davis', 'James Baldwin', 'Chimamanda Ngozi Adichie', 'Festa da Boa Morte', 'Congada', 'Pixinguinha', 'Clementina de Jesus', 'Ruth de Souza', 'Grande Otelo', 'Lima Barreto', 'Aleijadinho', 'Tia Ciata'
];
const UNIQUE_WORDS = [...new Set(PREDEFINED_WORDS)];

type Page = 'home' | 'about' | 'privacy';

// GTM dataLayer declaration for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
  }
}

const AppContent: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [currentTopic, setCurrentTopic] = useState<string>('Kanimambo');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedImageUrl, setEditedImageUrl] = useState<string>('');
  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [randomImages, setRandomImages] = useState<string[]>([]);
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

  // Effect to handle theme changes
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

  // Effect to load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Effect to read topic from URL on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicFromUrl = urlParams.get('topic');
    if (topicFromUrl) {
      try {
        setCurrentTopic(decodeURIComponent(topicFromUrl));
      } catch (e) {
        console.error('Failed to decode URL topic parameter:', e);
        // Fallback to a default topic if decoding fails
        setCurrentTopic('Kanimambo');
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Fetch available random images on mount
  useEffect(() => {
    const loadRandomImages = async () => {
      try {
        const resp = await fetch('/api/random-images');
        if (resp.ok) {
          const list = await resp.json();
          setRandomImages(list);
        }
      } catch (e) {
        console.warn('Could not load random images list:', e);
      }
    };
    loadRandomImages();
  }, []);

  // Effect to fetch content when topic changes
  useEffect(() => {
    if (!currentTopic || currentPage !== 'home') return;

    // Update URL and push to GTM dataLayer for SPA tracking
    try {
      const newUrl = `${window.location.pathname}?topic=${encodeURIComponent(currentTopic)}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      // Ensure dataLayer exists
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtualPageView',
        pagePath: newUrl,
        pageTitle: `${currentTopic} - Wikipreta.org`
      });
    } catch (e) {
      console.warn('Could not update browser history or GTM dataLayer:', e);
    }

    // Helper to get a random image from the local assets
    const getRandomImage = () => {
      if (randomImages.length === 0) return '/assets/images/random/random1.png'; // Use one of the generated ones as fallback
      const randomIndex = Math.floor(Math.random() * randomImages.length);
      return `/assets/images/random/${randomImages[randomIndex]}`;
    };

    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      setContent('');
      setTopicImage(null);
      setIsEditing(false);

      try {
        // 1. Check DB first (via server)
        const topicData = await getTopicContent(currentTopic);
        
        if (topicData) {
          setContent(topicData.content);
          setTopicImage(topicData.image_url || getRandomImage());
          setIsLoading(false); 
        } else {
          // 2. If not in DB, generate content via AI
          const generatedContent = await generateTopicContent(currentTopic);
          if (generatedContent) {
            setContent(generatedContent);
            setTopicImage(getRandomImage());

            // 3. Save the newly generated content - handle error silently
            try {
              await saveTopicContent(currentTopic, generatedContent);
            } catch (saveError) {
              console.warn('Could not save generated content to DB:', saveError);
            }
          } else {
            setError(`Não foi possível gerar conteúdo para "${currentTopic}". Verifique sua conexão ou tente novamente.`);
          }
        }

        // Always update history after a successful load
        const newHistory = addToHistory(currentTopic);
        setHistory(newHistory);

      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido';
        setError(errorMessage);
        setContent('');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();

  }, [currentTopic, currentPage]);

  const handleNavigate = (page: Page) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  const handleWordClick = useCallback((word: string) => {
    const newTopic = word.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      handleNavigate('home');
      setCurrentTopic(newTopic);
    }
  }, [currentTopic]);

  const handleSearch = useCallback((topic: string) => {
    const newTopic = topic.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      handleNavigate('home');
      setCurrentTopic(newTopic);
    }
  }, [currentTopic]);

  const handleRandom = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setContent('');

    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    let randomWord = UNIQUE_WORDS[randomIndex];

    if (randomWord.toLowerCase() === currentTopic.toLowerCase()) {
      const nextIndex = (randomIndex + 1) % UNIQUE_WORDS.length;
      randomWord = UNIQUE_WORDS[nextIndex];
    }

    handleNavigate('home');
    setCurrentTopic(randomWord);
  }, [currentTopic]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard && currentTopic && content) {
      const cleanContent = content.replace(/\*\*/g, '');
      const textToCopy = `${currentTopic}\n${cleanContent}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Falha ao copiar o texto: ', err);
      });
    }
  }, [currentTopic, content]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;

    const shareUrl = `${window.location.origin}${window.location.pathname}?topic=${encodeURIComponent(currentTopic)}`;
    const shareData = {
      title: `Wikipreta.org: ${currentTopic}`,
      text: `Descobrindo sobre ${currentTopic} na Wikipreta.org! #HistóriaPreta`,
      url: shareUrl,
    };

    try {
      await navigator.share(shareData);
    } catch (err) {
      console.log('Share was cancelled or failed', err);
    }
  }, [currentTopic]);

  const handleDownloadImage = useCallback(() => {
    if (!topicImage) return;

    const fileName = `Wikipreta_${currentTopic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;

    const link = document.createElement('a');
    link.href = topicImage;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [topicImage, currentTopic]);

  const handleEdit = () => {
    setEditedContent(content);
    // Only set editedImageUrl if the current image is not a local random one
    if (topicImage && !topicImage.startsWith('/assets/images/random/')) {
      setEditedImageUrl(topicImage);
    } else {
      setEditedImageUrl('');
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
    setEditedImageUrl('');
  };

  const handleSaveEdit = async () => {
    if (editedContent.trim()) {
      const finalContent = editedContent.trim();
      const finalImageUrl = editedImageUrl.trim() || undefined;
      
      await saveTopicContent(currentTopic, finalContent, user?.email, finalImageUrl);
      
      setContent(finalContent);
      if (finalImageUrl) {
        setTopicImage(finalImageUrl);
      }
      
      setIsEditing(false);
      setEditedContent('');
      setEditedImageUrl('');
    }
  };

  const toggleHistory = () => {
    setIsHistoryOpen(prev => !prev);
  };

  const handleHistoryClick = (topic: string) => {
    if (topic.toLowerCase() !== currentTopic.toLowerCase()) {
      handleNavigate('home');
      setCurrentTopic(topic);
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setIsHistoryOpen(false);
  };

  const footerMenuItems = [
    { label: 'Home', page: 'home' },
    { label: 'Sobre', page: 'about' },
    { label: 'Privacidade', page: 'privacy' },
  ];

  return (
    <div>
      <HistoryPanel
        isOpen={isHistoryOpen}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
        onHistoryClick={handleHistoryClick}
        onClearHistory={handleClearHistory}
      />
      <div className="flex items-center justify-between gap-4 mb-12">
        <div className="flex-1"></div>
        <h1 className="tracking-widest uppercase text-2xl text-center">
          WIKIPRETA.ORG
        </h1>
        <div className="flex-1 flex justify-end items-center gap-4">
          <button
            onClick={toggleHistory}
            className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
            aria-label="Ver histórico de navegação"
            title="Histórico"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </button>
          <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>

      <main className="pb-12">
        {currentPage === 'home' && (
          <>
            <div className="flex items-baseline justify-between gap-4 mb-12 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <SearchBar onSearch={handleSearch} onRandom={handleRandom} isLoading={isLoading} />
            </div>
            <header className="text-center mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">
                Clique em uma palavra em negrito para ver outro verbete.
              </p>
            </header>
            <div>
              <div className="flex justify-center items-center gap-3 mb-8">
                <h2 className="capitalize text-3xl">
                  {currentTopic}
                </h2>
                <button
                  onClick={handleCopy}
                  className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors duration-200 rounded-full"
                  aria-label="Copiar título e definição"
                  title="Copiar título e definição"
                >
                  {isCopied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-500">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
                {navigator.share && (
                  <button
                    onClick={handleNativeShare}
                    className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors duration-200 rounded-full"
                    aria-label="Compartilhar"
                    title="Compartilhar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                )}
              </div>

              {isLoading && <LoadingSkeleton />}

              {!isLoading && error && (
                <div className="text-center py-8 px-6 border border-solid border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">{error}</h3>
                  <button
                    onClick={() => {
                      setError(null);
                      setCurrentTopic(currentTopic);
                    }}
                    className="mt-4 inline-flex items-center gap-2 py-2 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 font-semibold transition-transform transform hover:scale-105"
                    aria-label="Tentar novamente"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path></svg>
                    Tentar Novamente
                  </button>
                </div>
              )}

              {!isLoading && content.length === 0 && !error && (
                <div className="text-center py-8 px-6 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg">
                  <h3 className="text-xl text-gray-800 dark:text-gray-200">Não foi encontrado conteúdo para "{currentTopic}".</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">Você gostaria de ser o primeiro a criar este verbete?</p>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-2 py-2 px-5 rounded-md bg-[#B8860B] text-white hover:bg-opacity-90 dark:bg-[#D4AF37] dark:text-black font-semibold transition-transform transform hover:scale-105"
                    aria-label={`Criar verbete para ${currentTopic}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                    Criar Verbete
                  </button>
                </div>
              )}

              {content.length > 0 && (
                isEditing ? (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Definição do Verbete
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.querySelector('textarea');
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const selection = text.substring(start, end);
                            const after = text.substring(end);
                            const newText = `${before}**${selection || 'termo'}**${after}`;
                            setEditedContent(newText);
                            // Focus back
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, end + 2);
                            }, 10);
                          }}
                          className="p-1 px-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-lg flex items-center gap-1 transition-colors"
                          title="Negrito (Transforma em link)"
                        >
                          B
                        </button>
                      </div>
                    </div>
                    
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-64 p-4 border rounded-md bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#B8860B] dark:focus:ring-[#D4AF37] outline-none resize-y mb-2 font-serif leading-relaxed"
                      placeholder="Escreva a definição aqui..."
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">
                      Dica: Palavras entre **asteriscos duplos** (negrito) tornam-se links para outros verbetes automaticamente.
                    </p>
                    
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      URL da Imagem (Opcional - Deixe em branco para imagem randômica)
                    </label>
                    <input
                      type="text"
                      value={editedImageUrl}
                      onChange={(e) => setEditedImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#B8860B] dark:focus:ring-[#D4AF37] outline-none mb-4"
                    />

                    <div className="flex justify-end gap-4 mt-4">
                      <button onClick={handleCancelEdit} className="py-2 px-4 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                        Cancelar
                      </button>
                      <button onClick={handleSaveEdit} className="py-2 px-4 rounded-md bg-[#B8860B] text-white hover:bg-opacity-90 dark:bg-[#D4AF37] dark:text-black font-bold">
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <ContentDisplay
                      content={content}
                      onWordClick={handleWordClick}
                    />
                    {!isLoading && isAuthenticated && (
                      <div className="flex justify-end mt-4">
                        <button onClick={handleEdit} className="flex items-center gap-2 py-2 px-4 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                          Editar
                        </button>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </>
        )}

        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'privacy' && <PrivacyPage />}

        {(currentPage === 'home' && !isLoading && content) && (
          <div
            key={currentTopic}
            id="image-container"
            className="my-12 mx-auto w-full max-w-[728px] aspect-video border border-gray-300 dark:border-gray-700 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-800/50 relative"
            aria-live="polite"
          >
            {isImageLoading && <div className="text-gray-500 dark:text-gray-400 animate-pulse">Gerando imagem...</div>}
            {!isImageLoading && topicImage && (
              <>
                <img src={topicImage} alt={`Representação artística de ${currentTopic}`} className="w-full h-full object-cover rounded-md" />
                <button
                  onClick={handleDownloadImage}
                  className="absolute bottom-3 right-3 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all duration-200"
                  aria-label="Baixar imagem"
                  title="Baixar imagem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
              </>
            )}
            {!isImageLoading && !topicImage && (
              <div className="text-gray-500 dark:text-gray-400 text-center p-4">A representação visual do verbete aparecerá aqui.</div>
            )}
          </div>
        )}
      </main>

      <footer className="sticky-footer">
        <nav className="mb-4" aria-label="Footer navigation">
          <ul className="flex justify-center items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {footerMenuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                <li>
                  <button onClick={() => handleNavigate(item.page as Page)} className="px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                    {item.label}
                  </button>
                </li>
                {index < footerMenuItems.length - 1 && (
                  <li aria-hidden="true">·</li>
                )}
              </React.Fragment>
            ))}
            <li>
              {isAuthenticated ? (
                <>
                  <button onClick={() => window.location.href = '/admin'} className="mr-3 px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                    Admin
                  </button>
                  <button onClick={logout} className="px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                    Sair ({user?.username})
                  </button>
                </>
              ) : (
                <button onClick={() => window.location.href = '/login'} className="px-2 py-1 transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37]">
                  Login
                </button>
              )}
            </li>
          </ul>
        </nav>
        <p className="footer-text" style={{ margin: 0 }}>
          Wikipreta.org · Valorizando e difundindo a história preta.
        </p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} /> {/* Admin Route */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;