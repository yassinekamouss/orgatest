pipeline {
    agent any

    tools {
        // Assurez-vous d'avoir configuré cet outil dans Jenkins > Global Tool Configuration
        // Le nom 'NodeJS' doit correspondre à celui configuré
        nodejs 'NodeJS' 
    }

    environment {
        // Nom de l'image locale (sera taguée avec le numéro de build)
        IMAGE_NAME = "orgatest-react"
    }

    stages {
        stage('Checkout SCM') {
            steps {
                // Récupère le code depuis la branche configurée dans le job Jenkins
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installation des dépendances...'
                // Installation propre des paquets node
                sh 'npm ci' 
            }
        }

        stage('Build React App') {
            steps {
                echo 'Compilation de l\'application React...'
                // Génère le dossier /build (ou /dist pour Vite)
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Construction de l'image Docker..."
                    // On construit l'image en utilisant le Dockerfile
                    // On passe le tag du build courant
                    sh "docker build -t ${IMAGE_NAME}:${env.BUILD_NUMBER} ."
                }
            }
        }

        stage('Validation') {
            steps {
                echo "Succès ! L'image ${IMAGE_NAME}:${env.BUILD_NUMBER} a été construite localement."
            }
        }
    }
}