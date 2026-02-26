#!/bin/bash
# Script de inicio para VPS
set -e

echo "Iniciando despliegue de KONTAX..."

# Instalar dependencias si no existen
npm install

# Construir la aplicación para producción
echo "Compilando frontend y backend..."
npm run build

# Levantar servidor
echo "Iniciando servidor en modo producción..."
npm run start
