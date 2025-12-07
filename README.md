# HoleController_Server
EVE Online WH-Map server

Complete guide:
Last update 07.12.2025

pkg install git
cd $HOME
git clone https://github.com/yourname/HoleController_Server
cd $HOME/HoleController_Server
npm install
npm install socket.io
cd $HOME
git clone https://github.com/yourname/HoleControllerClient
cd $HOME/HoleControllerClient
npm install
npm install socket.io-client

copy personal config file from some folder in your phone (for example "Download" foler) to server folder:
cp /storage/emulated/0/Download/config.local.js ~/HoleController_Server/


Start server:
cd $HOME/HoleController_Server; git pull;pm2 delete all;pm2 flush;pm2 start server.js;pm2 logs --lines 100;
cd $HOME/HoleControllerClient; git pull; apachectl restart
