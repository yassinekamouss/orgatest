# Étape : Serveur (Nginx)
# Nous utilisons une image légère Nginx pour servir les fichiers statiques
FROM nginx:alpine

# Copier le dossier de build généré par Jenkins vers le dossier par défaut de Nginx
# ATTENTION : Si vous utilisez Vite, remplacez 'build' par 'dist' ci-dessous
COPY build /usr/share/nginx/html

# (Optionnel) Copier une config Nginx personnalisée si nécessaire
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]