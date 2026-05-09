import React from 'react';
import AdminLayout from '../components/AdminLayout';

const AdminUsers: React.FC = () => {
    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                    Usuários
                </h1>
                <p className="text-stone-500 mt-2">
                    Gerencie os administradores e colaboradores da plataforma.
                </p>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-12 text-center">
                <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <h2 className="text-xl font-bold mb-2">Em breve</h2>
                <p className="text-stone-500 max-w-md mx-auto">
                    A área de gestão de usuários permitirá adicionar novos editores e gerenciar permissões de acesso.
                </p>
            </div>
        </AdminLayout>
    );
};

export default AdminUsers;
