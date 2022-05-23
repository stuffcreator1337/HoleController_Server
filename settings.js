module.exports = {
	"whook" : { 
		"url" : "https://discord.com/api/webhooks/***WEBHOOK_URL_GOES_HERE***",
		"name": '***YOUR_DISCORD_MAP_BOT_NAME***',
		"avatar": "https://imageserver.eveonline.com/Type/2062_64.png",//<- avatar example for your discord bot
		"welcomeMsg": "***MESSAGE_IN_DISCORD_DISPLAYED_AFTER_MAP_STARTED***"
	},
	"Servers":{
		"server1_tranq" : {//TRANQUILITY SERVER EXAMPLE
			"client" : "12345678901234567890123456789012",//<- ClientID from https://developers.eveonline.com/applications, 32-long
			"secret" : "1234567890123456789012345678901234567890",//<- ClientSecret from https://developers.eveonline.com/applications, 40-long
			"login" : "login.",
			"port" : 3000,//<- your port
			"source" : "tranquility",
			"file": "_tranq",
			"token" : "stokens",
			"path" : 'C:/nodejs/server',//<- your files location example
			"corp": 605796230//<- your corporation needed to first login
		},
		"server1_sisi" : {//SINGULARITY SERVER EXAMPLE
			"client" : "12345678901234567890123456789012",//<- ClientID from https://developers.testeveonline.com/, 32-long 
			"secret" : "1234567890123456789012345678901234567890",//<- ClientSecret from https://developers.testeveonline.com/, 40 long
			"login" : "sisilogin.test",
			"port" : 8080,//<- your port
			// "source" : "singularity", //<-- CCP removed it 2020-01-13, only TRANQ data is available
			"source" : "tranquility",
			"file": "_sisi",
			"token" : "ttokens",
			"path" : 'C:/nodejs/server',//<- your files location example
			"corp": 1000044//<- your corporation needed to first login
		}
	},
	"homesystemID" : 31000001,//<- your home system; it cannot be deleted from map view, ID could easily be found at https://zkillboard.com/system/31000001/
	"currentServer" : "server1_tranq"//<- current server that would be in use at launch
	
};