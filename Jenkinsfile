pipeline {
    agent any

    // Assure-toi d'avoir configuré "NodeJS" dans "Global Tool Configuration"
    tools {
        nodejs 'NodeJS' 
    }

    environment {
        // TES INFOS
        DOCKERHUB_USERNAME = 'yassinekamouss'
        APP_NAME = 'orgatest-react'
        
        // Le nom complet : yassinekamouss/orgatest-react:42
        FULL_IMAGE_NAME = "${DOCKERHUB_USERNAME}/${APP_NAME}:${env.BUILD_NUMBER}"
        
        // LA CLEF DU COFFRE 🔑
        // Il faut créer ce "Credential" (Username with password) dans Jenkins avec l'ID exact :
        DOCKER_CREDS = credentials('yassinekamouss-dockerhub')
    }

    stages {
        stage('1. Récupérer le Code (Checkout)') {
            steps {
                checkout scm
            }
        }

        stage('2. Préparer le code React') {
            steps {
                echo '☕ On prépare les ingrédients...'
                sh 'npm ci' 
                sh 'npm run build'
                // Cela crée le dossier "build" ou "dist" que Docker va copier
            }
        }

        stage('3. Construire la Boîte (Docker Build)') {
            steps {
                script {
                    echo "📦 Emballage en cours..."
                    sh "docker build -t ${FULL_IMAGE_NAME} ."
                }
            }
        }

        stage('4. Connexion & Envoi (Login & Push)') {
            steps {
                script {
                    echo "🚚 Le camion part vers Docker Hub..."
                    
                    // Connexion sécurisée (Le mot de passe ne s'affiche pas dans les logs)
                    sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                    
                    // Envoi de la version précise (ex: v12)
                    sh "docker push ${FULL_IMAGE_NAME}"
                    
                    // Création et envoi de l'étiquette "latest" (La dernière version)
                    sh "docker tag ${FULL_IMAGE_NAME} ${DOCKERHUB_USERNAME}/${APP_NAME}:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/${APP_NAME}:latest"
                }
            }
        }
    }

    post {
        always {
            script {
                echo '🧹 Nettoyage de l\'usine...'
                sh 'docker logout'
                // On supprime les images locales pour ne pas remplir le disque du serveur Jenkins
                sh "docker rmi ${FULL_IMAGE_NAME} || true"
                sh "docker rmi ${DOCKERHUB_USERNAME}/${APP_NAME}:latest || true"
            }
        }
        success {
            echo "✅ Succès ! L'image est bien au chaud sur Docker Hub."
        }
    }
}
