# 🐳 Guía de Docker para ICM Notes

Este proyecto incluye una configuración completa de Docker para desarrollo.

## 📋 Requisitos Previos

- Docker Desktop instalado ([Descargar aquí](https://www.docker.com/products/docker-desktop))
- Docker Compose (incluido con Docker Desktop)

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```bash
./docker-start.sh
```

Este script hace todo automáticamente:
- Construye los contenedores
- Levanta todos los servicios
- Genera la APP_KEY
- Ejecuta las migraciones
- Configura storage links

### Opción 2: Manual

```bash
# 1. Construir imágenes
docker compose build

# 2. Levantar contenedores
docker compose up -d

# 3. Generar APP_KEY
docker compose exec app php artisan key:generate

# 4. Ejecutar migraciones
docker compose exec app php artisan migrate

# 5. Crear storage link
docker compose exec app php artisan storage:link
```

## 🌐 Acceso a la Aplicación

Una vez iniciado, la aplicación estará disponible en:

- **Aplicación**: http://localhost:8000
- **Base de datos MySQL**: localhost:3306
- **Redis**: localhost:6379
- **Vite Dev Server** (en modo dev): http://localhost:5173

## 📦 Servicios Incluidos

| Servicio | Descripción | Puerto |
|----------|-------------|--------|
| **app** | Aplicación Laravel (PHP 8.2) | - |
| **nginx** | Servidor web | 8000 |
| **db** | MySQL 8.0 | 3306 |
| **redis** | Cache/Queue | 6379 |
| **vite** | Hot reload frontend | 5173 |

## 🛠️ Comandos Útiles

### Gestión de Contenedores

```bash
# Ver contenedores corriendo
docker compose ps

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f app

# Detener contenedores
docker compose down

# Detener y eliminar volúmenes (¡cuidado! elimina la BD)
docker compose down -v

# Reiniciar un servicio
docker compose restart app
```

### Ejecutar Comandos Artisan

```bash
# Entrar al contenedor
docker compose exec app bash

# Ejecutar un comando directamente
docker compose exec app php artisan [comando]

# Ejemplos:
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
docker compose exec app php artisan cache:clear
docker compose exec app php artisan queue:work
```

### Ejecutar Comandos Composer

```bash
# Instalar dependencias
docker compose exec app composer install

# Agregar un paquete
docker compose exec app composer require vendor/package

# Actualizar dependencias
docker compose exec app composer update
```

### Ejecutar Comandos NPM

```bash
# Instalar dependencias
docker compose exec vite npm install

# Build de producción
docker compose exec vite npm run build

# Modo desarrollo con hot reload
docker compose up vite
```

## 🗄️ Base de Datos

### Credenciales

```
Host: localhost (o 'db' desde dentro de Docker)
Port: 3306
Database: icm_notes
Username: laravel
Password: password
Root Password: root
```

### Conectar desde tu máquina

Puedes usar cualquier cliente MySQL (TablePlus, Sequel Pro, DBeaver, etc.) con las credenciales de arriba.

### Acceder a MySQL CLI

```bash
docker compose exec db mysql -u laravel -p icm_notes
# Password: password
```

## 🔧 Desarrollo con Vite

Para desarrollo con hot reload de los assets frontend:

```bash
# En una terminal separada
docker compose up vite
```

Esto iniciará el servidor de desarrollo de Vite en el puerto 5173.

## 🐛 Troubleshooting

### Error: Port already in use

Si algún puerto está en uso, modifica `docker-compose.yml`:

```yaml
ports:
  - "8001:80"  # Cambiar 8000 a otro puerto
```

### Permisos de storage

Si hay problemas de permisos:

```bash
docker compose exec app chmod -R 775 storage bootstrap/cache
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
```

### Reconstruir contenedores

Si algo no funciona después de cambios:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Limpiar todo y empezar de nuevo

```bash
docker compose down -v
docker system prune -a
./docker-start.sh
```

## 📝 Notas

- Los cambios en el código se reflejan automáticamente (volúmenes montados)
- La base de datos persiste en un volumen Docker
- Los logs de Laravel están en `storage/logs/laravel.log`
- Para producción, asegúrate de cambiar las credenciales en `.env` y `docker-compose.yml`

## 🚨 Seguridad

⚠️ **IMPORTANTE**: Las credenciales por defecto son solo para desarrollo. 
En producción:

1. Cambia todas las contraseñas
2. Usa variables de entorno seguras
3. No expongas puertos innecesarios
4. Considera usar Docker secrets
