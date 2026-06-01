# Skill: Geração e Armazenamento de Imagens

> Imagens geradas por IA (Gemini Imagen) armazenadas no Supabase Storage.

---

## Fluxo

```
1. Usuário clica "Gerar Imagem" no modo de edição  [auth obrigatório]
2. geminiService.generateImage(topic) → POST /api/gemini/image
3. Backend valida JWT
4. Gemini Imagen 3.0 gera imagem (base64)
5. Upload para Supabase Storage (bucket: verbetes-images)
6. URL pública retornada
7. UPDATE topics SET image_url = publicUrl
8. Frontend atualiza imagem exibida
```

---

## Endpoint

```
POST /api/gemini/image   [auth obrigatório]
Body: { topic: string }
→ { imageUrl: string, source: 'gemini', cached: boolean }
```

---

## Prompt de Imagem

```javascript
const prompt = `
  Ilustração artística de alta qualidade sobre: ${topic}.
  Estilo: arte afro-brasileira contemporânea, paleta de cores vibrantes,
  inspirado em artistas como Emiliano Di Cavalcanti e Djanira.
  Sem texto, sem letras, sem palavras na imagem.
  Formato retangular, horizontal.
`;
```

---

## Upload para Supabase Storage

```javascript
const filename = `${slugify(topic)}-${Date.now()}.jpg`;

const { error } = await supabase.storage
  .from('verbetes-images')
  .upload(filename, Buffer.from(imageBytes, 'base64'), {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: '31536000',   // 1 ano de cache
  });

const { data } = supabase.storage
  .from('verbetes-images')
  .getPublicUrl(filename);

return data.publicUrl;
```

---

## Fallback — Imagens Locais

Quando a geração falha (quota, timeout ou não autenticado):

```javascript
// GET /api/random-images → lista de arquivos em public/assets/images/random/
const randomImages = [
  'africa-art-1.jpg',
  'quilombo-scene.jpg',
  'capoeira-art.jpg',
  // ... 12 imagens culturais predefinidas
];

// Frontend seleciona aleatoriamente
function getRandomLocalImage(images: string[]) {
  const idx = Math.floor(Math.random() * images.length);
  return `/assets/images/random/${images[idx]}`;
}
```

---

## Interface de Upload Manual (Admin)

Além da geração por IA, o editor pode inserir URL de imagem diretamente:

```tsx
// Toolbar de edição
<input
  type="url"
  placeholder="URL da imagem..."
  value={imageUrl}
  onChange={e => setImageUrl(e.target.value)}
  className="border rounded px-2 py-1 text-sm"
/>
<button onClick={() => handleImageUpload(file)}>
  Upload
</button>
```

---

## Arquivos Relevantes

| Arquivo | Responsabilidade |
|---|---|
| `api/index.js` | Endpoint POST /api/gemini/image |
| `api/index.js` | Endpoint GET /api/random-images |
| `services/geminiService.ts` | Proxy frontend → backend |
| `App.tsx` | Toolbar de edição + exibição da imagem |
| `public/assets/images/random/` | 12 imagens de fallback |
