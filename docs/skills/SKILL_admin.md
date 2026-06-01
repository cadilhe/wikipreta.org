# Skill: Painel Administrativo

> Interface de gerenciamento de verbetes, imagens e usuários.

---

## Rotas do Admin

| Rota | Componente | Acesso |
|---|---|---|
| `/admin` | `AdminDashboard` | Autenticado |
| `/admin/imagens` | `AdminImages` | Autenticado |
| `/admin/usuarios` | `AdminUsers` | Autenticado (role: admin) |

Todas as rotas admin são protegidas pelo `ProtectedRoute` que verifica `isAuthenticated`.

---

## AdminDashboard — Lista de Verbetes

```tsx
// pages/AdminDashboard.tsx

// Estado
const [topics, setTopics] = useState<Topic[]>([]);
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const [total, setTotal] = useState(0);
const ITEMS_PER_PAGE = 20;

// Busca com debounce 300ms
useEffect(() => {
  const timer = setTimeout(async () => {
    const data = await databaseService.listTopics({ page, limit: ITEMS_PER_PAGE, search });
    setTopics(data.topics);
    setTotal(data.total);
  }, 300);
  return () => clearTimeout(timer);
}, [search, page]);
```

**Colunas da tabela:**
| Coluna | Tipo |
|---|---|
| Título | text + link para verbete |
| Slug | text (badge) |
| Source | badge (deepseek/gemini/user) |
| Criado em | data formatada |
| Ações | Editar · Excluir |

---

## AdminImages — Gerenciamento de Imagens

- Lista todas as imagens do bucket `verbetes-images`
- Preview thumbnail
- Excluir imagem
- Associar imagem a verbete por URL

---

## AdminUsers — Gerenciamento de Usuários

- Lista usuários do Supabase Auth
- Campos: email, role, criado em, último acesso
- Promover/remover role `admin`
- Desativar conta

> Requer role `admin` no metadata do usuário: `{ role: 'admin' }`.

---

## Layout Admin (AdminLayout)

```tsx
// components/AdminLayout.tsx
export function AdminLayout({ children }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow px-6 py-4 flex justify-between">
        <div className="flex gap-4">
          <NavLink to="/admin">Verbetes</NavLink>
          <NavLink to="/admin/imagens">Imagens</NavLink>
          <NavLink to="/admin/usuarios">Usuários</NavLink>
        </div>
        <div className="flex gap-4 items-center">
          <NavLink to="/">← Enciclopédia</NavLink>
          <button onClick={logout}>Sair</button>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

---

## Edição de Verbete (Admin)

Ao clicar "Editar" em um verbete na lista:
1. Navega para `/?topic={slug}&edit=true`
2. App.tsx detecta `edit=true` e exibe toolbar de edição
3. Edição inline no ContentDisplay
4. Salvar → PUT /api/topics/:slug (cria revisão automática)

---

## Paginação

```tsx
function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="flex gap-2">
      <button disabled={page === 1} onClick={() => onPage(page - 1)}>←</button>
      <span>{page} / {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => onPage(page + 1)}>→</button>
    </div>
  );
}
```
