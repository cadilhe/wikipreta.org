import React from 'react';
import AdminLayout from '../components/AdminLayout';

const AdminImages: React.FC = () => {
    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-white">
                    Imagens
                </h1>
                <p className="text-stone-500 mt-2">
                    Gerencie o banco de imagens da Wikipreta.
                </p>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-12 text-center">
                <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
                <h2 className="text-xl font-bold mb-2">Em breve</h2>
                <p className="text-stone-500 max-w-md mx-auto">
                    Esta funcionalidade está sendo preparada para permitir o gerenciamento centralizado de todas as imagens geradas e enviadas.
                </p>
            </div>
        </AdminLayout>
    );
};

export default AdminImages;
