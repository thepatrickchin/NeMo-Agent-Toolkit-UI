#!/bin/bash

# Docker push script for NeMo Agent Toolkit UI
# This script builds, tags, and pushes the Docker image to AWS ECR

set -e  # Exit on any error

# Configuration
ECR_REGISTRY="241723985192.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_NAME="talk-to-data-agent-ui-prod"
AWS_REGION="us-east-1"
VERSION="1.0.0.2-RELEASE"
AWS_ACCOUNT_ID="241723985192"
ECR_REPOSITORY="talk-to-data-agent-ui-prod"
IMAGE_TAG="1.0.0.2-RELEASE"
PLATFORM="linux/amd64"
BUILDER_NAME="multiplatform-builder"
DOCKERFILE_PATH="Dockerfile"

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

echo "🔧 Setting up Docker buildx builder..."
# Create buildx builder if it doesn't exist
if ! docker buildx inspect $BUILDER_NAME > /dev/null 2>&1; then
    echo "Creating new buildx builder: $BUILDER_NAME"
    docker buildx create --name $BUILDER_NAME --use
else
    echo "Using existing buildx builder: $BUILDER_NAME"
    docker buildx use $BUILDER_NAME
fi

echo "✅ Buildx builder ready"

echo "🏗️  Building Docker image with dev overlay environment..."

# Copy .env-dev-overlay as .env for the build context
if [ -f ".env-prod-overlay" ]; then
    cp .env-prod-overlay .env
    echo "✅ Copied .env-prod-overlay to .env for build context"
else
    echo "❌ .env-prod-overlay file not found!"
    exit 1
fi

# Build and push the Docker image using buildx for multi-platform support
echo "🏗️  Building multi-platform image for: $PLATFORM"
docker buildx build \
    --builder=$BUILDER_NAME \
    --platform=$PLATFORM \
    -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG \
    --no-cache \
    --push \
    -f $DOCKERFILE_PATH \
    .

BUILD_STATUS=$?

# Clean up the temporary .env file
rm -f .env
echo "✅ Cleaned up temporary .env file"

if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Docker buildx build and push failed. Please check your Dockerfile and try again."
    exit 1
fi

echo "✅ Docker image built and pushed successfully to ECR!"
echo "🎉 Multi-platform image available at: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"
echo "📦 Platforms: $PLATFORM"
