import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'forgot'>('login');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                navigate('/admin');
            }
        } catch (err: any) {
            setError(err.message || 'Falha no login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });

            if (error) throw error;

            setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        } catch (err: any) {
            setError(err.message || 'Falha ao solicitar redefinição de senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF8F2] text-[#2C2C2C] p-6">
            <div className="mb-10 text-center animate-fade-in">
                <h1 className="text-5xl font-serif font-bold text-[#B8860B] mb-2 tracking-tighter">wikipreta.org</h1>
                <p className="text-stone-500 font-serif italic text-lg">Memória e História Viva</p>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] w-full max-w-md border border-stone-100">
                {view === 'login' ? (
                    <>
                        <h2 className="text-2xl font-serif font-bold text-stone-800 mb-8 text-center">Acesso à Curadoria</h2>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm shadow-sm animate-shake">
                                <p className="font-bold">Erro de Autenticação</p>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">E-mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 focus:outline-none transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-400">Senha</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setView('forgot');
                                            setError('');
                                            setSuccessMessage(null);
                                        }}
                                        className="text-xs text-stone-400 hover:text-amber-600 transition-colors font-medium"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-stone-800 hover:bg-stone-950 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Autenticando...' : 'Entrar no Sistema'}
                            </button>
                        </form>
                        
                        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                            <button 
                                onClick={() => navigate('/')}
                                className="text-stone-400 hover:text-amber-600 text-sm transition-colors"
                            >
                                &larr; Voltar para a Enciclopédia
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4 text-center">Recuperar Acesso</h2>
                        <p className="text-stone-500 text-sm mb-6 text-center leading-relaxed font-serif">
                            Insira seu e-mail cadastrado para receber um link de redefinição de senha.
                        </p>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm shadow-sm animate-shake">
                                <p className="font-bold">Erro</p>
                                <p>{error}</p>
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6 text-sm shadow-sm">
                                <p className="font-bold">Sucesso</p>
                                <p>{successMessage}</p>
                            </div>
                        )}

                        <form onSubmit={handleResetRequest} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">E-mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 focus:outline-none transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-stone-800 hover:bg-stone-950 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                            <button 
                                type="button"
                                onClick={() => {
                                    setView('login');
                                    setError('');
                                    setSuccessMessage(null);
                                }}
                                className="text-stone-400 hover:text-amber-600 text-sm transition-colors"
                            >
                                &larr; Voltar para o Login
                            </button>
                        </div>
                    </>
                )}
            </div>
            
            <p className="mt-12 text-stone-400 text-xs font-serif italic">
                © 2026 WikiPreta.org - Preservando a ancestralidade digital.
            </p>
        </div>
    );
};

export default LoginPage;
