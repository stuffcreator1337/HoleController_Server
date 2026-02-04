/*
* Create copy of this file, edit it and rename it to 'config.local.js'
*/
module.exports = {
	App: {
		client: "",
		secret: ""
    	},
	Hooks: {
    	DiscordWHK: "",
    	telegrambot_token: "",
    	telegrambot_channelID: "",
		name: 'Hole Controller',
		avatar: "https://imageserver.eveonline.com/Type/2062_64.png",
		welcomeMsg: "Hole Controller restarted."
	},
	Server: {
    	server_addr: "0.0.0.0",	
    	server_addr_alt: "https://url.address.com/",
		port: 3000
	},
	Map: {
    	homesystemID : 30000142,
    	corporation : 1000167,
		restrict_access_by_corp: false,    
		alliance : 632866070,
		restrict_access_by_alli: false
	}
};
