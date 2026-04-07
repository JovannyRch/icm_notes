#!/bin/bash

echo "🚀 Iniciando ICM Notes con Docker..."
echo ""

# Crear directorios de storage si no existen
echo "📁 Verificando directorios..."
mkdir -p storage/framework/{sessions,views,cache}
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Construir y levantar contenedores
echo "🐳 Construyendo contenedores Docker..."
docker compose build

echo "🔼 Levantando contenedores..."
docker compose up -d app nginx db redis

# Esperar a que MySQL esté listo
echo "⏳ Esperando a que la base de datos esté lista..."
sleep 10

# Ejecutar comandos dentro del contenedor
echo "🔑 Generando APP_KEY..."
docker compose exec -T app php artisan key:generate

echo "📊 Ejecutando migraciones..."
docker compose exec -T app php artisan migrate --force

echo "🗂️  Corriendo seeders (si existen)..."
docker compose exec -T app php artisan db:seed --force || echo "No hay seeders o falló"

echo "🔗 Creando storage link..."
docker compose exec -T app php artisan storage:link

echo "🧹 Limpiando cache..."
docker compose exec -T app php artisan config:clear
docker compose exec -T app php artisan cache:clear
docker compose exec -T app php artisan view:clear

echo ""
echo "✅ ¡Listo! La aplicación está corriendo en:"
echo "   🌐 http://localhost:8000"
echo ""
echo "📝 Comandos útiles:"
echo "   docker compose logs -f         # Ver logs"
echo "   docker compose down            # Detener contenedores"
echo "   docker compose exec app bash   # Entrar al contenedor"
echo "   docker compose exec app php artisan [comando]"
echo ""
echo "🔥 Para desarrollo con Vite hot reload:"
echo "   docker compose up vite"
echo ""
