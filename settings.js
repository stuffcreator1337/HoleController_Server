const path = require("path");

let localSecrets = {};

try {
	localSecrets = require("./config.local.js"); // локальные ключи
} catch (e) {
	console.error("‘айл config.local.js не найден! —оздайте его на основе config.example.local.js");
	process.exit(1);
}

// ”ниверсальный путь к корневой папке сервера Ч работает везде
const universalPath = path.join(__dirname);

module.exports = {
	"whook" : { 
		"url": localSecrets.DiscordWHK,
		"name": 'Hole Controller',
		"avatar": "https://imageserver.eveonline.com/Type/2062_64.png",
		"welcomeMsg": "Hole Controller restarted."
	},
	"Servers":{
		"server1_tranq" : {
			"client": localSecrets.Servers.server1_tranq.client,
			"secret": localSecrets.Servers.server1_tranq.secret,
			"login" : "login.",
			"port" : 8080,
			"source" : "tranquility",
			"file": "_tranq",
			"token" : "stokens",
			"path": universalPath,
			"corp": 1000167
		},
		"server1_sisi": {
			"client": localSecrets.Servers.server1_sisi.client,
			"secret": localSecrets.Servers.server1_sisi.secret,
			"login" : "sisilogin.test",
			"port" : 8080,
			// "source" : "singularity", //<-- CCP removed it 2020-01-13
			"source" : "tranquility",
			"file": "_sisi",
			"token" : "ttokens",
			"path": universalPath,
			"corp": 1000167
		}
	},
	"homesystemID" : 31001834,
	"currentServer" : "server1_tranq"
	
};