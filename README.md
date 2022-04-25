# HoleController_Server
EVE Online WH-Map server

1. установаить нод:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
node -e "console.log('Running Node.js ' + process.version)"

2. залить туда файлы сервера

3. сгенерировать package.json:
npm install -g autod
autod -w

4. установить все зависимости:
npm install

5. установить pm2:
npm install pm2 -g


cd;
cd app;pm2 stop server;

pm2 flush;pm2 stop server;pm2 start server.js;pm2 logs --lines 100;
