# Guía de Deployment en Vercel

## Preparación

### 1. Asegúrate de tener tu código en GitHub

```bash
git add .
git commit -m "Ready for deployment with PWA support"
git push
```

### 2. Obtén tus credenciales de Supabase

Ve a tu [Dashboard de Supabase](https://app.supabase.com/) y copia:
- **Project URL** (VITE_SUPABASE_URL)
- **Anon/Public Key** (VITE_SUPABASE_ANON_KEY)

## Deployment en Vercel

### Opción A: Interfaz Web (Recomendado)

1. Ve a [vercel.com](https://vercel.com) y haz login
2. Click en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente que es un proyecto Vite
5. En **"Environment Variables"**, agrega:
   ```
   VITE_SUPABASE_URL = tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY = tu_clave_publica
   ```
6. Click en **"Deploy"**
7. ¡Listo! Tu PWA estará disponible en una URL de Vercel

### Opción B: CLI de Vercel

```bash
# Instalar Vercel CLI (solo la primera vez)
npm install -g vercel

# Deploy
vercel

# Configurar variables de entorno
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy a producción
vercel --prod
```

## Verificar que la PWA funciona

1. Abre tu sitio en Chrome/Edge (móvil o escritorio)
2. Deberías ver un ícono de "Instalar" en la barra de direcciones
3. Verifica en DevTools > Application > Manifest
4. Prueba instalar la app
5. Verifica que funcione offline (desconecta internet y recarga)

## Configuración de Dominio (Opcional)

1. En Vercel, ve a Settings > Domains
2. Agrega tu dominio personalizado
3. Sigue las instrucciones de DNS
4. Vercel configurará automáticamente HTTPS

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que agregaste las variables de entorno en Vercel
- Asegúrate de que NO tienen espacios al inicio/final
- Redeploya el proyecto después de agregar las variables

### La PWA no se instala
- Verifica que estés usando HTTPS (Vercel lo hace automático)
- Abre DevTools > Application > Manifest para ver errores
- Los iconos deben estar en la carpeta `public/`

### Service Worker no se registra
- Verifica en DevTools > Application > Service Workers
- Limpia el caché del navegador
- La PWA solo funciona en production build, no en desarrollo

## Comandos útiles

```bash
# Build local
npm run build

# Preview del build
npm run preview

# Limpiar caché y rebuild
rm -rf dist node_modules/.vite && npm run build
```

## Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [PWA Builder](https://www.pwabuilder.com/)
