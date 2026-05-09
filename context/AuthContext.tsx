import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    session: any | null;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                mapUser(session.user);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                mapUser(session.user);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const mapUser = (supabaseUser: SupabaseUser) => {
        setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
            role: supabaseUser.user_metadata?.role || 'editor'
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
