import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
    listBannedTerms,
    addBannedTerm,
    deleteBannedTerm,
    importBannedTermsBulk,
    deleteBannedTermsBulk,
    BannedTerm
} from '../services/databaseService';

interface ConfirmModalConfig {
    isOpen: boolean;
    id: string;
    term: string;
}

const AdminBannedTerms: React.FC = () => {
    const [bannedTerms, setBannedTerms] = useState<BannedTerm[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [newTerm, setNewTerm] = useState('');
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
        isOpen: false,
        id: '',
        term: ''
    });

    const filteredTerms = bannedTerms.filter(bt =>
        bt.term.toLowerCase().includes(search.toLowerCase())
    );

    // Clear selection when search query changes
    useEffect(() => {
        setSelectedIds([]);
    }, [search]);

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredTerms.map(bt => bt.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleBulkDeleteClick = () => {
        if (selectedIds.length === 0) return;
        setBulkDeleteModalOpen(true);
    };

    const handleConfirmBulkDelete = async () => {
        setBulkDeleteModalOpen(false);
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            await deleteBannedTermsBulk(selectedIds);
            setBannedTerms(prev => prev.filter(bt => !selectedIds.includes(bt.id)));
            setSuccessMessage(`${selectedIds.length} termos desbanidos com sucesso!`);
            setSelectedIds([]);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Failed to delete bulk terms:', err);
            setError(err.message || 'Falha ao desbanir os termos selecionados.');
        } finally {
            setLoading(false);
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.txt')) {
            setError('Por favor, selecione apenas arquivos de texto (.txt).');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) {
                    setError('O arquivo selecionado está vazio.');
                    setLoading(false);
                    return;
                }

                // Split by lines and clean
                const lines = text.split(/\r?\n/);
                const terms = lines
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'));

                if (terms.length === 0) {
                    setError('Nenhum termo válido encontrado no arquivo.');
                    setLoading(false);
                    return;
                }

                const result = await importBannedTermsBulk(terms);
                setSuccessMessage(result.message || `${terms.length} termos importados com sucesso!`);
                setSelectedIds([]);
                
                // Reload list
                const data = await listBannedTerms();
                setBannedTerms(data);
            } catch (err: any) {
                console.error('Error importing bulk terms:', err);
                setError(err.message || 'Falha ao importar termos em massa.');
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => {
            setError('Erro ao ler o arquivo.');
            setLoading(false);
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        fetchBannedTerms();
    }, [isAuthenticated, authLoading, navigate]);

    const fetchBannedTerms = async () => {
        setLoading(true);
        setError(null);
        setSelectedIds([]);
        try {
            const data = await listBannedTerms();
            setBannedTerms(data);
        } catch (err: any) {
            console.error('Failed to fetch banned terms:', err);
            setError(err.message || 'Falha ao carregar a lista de termos banidos.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTerm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const termToBan = newTerm.trim().toLowerCase();
        if (!termToBan) {
            setError('Por favor, insira um termo válido.');
            return;
        }

        // Check if already in list
        const exists = bannedTerms.some(bt => bt.term === termToBan);
        if (exists) {
            setError('Este termo já está banido.');
            return;
        }

        setActionLoading(true);
        try {
            const created = await addBannedTerm(termToBan);
            setBannedTerms(prev => [...prev, created].sort((a, b) => a.term.localeCompare(b.term)));
            setNewTerm('');
            setSuccessMessage(`O termo "${termToBan}" foi banido com sucesso!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Failed to ban term:', err);
            setError(err.message || 'Falha ao banir o termo.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteClick = (id: string, term: string) => {
        setConfirmModal({
            isOpen: true,
            id,
            term
        });
    };

    const handleConfirmDelete = async () => {
        const { id, term } = confirmModal;
        setConfirmModal({ isOpen: false, id: '', term: '' });
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            await deleteBannedTerm(id);
            setBannedTerms(prev => prev.filter(bt => bt.id !== id));
            setSuccessMessage(`O termo "${term}" foi desbanido com sucesso!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Failed to delete banned term:', err);
            setError(err.message || 'Falha ao remover o termo da lista.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                        Termos Banidos
                    </h1>
                    <p className="text-stone-500 mt-2">
                        Gerencie a lista de termos banidos que não devem existir na Wikipreta.org.
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

            {/* Form to Ban a New Term */}
            <div className="mb-8 p-6 bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-white">
                        Banir Novo Termo
                    </h3>
                    <label className="cursor-pointer text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 transition-colors uppercase tracking-wider flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Importar Termos (.txt)
                        <input
                            type="file"
                            className="hidden"
                            accept=".txt"
                            onChange={handleImportFile}
                            onClick={(e) => { (e.target as any).value = null; }}
                        />
                    </label>
                </div>
                <form onSubmit={handleAddTerm} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Ex: java, insulto, computador..."
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all text-stone-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {actionLoading ? (
                            <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                Banir Termo
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* List and Search of Banned Terms */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-stone-50/50 dark:bg-stone-950/20">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar na lista de banidos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all text-stone-900 dark:text-white"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end animate-in fade-in duration-200">
                            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                                {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={handleBulkDeleteClick}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Excluir Selecionados
                            </button>
                        </div>
                    ) : (
                        !loading && (
                            <span className="text-sm text-stone-500">
                                Total: <span className="font-bold text-stone-900 dark:text-stone-100">{filteredTerms.length}</span> termos banidos
                            </span>
                        )
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 text-xs uppercase tracking-widest border-bottom border-stone-200 dark:border-stone-800">
                                <th className="p-6 font-semibold w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={filteredTerms.length > 0 && selectedIds.length === filteredTerms.length}
                                        onChange={handleSelectAll}
                                        className="rounded border-stone-300 dark:border-stone-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                    />
                                </th>
                                <th className="p-6 font-semibold">ID</th>
                                <th className="p-6 font-semibold">Termo</th>
                                <th className="p-6 font-semibold">Adicionado em</th>
                                <th className="p-6 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-stone-500 italic">Carregando termos banidos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTerms.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-stone-500">
                                        Nenhum termo banido encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredTerms.map((bt) => (
                                    <tr key={bt.id} className={`hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group ${selectedIds.includes(bt.id) ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                                        <td className="p-6 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(bt.id)}
                                                onChange={() => handleSelectRow(bt.id)}
                                                className="rounded border-stone-300 dark:border-stone-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-6 text-stone-400 font-mono text-xs">#{bt.id}</td>
                                        <td className="p-6 font-serif text-base font-bold text-stone-900 dark:text-white">
                                            {bt.term}
                                        </td>
                                        <td className="p-6 text-sm text-stone-500">
                                            {new Date(bt.created_at).toLocaleDateString('pt-BR')} às {new Date(bt.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-6 text-right">
                                            <button
                                                onClick={() => handleDeleteClick(bt.id, bt.term)}
                                                className="p-2 text-stone-400 hover:text-green-600 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                                                title="Desbanir termo (Permitir)"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Premium Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">
                                    Desbanir Termo
                                </h3>
                                <p className="text-stone-600 dark:text-stone-400 text-sm mt-1.5 leading-relaxed">
                                    Tem certeza que deseja desbanir o termo <strong className="text-stone-900 dark:text-white">"{confirmModal.term}"</strong>?
                                    Ele poderá ser gerado e pesquisado novamente por qualquer usuário.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, id: '', term: '' })}
                                className="px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-55 dark:hover:bg-stone-800 transition-colors text-sm font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-stone-900 rounded-lg transition-colors text-sm font-semibold bg-amber-500 hover:bg-amber-600 dark:text-stone-950"
                            >
                                Confirmar e Desbanir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Bulk Delete Confirmation Modal */}
            {bulkDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-2.5 rounded-full bg-red-50 text-red-650 dark:bg-red-950/30 dark:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">
                                    Desbanir Termos em Massa
                                </h3>
                                <p className="text-stone-600 dark:text-stone-400 text-sm mt-1.5 leading-relaxed">
                                    Tem certeza que deseja desbanir os <strong className="text-stone-900 dark:text-white">{selectedIds.length} termos selecionados</strong>?
                                    Eles poderão ser gerados e pesquisados novamente por qualquer usuário.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setBulkDeleteModalOpen(false)}
                                className="px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-55 dark:hover:bg-stone-800 transition-colors text-sm font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmBulkDelete}
                                className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-semibold bg-red-600 hover:bg-red-700"
                            >
                                Confirmar e Desbanir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminBannedTerms;
