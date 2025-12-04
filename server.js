var busy = false;
const path1 = './';

var crest,map1,charFleet;

const http = require('http');
// const https = require('https');
const btoa_func = require('btoa');
const atob_func = require('atob');
//var io = require('socket.io');
const { Server } = require('socket.io');
const request = require('request');
const querystring = require('querystring');

const settings = require(path1+'settings');

const { Webhook } = require('discord-webhook-node');

// import { XMLHttpRequest } from 'w3c-xmlhttprequest';

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const hook = new Webhook(settings.whook.url);

hook.setUsername(settings.whook.name);
hook.setAvatar(settings.whook.avatar); 
hook.send(settings.whook.welcomeMsg);

const homesystemID = settings.homesystemID;

/*****************************************************************
	creating datas
******************************************************************/
// const dbconst = require(path1+'/db/constellations');
const dbjumps = require(path1+'/db/jumps');
const dbfulleden = require(path1+'/db/mapofeden');
const dbsysnames = require(path1+'/db/sysnames');
// const dbregions = require(path1+'/db/regions');
// const dbholes = require(path1+'/db/wh_holes');
const dbinfo = require(path1+'/db/wh_info');
const  tools = require(path1+'/tools');
// console.log(dbsysnames['J115031']);

/*****************************************************************
	connection settings
******************************************************************/
	
const currentServer = settings.Servers.server1_tranq;
const path = currentServer["path"];

process.on('uncaughtException', function (err) {
  console.error(err);
  console.log('\x1b[31m%s\x1b[0m', "Node NOT Exiting...");
});

var json = '';
var used_code = "";

// var crestDB = [];
// var charsLoc = [];
/*****************************************************************
	reading saved files with map and ESI-keys
******************************************************************/
readF('crestDB',function(err,old_db){
	crest = new swagger(old_db);
	crest.start_timer();
});
readF('map1',function(err,old_db){
	map1 = new map(old_db);
	map1.clean_timer();
	// console.log(map1);
});

//'\x1b[31m%s\x1b[0m' - red
//'\x1b[32m%s\x1b[0m' - green
//'\x1b[33m%s\x1b[0m' - dark yellow

/*****************************************************************
	creating server
******************************************************************/
var server = http.createServer(function (req, res) {

	console.log("=== Incoming request ===");
	console.log("URL:", req.url);

	// --- Разбор URL безопасным способом ---
	const fullUrl = "http://localhost" + req.url; // base обязательна
	const urlObj = new URL(fullUrl);

	// Извлекаем GET-параметры:
	const code = urlObj.searchParams.get("code");
	const state = urlObj.searchParams.get("state");

	// Это случается при запросах Socket.IO:
	// /socket.io/?EIO=3&transport=polling&t=123
	if (req.url.startsWith("/socket.io/")) {
		res.writeHead(200);
		return res.end("");  // socket.io сам продолжает обработку
	}

	// Если запрос без code — значит это просто заход на localhost:3000
	if (!code) {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		return res.end("Server running.\nNo OAuth code provided.\n");
	}

	// Если нет state — ошибка формата запроса
	if (!state) {
		res.writeHead(400, { 'Content-Type': 'text/plain' });
		return res.end("Missing 'state' parameter");
	}

	// --- Разбор state ---
	let parts = state.split('_');
	if (parts.length !== 2) {
		res.writeHead(400, { 'Content-Type': 'text/plain' });
		return res.end("Malformed 'state' parameter");
	}

	let stateCode = parts[0];
	let uniqueCode = parts[1];

	console.log("code =", code);
	console.log("state =", state);
	console.log("stateCode =", stateCode);
	console.log("uniqueCode =", uniqueCode);

	// --- Ответ пользователю ---
	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end('Token received. You can close this page.<script>window.close();</script>');

	// --- Далее: используем code ---
	if (code === used_code) {
		console.log("Duplicate OAuth code ignored");
		return;
	}

	used_code = code;

	// Формируем запрос на получение токена
	var data = querystring.stringify({
		'grant_type': 'authorization_code',
		'code': code
	});

	auth(data, '', function (err, name, json1) {
		if (err) {
			console.log("auth() error:", err);
			return;
		}
		console.log("New access token:", json1["access_token"]);

		var host = currentServer["login"] + 'eveonline.com';
		var url = '/oauth/verify';

		getCharacterData(host, url, json1["access_token"], function (err, json2) {
			if (err) {
				console.log("verify error:", err);
				return;
			}
			console.log("Character data:", json2);
			update_crest(json1, json2, stateCode, uniqueCode);
		});
	});
});
/*****************************************************************
	запускаем сокет для общения с клиентом
******************************************************************/
const io = new Server(server, {
	cors: {
		origin: "http://" + currentServer["LocalAddr"] + ":" + currentServer["port"],
		methods: ["GET", "POST"],
		credentials: true           // обязательно
	}
});


/*****************************************************************
	создаем класс для базы с крест-инфой о персах
******************************************************************/
class swagger{
	/*****************************************************************
	|=|	загруэаем инфу с файлов в кеш
	******************************************************************/
	constructor(old){
		this.crestDB = old || readFsync(path+'/server_files/crestDB'+currentServer["file"]+'.json');
		this.charLoc = readFsync(path+'/server_files/charLoc'+currentServer["file"]+'.json');
		this.charStatus = {};
		this.systemsKB = {};
	}
	/*****************************************************************
	|=|	запускаем таймера, первоначальный через секунду, дл обновления токенов
	|=| затем каждые 100 секунд = 1,6 минут (макс 20)
	|=| обновляем инфу о персах каждые 15 сек
	|=| обновляем данные о системах с КБ каждые 600 секунд = 10 минут
	******************************************************************/
	start_timer(){
		var that = this;
		setTimeout(function(){ that.refreshAccess('all');},1000);
		setInterval(function(){ that.refreshAccess('all');},100000);
		setInterval(function(){ that.updateChar();},15000);
		setTimeout(function(){ that.updateZKB();},3000);
	}
	upd(json){
		this.crestDB = json;
	}
	/*****************************************************************
	|=|	обновляем токен
	|=| если для всех то переадресуем в другую функцию
	******************************************************************/
	refreshAccess(id){
		var crestDB = this.crestDB;
		if(id == 'all'){this.delayRefreshToken(0);return;}
		for(var i=0;i<crestDB.length;i++){
		// console.log("158: REFRESHING "+crestDB[i]['CharacterID']);
			var ch_id =  crestDB[i]['CharacterID'];
			if(id == ch_id){
				var data = querystring.stringify({ 'grant_type': 'refresh_token',
												'refresh_token': crestDB[i]['refresh_token'] });
				console.log("188: refreshing token for: "+ch_id);
				auth(data, ch_id, function(err, id, answer) {
					for(let i=0;i<crestDB.length;i++){
						if(id == crestDB[i]['CharacterID']){								
							if (err) {
								console.log(err);console.log(id);
								send('', "token_error", id, crestDB[i]['code']);
							} else {
								crest.charStatus[id] = 'refreshed';
								crestDB[i]['access_token'] = answer['access_token'];
							}
						}
					}
				});
			}
		}
	}
	/*****************************************************************
	|=|	обновляем токен начиная с i, доходим до конца и заканчиваем
	******************************************************************/
	delayRefreshToken(i){
		// console.log(i);
		var crestDB = this.crestDB;
		if(i==crestDB.length)return;
		
		// console.log("158: "+crestDB[i]['CharacterID']);
		
		var ch_id =  crestDB[i]['CharacterID'];
		var data = querystring.stringify({ 'grant_type': 'refresh_token',
										'refresh_token': crestDB[i]['refresh_token'] });
		console.log("215: refreshing token for: "+ch_id);
		auth(data, ch_id, function(err, id, answer) {
			for(let i=0;i<crestDB.length;i++){
				if(id == crestDB[i]['CharacterID']){								
					if (err) {
						console.log('\x1b[31m%s\x1b[0m', "Character with the ID="+id+" got error:");console.log('\x1b[31m%s\x1b[0m', err);
						send('', "token_error", id, crestDB[i]['code']);
					} else {
						crest.charStatus[id] = 'refreshed';
						crestDB[i]['access_token'] = answer['access_token'];
					}
				}
			}
		});
		var that = this;	
		i++;	
		var j = i;
		
		// двигаемся дальше, берем для рефреша токена следующего через 100 мс	
		setTimeout(function(){/* console.log('222: '+j);  */that.delayRefreshToken(j);},100);
	}
	/*****************************************************************
	|=|	обновляем всю инфу о персе, вызывается раз в 15 секунд
	******************************************************************/
	updateChar(){
		// const used = process.memoryUsage();
		// for (let key in used) {
		  // console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
		// }
		// console.log(this.charLoc);
		// tools.memory();
		var charLoc = this.charLoc;
		var crestDB = this.crestDB;
		// var old_charLoc = tools.clone(charLoc);
		for(let i=0; i<crestDB.length;i++){
			if(this.charStatus[crestDB[i]['CharacterID']] == 'refreshed'){
				if(!crestDB[i]['access_token']){
					console.log('\x1b[33m%s\x1b[0m', '247: TOKEN ERROR = '+crestDB[i]['CharacterID']+' = '+atob(crestDB[i]['CharacterName']));
					send('', "token_error", crestDB[i]['CharacterID'], crestDB[i]['code']);
				}else{			
					/*
						обновляем локацию, корабль и онлайн
					*/
					this.updateCharLoc(crestDB[i]['access_token'],crestDB[i]['CharacterID'],charLoc);
					/* this.updateCharFleet(crestDB[i]['access_token'],crestDB[i]['CharacterID'],charLoc); */
					this.updateCharShip(crestDB[i]['access_token'],crestDB[i]['CharacterID'],charLoc);
					this.updateCharOnline(crestDB[i]['access_token'],crestDB[i]['CharacterID'],charLoc);
				}				
			}			
		}
		// if(!(JSON.stringify(old_charLoc) === JSON.stringify(charLoc)))
		var sendData = [];
		// console.log(charLoc);
		var now_time = new Date().getTime();
		// console.log();
		for(var i=0;i<charLoc.length;i++){
			var pers_outtime = new Date(charLoc[i].last_logout).getTime() + 1800000;		//время после которого показывать перса не надо, это 30 минут
			// console.log((charLoc[i].online == true)||(now_time < pers_outtime));
			if((charLoc[i].online == true)||(now_time < pers_outtime)){
				sendData.push(charLoc[i]);
			}
		}
		send('', "new_chars_position", sendData,'all');
	}
	/*****************************************************************
	|=|	обновляем дынные по системам с килборды
	******************************************************************/
	updateZKB(){
		var mp = map1.map1;
		for(var j in mp){
			var s1 = mp[j]["sys1"];
			var s2 = mp[j]["sys2"];
			this.systemsKB["sys_"+s1+""] = "";
			this.systemsKB["sys_"+s2+""] = "";
		}

		var tmout = 0;
		var syst_count = Object.keys(this.systemsKB).length;
		console.log("Starting KB-parse, systems to check: "+syst_count);
		for(var s in this.systemsKB){	
			setTimeout(this.requestZkb,tmout+=1000,s,syst_count--);		
		}
	}
	requestZkb(s,c){		
		var syst = s.substring(4, 12);
		var url = "https://zkillboard.com/api/systemID/"+syst+"/";		
		console.log(url);
		// var url = "https://zkillboard.com/api/systemID/30000142/pastSeconds/43200/";		
		getAjax(url,function(er,data1){
			if(data1.length){				;
				crest.systemsKB[s] = data1[0].killmail_id;
			}
			if(c == 1){
				send('', "zkb_data", crest.systemsKB, 'all');
			}
		}); 
		
	}
	/*****************************************************************
	|=|	обновляем статус онлайн перса
	******************************************************************/
	updateCharOnline(token,charID,charLoc){
			// console.log('======UPDATING CHARACTER ONLINE FOR: '+charID+'=====');
			var host = 'esi.evetech.net';
			var url = '/v2/characters/'+charID+'/online/?datasource='+currentServer["source"];
			getCharacterData(host,url,token, function(err, data,id) {
				if (err) {
					console.log(err+' Online for: '+id);
				} else {
					if(data['error'])return;
					for(var i=0;i<charLoc.length;i++){
						if(charLoc[i]['CharacterID'] == id){
							if(data['error'])return;
							for(var prop in data){
								charLoc[i][prop] = data[prop];
							}
							if(charLoc[i]['online'] == true){		
								charLoc[i]["loc_time"] = new Date().getTime();
							}
							// console.log(charLoc[i]);
							// console.log('======UPDATING CHARACTER ONLINE FOR: '+id+'::::'+data["online"]);
						}
					}
				}
			},charID);
	}
	/*****************************************************************
	|=|	обвновляем статус флота перса
	******************************************************************/
	updateCharFleet(token,charID,charLoc){
			var host = 'esi.evetech.net';
			var url = '/v1/characters/'+charID+'/fleet/?datasource='+currentServer["source"];		
			getCharacterData(host,url,token, function(err, data,id) {
				if (err) {
					console.log(err+' Fleet info of: '+id);
				} else {
					if(data['error'])return;
					// console.log(data);
					if(data.fleet_id){
						/* charFleet.pushFleet(data.fleet_id,charID, token);
						charFleet.reformFleet(charID); */
					}
					// console.log(data.fleet_id);

				}
			},charID);		
	}
	/*****************************************************************
	|=|	обновляем текущий корабль перса
	******************************************************************/
	updateCharShip(token,charID,charLoc){
			var host = 'esi.evetech.net';
			var url = '/v1/characters/'+charID+'/ship/?datasource='+currentServer["source"];
			getCharacterData(host,url,token, function(err, data,id) {
				if (err) {
					console.log(err+' Ship for: '+id);
				} else {
					if(data['error'])return;
					for(let i=0;i<charLoc.length;i++){
						if(charLoc[i]['CharacterID'] == id){
							// console.log('======UPDATING CHARACTER SHIP FOR: '+id+'=====');
							charLoc[i]["ship_type_id"] = data['ship_type_id'];
							charLoc[i]["ship_name"] = btoa(data['ship_name']);
							charLoc[i]["ship_item_id"] = btoa(data['ship_item_id']);
							// console.log(data); 
						}
					}
				}
			},charID);
	}
	/*****************************************************************
	|=|	обновляем текущую локацию перса
	******************************************************************/
	updateCharLoc(token,charID,charLoc){
			var host = 'esi.evetech.net';
			var url = '/v1/characters/'+charID+'/location/?datasource='+currentServer["source"];
			getCharacterData(host,url,token, function(err, data,id) {
				if (err) {
					console.log(err+'257: Location for: '+id);
				} else {
					var found = false;
					for(let i=0;i<charLoc.length;i++){
						if(charLoc[i]['CharacterID'] == id){
							if(data['structure_id']){//console.log('DOCKED IN STATION');
								charLoc[i]["solar_system_id"] = data['solar_system_id'];
								//console.log(data);							
								return;}
							var old_id = tools.clone(charLoc[i]["solar_system_id"]);
							var new_id = data['solar_system_id'];
							var old_time = charLoc[i]["loc_time"];
							if(!new_id){console.log('UNDEFINED NEW SYSTEM ID');
								console.log(data);
								return;}
							var new_time = new Date().getTime();
							charLoc[i]["solar_system_id"] = data['solar_system_id'];
							found = true;
							if((new_id != old_id)&&(new_time < old_time+300000)){
								var s1info = dbfulleden[new_id];
								var s2info = dbfulleden[old_id];
								console.log("425:");
								console.log(s1info);
								console.log('\x1b[34m%s\x1b[0m', "Jump through systems detected: "+old_id+" ("+s2info["solarSystemName"]+")-->"+new_id+" ("+s1info["solarSystemName"]+")");
								/*
									1 проверка, что новая система это вх
									2 что старая система это вх
									3 что если они кспейс, то не должны быть соединены
									4 не должно быть связи через 1 систему
								*/
								var s1wh 	= tools.isWh(dbfulleden,new_id);
								var s2wh 	= tools.isWh(dbfulleden,old_id);
								var sJumps = null;
								if(!s1wh && !s2wh){sJumps = map1.jumps[old_id][new_id];}
								if((tools.isWh(dbfulleden,new_id) == true)||(tools.isWh(dbfulleden,old_id) == true)||(map1.jumps[old_id][new_id]==null)){
									console.log('\x1b[34m%s\x1b[0m', 'Old sysID: '+old_id+', new sysID: '+new_id);
									map1.create_link(new_id,old_id,'',id);
								}
							}
						}
					}
					if(!found){
						var f = findById(crest.crestDB,id,'CharacterID');
						charLoc.push({
							"CharacterName" : crest.getNameByID(id),
							"CharacterID" : id,
							"solar_system_id" : data['solar_system_id'],
							"loc_time" : "",
							"code" : f[1].code
						});
					}
				}
			},charID);
	}
	/*****************************************************************
	|=|	обновляем текущую локацию по команде из фантома
	******************************************************************/
	updateCharLocPhantom(id,charName,sysName,charLoc){
		var found = false;
		for(let i=0;i<charLoc.length;i++){
			if(charLoc[i]['CharacterID'] == id){			
				// console.log('======UPDATING CHARACTER ONLINE FOR: '+id+'=====');
				var old_id = tools.clone(charLoc[i]["solar_system_id"]);
				var new_id = dbsysnames[sysName].solarSystemID;//tools.getSysId(sysName);
				var old_time = charLoc[i]["loc_time"];
				var new_time = new Date().getTime();
				charLoc[i]['online'] = true;
				charLoc[i]["loc_time"] = new_time;
				charLoc[i]["solar_system_id"] = dbsysnames[sysName].solarSystemID;//tools.getSysId(sysName);
				found = true;
				if((new_id != old_id)&&(new_time < old_time+300000)){
					console.log('======UPDATING CHARACTER POSITION FOR: '+id+'=====');
					console.log(new_id,old_id); 
					// console.log(map1.jumps,[new_id]);
					if((tools.isWh(dbfulleden,new_id) == true)||(tools.isWh(dbfulleden,old_id) == true)||(map1.jumps[old_id][new_id]==null)){
						console.log("%c Old sysID: "+old_id+", new sysID: "+new_id,"background: #336699; color: white");
						map1.create_link(new_id,old_id,'',id);
					}
				}	
			}else{
				if(charLoc[i]["loc_time"] < (charLoc[i]["loc_time"] + 600000)){
					charLoc[i]['online'] = false;
				}
			}
		}
		if(!found){
				console.log('======CREATING NEW ENTRY FOR: '+id+'=====');
			charLoc.push({
				"CharacterName" : btoa(charName),
				"CharacterID" : id,
				"solar_system_id" : dbsysnames[sysName].solarSystemID,//tools.getSysId(sysName);
				"loc_time" : "",
				"code" : 100500
			});
		}
	}
	getNameByID(id){
	var crestDB = this.crestDB;
	for(let i=0;i<crestDB.length;i++){
		if(crestDB[i]['CharacterID'] == id)return crestDB[i]['CharacterName'];
	}
	
}
}

/*****************************************************************
	создаем класс для управления флотом
******************************************************************/
class fleet{
	constructor(){
	// fleetid,charID,token){
		// this.id 		= [];
		// this.charID 	= [];
		// this.token		= [];
		
	}
	pushFleet(fleetid,charID,token){
		this[charID] = {'id':fleetid,'token':token};
	}
	reformFleet(charID){
		var host = 'esi.evetech.net';
		var url = '/v1/fleets/'+this[charID].id+'/wings/?datasource='+currentServer["source"];		
		getCharacterData(host,url,this[charID].token, function(err, data,charID) {
			if (err) {
				console.log(err+' Fleet info of: '+charID);
			} else {
				if(data['error'] || !data)return;
				// console.log(data[0].squads);				
				charFleet.renameWing(charID,data[0].id);
				charFleet.renameSquads(charID,data[0].id,data[0].squads);
			}
		},charID);		
		// if(this[charID].readySquads == true){
		// console.log('2READY?');
		// }
	}
	renameSquads(charID,wingID,squads){
		var SquadsNames = ['Damage','Logistics','Tackle','Scanners','Other'];
		var found = {};
		for(var i=0;i<squads.length;i++){
			for(var f in SquadsNames){
				if(squads[i].name == SquadsNames[f])found[SquadsNames[f]]	= true;
			}
		}
		var otherSquads = [];
		for(var i=0;i<squads.length;i++){
			var nameFound = false;
			for(var j=0;j<SquadsNames.length;j++){
				if(squads[i].name == SquadsNames[j])nameFound = true;
			}
			if(!nameFound)otherSquads.push(squads[i].id);
		}
		
		// console.log(otherSquads);
		// console.log(found);
		var needSquads = [];
		for(var f in SquadsNames){
			if(!found[SquadsNames[f]])	{needSquads.push(SquadsNames[f]);}
		}
		
		for(var name in needSquads){
			if(otherSquads[0]){
				// console.log(otherSquads);
				this.changeSquadName(charID,otherSquads[0],needSquads[name]);
				otherSquads.splice(0, 1);
				// needSquads
			}
		}
		// console.log('403:', needSquads , otherSquads.length);
		// console.log(found);
		if(needSquads && (otherSquads.length == 0)){
			console.log('not enougth squads');
			this[charID].readySquads = false;
			this.createSquad(charID,wingID);
		}else{
			console.log('WING READY');
			this[charID].readySquads = true;
			this.getMembers(charID);
		}		
	}
	changeSquadName(charID,squadID,newName){
		var host = 'esi.evetech.net';
		var url = '/v1/fleets/'+this[charID].id+'/squads/'+squadID+'/?datasource='+currentServer["source"];	
		var d1 = {'name' : newName};
		putCharacterData(host,url,charFleet[charID].token, function(err, data,id) {
			if (err) {
				console.log(err+' Fleet info of: '+id);
			} else {
				if(data['error'])return;
			}
		},charID,d1);	
	}
	createSquad(charID,wingID){
		var host = 'esi.evetech.net';
		var url = '/v1/fleets/'+this[charID].id+'/wings/'+wingID+'/squads/?datasource='+currentServer["source"];	
		postCharacterData(host,url,charFleet[charID].token, function(err, data,id) {
			if (err) {
				console.log(err+' Fleet info of: '+id);
			} else {
				if(data['error'])return;
				// console.log(data);		
				// console.log(data.fleet_id);
			}
		},charID);		
	}
	renameWing(charID,wingID){
		var host = 'esi.evetech.net';
		var url = '/v1/fleets/'+this[charID].id+'/wings/'+wingID+'/?datasource='+currentServer["source"];	
		var d1 = {'name' : 'ESI wing'};
		// console.log(d1);
		putCharacterData(host,url,charFleet[charID].token, function(err, data,id) {
			if (err) {
				console.log(err+' Fleet info of: '+id);
			} else {
				if(data['error'])return;
			}
		},charID,d1);			
	}
	getMembers(charID){
		var host = 'esi.evetech.net';
		var url = '/v1/fleets/'+this[charID].id+'/members/?datasource='+currentServer["source"];		
		getCharacterData(host,url,this[charID].token, function(err, data,id) {
			if (err) {
				console.log(err+' Fleet info of: '+id);
			} else {
				if(data['error'])return;
				// console.log('459:');
				// console.log(data);
				for(var i=0;i<data.length;i++){
					if(data[i].role_name == 'Squad Member'){
						console.log(data[i]);
						var sh = data[i].ship_type_id;
						if(shipType(sh) == 'Logistics'){		charFleet.moveMember(charID,data[i].character_id,'Logistics');}
						else if(shipType(sh) == 'Tackle')							{charFleet.moveMember(charID,data[i].character_id,'Tackle');}
						else if(shipType(sh) == 'Scanners')							{charFleet.moveMember(charID,data[i].character_id,'Scanners');}
					}
				}
				// console.log(data.fleet_id);
			}
		},charID);	
	}
	moveMember(charID,character_id,squadName){
		var host = 'esi.evetech.net';
		var url = '/v1/fleets/'+this[charID].id+'/wings/?datasource='+currentServer["source"];	
		getCharacterData(host,url,this[charID].token, function(err, data,character_id) {
			if (err) {
				console.log(err+' Fleet info of: '+charID);
			} else {
				if(data['error'] || !data)return;
				for(var i=0;i<data[0].squads.length;i++){
					if(data[0].squads[i].name == squadName){						
						// console.log(data[0]);//.squads[i]);
						// console.log(charFleet[charID].id,character_id);
						var host = 'esi.evetech.net';
						var url = '/v1/fleets/'+charFleet[charID].id+'/members/'+character_id+'/?datasource='+currentServer["source"];	
						var d1 = {
						  "role": "squad_member",
						  "squad_id": data[0].squads[i].id,
						  "wing_id": data[0].id
						};
						putCharacterData(host,url,charFleet[charID].token, function(err, data,id) {
							if (err) {
								console.log(err+' Fleet info of: '+id);
							} else {
								if(data['error'])return;
							}
						},charID,d1);	
					}
				}
				// console.log('478:'+squadName);				
				// charFleet.renameWing(charID,data[0].id);
				// charFleet.renameSquads(charID,data[0].id,data[0].squads);
			}
		},character_id);		
	}
}
function shipType(sh){
	if(sh == 11987 || sh == 11985 || sh == 11989 || sh == 11978 || sh == 37457 || sh == 37458 || sh == 37459 || sh == 37460)	return 'Logistics';
	if(sh == 22456 || sh == 37480)									return 'Tackle';
	if(sh == 11188 || sh == 11192 || sh == 11172 || sh == 11182 || sh == 44993)	return 'Scanners';
	return 'Damage';
	return 'Other';
}
charFleet = new fleet();
/*****************************************************************
	создаем класс для управления картой
******************************************************************/
class map{
	constructor(json){
		this.map1 		= json || readFsync(path+'/server_files/map1'+currentServer["file"]+'.json');
		// for(var i=0;i<16;i++){
		// this.map1.push(json[i]);}// || readFsync(path+'/server_files/map1'+currentServer["file"]+'.json')[i]
		this.systems 	= dbfulleden;
		// this.consts 	= dbconst;
		this.jumps 		= dbjumps;
		// this.regions 	= dbregions;
		// this.holes 		= dbholes;
		this.info 		= dbinfo;
		this.sigs 		= readFsync(path+'/server_files/sigs'+currentServer["file"]+'.json');
		this.names 		= readFsync(path+'/server_files/names'+currentServer["file"]+'.json');
	}
	// getSysId(name){
		// this.systems
		// return sysID;
	// }
	clean_timer(){
		var that = this;
		setInterval(function(){ that.clean_map();},60000);//600000 - timer = 1 час
	}
	clean_map(){
		var currDate = new Date().getTime();
		var jsonToDel = [];
		for(var i=0;i<this.map1.length;i++){
			// console.log(parseInt(this.map1[i].last_passed)+  24*60*60*1000< parseInt(currDate));
			if((parseInt(this.map1[i].last_passed) + 24*60*60*1000)< currDate){
				console.log('todel:'+this.map1[i].sys1+'---'+this.map1[i].sys2+' '+this.map1[i].last_passed +', '+currDate+'; '+tools.msToTime(this.map1[i].last_passed - (currDate + 24*60*60*1000)));
				this.map1[i].alive = "0";
				jsonToDel.push(this.map1[i]);
				// this.map1.splice(i,1);
			}
		}
		readF('history',function(err,saved_history,size,json,that){
			// console.log(saved_history.length, typeof(saved_history));
			// console.log(json.length);
			var new_history = saved_history.concat(json);
			// console.log(saved_history.length);
			
			writeF(new_history,"history",function(){
				// var size = fileSize("history");
			});		
			that.map1 = that.map1.filter( function( el ) {
			  return json.indexOf( el ) < 0;
			} );
			console.log('====MAP CACHE CLEANED====');
		},jsonToDel,this);
	}
	create_link(new_id,old_id,type,charID){
		var openDate = new Date();
		var jsonReady = {
				"sys1" : ""+new_id+"",
				"sys2" : ""+old_id+"",
				"date" : ""+openDate.getTime()+"",
				"last_passed" : ""+openDate.getTime()+"",
				"status" : "0", 
				"founder" : ""+charID+"", 
				"alive" : "1",
				"deleted" : "",
				"type" : type
				}
		if(type == 'labelline'){
			this.getDistance(new_id,old_id,function(data1,data2,that){
				jsonReady.labelCenter = data2.length+" ("+data1.length+")_jumps";
				// console.log(jsonReady);
				that.newLinkCheck(charID,jsonReady);
			});	
		}
		else{
			this.newLinkCheck(charID,jsonReady);
		}
	}
	getDistance(id1,id2,callback){
		// var destSys = sysId;
		// console.log(destSys);
		var that = this;
		if(tools.isWh(this.systems,id1) || tools.isWh(this.systems,id2)) return "no way";
		var url1 = 'https://esi.evetech.net/v1/route/'+id1+'/'+id2+'/?datasource=tranquility&flag=shortest';
		var url2 = 'https://esi.evetech.net/v1/route/'+id1+'/'+id2+'/?datasource=tranquility&flag=secure';
		getCCPdata(url1,function(er,data1){//////////////////////<<<<<<<<<<<<<<========----------потом отредактировать и вернуть
			getCCPdata(url2,function(er,data2){
				callback(data1,data2,that);
			});
		}); 

	}
	newLinkCheck(user,links){
		//console.log('new link');
		var currDate = new Date();
		var old_j = this.map1;	
		var already_exists = false;
		if((links["sys1"] == "")||(links["sys2"] == "")){
			console.log('================== map refresh from '+user+'==========================');
			send('', "map_replot", old_j,user);
			return;
		}
		console.log('================== new link ==========================');
		for(let i=0; i<old_j.length; i++){
			if(tools.compareSystems(old_j[i],links)){
				old_j[i]["alive"] = "1";
				old_j[i]["last_passed"] =  ""+currDate.getTime()+"";
				already_exists = true;
			}
		}
		// console.log(links);
		//console.log(old_j[i]["sys1"],old_j[i]["sys2"]);
		if(!already_exists){
			old_j.push(links);
			if(links.sys1 == homesystemID.toString() || links.sys2 == homesystemID.toString()){
				var s = '';
				if(links.sys1 == homesystemID.toString()){s = links.sys2;}else{s = links.sys1;}
				// this.systems[s]
				webhooksSend('Система из дома: '+s,s,this.systems[s],this);
			}
			
		}
		// console.log(old_j);
		send('', "new_links_found", old_j,"all");
		if(old_j != "[]"){
			// writeF(old_j,'map1');
			this.map1 = old_j;
		}
		else{
			console.log("empty json from new_link");
		}
	}
}

/*****************************************************************
	функции для работы креста и инфы о персах
******************************************************************/
function update_crest(token,info,state,unique){//обновляем имеющуюся инфу, либо добавляем новую
	var crestDB = crest.crestDB;
	var charLoc = crest.charLoc;
	var sendAuthAll = function(c,uni,st){
		var sendData = [];
		var charLoc = crest.charLoc;
		console.log('409:' + state);
		// console.log(charLoc);
		for(var i=0;i<charLoc.length;i++){
			if(c == charLoc[i]['code']){
				sendData.push(charLoc[i]);
			}
		}
		console.log('416:');
		console.log(sendData);
		send('', "auth_success_"+st, [c,map1.map1,sendData],uni);
	};
	//задаем код чтобы не повторялся
	var code = Math.floor(Math.random() * 10000000);
	while(findById(crest.crestDB,code,'code')){
		code = Math.floor(Math.random() * 10000000);
	}
	if(state == 'firstlogin'){
		//ищем перса, вдруг уже зареган
		let found = findById(crest.crestDB,info['CharacterID'],'CharacterID');//ищем нужного перса
		//если перс не найден, значит всё новое - узнаем корпу, делаем новую запись, узнаем локацию
		if(!found){
			let url = 'https://esi.evetech.net/dev/characters/'+info['CharacterID']+'/?datasource='+currentServer["source"];
			getCCPdata(url,function(e,response){
				if(e){console.log('\x1b[31m%s\x1b[0m', '408: error'); return;}
				if(response.corporation_id != currentServer["corp"]){
					console.log('\x1b[35m%s\x1b[0m', '430: Not in Another War!');
					send('', "error_text", {'text':'Not in Another War!'},unique);
					return;
				}
				let data = {
					'CharacterID': info['CharacterID'],
					'CharacterName':btoa(info['CharacterName']),
					'refresh_token':token['refresh_token'],
					"access_token": token['access_token'],
					'code': code
				};
				console.log('438: ADDING NEW CHARACTER: '+info['CharacterName']);
				crestDB.push(data);
				let host = 'esi.evetech.net';
				let url = '/v1/characters/'+info['CharacterID']+'/location/?datasource='+currentServer["source"];
				getCharacterData(host,url,token['access_token'], function(err, data,id,name) {
					if (err) {
						console.log(err+'257: Location for: '+id);
					} else {
						let sendData = {
							"CharacterName": btoa(name),
							"CharacterID":id,
							"solar_system_id":data['solar_system_id'],
							"code":code
						};
						charLoc.push(sendData);
						send('', "auth_success_"+state, [code,map1.map1,[sendData]],unique);
					}
				},info['CharacterID'],info['CharacterName']);				
			});
		
		}else{//перс найден, исправляем код ищем все записи по его коду и отправляем данные
			var i = found[0];
			console.log('464: FOUND CHARACTER');
			// crestDB[i]['code'] = unique;
			// charLoc[i]['code'] = unique;
			// console.log(crestDB[i]);
			sendAuthAll(crestDB[i]['code'],unique,state);
		}
	}
	else if(state == 'addcharacter'){
		//ищем перса, вдруг уже зареган
		let found = findById(crest.crestDB,info['CharacterID'],'CharacterID');//ищем нужного перса
		//если перс не найден, его нужно добавить в список с кодом, если найден - только исправить код
		if(!found){
			let data = {
				'CharacterID': info['CharacterID'],
				'CharacterName':btoa(info['CharacterName']),
				'refresh_token':token['refresh_token'],
				"access_token": token['access_token'],
				'code': unique
			};
			console.log('ADDING NEW CHARACTER: '+info['CharacterName']);
			crestDB.push(data);	
			let host = 'esi.evetech.net';
			let url = '/v1/characters/'+info['CharacterID']+'/location/?datasource='+currentServer["source"];
			getCharacterData(host,url,token['access_token'], function(err, data,id,name) {
				if (err) {
					console.log(err+'257: Location for: '+id);
				} else {
					let sendData = {
						"CharacterName": btoa(name),
						"CharacterID":id,
						"solar_system_id":data['solar_system_id'],
						"code":unique
					};
					charLoc.push(sendData);
					sendAuthAll(unique,unique,state);
				}
			},info['CharacterID'],info['CharacterName']);				
		}else{
			var i = found[0];
			console.log('503: CHARACTER DATA UPDATED');
			crestDB[i]['code'] = unique;
			charLoc[i]['code'] = unique;
			crestDB[i]['refresh_token'] = token['refresh_token'];
			crestDB[i]['access_token'] = token['access_token'];
			console.log(crestDB[i]);
			sendAuthAll(unique,unique,state);
		}
	}
}

function findById(base,value,type){
	for(let i=0;i<base.length;i++){
	if(value == base[i][type])return [i,base[i]];
	}
}
	

function auth(data,name,callback){
	var authorizationBasic = Buffer.from(currentServer["client"] + ':' + currentServer["secret"]).toString('base64');
	var options = {
		method: 'POST',
		url: 'https://'+currentServer["login"]+'eveonline.com/oauth/token',
		headers: {
			   'Authorization': 'Basic ' + authorizationBasic,
				'Content-Type': 'application/json'
			},
		form : data
	};
	request.post(options, function (error, response, body) {
		if (error || response.statusCode !== 200) {
			callback(error || {statusCode: response.statusCode},name);
		}
		try{
			let json = JSON.parse(body);
				callback(null, name, json);  
		}
		catch(e){
			console.log("428:");
			console.log(e);
			console.log(body);
		}
	});
	//tools.memory();
}

function getCCPdata(u,callback){
	var options = {
		method: 'GET',
		url: u,
		headers: { 
			'Content-Type': 'application/json'
		}
	};	
	request.get(options, function (error, response, body) {
		// console.log("492:"+id);
		if (error || response.statusCode !== 200) {
			console.log('\x1b[31m%s\x1b[0m', "450: ERROR FOR "+response.statusCode+ " "+error);
			// console.log(error);
		}
		callback(null, JSON.parse(body));  
	});
}
function getAjax(u,callback, token){
	var options = {
		type: 'GET',
		url: u,
		crossDomain: true,
		headers: { 
			'Authorization': 'Bearer ' + token
		}
	};	
	request.get(options, function (error, response, body) {
		// console.log("492:"+id);
		if (error || response.statusCode !== 200) {
			console.log('\x1b[31m%s\x1b[0m', "978: ERROR FOR "+response.statusCode+ " "+error);
			callback(null,[]);
			return;
		}
		try{	
			if(body != null)callback(null, JSON.parse(body));				
		}
		catch(e){
			console.log('985:');
			console.log(e);		
		}
	});
}
function getCharacterData(h,u,token,callback,id,name){
	if(!token){console.log('890: TOKEN ERROR = '+id+' = '+name); return null;}
	// console.log('420: '+h+u+', '+token);
	var u1 = h+u;
	var options = {
		method: 'GET',
		url: 'https://'+h+u, 	
		headers: { 
		    'Authorization': 'Bearer ' + token,
			'Content-Type': 'application/json'
		}
	};

	request.get(options, function (error, response, body) {
			// console.log("997:");
			// console.log(body);
		// console.log("492:"+id);
		if (error || (response.statusCode !== 200 && response.statusCode !== 404)) {
			console.log("797: ERROR FOR "+id+" | "+options.url);
			
			// console.log(options.url);
			console.log(crest.charStatus);
			try{
				console.log("802: ERROR"+response.statusCode);
				if(response.statusCode == 304 || response.statusCode == 400 || response.statusCode == 403 || response.statusCode == 502){
					crest.charStatus[id] = 'fail';
					crest.refreshAccess(id);
					return callback(error || ("498 statusCode: "+response.statusCode+", "+response.body),'',id);
				}
			}
			catch(e){
				// console.log(response.body);
				return callback(error || ("498 statusCode: "+response.statusCode+", "+response.body),'',id);
			}
		}
		// console.log("500: OK, bodyresponse recieved for: "+id);
		// console.log(response.body);
		try{			
			
			var tmp0 = JSON.stringify(body);
			var tmp1 = tmp0.replace(/^"/,"");
			var tmp2 = tmp1.replace(/"$/,"");
			var tmp3 = tmp2.replace(/\\/g,"");
			//console.log('1028:'+ tmp3);
			
			
			var tst = JSON.parse(tmp3);			
			callback(null, tst, id, name);  
			
		}
		catch(e){
			console.log('1044:');
			console.log(e);
			console.log('876:'+ JSON.stringify(body));
			console.log(JSON.parse(body),id, name);
		
		}
	});
	// tools.memory();
}		
function putCharacterData(h,u,token,callback,id,data){
	if(!token){console.log('935: TOKEN ERROR'); return null;}
	// console.log('420: '+h+u+', '+token);
	// console.log(data);
	var u1 = h+u;
	var options = {
		method: 'PUT',
		url: 'https://'+h+u, 	
		headers: { 
		    'Authorization': 'Bearer ' + token,
			'Content-Type': 'application/json'
		},
		// form : data,
		json:data
	};

	request.put(options, function (error, response) {
		// console.log("492:"+id);
		if (error || (response.statusCode !== 200 && response.statusCode !== 404 && response.statusCode !== 204)) {
			console.log("709: ERROR FOR "+id);
			console.log(response.statusCode);
			console.log(error);
			try{
				if(response.statusCode == 304 || response.statusCode == 400 || response.statusCode == 403){
					crest.refreshAccess(id);
				}
			}
			catch(e){
				// console.log(response.body);
				return callback(error || ("498 statusCode: "+response.statusCode+", "+response.body),'',id);
			}
		}
	// console.log("500: OK, bodyresponse recieved for: "+id);
	});
	// tools.memory();
}		
function postCharacterData(h,u,token,callback,id,data){
	if(!token){console.log('971: TOKEN ERROR'); return null;}
	var u1 = h+u;
	var options = {
		method: 'POST',
		url: 'https://'+h+u, 	
		headers: { 
		    'Authorization': 'Bearer ' + token,
			'Content-Type': 'application/json'
		},
		json:data
	};
	request.post(options, function (error, response) {
		if (error || (response.statusCode !== 200 && response.statusCode !== 404 && response.statusCode !== 204 && response.statusCode !== 201)) {
			console.log("709: ERROR FOR "+id);
			console.log(response.statusCode);
			console.log(error);
			try{
				if(response.statusCode == 304 || response.statusCode == 400 || response.statusCode == 403){
					crest.refreshAccess(id);
				}
			}
			catch(e){
				return callback(error || ("498 statusCode: "+response.statusCode+", "+response.body),'',id);
			}
		}
	});
}		
console.log('\x1b[32m%s\x1b[0m', '_______________________________________');
console.log('\x1b[32m%s\x1b[0m', '507: Socket.IO running on port:'+currentServer["port"]);

var fs = require('fs');
var json_files = {};
json_files["users"] =  readFsync(path+'/server_files/users'+currentServer["file"]+'.json');
json_files["locals"] = [];

var backup = setInterval(saveFile, 10000);

// console.log("===TEST===");
// Add a connect listener
io.sockets.on('connection', function(socket)
{
	console.log('connection :', socket.request.connection._peername);
	// Disconnect listener
	socket.on('disconnect', function() {
		console.log('Client disconnected.');
	});
	/*****************************************************************
	|=|	пришел запрос на доступ с данными
	******************************************************************/
	socket.on('user_auth', function(data) {
		data = data.replace(/"/g,'');
		console.log('\x1b[34m%s\x1b[0m', '====================');
		console.log('\x1b[34m%s\x1b[0m', '532: USER AUTH CODE:',data);
		console.log('\x1b[34m%s\x1b[0m', '====================');
		// data = JSON.parse(data);
		var crestDB = crest.crestDB;
		// console.log("542: we need id: "+data[i]['CharacterID']);
		var sendData = [];
		for(var i=0;i<crestDB.length;i++){//перебираем персов из данных на соответствие имеющимся
			console.log('635: code = '+crestDB[i].code);
			if(crestDB[i].code == data){			
				console.log("542: FOUND "+atob(crestDB[i]['CharacterName'])+" with code "+data);
				// for(var j=0;j<)
				if(findById(crest.charLoc,crestDB[i]['CharacterID'],'CharacterID')){
					sendData.push(findById(crest.charLoc,crestDB[i]['CharacterID'],'CharacterID')[1]);
				}
			}
		}		
		console.log(sendData);
		if(sendData.length == 0){
			send('', "privat_char_update", sendData,data);
		}else{
			send('', "privat_char_update", sendData,data);
			map1.map1 = tools.correctJS(map1.map1);
			send(socket, "map_connections", {'map':map1.map1,'custom_sys_names':map1.names,'residents':json_files["locals"]},data);
		}
	});
	/*****************************************************************
	|=|		
	******************************************************************/
	// socket.on('residents_request', function(data) {
		// var user = data["user"];
		// var old_j = json_files["locals"];
		// send('', "new_chars_position", old_j,user);
	// });
	// socket.on('residents_update', function() {
		// var old_j = json_files["locals"];
		// send('', "new_chars_position", old_j,"all");
	// });
	/*****************************************************************
	|=|	получил сигнатуры от клиента
	******************************************************************/
	socket.on('sigs_from_client', function(data) {
		console.log('562: ================== sigs_from_client ==========================');
		var dWrite = {"id" : data["id"], "system" : data["system"], "sigs": data["sigs"]};
		var old_sigs = map1.sigs;
			var finded = false;
			for(let i=0; i< old_sigs.length; i++){
				console.log("569: "+old_sigs[i].id);
				if(old_sigs[i].id == data["id"]){
					// console.log("found system");
					finded = true;
					old_sigs[i].sigs = data["sigs"];
				}
			}
			if(finded == false){
				console.log("577: system not found");
				old_sigs[old_sigs.length] = dWrite;
			}
		
			map1.sigs = old_sigs;
	});
	/*****************************************************************
	|=|	
	******************************************************************/
	socket.on('sysname_from_client', function(data) {
		console.log('562: ================== sigs_from_client ==========================');
		var dWrite = {"id" : data["id"], "system" : data["system"], "name": data["name"]};
		var old_names = map1.names;
			var finded = false;
			for(let i=0; i< old_names.length; i++){
				console.log("569: "+old_names[i].id);
				if(old_names[i].id == data["id"]){
					// console.log("found system");
					finded = true;
					old_names[i].name = data["name"];
				}
			}
			if(finded == false){
				console.log("1043: system not found");
				old_names[old_names.length] = dWrite;
			}
		
			map1.names = old_names;
		
			send(socket, "sending_names", {"names":map1.names,"data":data}, 'all');	
	});
	/*****************************************************************
	|=|		запрос на сигнатуры
	******************************************************************/	
	socket.on('sigs_request', function(data) {
		console.log('588: ================== sigs_request ==========================');
		console.log('sigs requested from '+data["user"]+' for system '+data.name+" ("+data.id+")");
		var old_sigs = map1.sigs;
			// console.log(old_sigs);
			// console.log(data.id);
			var sData = '';
			for(let i=0; i< old_sigs.length; i++){
				// console.log(old_sigs[i].id);
				if(old_sigs[i].id == data["id"]){
					console.log("598: Found system with "+old_sigs[i].sigs.length+" sigs");
					sData = old_sigs[i].sigs;
				}
			}		
			send(socket, "sending_sigs", {"sigs":sData,"data":data}, data["user"]);
		// });
	});
	/*****************************************************************
	|=|		
	******************************************************************/	
	socket.on('system_names_request', function(data) {
		console.log('588: ================== system_names_request ==========================');
		console.log('system_names requested from '+data["user"]);
	
		send(socket, "sending_names", {"names":map1.names,"data":data}, data["user"]);		
	});

	// socket.on('new_char_location', function(data) {
		// console.log('recieved new_char_location for: '+data["user"]);
		// var find = false;
		// // readF('users', function(err,old_j){
		// var old_j = json_files["users"];
		// for(var i=0; i<old_j.length; i++){
			// if(old_j[i]["name"] == data["user"]){
				// // console.log('sys old: '+old_j[i]["solar_system_id"]+" sys new: "+data["solar_system_id"]);
				// old_j[i]["solar_system_id"] 		= data["solar_system_id"] || old_j[i]["solar_system_id"];	
				// old_j[i]["ship_type_id"] 	= data["ship_type_id"] || old_j[i]["ship_type_id"];		
				// old_j[i]["ship_name"] 	= data["ship_name"] || old_j[i]["ship_name"];		
				// old_j[i]["ship_item_id"] 		= data["ship_item_id"] || old_j[i]["ship_item_id"];		
				// old_j[i]["loc_time"] 		= data["loc_time"] || old_j[i]["loc_time"];		
				// old_j[i]["last_time"] 		= data["last_time"] || old_j[i]["last_time"];		
				// find = true;		
				// // console.log("char entry found, we choose: "+old_j[i]["solar_system_id"]);
			// }
		// }
		// if(find == false){
			// console.log("creating new entry for a char: "+data["user"]);
			// for(var i=0; i<old_j.length; i++){
				// console.log(old_j[i]["name"]);
			// }
			// var newEntry = {'name'		: data["user"] || '',
							// 'solar_system_id'		: data["solar_system_id"] || '',
							// 'ship_type_id'	: data["ship_type_id"] || '',
							// 'ship_name'	: data["ship_name"] || '',
							// 'loc_time'	: data["loc_time"] || '',
							// 'last_time'	: data["last_time"] || '',
							// 'ship_item_id'	: data["ship_item_id"] || ''};
			// old_j[old_j.length] = newEntry;
		// }
		// // console.log(newEntry);
		// // console.log(old_j);
		// send(socket, "new_chars_position", old_j,"all");
		// if(old_j != "[]"){
			// // writeF(old_j,'users');
			// json_files["users"] = old_j;
			// }else{console.log("empty json from new_char_location");}
		// // });
	// });

	/*****************************************************************
	|=|		возвращение карты по запросу юзера
	******************************************************************/
	socket.on('map_request', function(user) {
		console.log('650: ================== map_request from '+user+' ==========================');
		// readF('map1',function(err,data){		
		// var crestDB = crest.crestDB;
		// for(var i=0; i<crestDB.length;i++){
		
			// if(crestDB[i]['CharacterID'] == user){}
			// var url = 'https://esi.evetech.net/v1/characters/'+charID+'/location/?datasource='+currentServer["source"];
			// getCharacterData(url,token, function(err, data,id) {
				// if (err) {
					// console.log(err+' Location for: '+id);
				// } else {
					// send(socket, "map_connections", {'map':map1.map1,'residents':json_files["locals"]},user);
				// }
			// });
		// }
		// console.log(map1.map1);
		// console.log(tools.correctJS(map1.map1));
		map1.map1 = tools.correctJS(map1.map1);
		send(socket, "map_connections", {'map':map1.map1,'custom_sys_names':map1.names,'residents':json_files["locals"]},user);
		// });
	
	});
	/*****************************************************************
	|=|	
	******************************************************************/	
	socket.on('routes_request', function(user) {
		// readF('map1',function(err,data){		
			send(socket, "routes", map1.map1,user);
		// });
	});
	/*****************************************************************
	|=|		удаление ноды со всеми связями
	******************************************************************/
	socket.on('node_to_del', function(data) {
		console.log('677: ================== node_to_del ==========================');
		// console.log(data);
		var user = data["user"];
		var node = data["node"];
		// readF('map1', function(err,old_j){
		var old_j = map1.map1;
			for(let i=0; i<old_j.length; i++){
				if((old_j[i]["sys1"] == node)||(old_j[i]["sys2"] == node)){
					old_j[i]["alive"] = "0";	
					old_j[i]["deleted"] = data["date"];				
				}		
			}
			send(socket, "new_links_found", old_j,"all");
			if(old_j != "[]"){
				// writeF(old_j,'map1');
				map1.map1 = old_j;
				}else{console.log("693: empty json from node_to_del");}
		// });
	});

	/*****************************************************************
	|=|		восстановить последнюю связь
	******************************************************************/	
	socket.on('restore_last', function(data) {
		console.log('698: ================== restore last ==========================');
		//console.log(data);
		// readF('map1', function(err,old_j){
		var old_j = map1.map1;
			var rest = [];
			var k = 0;
			for(let i=0; i<old_j.length; i++){
				if(old_j[i]["alive"] == "0"){
					//console.log("found connection to restore: "+old_j[i]['sys1']+" -- "+old_j[i]['sys2']);
					rest[k] = old_j[i];
					k++;
				}
			}
			console.log("711:");
			console.log(rest[0]);
			if(rest[0] == null) return;
			rest.sort(tools.compare);
			// console.log(rest);
			var sys1 = rest[0]["sys1"]
			var sys2 = rest[0]["sys2"]
		
			for(let i=0; i<old_j.length; i++){
				if((old_j[i]["alive"] == "0")&&(old_j[i]["sys1"] == sys1)&&(old_j[i]["sys2"] == sys2)){
					old_j[i]["alive"] = "1";
				}
			}
			// console.log(old_j);
			send(socket, "new_links_found", old_j,"all");
			if(old_j != "[]"){
				// writeF(old_j,'map1');
				map1.map1 = old_j;
				}else{console.log("empty json from restore_last");}
		// });
	});
	/*****************************************************************
	|=|		обновить локацию перса при сообщении из фантома
	******************************************************************/	
	socket.on('message_from_phantom', function(data) {
		// var user = data["user"];
		// console.log('message_from_phantom:',data);
		crest.updateCharLocPhantom(data.characterID,data.characterName,data.location,crest.charLoc);
		// send(socket, "map_replot", map1.map1,data);
	});

	/*****************************************************************
	|=|		общее сообщение перерисовать карту
	******************************************************************/
	socket.on('map_redraw', function(data) {
		// var user = data["user"];
		send(socket, "map_replot", map1.map1,data);
	});

	/*****************************************************************
	|=|		новый линк, чтобы перерисовать карту
	|=|		если пустой, то посылается одному
	******************************************************************/
	socket.on('new_link', function(data) {
		if(data['sys1']==''){
			send(socket, "map_replot", map1.map1,data['user']);
			return;
		}
		map1.create_link(data['sys1'],data['sys2'],data['type'],data['user']);
	});
	/*****************************************************************
	|=|		изменение параметров связи
	******************************************************************/
	socket.on('link_edit', function(data) {
		console.log('738: ================== edit link ==========================');
		var user = data["user"];
		var action = data["action"];
		var prop;
		// console.log(data);
		//v = (v ? 0 : 1);
		// readF('map1', function(err,old_j){
			var old_j = map1.map1;
			if(action == "Time"){prop = "tc"}
			if(action == "Mass"){prop = "mc"}
			if(action == "Frig"){prop = "fs"}
		
			for(let i=0; i<old_j.length; i++){
				if(tools.compareSystems(old_j[i],data)){
					if(action == "Delete"){
						//console.log(data["date"]);
						//console.log(old_j[i]["deleted"]);
						old_j[i]["alive"] = "0";
						old_j[i]["deleted"] = data["date"];
					}
						else{console.log("758: The "+prop+" was: "+old_j[i][prop]);
						old_j[i][prop] = (old_j[i][prop] ? 0 : 1);
							console.log("760: Setting "+prop+" to: "+old_j[i][prop]);
					}			
				}
			}
			//console.log(old_j[i]["sys1"],old_j[i]["sys2"]);
			send(socket, "link_edit_from_node", old_j,"all");
			if(old_j != "[]"){
				// writeF(old_j,'map1');
				map1.map1 = old_j;
				}else{console.log("769: empty json from link_edit");}
		// });
	});
});
server.listen(currentServer["port"], () => console.log('\x1b[32m%s\x1b[0m', "Server listening on " + currentServer["port"]));
/*****************************************************************
	отправка сообщений в discord
******************************************************************/
function sendToDiscord(txt,id,inf,that){
	var icon_url = "https://imageserver.eveonline.com/Type/2062_64.png";
	var cl = inf.sysclass;
	var sec = inf.security;
	var data = "";
	if(sec > 0.45){
		that.getDistance(homesystemID,id,function(data1,data2){
			var data = "Дома хайсек <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">";
			hook.send(data);
			return;			
		});
	}else if(sec > 0){
		data = "Дома лоусек <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">";
	// }else if(inf.hubj == '-1' && cl == 'C4'){
		// data = "Новый статик <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">";
	}else if(inf.regionID == '10000070'){
		data = "Дома почвень "+cl+" <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">";//10000070
	}else if(inf.hubj == '-1'){
		data = "Дома новая дыра "+cl+" <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">";
	}else {
		data = "Дома нули <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">";
	}
	if(data != "" ){hook.send(data);return;}
	
}


/*****************************************************************
	отправка сообщений в слак
******************************************************************/
function sendToSlack(data){
	var url = 'https://hooks.slack.com/services/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';//map-bot-

	var options = {
		json: data,
		dataType: 'json',
		processData: false,
		method: 'POST',
		url: url
	};

	request.post(options, function (error, response, body) {
		if (!error && (response.statusCode == 200)) {
			console.log ("812: sendingToSlack ");// + txt);
			}
		else {
			console.log ('\x1b[31m%s\x1b[0m', "815: sendToSlack: error, code == " + response.statusCode + ", " + response.body + ".\n");
		}  
	});
}
function slackMessage(txt,id,inf,that){
	var icon_url = "https://imageserver.eveonline.com/Type/2062_64.png";
		var cl = inf.sysclass;
		var sec = inf.security;
		var data = {};
		if(sec > 0.45){
			var data = {
				"icon_url": icon_url,
				"text": "Дома хайсек <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">"
			};
		}else if(sec > 0){
			data = {
				"icon_url": icon_url,
				"text": "Дома лоусек <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">"
			};		
		}else if(inf.hubj == '-1' && cl == 'C4'){
			data = {
				"icon_url": icon_url,
				"text": "Новый статик <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">"
			};
		}else if(inf.hubj == '-1'){
			data = {
				"icon_url": icon_url,
				"text": "Дома входяшка "+cl+" <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">"
			};
		}else {
			data = {
				"icon_url": icon_url,
				"text": "Дома нули <https://zkillboard.com/system/"+id+"|"+inf.solarSystemName+">"
			};
		}
		if(data){sendToSlack(data);return;}
		
		// {
		// "text": "<https://alert-system.com/alerts/1234|Click here> for details!"
	// }
}

/*****************************************************************
	вспомогательные функции будут здесь
******************************************************************/
function webhooksSend(txt,id,inf,that){	
	//Slack:
	slackMessage(txt,id,inf,that);
	//Discord:
	hook.send(txt);
}
/*****************************************************************
	вспомогательные функции будут здесь
******************************************************************/
function btoa(b){
	if(!b){console.log('\x1b[31m%s\x1b[0m', "1366: btoa error"); return '';}
	else{return btoa_func(b);}
}
function atob(b){
	if(!b){console.log('\x1b[31m%s\x1b[0m', "1390: atob error"); return '';}
	else{return atob_func(b);}
}

/*****************************************************************
	отправка клиенту
******************************************************************/
function send(socket, type, message,user){
	io.emit(type, [message,user]);
	console.log("783: <<<<<<<<<<   message of '"+type+"' sent  >>>>>>>>>>>>>>>>");
}

/*****************************************************************
	работа с файлами сохраняем обработанный кеш для креста, локации персов и карты
******************************************************************/
function saveFile(){
	// console.log("===================================|\n| SAVING STARTED AT: "+tools.msToTime(new Date().getTime(),'sec')+"  GMT |");
	// console.log("\n");

	var fileSize = function(file) {
		const stats = fs.statSync(path+'/server_files/'+file+currentServer["file"]+'.json')
		const fileSizeInBytes = stats.size
		return fileSizeInBytes
	};
	var addLength = function(str,len,ch){
		str = str.toString();
		var i = str.length;
		// console.log(i);
		for(let j=i;j<len;j++){
			str = ch+str;
			// console.log(str);
		}
		return str;
	};
	// console.log(crest.crestDB);
	writeF(crest.crestDB,"crestDB",function(){
			var size = fileSize("crestDB");
			// console.log("| ["+addLength(crest.crestDB,8,' ')+"]   --- "+addLength(size,10,'-')+" bytes  |");
		});
	writeF(crest.charLoc,"charLoc",function(){
			var size = fileSize("charLoc");
			// console.log("| ["+addLength(file,8,' ')+"]   --- "+addLength(size,10,'-')+" bytes  |");
		});
	writeF(map1.sigs,"sigs",function(){
			var size = fileSize("sigs");
			// console.log("| ["+addLength(file,8,' ')+"]   --- "+addLength(size,10,'-')+" bytes  |");
		});
	writeF(map1.names,"names",function(){
			var size = fileSize("names");
			// console.log("| ["+addLength(file,8,' ')+"]   --- "+addLength(size,10,'-')+" bytes  |");
		});
	writeF(map1.map1,"map1",function(){
			var size = fileSize("map1");
			// console.log("| ["+addLength(file,8,' ')+"]   --- "+addLength(size,10,'-')+" bytes  |");
		});
	// for(var file in json_files) {
	// console.log(file);
		// writeF(json_files[file],file,function(){
			// var size = fileSize(file);
			// // console.log("| ["+addLength(file,8,' ')+"]   --- "+addLength(size,10,'-')+" bytes  |");
		// });
	// }
}
function writeF(json,file,callback){

	fs = require('fs');
	if(json != "[]"){
		try {
			var test = JSON.parse(JSON.stringify(json));
			// fs.writeFile(path+file+currentServer["file"]+'.json', JSON.stringify(json,null,'\t'), function (err) {
			fs.writeFile(path+'/server_files/'+file+currentServer["file"]+'.json', JSON.stringify(json,null,'\t'), function (err) {
			//fs.writeFile(path+'/server_files/'+file+currentServer["file"]+'.json', '[]', function (err) {
				if (err) return console.log(err);
				// var size = fileSize(file);
				callback();				
			});
		}
		catch (e) {
	console.log("825:");
			console.log(e);			
		}
	}
}
function readFsync(file){
	var json = [];
	// console.log(path+'/server_files/'+file+currentServer["file"]+'.json');
	try{
		json_tst = JSON.parse(fs.readFileSync(file, 'utf8'));
		json = json_tst;
	}
	catch(e){
		console.log('819: creating new file:' +file);
		fs.writeFile(file, "[]", function (err2) {
			if (err2) return console.log(err2);
			// console.log('824: Saved');			
		});
		return [];
	}
	return json;
}
function readF(file, callback, var1, var2){
	// console.log("840:\n"+file);
	// console.log('1389');
	// console.log(var_to_back);
	fs = require('fs');
	var json;
	var readData;
	
	var fileSize = function(file) {
		const stats = fs.statSync(path+'/server_files/'+file+currentServer["file"]+'.json')
		const fileSizeInBytes = stats.size
		return fileSizeInBytes
	};
	// fs.readFile(path+file+currentServer["file"]+'.json', 'utf8', function(err, data) {
	fs.readFile(path+'/server_files/'+file+currentServer["file"]+'.json', 'utf8', function(err, data) {
		try{		
			var size = fileSize(file);	
			// console.log("842: "+var1);	
			var rdata = JSON.parse(data);
			callback(err,rdata,size,var1,var2);
		}
		catch(e){
			console.log('\x1b[31m%s\x1b[0m', "853: ===ERROR WHILE READING FILE===creating new file\n"+e);
			// console.log(e);
			fs.open(path+'/server_files/'+file+currentServer["file"]+'.json', 'w', function (err1, f) {
			// console.log(f);
				if (err1) throw err1;
				fs.writeFile(f, "[]", function (err2) {
					if (err2) return console.log(err2);
					// console.log('Saved!');
					var rdata = [];
					callback(err2,rdata,2,var1,var2);				
				});
			});
		}
	});
	
}
