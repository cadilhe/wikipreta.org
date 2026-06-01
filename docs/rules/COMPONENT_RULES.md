# Component Rules — Wikipreta.org

> Guia de organização e padrões dos componentes React.

---

## 1. Estrutura de Componentes

```
components/           ← Componentes reutilizáveis
  SearchBar.tsx       ← Input de busca + botão aleatório
  ContentDisplay.tsx  ← Renderiza verbete com links interativos ⭐
  AdminLayout.tsx     ← Layout do painel admin
  ThemeSwitcher.tsx   ← Toggle dark/light
  HistoryPanel.tsx    ← Histórico de navegação
  LoadingSkeleton.tsx ← Skeleton de carregamento
  AsciiArtDisplay.tsx ← Arte ASCII decorativa
  AboutPage.tsx       ← Página Sobre
  PrivacyPage.tsx     ← Política de Privacidade

pages/                ← Páginas do painel admin
  AdminDashboard.tsx  ← Lista paginada de tópicos
  AdminImages.tsx     ← Gestão de imagens
  AdminUsers.tsx      ← Gestão de usuários
  LoginPage.tsx       ← Autenticação
```

---

## 2. ContentDisplay — Componente Central

O `ContentDisplay` é o componente mais crítico do sistema.

**Responsabilidade:** Receber o texto do verbete (com termos em `**negrito**`) e renderizá-lo com os termos em negrito convertidos em links clicáveis.

```tsx
// Parsing de negrito → link
function parseContent(text: string, onNavigate: (topic: string) => void): JSX.Element[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Termo em negrito → link clicável
      return (
        <strong key={i}
          className="cursor-pointer text-amber-600 dark:text-amber-400 hover:underline"
          onClick={() => onNavigate(part)}
        >
          {part}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
```

**Regra:** Os `**termos**` no conteúdo gerado pela IA definem os links de navegação. A IA deve ser instruída a usar `**negrito**` em termos relevantes de história/cultura negra.

---

## 3. AuthContext — Estado de Auth

```tsx
// context/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

// Uso em qualquer componente
const { user, isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <Navigate to="/login" />;
}
```

---

## 4. Roteamento (React Router 7)

```tsx
// App.tsx — rotas principais
<Routes>
  <Route path="/" element={<MainApp />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/privacy" element={<PrivacyPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
  <Route path="/admin/imagens" element={<ProtectedRoute><AdminImages /></ProtectedRoute>} />
  <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
</Routes>
```

**URL Parameters:**
- `/?topic=zumbi-dos-palmares` — Carrega tópico específico
- `/?topic=X&edit=true` — Abre tópico em modo de edição (requer auth)

---

## 5. SearchBar

```tsx
interface SearchBarProps {
  onSearch: (query: string) => void;
  onRandom: () => void;
  loading: boolean;
}

// Comportamento:
// - Enter → onSearch(query)
// - Botão Pesquisar → onSearch(query)
// - Botão Aleatório → onRandom() → seleciona da lista PREDEFINED_WORDS
// - Desabilitado durante loading
```

---

## 6. HistoryPanel

Gerencia o histórico de navegação local (localStorage):
- Máximo de N tópicos recentes
- Exibido como lista lateral
- Clique → navega para o tópico
- **Não sincronizado com servidor** — apenas local

---

## 7. LoadingSkeleton

Sempre exibir skeleton durante carregamento de verbete:

```tsx
if (loading) return <LoadingSkeleton />;
if (error) return <ErrorMessage message={error} />;
return <ContentDisplay topic={topic} onNavigate={handleNavigate} />;
```

---

## 8. ThemeSwitcher

```tsx
// Alterna classe 'dark' no document.documentElement
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Init no App.tsx
const saved = localStorage.getItem('theme');
if (saved === 'dark') document.documentElement.classList.add('dark');
```

---

## 9. AdminDashboard — Padrões

```tsx
// Paginação
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 20;

// Busca com debounce
const [search, setSearch] = useState('');
useEffect(() => {
  const timer = setTimeout(() => fetchTopics(search, page), 300);
  return () => clearTimeout(timer);
}, [search, page]);
```

---

## 10. Modo de Edição

O modo de edição é ativado via URL param `?edit=true`:

```tsx
// App.tsx
const searchParams = new URLSearchParams(location.search);
const editMode = searchParams.get('edit') === 'true';

// Condições para mostrar toolbar de edição
const canEdit = isAuthenticated && editMode;
```

Toolbar inclui: formatação negrito, campo URL de imagem, botão upload, salvar/cancelar.
