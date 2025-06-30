#!/bin/bash

read_first_line_of_file() {
  local file="$1"
  if [ -e "$file" ]; then
    read -r line < "$file"
    echo "$line"
  else
    echo "File $file does not exist."
    exit 1
  fi
}

# Load environment variables
set -a
source .env.prod
set +a

# Read secrets
docker_token=$(read_first_line_of_file "secrets/.docker-oauth-token")
docker_username=$(read_first_line_of_file "secrets/.docker-login-username")

# Login to Docker Hub and pull images
# echo "$docker_token" | docker login --username "$docker_username" --password-stdin

# Pull latest images
echo "Pulling latest images..."
docker pull ghcr.io/"$docker_username"/${REGISTRY_ID}:${VERSION}

# Logout from registry
docker logout

# Stop and remove existing container
echo "Stopping existing container..."
docker stop ${PROJECT_NAME} || true
docker rm ${PROJECT_NAME} || true

# Start container
echo "Starting container..."
docker run -d --name ${PROJECT_NAME} -v ${HOME}/.${PROJECT_NAME}:/home/app/.${PROJECT_NAME} --env-file ./.env.prod --restart unless-stopped "$docker_username"/${PROJECT_NAME}:${VERSION}

sleep 1

# Show running containers
echo "Current running containers:"
docker ps

echo "Deployment completed!"
