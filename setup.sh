#!/bin/bash

# TrueAminos Dashboard Setup Script
echo "Setting up TrueAminos Dashboard..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Start the application
echo "Starting application..."
npm start