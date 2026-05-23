import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
    listAdminImages,
    deleteAdminImage,
    searchTopicsForAssociation,
    associateImageToTopic,
    AdminImage
} from '../services/databaseService';

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

interface AssociateModalConfig {
    isOpen: boolean;
    imageName: string;
    imageUrl: string;
}

interface TopicResult {
    id: string;
    title: string;
    slug: string;
}

const AdminImages: React.FC = () => {
    const [images, setImages] = useState<AdminImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Modais
    const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    const [associateModal, setAssociateModal] = useState<AssociateModalConfig>({
        isOpen: false,
        imageName: '',
        imageUrl: ''
    });

    // Busca de tópicos no modal
    const [topicQuery, setTopicQuery] = useState('');
    const [topicResults, setTopicResults] = useState<TopicResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [associationPending, setAssociationPending] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        fetchImages();
    }, [isAuthenticated, authLoading, navigate]);

    // Debounce na busca de tópicos do modal de associação
    useEffect(() => {
        if (!associateModal.isOpen) return;

        const timer = setTimeout(() => {
            fetchTopicResults(topicQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [topicQuery, associateModal.isOpen]);

    const fetchImages = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listAdminImages();
            setImages(data);
        } catch (err: any) {
            console.error('Failed to fetch images:', err);
            setError(err.message || 'Falha ao carregar a galeria de imagens.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTopicResults = async (query: string) => {
        setSearchLoading(true);
        try {
            const data = await searchTopicsForAssociation(query);
            setTopicResults(data);
        } catch (err) {
            console.error('Error searching topics:', err);
        } finally {
            setSearchLoading(false);
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

    const handleDelete = (imageName: string) => {
        showConfirm({
            title: 'Excluir Imagem',
            message: `Tem certeza que deseja excluir permanentemente esta imagem? Os verbetes associados a ela deixarão de exibi-la.`,
            confirmText: 'Excluir Imagem',
            type: 'danger',
            onConfirm: async () => {
                setActionLoading(imageName);
                setError(null);
                try {
                    await deleteAdminImage(imageName);
                    setImages(images.filter(img => img.name !== imageName));
                    setSuccessMessage('Imagem excluída com sucesso.');
                    setTimeout(() => setSuccessMessage(null), 3000);
                } catch (err: any) {
                    console.error('Failed to delete image:', err);
                    setError(err.message || 'Falha ao excluir a imagem.');
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleOpenAssociation = (imageName: string, imageUrl: string) => {
        setTopicQuery('');
        setTopicResults([]);
        setAssociateModal({
            isOpen: true,
            imageName,
            imageUrl
        });
        fetchTopicResults('');
    };

    const handleAssociate = async (topicSlug: string, topicTitle: string) => {
        setAssociationPending(true);
        setError(null);
        try {
            await associateImageToTopic(topicSlug, associateModal.imageUrl);
            setSuccessMessage(`Imagem associada ao verbete "${topicTitle}" com sucesso!`);
            setAssociateModal({ isOpen: false, imageName: '', imageUrl: '' });
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error during association:', err);
            setError(err.message || 'Falha ao associar a imagem ao verbete.');
        } finally {
            setAssociationPending(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const cleanFilename = (name: string) => {
        // Se ainda existirem arquivos antigos prefixados com o ID do usuário (UUID de 36 caracteres + '_'), removemos
        const uuidPrefixRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
        return name.replace(uuidPrefixRegex, '');
    };

    const filteredImages = images.filter(img =>
        img.name.toLowerCase().includes(search.toLowerCase())
    );

    const ITEMS_PER_PAGE = 100;
    const totalPages = Math.ceil(filteredImages.length / ITEMS_PER_PAGE);
    const displayedImages = filteredImages.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const renderPaginationControls = (position: 'top' | 'bottom') => {
        if (filteredImages.length <= ITEMS_PER_PAGE) return null;

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }

        const containerClasses = position === 'top'
            ? 'flex items-center gap-1 md:gap-1.5 bg-stone-100 dark:bg-stone-900/55 p-1 rounded-lg border border-stone-200 dark:border-stone-800'
            : 'flex justify-center items-center gap-1.5 md:gap-2 mt-8 pt-6 border-t border-stone-100 dark:border-stone-800/80 w-full';

        return (
            <div className={containerClasses}>
                <button
                    disabled={currentPage === 1}
                    onClick={() => {
                        setCurrentPage(prev => Math.max(prev - 1, 1));
                        if (position === 'bottom') {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    className="px-2 py-1 md:px-2.5 md:py-1.5 rounded-md border border-stone-250 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1 bg-white dark:bg-stone-800"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Anterior
                </button>
                <div className="flex items-center gap-1">
                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => {
                                setCurrentPage(page);
                                if (position === 'bottom') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                                currentPage === page
                                    ? 'bg-amber-600 dark:bg-amber-500 text-white dark:text-stone-950 shadow-sm font-bold'
                                    : 'border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 bg-white dark:bg-stone-800'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                        setCurrentPage(prev => Math.min(prev + 1, totalPages));
                        if (position === 'bottom') {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    className="px-2 py-1 md:px-2.5 md:py-1.5 rounded-md border border-stone-250 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1 bg-white dark:bg-stone-800"
                >
                    Próximo
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        );
    };

    return (
        <AdminLayout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                        Imagens
                    </h1>
                    <p className="text-stone-500 mt-2">
                        Gerencie o banco de imagens, envie novos arquivos e associe a verbetes da Wikipreta.
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
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-stone-50/50 dark:bg-stone-950/20">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar imagem por nome de arquivo..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>

                    {!loading && renderPaginationControls('top')}
                    
                    {!loading && (
                        <span className="text-sm text-stone-500 whitespace-nowrap">
                            {filteredImages.length > ITEMS_PER_PAGE ? (
                                <>
                                    Exibindo <span className="font-bold text-stone-900 dark:text-stone-100">{displayedImages.length}</span> de <span className="font-bold text-stone-900 dark:text-stone-100">{filteredImages.length}</span> imagens
                                </>
                            ) : (
                                <>
                                    Total: <span className="font-bold text-stone-900 dark:text-stone-100">{filteredImages.length}</span> imagens
                                </>
                            )}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-stone-500 italic">Carregando galeria de imagens...</p>
                        </div>
                    </div>
                ) : filteredImages.length === 0 ? (
                    <div className="p-20 text-center text-stone-500">Nenhuma imagem encontrada.</div>
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayedImages.map((image) => {
                            const isPending = actionLoading === image.name;

                            return (
                                <div key={image.name} className="bg-stone-50 dark:bg-stone-950/40 rounded-xl overflow-hidden border border-stone-200/60 dark:border-stone-800/80 flex flex-col group hover:border-amber-500/50 dark:hover:border-amber-500/30 transition-all duration-300">
                                    <div className="aspect-video w-full overflow-hidden bg-stone-100 dark:bg-stone-900 relative">
                                        <img
                                            src={image.url}
                                            alt={image.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div className="mb-4">
                                            <p className="text-xs font-mono text-stone-400 dark:text-stone-500 truncate" title={image.name}>
                                                {cleanFilename(image.name)}
                                            </p>
                                            <div className="flex justify-between items-center mt-2 text-[10px] text-stone-500">
                                                <span>{formatSize(image.size)}</span>
                                                <span>{new Date(image.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end">
                                            {isPending ? (
                                                <div className="py-2 flex justify-center w-full">
                                                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenAssociation(image.name, image.url)}
                                                        className="flex-1 py-1.5 px-3 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-xs font-semibold animate-in fade-in duration-200"
                                                    >
                                                        Associar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(image.name)}
                                                        className="py-1.5 px-3 border border-red-200/60 dark:border-red-950/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-xs font-semibold animate-in fade-in duration-200"
                                                    >
                                                        Excluir
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                        {renderPaginationControls('bottom')}
                    </div>
                )}
            </div>

            {/* Modal de Confirmação customizado para o Design System */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-2.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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
                                className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-semibold bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 dark:text-black"
                            >
                                {confirmModal.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Associação a Verbete */}
            {associateModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">
                                    Associar Imagem a Verbete
                                </h3>
                                <p className="text-stone-500 text-xs mt-1">
                                    Pesquise o verbete onde deseja exibir esta imagem.
                                </p>
                            </div>
                            <button
                                onClick={() => setAssociateModal({ isOpen: false, imageName: '', imageUrl: '' })}
                                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-850 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-4 p-3 bg-stone-50 dark:bg-stone-950/30 rounded-lg border border-stone-150 dark:border-stone-850">
                            <img
                                src={associateModal.imageUrl}
                                alt="Visualização"
                                className="w-16 h-12 object-cover rounded-md border border-stone-200 dark:border-stone-800"
                            />
                            <div className="overflow-hidden">
                                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                                    {cleanFilename(associateModal.imageName)}
                                </p>
                                <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                                    {associateModal.imageUrl}
                                </p>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Digitar nome do verbete..."
                                value={topicQuery}
                                onChange={(e) => setTopicQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                autoFocus
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[200px] border border-stone-200 dark:border-stone-850 rounded-lg divide-y divide-stone-100 dark:divide-stone-850 mb-6">
                            {searchLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2">
                                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs text-stone-500 italic">Buscando verbetes...</span>
                                </div>
                            ) : topicResults.length === 0 ? (
                                <div className="py-12 text-center text-xs text-stone-500">Nenhum verbete encontrado.</div>
                            ) : (
                                topicResults.map(topic => {
                                    return (
                                        <div key={topic.id} className="p-3.5 flex justify-between items-center hover:bg-stone-50 dark:hover:bg-stone-850/50 transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                                    {topic.title}
                                                </p>
                                                <p className="text-[10px] text-stone-400 font-mono">
                                                    slug: {topic.slug}
                                                </p>
                                            </div>
                                            {associationPending ? (
                                                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAssociate(topic.slug, topic.title)}
                                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400 text-white rounded-lg text-xs font-semibold transition-all"
                                                >
                                                    Selecionar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminImages;
