pipeline {
    agent any

    tools {
        nodejs 'NodeJS' 
    }

    environment {
        // 1. VOTRE USERNAME DOCKER HUB (Obligatoire pour le push)
        DOCKERHUB_USERNAME = 'yassinekamouss'
        
        // 2. Le nom de votre application
        APP_NAME = 'orgatest-react'
        
        // 3. Nom complet de l'image (ex: yassine/orgatest:12)
        FULL_IMAGE_NAME = "${DOCKERHUB_USERNAME}/${APP_NAME}:${env.BUILD_NUMBER}"
        
        // 4. Récupération des identifiants sécurisés depuis Jenkins
        // Remplacez 'dockerhub-id' par l'ID que vous avez donné dans "Manage Credentials"
        DOCKER_CREDS = credentials('yassinekamouss-dockerhub')
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installation des dépendances...'
                sh 'npm ci' 
            }
        }

        stage('Build React App') {
            steps {
                echo 'Compilation de l\'application React...'
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Construction de l'image : ${FULL_IMAGE_NAME}"
                    sh "docker build -t ${FULL_IMAGE_NAME} ."
                }
            }
        }

        stage('Login to Docker Hub') {
            steps {
                script {
                    echo "Connexion au Docker Hub..."
                    // Utilisation sécurisée du mot de passe via la variable d'environnement
                    // --password-stdin est la méthode la plus sécurisée (évite les warnings)
                    sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    echo "Envoi de l'image vers Docker Hub..."
                    // Push de la version avec le numéro de build (ex: :5)
                    sh "docker push ${FULL_IMAGE_NAME}"
                    
                    // (Optionnel) Création et push du tag 'latest'
                    // C'est une bonne pratique pour que les gens puissent faire 'docker pull' sans connaitre le numéro
                    sh "docker tag ${FULL_IMAGE_NAME} ${DOCKERHUB_USERNAME}/${APP_NAME}:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/${APP_NAME}:latest"
                }
            }
        }
    }

    // Cette section s'exécute toujours à la fin, même en cas d'erreur
    post {
        always {
            script {
                echo 'Nettoyage...'
                sh 'docker logout'
                sh "docker rmi ${FULL_IMAGE_NAME} || true"
                sh "docker rmi ${DOCKERHUB_USERNAME}/${APP_NAME}:latest || true"
            }
        }
        success {
            script {
                echo "Le Build est un succès ! Lancement du déploiement... 🚀"
                // C'est ICI que la magie opère :
                // On appelle le job 'deploy-orgatest-minikube'
                // Et on lui donne le paramètre IMAGE_TAG avec notre numéro de build
                build job: 'deploy-orgatest-minikube', parameters: [string(name: 'IMAGE_TAG', value: "${env.BUILD_NUMBER}")]
            }
        }
    }
}
