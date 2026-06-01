# Skill: Autenticação

> Supabase Auth com JWT. Frontend gerencia sessão; backend valida token.

---

## Fluxo de Login

```
1. Usuário acessa /login
2. Preenche email + senha → supabase.auth.signInWithPassword()
3. Supabase retorna { session: { access_token, user } }
4. AuthContext armazena user e session
5. Redirect para /admin
```

---

## AuthContext

```tsx
// context/AuthContext.tsx
interface User {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(mapUser(session.user));
      setLoading(false);
    });

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session ? mapUser(session.user) : null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Mapear user Supabase para User interno
function mapUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    role: supabaseUser.user_metadata?.role ?? 'viewer',
  };
}
```

---

## ProtectedRoute

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSkeleton />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}
```

---

## Enviar Token nas Requisições

```typescript
// services/databaseService.ts
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

---

## Validação no Backend

```javascript
// api/auth.js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function validateToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role ?? 'viewer',
  };
}
```

---

## Criar Usuário Admin (Manual)

No Supabase Dashboard → Authentication → Users:
1. Add User → email + senha
2. Clicar no usuário → Edit → User Metadata:
```json
{ "role": "admin" }
```

---

## Configuração Supabase Auth

```
Dashboard → Authentication → Settings:
- Email confirmations: desabilitar em dev, habilitar em prod
- Redirect URL: http://localhost:3000 (dev) | https://wikipreta.org (prod)
- Session expiry: 3600s (1 hora)
```
