module.exports = {
	foo: function () {
	// whatever
	},	
	compare: function(a,b) {
		if (a.deleted > b.deleted)
			return -1;
		if (a.deleted < b.deleted)
			return 1;
		return 0;
	},
	Log: function(er,file){	
		fs = require('fs');	
			// fs.writeFile(path+file+'.log', er+'\n', function (err) {
			fs.writeFile(path+file+'.log', er+'\n', function (err) {
				if (err) return console.log(err);
				console.log('>>>>>>>>>>>>>>>  Log saved  <<<<<<<<<<<<<<<<<<<<<<');
			});	
	},
	compareSystems: function (obj,data){
		if(obj["sys1"] == data["sys1"]){
			if(obj["sys2"] == data["sys2"]){
				return true;
			}
		}
		if(obj["sys2"] == data["sys1"]){
			if(obj["sys1"] == data["sys2"]){
				return true;
			}
		}	
	},
	kspaceConnected: function(sys1,sys2){
		var found = false;
		for(var sys3 in sys1){
			if(sys2[sys3]!= null){found = true}
		}
		return found;
	},
	msToTime: function(duration,opt) {
			var milliseconds = parseInt((duration%1000)/100)
				, seconds = parseInt((duration/1000)%60)
				, minutes = parseInt((duration/(1000*60))%60)
				, hours = parseInt((duration/(1000*60*60))%24)
				, days = parseInt((duration/(1000*60*60*24))%365);

			hours = (hours < 10) ? "0" + hours : hours;
			minutes = (minutes < 10) ? "0" + minutes : minutes;
			seconds = (seconds < 10) ? "0" + seconds : seconds;

			// return days + ":" +hours + ":" + minutes + ":" + seconds + "." + milliseconds;
			if(opt == 'sec'){return hours + ":" + minutes + ":" + seconds;}else{
			// return hours + ":" + minutes + ":" + seconds;
			return hours + ":" + minutes;}
	},
	clone: function(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	},
	memory: function (){
		const used = process.memoryUsage().heapUsed / 1024 / 1024;
		console.log(`189: memory used: ${Math.round(used * 100) / 100} MB`);
	},	
	isWh: function (systems,id){
		// if(typeof map1 === 'undefined')return;
	// console.log(map1.systems[id]);
		var currentSys = systems[id];
		if((currentSys["class5"]!="High")&&(currentSys["class5"]!="Low")&&(currentSys["class5"]!="Null")){
		return true;}
		else {return false;}
	},
	create_link: function (new_id,old_id,type){
		if(type == 'labelline'){
			// getDistance(new_id,old_id,function(data1,data2){
				// var CurrentUser = $jit.id('CurrentUser-active').innerHTML; 
				// var openDate = new Date();
				// var jsonReady = {
					// "sys1" : ""+new_id+"",
					// "sys2" : ""+old_id+"",
					// "date" : ""+openDate.getTime()+"",
					// "status" : "0", 
					// "founder" : "", 
					// "alive" : "1",
					// "deleted" : "",
					// "type" : type,
					// "labelCenter" : data2.length+" ("+data1.length+") jumps"
					// };
				// // socket.emit('new_link', {'user':CurrentUser, 'link': jsonReady});	
			// });	
		}
		else
		{
			// var CurrentUser = $jit.id('CurrentUser-active').innerHTML; 
			var openDate = new Date();
			var jsonReady = {
				"sys1" : ""+new_id+"",
				"sys2" : ""+old_id+"",
				"date" : ""+openDate.getTime()+"",
				"status" : "0", 
				"founder" : "", 
				"alive" : "1",
				"deleted" : "",
				"type" : type
				};
			socket.emit('new_link', {'user':'testUser', 'link': jsonReady});
		}
	},
	getDistance: function(id1,id2,callback){
	// if(isWh(id1) || isWh(id2)) return "no way";
		// var url1 = 'https://esi.tech.ccp.is/latest/route/'+id1+'/'+id2+'/?datasource=tranquility&flag=shortest';
		// var url2 = 'https://esi.tech.ccp.is/latest/route/'+id1+'/'+id2+'/?datasource=tranquility&flag=secure';
		// $.when(getAjax(url1)).done(function(data1){
			// $.when(getAjax(url2)).done(function(data2){
				// callback(data1,data2);
			// });
		// });

	},
	correctJS: function(json){
		var del = [];
		for(var i=0; i<json.length;i++){
			if((json[i].sys1 == 'undefined')||(json[i].sys2 == 'undefined')){
				del.push(i);
			}
		}
		del.sort(function(a, b){return b-a});
		for(var j=0;j<del.length;j++){
			json.splice(del[j],1);
		}
		// console.log(del);
		return json;
	}
};