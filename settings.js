/*
const path = require("path");

let localSecrets = {};

try {
	localSecrets = require("./config.local.js"); //
} catch (e) {
	console.error("config.local.js not found");
	process.exit(1);
}

//
const universalPath = path.join(__dirname);

module.exports = {
	"whook" : { 
		"url": localSecrets.DiscordWHK,
		"name": 'Hole Controller',
		"avatar": "https://imageserver.eveonline.com/Type/2062_64.png",
		"welcomeMsg": "Hole Controller restarted."
	},
	"telegrambot": {
		"token": localSecrets.telegrambot_token,
        "channelID": localSecrets.telegrambot_channelID
	},
	"Server":{
		"client": localSecrets.App.client,
		"secret": localSecrets.App.secret,
		"login" : "login.",
		"LocalAddr": localSecrets.server_addr, 
		"port" : "3000",
		"source" : "tranquility",
		"file": "_tranq",
		"token" : "stokens",
		"path": universalPath
	},
	"Access":{
		"corporation" : localSecrets.corporation,
		"restrict_C" : localSecrets.restrict_access_by_corp,
		"alliance" :  localSecrets.alliance,
		"restrict_A" : localSecrets.restrict_access_by_alli
	},
	"homesystemID" : localSecrets.homesystemID,
	"currentServer" : "server1_tranq"
	
};
*/