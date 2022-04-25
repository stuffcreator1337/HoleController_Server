# HoleController_Server
EVE Online WH-Map server

1. Install NODE:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
node -e "console.log('Running Node.js ' + process.version)"

2. Upload server files

3. Generate package.json:
npm install -g autod
autod -w

4. Install all dependencies:
npm install

5. Install pm2:
npm install pm2 -g

Start server:
cd;
cd app;pm2 stop server;

pm2 flush;pm2 stop server;pm2 start server.js;pm2 logs --lines 100;
