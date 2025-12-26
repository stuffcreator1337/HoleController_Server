var busy = false;
const path1 = './';

var crest,map1,charFleet;

const http = require('http');
// const https = require('https');
const btoa_func = require('btoa');
const atob_func = require('atob');
// var io = require('socket.io');
const request = require('request');
// const querystring = require('querystring');
var fs = require('fs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// const path = 'D:/totalz_github/map_30.08.2020/db_parser';
const path = require("path");
const universalPath = path.join(__dirname);
// const path = 'E:/nodejs/db_parser';

const currentStage = 0;



/*****************************************************************
  "name": "Class 1 Magnetar Effects",
  "graphic_id": 1217,
  "group_id": 920,
  "type_id": 30847,
******************************************************************/


var stage2 = 0;

const kSpaceLastSystem = 0;
var mapofeden = {};
var nIntervId;


getsystems();

// var skip_stage_1 = false;
var skip_stage_2 = false;
var skip_stage_3 = false;
var skip_stage_4 = false;
var skip_stage_5 = false;
var skip_stage_6 = false;
var skip_stage_7 = false;


/*****************************************************************
	1. Get all the systems
******************************************************************/
function getsystems(){
	console.log('\x1b[32m%s\x1b[0m', '...checking stage 1');
	let url1 = 'https://esi.evetech.net/latest/universe/systems/?datasource=tranquility';
	getCCPdata(url1,false,function(e,response1){
		if(e){console.log('\x1b[31m%s\x1b[0m', '37: error'); return;}
		writeF(response1,"systems",function(){		
			console.log('\x1b[32m%s\x1b[0m', 'Stage 1 success:'+response1.length);
			
			mapofeden = require(path1+'/db/mapofeden');	
			stage2 = Object.keys(mapofeden).length;
			console.log('\x1b[32m%s\x1b[0m', 'Starting from number:'+stage2);
			console.log('\x1b[32m%s\x1b[0m', '...checking stage 2');
			getsysinf(response1);
		});
	});
}
/*****************************************************************
	2. Fetch data for all the systems
******************************************************************/
function getsysinf(systems){
	if(skip_stage_2 == true){filldisthubjadrh();return;};
	if(stage2>=systems.length || stage2<0){filldisthubjadrh();return;}
	var syst = systems[stage2];		
	
	var url1 = 'https://esi.evetech.net/latest/universe/systems/'+syst+'/?datasource=tranquility&language=en';	
	getCCPdata(url1,false,function(e,response1){
		if(e){console.log('\x1b[31m%s\x1b[0m', '79: error: '+e); getsysinf(systems); return;}		
		var url2 = 'https://esi.evetech.net/latest/universe/constellations/'+response1.constellation_id+'/?datasource=tranquility&language=en';	
		getCCPdata(url2,false,function(e,response2){
			if(e){console.log('\x1b[31m%s\x1b[0m', '82: error: '+e); getsysinf(systems); return;}
			var sysclass = [0,0];
			switch(response2.region_id) {
				case 10000070:																														sysclass[0] = "Pochven";	sysclass[1] = "#660000";	break;
				case 11000001:case 11000002:case 11000003:																							sysclass[0] = "C1";			sysclass[1] = "#00FF00";	break;
				case 11000004:case 11000005:case 11000006:case 11000007:case 11000008:																sysclass[0] = "C2";			sysclass[1] = "#33CC00";	break;
				case 11000009:case 11000010:case 11000011:case 11000012:case 11000013:case 11000014:case 11000015:									sysclass[0] = "C3";			sysclass[1] = "#55BB00";	break;
				case 11000016:case 11000017:case 11000018:case 11000019:case 11000020:case 11000021:case 11000022:case 11000023:					sysclass[0] = "C4";			sysclass[1] = "#BB5500";	break;
				case 11000024:case 11000025:case 11000026:case 11000027:case 11000028:case 11000029:												sysclass[0] = "C5";			sysclass[1] = "#CC2200";	break;
				case 11000030:																														sysclass[0] = "C6";			sysclass[1] = "#CC0000";	break;
				case 11000031:																														sysclass[0] = "Null";		sysclass[1] = "#6633CC";	break;
				case 11000032:																														sysclass[0] = "C13";		sysclass[1] = "#CC6699";	break;
				case 11000033:																														sysclass[0] = "C14";		sysclass[1] = "#999966";	break;
				case 12000001:case 12000002:case 12000003:case 12000004:case 12000005:																sysclass[0] = "Abyss";		sysclass[1] = "#996633";	break;					
				default: sysclass=getsysclass(response1.security_status);
			}
			mapofeden[syst] = {"regionID" : response2.region_id.toString(), 
				"constellationID" : response1.constellation_id.toString(), 
				"solarSystemName" : response1.name.toString(), 
				"security": response1.security_status.toString(),
				"radius" : "0",
				"hubj" : "-1",
				"huba" : "-1",
				"hubd" : "-1",
				"hubr" : "-1",
				"hubh" : "-1",
				"sysclass" : sysclass[0],
				"color" : sysclass[1]	
			};
			stage2=stage2+1;	
			
			if(stage2>=systems.length && stage2>0){
				console.log('\x1b[32m%s\x1b[0m', 'Stage 2 in progress:'+stage2 +" of "+ systems.length+" for "+syst);	
				console.log('\x1b[32m%s\x1b[0m', 'writing');
				writeF(mapofeden,"mapofeden",function(){		
					console.log('\x1b[32m%s\x1b[0m', 'Stage 2 success');
					stage2=-stage2;
					filldisthubjadrh();
					return;
				});
			}else{
				if(stage2%20==0){
					writeF(mapofeden,"mapofeden",function(){		
						console.log('\x1b[32m%s\x1b[0m', 'Stage 2 in progress:'+stage2 +" of "+ systems.length+" for "+syst+": SAVED");	
					});
				}else{
					console.log('\x1b[32m%s\x1b[0m', 'Stage 2 in progress:'+stage2 +" of "+ systems.length+" for "+syst);	
				}
				getsysinf(systems);
			}			
		});	
	});	
}
function getSystemClass(sys) {
	const id = Number(sys.system_id);

	// Pochven (Triglavian Systems)
	if (id >= 33000001 && id <= 33003000) {
		return "Pochven";
	}

	// Thera (Особая вормхольная система)
	if (id === 31001497) {
		return "Thera";
	}

	// Abyssal Space
	if (id >= 32000001 && id <= 32000200) {
		return "Abyss";
	}

	// Wormhole (C1–C6) Space
	if (id >= 31000001 && id <= 31002533) {
		if (sys.name.startsWith("J")) {
			return `C${id - 31000000}`;
		}
	}

	// High Sec
	if (sys.security >= 0.45) return "High";
	// Low Sec
	if (sys.security > 0) return "Low";
	// Null Sec
	return "Null";
}
function getsysclass(secstatus){
	if(secstatus>0.45){return ["High","#00CCFF"];}
	else if(secstatus>0){return ["Low","#FFFF00"];}
	else{return ["Null","#6633CC"];}
	return [0,0];
}
/*****************************************************************
	3. Get distances to most hubs
******************************************************************/
function filldisthubjadrh(){
	console.log('\x1b[32m%s\x1b[0m', '...checking stage 3');
	var dbfulleden = require(path1+'/db/mapofeden');	
	if(skip_stage_3 == true){fillsysnamestable(dbfulleden);return;};
	var hubID = 30000142; var type = "J";
	//console.log("kSpaceLastSystem", kSpaceLastSystem);
	//console.log("data", dbfulleden[kSpaceLastSystem]);
	if(dbfulleden[kSpaceLastSystem].hubj != "-1"){hubID = 30000142; type = "A";}
	if(dbfulleden[kSpaceLastSystem].huba != "-1"){hubID = 30002187; type = "D";}
	if(dbfulleden[kSpaceLastSystem].hubd != "-1"){hubID = 30002659; type = "R";}
	if(dbfulleden[kSpaceLastSystem].hubr != "-1"){hubID = 30002510; type = "H";}
	if(dbfulleden[kSpaceLastSystem].hubh != "-1"){
		fillsysnamestable(dbfulleden);return;		
	}

	stage2 = 0;// <<-- set this to the last saved checkpoint
	fillhubdist(dbfulleden,hubID,type);
}
function fillhubdist(dbfulleden, hubID, type){

	if(stage2>=Object.keys(dbfulleden).length)return;
	var syst = Object.keys(dbfulleden)[stage2];		
	
	var url3 = 'https://esi.evetech.net/latest/route/'+syst+'/'+hubID+'/?datasource=tranquility&flag=shortest';	
	getCCPdata(url3,404,function(e,response1){
		if(e){console.log('\x1b[31m%s\x1b[0m', '159: error:' +e); fillhubdist(dbfulleden, hubID, type);return;}	
		if(type=="J"){dbfulleden[syst].hubj = response1.length?response1.length.toString():"-1";}
		if(type=="A"){dbfulleden[syst].huba = response1.length?response1.length.toString():"-1";}
		if(type=="D"){dbfulleden[syst].hubd = response1.length?response1.length.toString():"-1";}
		if(type=="R"){dbfulleden[syst].hubr = response1.length?response1.length.toString():"-1";}
		if(type=="H"){dbfulleden[syst].hubh = response1.length?response1.length.toString():"-1";}		
		stage2=stage2+1;	
		if(stage2>=Object.keys(dbfulleden).length){
			console.log('\x1b[32m%s\x1b[0m', 'writing');
			writeF(dbfulleden,"mapofeden",function(){		
				console.log('\x1b[32m%s\x1b[0m', 'Stage '+type+' success');
			});
			
		}else{
			if(stage2%20==0){
				writeF(mapofeden,"mapofeden",function(){		
					console.log('\x1b[32m%s\x1b[0m', 'Stage '+type+' in progress:'+stage2 +" of "+ Object.keys(dbfulleden).length+" for "+syst+": SAVED");	
				});
			}else{
				console.log('\x1b[32m%s\x1b[0m', 'Stage '+type+' in progress:'+stage2+" of "+ Object.keys(dbfulleden).length+ " for "+syst);	
			}
			fillhubdist(dbfulleden, hubID, type);
		}
		
	});
}
/*****************************************************************
	4. Creating sysnames
******************************************************************/
function fillsysnamestable(dbfulleden){
	if(skip_stage_4 == true){parsesystemjumps();return;};
	console.log('\x1b[32m%s\x1b[0m', '...checking stage 4');
	var i=0;
	var listparsed = JSON.parse(JSON.stringify(dbfulleden));
	// console.log(Object.keys(dbfulleden)[Object.keys(dbfulleden).length-1]);
	readF('sysnames',function(err,db_file,size,json,that){
		var namestable = db_file;
		if(Object.keys(namestable).length==Object.keys(dbfulleden).length){
			console.log('\x1b[32m%s\x1b[0m', 'Stage 4 success, file already full');
			parsesystemjumps();
			return;
		}
		for(i=0;i<Object.keys(dbfulleden).length;i++){
			var syst = Object.keys(dbfulleden)[i];	
			var name = listparsed[syst];	
			namestable[name.solarSystemName] = {"solarSystemID" : parseInt(syst)};	
			console.log('\x1b[32m%s\x1b[0m', 'Stage 4 in progress:'+i+" of "+ Object.keys(dbfulleden).length+ " for "+name.solarSystemName);
		// i=i+1000;
		}
		writeF(namestable,"sysnames",function(){		
			console.log('\x1b[32m%s\x1b[0m', 'Stage 4 success');
			parsesystemjumps();
			return;
		});
	});	
}
/*****************************************************************
	5. Parsing connections and systemjumps
******************************************************************/
function parsesystemjumps(){
	if(skip_stage_5 == true){parseWormholeTypes();return;};
	console.log('\x1b[32m%s\x1b[0m', '...checking stage 5');		
	// readF('jumps',function(err,db_file,size,json,that){
		var request = new XMLHttpRequest();
		request.open('GET', 'https://www.fuzzwork.co.uk/dump/latest/mapSolarSystemJumps.csv', true);
		request.send(null);
		request.onreadystatechange = function () {
			if (request.readyState === 4 && request.status === 200) {
				var type = request.getResponseHeader('Content-Type');
				if (type.indexOf("text") !== 1) {
					var smg = request.responseText.replace(/,10[0-9]{6}/g,"]");
					 smg = smg.replace(/10[0-9]{6},/g,"[");
					var messages = smg.split('\n');
					messages.shift();
					
					var jumps = {};
					// parsejumpsarr(jumps,messages);
					parseWormholeTypes();
					return ;
				}
			}
		}
		
	// });	
}
function parsejumpsarr(jumps,messages){
	for(var i=0; i<messages.length;i++){
		if(messages[i].length){		
			var m1 = JSON.parse(messages[i]);
			var sys1 = m1[1];
			var sys2 = m1[2];
			if(typeof(jumps[sys1]) == 'undefined'){jumps[sys1] = {};};
			jumps[sys1][sys2] = sys2.toString();
			console.log('\x1b[32m%s\x1b[0m', 'Stage 5 in progress:'+i+" of "+ messages.length+ " for "+sys1);
		}
	}
	writeF(jumps,"jumps",function(){		
		console.log('\x1b[32m%s\x1b[0m', 'Stage 5 success');
		return;
	});	
}
/*****************************************************************
	6. Getting wormholes
******************************************************************/
function parseWormholeTypes(){		
	var url6 = 'https://esi.evetech.net/latest/universe/groups/988/?datasource=tranquility&language=en';
	getCCPdata(url6,false,function(e,response6){	
		readF('wh_holes',function(err,db_file,size,json,that){

			var whs = response6.types;
			var holes = {};
			console.log('\x1b[32m%s\x1b[0m', '...checking stage 6');	

			if(Object.keys(db_file).length==whs.length){
				console.log('\x1b[32m%s\x1b[0m', 'Stage 6 success, file already full');
				return;
			}
			parseWhItem(whs,0,holes);

			return;
		});
	});
}
function parseWhItem(whs,i,holes){
	var url6_1 = 'https://esi.evetech.net/latest/universe/types/'+whs[i]+'/?datasource=tranquility&language=en';
	getCCPdata(url6_1,false,function(e,response61){
		i=i+1;
		if(i>=whs.length){
			
			writeF(holes,"wh_holes",function(){		
				console.log('\x1b[32m%s\x1b[0m', 'Stage 6 success');
				return;
			});	
			return
		};
		if(typeof(response61.dogma_attributes) != 'undefined'){
			var nm = response61.name.replace(/Wormhole /,"");
			holes[nm] = {};
			holes[nm]["from"] = "";
			holes[nm]["to"] = response61.dogma_attributes[3].value;
			holes[nm]["time"] = response61.dogma_attributes[4].value;
			holes[nm]["mass"] = response61.dogma_attributes[5].value;
			holes[nm]["regen"] = response61.dogma_attributes[6].value;
			holes[nm]["jumpmass"] = response61.dogma_attributes[7].value;			
			console.log(response61.type_id,response61.name,
		"to: "+response61.dogma_attributes[3].value,
		"time: "+response61.dogma_attributes[4].value,
		"mass: "+response61.dogma_attributes[5].value,
		"regen: "+response61.dogma_attributes[6].value,
		"jumpmass: "+response61.dogma_attributes[7].value,
		"distibution: "+response61.dogma_attributes[8].value
		);}
		else {
			var nm = response61.name.replace(/Wormhole /,"");
			holes[nm] = {};
			holes[nm]["from"] = "";
			holes[nm]["to"] = "";
			holes[nm]["time"] = "";
			holes[nm]["mass"] = "";
			holes[nm]["regen"] = "";
			holes[nm]["jumpmass"] = "";
			console.log(response61.type_id,response61.name);
		}
		parseWhItem(whs,i,holes);
	});
}
/*****************************************************************
	функции для работы ESI
******************************************************************/
async function getCCPdata(u,ignore,callback){
	var options = {
		method: 'GET',
		url: u,
		headers: { 
			'Content-Type': 'application/json'
		}
	};	
	request.get(options, function (error, response, body) {
		// console.log("492:");
		if ((error || response.statusCode !== 200)&&(response.statusCode!=ignore)) {
			console.log('\x1b[31m%s\x1b[0m', "450: ERROR FOR code:");
			console.log('\x1b[31m%s\x1b[0m', response.statusCode);
			console.log(error);
			callback(response.statusCode, JSON.parse(body)); 
			return;
		}
		callback(null, JSON.parse(body));  
	});
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
	работа с файлами сохраняем обработанный кеш для креста, локации персов и карты
******************************************************************/
function writeF(json, file, callback) {
    if (json != "[]") {
        try {
            var test = JSON.parse(JSON.stringify(json));
            
            // Используем path.join для кроссплатформенного пути
            const filePath = path.join(__dirname, 'db', `${file}.json`);
            
            // Записываем файл по пути
            fs.writeFile(filePath, JSON.stringify(json, null, '\t'), function (err) {
                if (err) return console.log(err);
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
	// console.log(path+'/db/'+file+currentServer["file"]+'.json');
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
	fs = require('fs');
	var json;
	var readData;
	
	var fileSize = function(file) {
		const stats = fs.statSync(path1+'/db/'+file+'.json')
		const fileSizeInBytes = stats.size
		return fileSizeInBytes
	};
	fs.readFile(path1+'/db/'+file+'.json', 'utf8', function(err, data) {
		try{		
			var size = fileSize(file);	
			var rdata = JSON.parse(data);
			callback(err,rdata,size,var1,var2);
		}
		catch(e){
			console.log('\x1b[31m%s\x1b[0m', "853: ===ERROR WHILE READING FILE===creating new file\n"+e);
			fs.open(path1+'/db/'+file+'.json', 'w', function (err1, f) {
				if (err1) throw err1;
				fs.writeFile(f, "{}", function (err2) {
					if (err2) return console.log(err2);
					var rdata = {};
					callback(err2,rdata,2,var1,var2);				
				});
			});
		}
	});
	
}
