#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
bun install

# Start the development server
echo "Starting development server..."
bun run dev

//bash command to fix Unable to write file 'vscode-remote://wsl+ubuntu/home/xhbh/dev/yasmineoss/tempdir/uitester/testu.txt' (NoPermissions (FileSystemError): Error: EACCES: permission denied, open '/home/xhbh/dev/yasmineoss/tempdir/uitester/testu.txt')
sudo chown -R $USER:$USER /home/xhbh/dev/yasmineoss/tempdir/uitester