#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
bun install

# Start the development server
echo "Starting development server..."
bun run dev