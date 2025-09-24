#!/bin/bash

# Docker push script for NeMo Agent Toolkit UI
# This script builds, tags, and pushes the Docker image to AWS ECR

set -e  # Exit on any error

# Configuration
ECR_REGISTRY="166838993696.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_NAME="talk-to-data-agent-ui"
AWS_REGION="us-east-1"
VERSION="latestz"

echo "🚀 Starting Docker build and push process..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it and try again."
    exit 1
fi

echo "🔐 Authenticating with AWS ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

if [ $? -ne 0 ]; then
    echo "❌ Failed to authenticate with AWS ECR. Please check your AWS credentials and try again."
    exit 1
fi

echo "✅ Successfully authenticated with AWS ECR"

echo "🏗️  Building Docker image with dev overlay environment..."

# Copy .env-dev-overlay as .env for the build context
if [ -f ".env-dev-overlay" ]; then
    cp .env-dev-overlay .env
    echo "✅ Copied .env-dev-overlay to .env for build context"
else
    echo "❌ .env-dev-overlay file not found!"
    exit 1
fi

# Build the Docker image
docker build -t $IMAGE_NAME:$VERSION .

# Clean up the temporary .env file
rm -f .env
echo "✅ Cleaned up temporary .env file"

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed. Please check your Dockerfile and try again."
    exit 1
fi

echo "✅ Docker image built successfully"

echo "🏷️  Tagging Docker image..."
docker tag $IMAGE_NAME:$VERSION $ECR_REGISTRY/$IMAGE_NAME:$VERSION

if [ $? -ne 0 ]; then
    echo "❌ Failed to tag Docker image."
    exit 1
fi

echo "✅ Docker image tagged successfully"

echo "📤 Pushing Docker image to ECR..."
docker push $ECR_REGISTRY/$IMAGE_NAME:$VERSION

if [ $? -ne 0 ]; then
    echo "❌ Failed to push Docker image to ECR."
    exit 1
fi

echo "✅ Docker image pushed successfully to ECR!"
echo "🎉 Image available at: $ECR_REGISTRY/$IMAGE_NAME:$VERSION"
