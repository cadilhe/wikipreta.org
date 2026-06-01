import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const navigate = useNavigate();

    // Handle session check on mount (the reset link auto-authenticates via URL hash)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If there's no session, we cannot update the user password
                setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
            }
        };
        checkSession();
    }, []);

    // Countdown effect on success
    useEffect(() => {
        if (!success) return;
        if (countdown === 0) {
            navigate('/login');
            return;
        }
        const timer = setTimeout(() => {
            setCountdown(c => c - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [success, countdown, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Falha ao redefinir a senha. Tente novamente.');
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
                <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4 text-center">Definir Nova Senha</h2>
                <p className="text-stone-500 text-sm mb-8 text-center leading-relaxed font-serif">
                    Insira e confirme sua nova senha de acesso à curadoria.
                </p>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm shadow-sm animate-shake">
                        <p className="font-bold">Erro</p>
                        <p>{error}</p>
                    </div>
                )}

                {success ? (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6 text-sm shadow-sm">
                        <p className="font-bold">Senha Alterada!</p>
                        <p className="mb-2">Sua senha foi redefinida com sucesso.</p>
                        <p className="text-xs text-stone-500 italic">Redirecionando para o login em {countdown} segundos...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Nova Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 focus:outline-none transition-all"
                                placeholder="Mínimo 6 caracteres"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 focus:outline-none transition-all"
                                placeholder="Digite novamente"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !!error}
                            className="w-full bg-stone-800 hover:bg-stone-950 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                    <button 
                        onClick={() => navigate('/login')}
                        className="text-stone-400 hover:text-amber-600 text-sm transition-colors"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
            
            <p className="mt-12 text-stone-400 text-xs font-serif italic">
                © 2026 WikiPreta.org - Preservando a ancestralidade digital.
            </p>
        </div>
    );
};

export default ResetPasswordPage;
