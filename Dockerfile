# Utilise Node.js 18 comme image de base
FROM node:18-alpine

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Création et définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances en mode production
RUN npm ci --only=production

# Copie du code source
COPY . .

# Exposition du port si nécessaire (à adapter selon votre config)
# EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]