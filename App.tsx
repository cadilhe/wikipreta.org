/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminImages from './pages/AdminImages';
import AdminUsers from './pages/AdminUsers';
import AdminBannedTerms from './pages/AdminBannedTerms';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { generateImageForTopic, generateTopicContent } from './services/geminiService';



// --- Components ---

import { getTopicContent, saveTopicContent, getHistory, addToHistory, clearHistory, getRecentlyUpdatedTopics, getMostAccessedTopics } from './services/databaseService';
import { supabase } from './services/supabase';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import ThemeSwitcher from './components/ThemeSwitcher';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';
import HistoryPanel from './components/HistoryPanel';
import ProtectedRoute from './components/ProtectedRoute';

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
  const navigate = useNavigate();
  const [currentTopic, setCurrentTopic] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicFromUrl = urlParams.get('topic');
    if (topicFromUrl) {
      try {
        return decodeURIComponent(topicFromUrl);
      } catch (e) {
        console.error('Failed to decode URL topic parameter:', e);
      }
    }
    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    return UNIQUE_WORDS[randomIndex];
  });
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ title: string, slug: string } | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('edit') === 'true';
  });
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedImageUrl, setEditedImageUrl] = useState<string>('');
  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
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

  const [recentlyUpdated, setRecentlyUpdated] = useState<any[]>([]);
  const [mostAccessed, setMostAccessed] = useState<any[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState<boolean>(false);
  const [isPopularLoading, setIsPopularLoading] = useState<boolean>(false);

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

  // Load recently updated and popular topics
  const loadSidebarLists = useCallback(async () => {
    setIsRecentLoading(true);
    setIsPopularLoading(true);
    try {
      const recent = await getRecentlyUpdatedTopics(30);
      setRecentlyUpdated(recent);
    } catch (e) {
      console.error('Failed to load recently updated topics:', e);
    } finally {
      setIsRecentLoading(false);
    }

    try {
      const popular = await getMostAccessedTopics(5);
      setMostAccessed(popular);
    } catch (e) {
      console.error('Failed to load popular topics:', e);
    } finally {
      setIsPopularLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'home') {
      loadSidebarLists();
    }
  }, [currentTopic, currentPage, loadSidebarLists]);

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

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('edit') !== 'true') {
        setIsEditing(false);
      }

      setError(null);
      setSuggestion(null);

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
        if (errorMessage.startsWith('typo:')) {
          const parts = errorMessage.split(':');
          setSuggestion({ title: parts[1], slug: parts[2] });
          setError(null);
        } else {
          setError(errorMessage);
          setSuggestion(null);
        }
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
    setEditedTitle(currentTopic);
    setEditedContent(content);
    setEditError(null);
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
    setEditedTitle('');
    setEditedContent('');
    setEditedImageUrl('');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      setEditError('O título do verbete não pode ficar vazio.');
      return;
    }
    if (!editedContent.trim()) {
      setEditError('A definição do verbete não pode ficar vazia.');
      return;
    }

    const finalTitle = editedTitle.trim();
    const finalContent = editedContent.trim();
    const finalImageUrl = editedImageUrl.trim() || undefined;

    try {
      setEditError(null);
      const savedTopic = await saveTopicContent(currentTopic, finalContent, user?.email, finalImageUrl, finalTitle);

      setContent(savedTopic.content);
      if (savedTopic.image_url) {
        setTopicImage(savedTopic.image_url);
      }

      // If the title changed, we need to update the currentTopic state so the view updates
      if (savedTopic.title && savedTopic.title !== currentTopic) {
        setCurrentTopic(savedTopic.title);
      }

      setIsEditing(false);
      setEditedTitle('');
      setEditedContent('');
      setEditedImageUrl('');
    } catch (err: any) {
      console.error('Failed to save edit:', err);
      setEditError(err.message || 'Falha ao salvar as alterações');
    }
  };

  const toggleHistory = () => {
    setIsHistoryOpen(prev => !prev);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTopic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('verbetes-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verbetes-images')
        .getPublicUrl(filePath);

      setEditedImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert('Falha ao enviar imagem: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
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

  // Header Cabeçalho
  return (
    <div className="max-w-[65ch] mx-auto pt-8 px-8 pb-20">
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

              {!isLoading && isEditing && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  {editError && (
                    <div className="mb-4 p-3 border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm flex justify-between items-center">
                      <span>{editError}</span>
                      <button onClick={() => setEditError(null)} className="text-red-500 hover:text-red-700" aria-label="Fechar erro">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Título do Verbete
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Título do verbete..."
                      className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#B8860B] dark:focus:ring-[#D4AF37] outline-none font-serif text-lg font-bold"
                    />
                  </div>

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
                    Imagem do Verbete
                  </label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={editedImageUrl}
                      onChange={(e) => setEditedImageUrl(e.target.value)}
                      placeholder="URL da imagem ou faça upload..."
                      className="flex-1 p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#B8860B] dark:focus:ring-[#D4AF37] outline-none"
                    />
                    <label className={`cursor-pointer p-2 px-3 rounded-md border border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-100 ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      {isUploadingImage ? 'Enviando...' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-4 mt-4">
                    <button onClick={handleCancelEdit} className="py-2 px-4 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                      Cancelar
                    </button>
                    <button onClick={handleSaveEdit} className="py-2 px-4 rounded-md bg-[#B8860B] text-white hover:bg-opacity-90 dark:bg-[#D4AF37] dark:text-black font-bold">
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}

              {!isLoading && !isEditing && (
                <>
                  {error && (
                    <div className="text-center py-8 px-6 border border-solid border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">{error}</h3>
                      <div className="flex justify-center gap-4 mt-4 flex-wrap">
                        {error !== 'Este termo não existe na Wikipreta.' && !error.includes('não foi reconhecido') && (
                          <button
                            onClick={() => {
                              setError(null);
                              setCurrentTopic(currentTopic);
                            }}
                            className="inline-flex items-center gap-2 py-2 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 font-semibold transition-transform transform hover:scale-105"
                            aria-label="Tentar novamente"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path></svg>
                            Tentar Novamente
                          </button>
                        )}
                        {isAuthenticated && (
                          <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 py-2 px-4 rounded-md bg-[#B8860B] text-white hover:bg-opacity-90 dark:bg-[#D4AF37] dark:text-black font-semibold transition-transform transform hover:scale-105"
                            aria-label={`Criar verbete para ${currentTopic}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                            Criar Verbete
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {suggestion && (
                    <div className="text-center py-8 px-6 border border-solid border-[#B8860B] dark:border-[#D4AF37] rounded-lg bg-amber-50 dark:bg-amber-900/10">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Você quis dizer:{' '}
                        <button
                          onClick={() => handleWordClick(suggestion.title)}
                          className="underline font-bold text-[#B8860B] dark:text-[#D4AF37] hover:opacity-80 transition-opacity"
                        >
                          {suggestion.title}
                        </button>
                        ?
                      </h3>
                      {isAuthenticated && (
                        <div className="mt-4">
                          <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 py-2 px-4 rounded-md bg-[#B8860B] text-white hover:bg-opacity-90 dark:bg-[#D4AF37] dark:text-black font-semibold transition-transform transform hover:scale-105"
                            aria-label={`Criar verbete para ${currentTopic}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                            Criar "{currentTopic}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {content.length === 0 && !error && !suggestion && (
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
                    <>
                      <ContentDisplay
                        content={content}
                        onWordClick={handleWordClick}
                      />
                      {isAuthenticated && (
                        <div className="flex justify-end mt-4">
                          <button onClick={handleEdit} className="flex items-center gap-2 py-2 px-4 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            Editar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'privacy' && <PrivacyPage />}

        {(currentPage === 'home' && !isLoading && !isEditing && content) && (
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

        {currentPage === 'home' && !isLoading && !isEditing && (
          <div className="mt-16 space-y-12 border-t border-gray-200 dark:border-gray-800 pt-12 animate-in fade-in duration-500">
            {/* Seção: Atualizados Recentemente (todos em chips) */}
            {recentlyUpdated.length > 0 && (
              <div>
                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-[#B8860B] dark:bg-[#D4AF37] rounded"></span>
                  Atualizados Recentemente
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentlyUpdated.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleWordClick(topic.title)}
                      className="px-3.5 py-1.5 text-sm rounded-full border border-stone-300 dark:border-stone-700 bg-stone-100/80 hover:bg-stone-200/60 dark:bg-stone-900/40 dark:hover:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:border-[#B8860B] dark:hover:border-[#D4AF37] hover:text-[#B8860B] dark:hover:text-[#D4AF37] transition-all font-medium"
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              </div>
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
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/imagens" element={<ProtectedRoute><AdminImages /></ProtectedRoute>} />
          <Route path="/admin/banidos" element={<ProtectedRoute allowedRoles={['admin']}><AdminBannedTerms /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;