# Despliegue de KONTAX en VPS

Para desplegar este sistema en un servidor VPS (Ubuntu/Debian), sigue estos pasos:

## Opción 1: Usando PM2 y Node.js directamente

1. **Instalar Node.js y NPM:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Instalar PM2 globalmente:**
   ```bash
   sudo npm install -g pm2
   ```

3. **Clonar el proyecto y preparar:**
   ```bash
   # Clonar el repo aquí
   npm install
   npm run build
   ```

4. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz copiando el entorno actual (sobre todo el `DATABASE_URL`).

5. **Iniciar con PM2:**
   ```bash
   pm2 start npm --name "kontax-app" -- run start
   pm2 save
   pm2 startup
   ```

## Opción 2: Usando Docker (Recomendado)

1. **Instalar Docker y Docker Compose:**
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   ```

2. **Levantar el contenedor:**
   Asegúrate de tener tu `.env` listo y ejecuta:
   ```bash
   sudo docker-compose up -d --build
   ```

El servidor estará escuchando internamente en el puerto **5000**.
Se recomienda configurar Nginx como proxy inverso para exponerlo al puerto 80 (HTTP) o 443 (HTTPS).