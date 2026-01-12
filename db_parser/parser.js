let busy = false;
const path1 = './';

let crest, map1, charFleet;

const http = require('http');
const axios = require('axios');
const request = require('request');
const fs = require('fs').promises;
const fsSync = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const path = require("path");
const universalPath = path.join(__dirname);

const currentStage = 0;

let filled_info = 0;
let kSpaceLastSystem = 0;
let mapofeden = {};
let nIntervId;

var result1 = [];
var result2 = 0;
var result3 = 0;
var result4 = 0;
var result5 = 0;
var result6 = 0;
var result7 = 0;
var result8 = 0;

// Запуск основной функции
(async () => {
    try {
        // 1. Get all the systems
        result1 = await getsystems();

        // 2. Fetch data for all the systems
        if (result1 != []) {
            mapofeden = await readFsync('mapofeden');
            filled_info = Object.keys(mapofeden).length;

            console.log('\x1b[32m%s\x1b[0m', 'Starting from number:' + filled_info);
            console.log('\x1b[32m%s\x1b[0m', '...checking stage 2');

            result2 = await getsysinf(result1);
        }

        // 3. Get distances to most hubs
        if (result2 != 0) {
           result3 = await filldisthubjadrh();
        }

    } catch (error) {
        console.error('Ошибка в основном потоке:', error);
    }
})();

let skip_stage_1 = false;
let skip_stage_2 = false;
let skip_stage_3 = false;
let skip_stage_4 = false;
let skip_stage_5 = false;
let skip_stage_6 = false;
let skip_stage_7 = false;

/*****************************************************************
    1. Get all the systems
******************************************************************/
async function getsystems() {
    console.log('\x1b[32m%s\x1b[0m', '...checking stage 1');

    try {
        const url1 = 'https://esi.evetech.net/latest/universe/systems/?datasource=tranquility';
        const response1 = await getCCPdata(url1, false);

        await writeF(response1.data, "systems");
        console.log('\x1b[32m%s\x1b[0m', 'Stage 1 success:' + response1.data.length);
        return response1.data;
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Stage 1 error:', error);
        return [];
    }
}

/*****************************************************************
    2. Fetch data for all the systems
******************************************************************/
async function getsysinf(systems) {
    if (skip_stage_2) {
        return 1;
    }

    if (filled_info >= systems.length || filled_info < 0) {
        return 1;
    }

    try {
        while (filled_info < systems.length) {
            const syst = systems[filled_info];

            const url1 = `https://esi.evetech.net/latest/universe/systems/${syst}/?datasource=tranquility&language=en`;
            const res1 = await getCCPdata(url1, false);
            const response1 = res1.data;

            const url2 = `https://esi.evetech.net/latest/universe/constellations/${response1.constellation_id}/?datasource=tranquility&language=en`;
            const res2 = await getCCPdata(url2, false);
            const response2 = res2.data;

            const sysclass = getsysclassByRegion(response2.region_id, syst, response1.security_status);

            mapofeden[syst] = {
                "regionID": response2.region_id.toString(),
                "constellationID": response1.constellation_id.toString(),
                "solarSystemName": response1.name.toString(),
                "security": response1.security_status.toString(),
                "radius": "0",
                "short_j": "-1",
                "short_a": "-1",
                "short_d": "-1",
                "short_r": "-1",
                "short_h": "-1",
                "secur_j": "-1",
                "secur_a": "-1",
                "secur_d": "-1",
                "secur_r": "-1",
                "secur_h": "-1",
                "sysclass": sysclass[0],
                "color": "data.color_",
                "color_org": sysclass[1]
            };

            filled_info++;

            if (filled_info % 20 === 0 || filled_info >= systems.length) {
                await writeF(mapofeden, "mapofeden");
                console.log('\x1b[32m%s\x1b[0m', `Stage 2 in progress:${filled_info} of ${systems.length} for ${syst}: SAVED`);
            } else {
                console.log('\x1b[32m%s\x1b[0m', `Stage 2 in progress:${filled_info} of ${systems.length} for ${syst}`);
            }
        }

        console.log('\x1b[32m%s\x1b[0m', 'Stage 2 success');
        return 1;

    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Stage 2 error:', error);
        return 0;
    }
}

function getsysclassByRegion(regionId, systemId, securityStatus) {
    switch (regionId) {
        case 10000004:
        case 10000017:
        case 10000019:
            return ["Jove", "#004D00"];
        case 10000070:
            return ["Pochven", "#660000"];
        case 11000001:
        case 11000002:
        case 11000003:
            return ["C1", "#00FF00"];
        case 11000004:
        case 11000005:
        case 11000006:
        case 11000007:
        case 11000008:
            return ["C2", "#33CC00"];
        case 11000009:
        case 11000010:
        case 11000011:
        case 11000012:
        case 11000013:
        case 11000014:
        case 11000015:
            return ["C3", "#55BB00"];
        case 11000016:
        case 11000017:
        case 11000018:
        case 11000019:
        case 11000020:
        case 11000021:
        case 11000022:
        case 11000023:
            return ["C4", "#BB5500"];
        case 11000024:
        case 11000025:
        case 11000026:
        case 11000027:
        case 11000028:
        case 11000029:
            return ["C5", "#CC2200"];
        case 11000030:
            return ["C6", "#CC0000"];
        case 11000031:
            return ["Thera", "#660033"];
        case 11000032:
            return ["C13", "#CC6699"];
        case 11000033:
            if (systemId === 31000001) return ["C14", "#999966"];
            if (systemId === 31000002) return ["C15", "#999966"];
            if (systemId === 31000003) return ["C16", "#999966"];
            if (systemId === 31000004) return ["C17", "#999966"];
            if (systemId === 31000006) return ["C18", "#999966"];
            break;
        case 12000001:
        case 12000002:
        case 12000003:
        case 12000004:
        case 12000005:
            return ["Abyss", "#996633"];
        case 14000001:
        case 14000002:
        case 14000003:
        case 14000004:
        case 14000005:
            return ["C19", "#CC99FF"];
        case 19000001:
            return ["GPMR", "#F2E6FF"];
        default:
            return getsysclass(securityStatus);
    }

    return getsysclass(securityStatus);
}

function getsysclass(secstatus) {
    if (secstatus > 0.45) return ["High", "#00CCFF"];
    else if (secstatus > 0) return ["Low", "#FFFF00"];
    else return ["Null", "#6633CC"];
}

/*****************************************************************
    3. Get distances to most hubs
******************************************************************/
async function filldisthubjadrh() {
    console.log('\x1b[32m%s\x1b[0m', '...checking stage 3');

    const dbfulleden = await readFsync('mapofeden');

    if (skip_stage_3) {
        await fillsysnamestable(dbfulleden);
        return;
    }

    if (kSpaceLastSystem === 0) {
        var firstKey = Object.keys(dbfulleden)[0];
        try {
            const loadedprogress = await readFsync('progress');
            if (loadedprogress.system) {
                console.log('\x1b[32m%s\x1b[0m', 'Loaded saved file, starting from:' + loadedprogress.system);
                firstKey = loadedprogress.system;
            } 
        }
        catch (e) {
            console.log('\x1b[31m%s\x1b[0m', `Error loading progress file: ${e}`);
        }
        console.log('\x1b[32m%s\x1b[0m', 'no saved system, starting from ' + firstKey);
        kSpaceLastSystem = firstKey;
    }

    console.log('\x1b[32m%s\x1b[0m', 'begin mapping...');

    await fillhubdist(dbfulleden);

    await writeF(dbfulleden, "mapofeden");

    await fillsysnamestable(dbfulleden);
}

async function fillhubdist(dbfulleden) {
    const systems = Object.keys(dbfulleden);

    for (let i = 0; i < systems.length; i++) {
        if (kSpaceLastSystem != 0) {
            if (systems[i] != kSpaceLastSystem) {
                continue;
            } else {
                kSpaceLastSystem = 0;
            }
        }
        const syst = systems[i];

        // Пропускаем не K-space системы
        const sysclass = dbfulleden[syst].sysclass;
        if (sysclass !== "High" && sysclass !== "Low" && sysclass !== "Null") {
            console.log('\x1b[32m%s\x1b[0m', `Stage HUBS in progress:${i} of ${systems.length} for ${syst} not a K-space, skipping...`);
            continue;
        }

        const hubs = [
            { id: 30000142, type: "J" },
            { id: 30002187, type: "A" },
            { id: 30002659, type: "D" },
            { id: 30002510, type: "R" },
            { id: 30002053, type: "H" }
        ];

        try {
            var resultHub = 0;
            for (const hub of hubs) {
                resultHub = await GetSystemHubDistance(dbfulleden, syst, hub.id, hub.type, i, systems.length);
                if(resultHub === 0) {
                    console.log('\x1b[31m%s\x1b[0m', `Stage ${hub.type} in progress:${i} of ${systems.length} for ${syst} failed to get distance, retrying...`);
                    break;
                }
            }
            if (resultHub === 0) {
                console.log('\x1b[31m%s\x1b[0m', `waiting...`);

                await sleepWithCountdown(600000);
                i--; // Повторить текущую систему
                continue;
            }
            await sleep(10); // Задержка между запросами

        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', `159: error:${error}`);
            await sleepWithCountdown(600000);
            i--; // Повторить текущую систему
        }
    }

    //console.log('\x1b[32m%s\x1b[0m', `Stage ${type} success`);
}
async function GetSystemHubDistance(dbfulleden, systemId, hubID, type, currentIndex, totalSystems) {
    const url1 = `https://esi.evetech.net/latest/route/${systemId}/${hubID}/?datasource=tranquility&flag=shortest`;
    const url2 = `https://esi.evetech.net/latest/route/${systemId}/${hubID}/?datasource=tranquility&flag=secure`;

    const [response1, response2] = await Promise.all([
        getCCPdata(url1, 404).catch(() => []),
        getCCPdata(url2, 404).catch(() => [])
    ]);
    //console.log(response1, response2);
    if (response1.success === false || response2.success === false) return 0;
    const shortValue = response1.data.length ? response1.data.length.toString() : "-1";
    const securValue = response2.data.length ? response2.data.length.toString() : "-1";

    if (type === "J") {
        dbfulleden[systemId].short_j = shortValue;
        dbfulleden[systemId].secur_j = securValue;
    } else if (type === "A") {
        dbfulleden[systemId].short_a = shortValue;
        dbfulleden[systemId].secur_a = securValue;
    } else if (type === "D") {
        dbfulleden[systemId].short_d = shortValue;
        dbfulleden[systemId].secur_d = securValue;
    } else if (type === "R") {
        dbfulleden[systemId].short_r = shortValue;
        dbfulleden[systemId].secur_r = securValue;
    } else if (type === "H") {
        dbfulleden[systemId].short_h = shortValue;
        dbfulleden[systemId].secur_h = securValue;
    }

    if ((currentIndex + 1) % 20 === 0 || (currentIndex + 1) === totalSystems) {
        await writeF(dbfulleden, "mapofeden");
        await writeF({ system: systemId }, "progress");
        console.log('\x1b[32m%s\x1b[0m', `Stage ${type} in progress:${currentIndex + 1} of ${totalSystems} for ${systemId} ${response1.data.length} ${response2.data.length}: SAVED`);
    } else {
        console.log('\x1b[32m%s\x1b[0m', `Stage ${type} in progress:${currentIndex + 1} of ${totalSystems} for ${systemId} ${response1.data.length} ${response2.data.length}`);
    }
    return 1;
}
/*****************************************************************
    4. Creating sysnames
******************************************************************/
async function fillsysnamestable(dbfulleden) {
    if (skip_stage_4) {
        await parsesystemjumps();
        return;
    }

    console.log('\x1b[32m%s\x1b[0m', '...checking stage 4');

    try {
        const namestable = await readF('sysnames');

        if (Object.keys(namestable).length === Object.keys(dbfulleden).length) {
            console.log('\x1b[32m%s\x1b[0m', 'Stage 4 success, file already full');
            await parsesystemjumps();
            return;
        }

        const systems = Object.keys(dbfulleden);
        for (let i = 0; i < systems.length; i++) {
            const syst = systems[i];
            const name = dbfulleden[syst];
            namestable[name.solarSystemName] = { "solarSystemID": parseInt(syst) };
            console.log('\x1b[32m%s\x1b[0m', `Stage 4 in progress:${i} of ${systems.length} for ${name.solarSystemName}`);
        }

        await writeF(namestable, "sysnames");
        console.log('\x1b[32m%s\x1b[0m', 'Stage 4 success');
        await parsesystemjumps();

    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Error in fillsysnamestable:', error);
    }
}

/*****************************************************************
    5. Parsing connections and systemjumps
******************************************************************/
async function parsesystemjumps() {
    if (skip_stage_5) {
        await parseWormholeTypes();
        return;
    }

    console.log('\x1b[32m%s\x1b[0m', '...checking stage 5');

    try {
        // Используем fetch вместо XMLHttpRequest для асинхронности
        const response = await fetch('https://www.fuzzwork.co.uk/dump/latest/mapSolarSystemJumps.csv');
        const text = await response.text();

        let smg = text.replace(/,10[0-9]{6}/g, "]");
        smg = smg.replace(/10[0-9]{6},/g, "[");
        const messages = smg.split('\n');
        messages.shift();

        const jumps = {};

        // Парсим асинхронно с chunk'ами для производительности
        await parsejumpsarr(jumps, messages);

        await parseWormholeTypes();

    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Error in parsesystemjumps:', error);
    }
}

async function parsejumpsarr(jumps, messages) {
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].length) {
            try {
                const m1 = JSON.parse(messages[i]);
                const sys1 = m1[1];
                const sys2 = m1[2];

                if (!jumps[sys1]) {
                    jumps[sys1] = {};
                }
                jumps[sys1][sys2] = sys2.toString();

                if (i % 1000 === 0) {
                    console.log('\x1b[32m%s\x1b[0m', `Stage 5 in progress:${i} of ${messages.length} for ${sys1}`);
                }
            } catch (error) {
                console.log('\x1b[31m%s\x1b[0m', `Error parsing line ${i}:`, error);
            }
        }
    }

    await writeF(jumps, "jumps");
    console.log('\x1b[32m%s\x1b[0m', 'Stage 5 success');
}

/*****************************************************************
    6. Getting wormholes
******************************************************************/
async function parseWormholeTypes() {
    console.log('\x1b[32m%s\x1b[0m', '...checking stage 6');

    try {
        const url6 = 'https://esi.evetech.net/latest/universe/groups/988/?datasource=tranquility&language=en';
        const res6 = await getCCPdata(url6, false);
        const response6 = res6.data;
        const holes = await readF('wh_holes');
        const whs = response6.types;

        if (Object.keys(holes).length === whs.length) {
            console.log('\x1b[32m%s\x1b[0m', 'Stage 6 success, file already full');
            return;
        }

        for (let i = 0; i < whs.length; i++) {
            await parseWhItem(whs[i], holes);
            console.log(`Processed wormhole ${i + 1} of ${whs.length}`);
        }

        await writeF(holes, "wh_holes");
        console.log('\x1b[32m%s\x1b[0m', 'Stage 6 success');

    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Error in parseWormholeTypes:', error);
    }
}

async function parseWhItem(whId, holes) {
    const url = `https://esi.evetech.net/latest/universe/types/${whId}/?datasource=tranquility&language=en`;

    try {
        const res = await getCCPdata(url, false);
        const response = res.data;
        const nm = response.name.replace(/Wormhole /, "");

        if (response.dogma_attributes) {
            holes[nm] = {
                "from": "",
                "to": response.dogma_attributes[3]?.value || "",
                "time": response.dogma_attributes[4]?.value || "",
                "mass": response.dogma_attributes[5]?.value || "",
                "regen": response.dogma_attributes[6]?.value || "",
                "jumpmass": response.dogma_attributes[7]?.value || ""
            };

            console.log(
                response.type_id, response.name,
                "to: " + response.dogma_attributes[3]?.value,
                "time: " + response.dogma_attributes[4]?.value,
                "mass: " + response.dogma_attributes[5]?.value,
                "regen: " + response.dogma_attributes[6]?.value,
                "jumpmass: " + response.dogma_attributes[7]?.value
            );
        } else {
            holes[nm] = {
                "from": "",
                "to": "",
                "time": "",
                "mass": "",
                "regen": "",
                "jumpmass": ""
            };
            console.log(response.type_id, response.name);
        }
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', `Error parsing wormhole ${whId}:`, error);
    }
}

/*****************************************************************
    функции для работы ESI
******************************************************************/
async function getCCPdata(u, ignore) {
    try {
        const response = await axios.get(u, {
            headers: {
                'User-Agent': 'EVE Map Parser/1.0',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status !== 200 && response.status !== ignore) {
            console.log('\x1b[31m%s\x1b[0m', `450: ERROR FOR code: ${response.status}`);
            //throw new Error(`HTTP ${response.status}`);
            return { success: false, data: null };
        }

        return { success: true, data: response.data };

    } catch (error) {
        if (error.response) {
            if (error.response.status === 404 && ignore === 404) {
                return { success: false, data: null };
            }
            console.log('\x1b[31m%s\x1b[0m', `450: ERROR FOR code: ${error.response.status}`);
        } else {
            console.log('\x1b[31m%s\x1b[0m', `450: ERROR: ${error.message}`);
        }
        //throw error;
        return { success: false, data: null };
    }
}

/*****************************************************************
    вспомогательные функции будут здесь
******************************************************************/
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function sleepWithCountdown(ms, interval = 10000) {
    if (ms <= 0) return;

    const startTime = Date.now();
    const endTime = startTime + ms;

    console.log(`\x1b[36mПауза на ${Math.ceil(ms / 1000)} секунд...\x1b[0m`);

    let remaining = ms;
    let nextCountdown = interval;

    while (remaining > 0) {
        if (remaining <= nextCountdown) {
            await new Promise(resolve => setTimeout(resolve, remaining));
            break;
        }

        // Ждем до следующего отсчета
        await new Promise(resolve => setTimeout(resolve, nextCountdown));

        remaining -= nextCountdown;
        const secondsLeft = Math.ceil(remaining / 1000);

        console.log(`\x1b[33mОсталось: ${secondsLeft} сек...\x1b[0m`);
    }

    console.log(`\x1b[32mПауза завершена!\x1b[0m`);
}
/*****************************************************************
    работа с файлами сохраняем обработанный кеш для креста, локации персов и карты
******************************************************************/
async function writeF(json, file) {
    if (!json || json === "[]") {
        console.log('No data to write for file:', file);
        return;
    }

    try {
        const jsonString = JSON.stringify(json, null, '\t');
        const dbDir = path.join(__dirname, 'db');
        const filePath = path.join(dbDir, `${file}.json`);

        // Создаем директорию, если она не существует
        await fs.mkdir(dbDir, { recursive: true });

        await fs.writeFile(filePath, jsonString);
        //console.log(`File ${file}.json written successfully`);
    } catch (e) {
        console.log('Error while writing file:', e);
        throw e;
    }
}

async function readFsync(filename) {
    try {
        const dbDir = path.join(__dirname, 'db');
        const filePath = path.join(dbDir, `${filename}.json`);

        // Создаем директорию, если она не существует
        await fs.mkdir(dbDir, { recursive: true });

        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.log(`Error reading file: ${filename}. Creating a new one.`);

        const dbDir = path.join(__dirname, 'db');
        const filePath = path.join(dbDir, `${filename}.json`);

        // Создаем директорию, если она не существует
        await fs.mkdir(dbDir, { recursive: true });

        // Создаем новый файл с пустым объектом
        await fs.writeFile(filePath, "{}");
        return {};
    }
}

async function readF(filename) {
    try {
        const dbDir = path.join(__dirname, 'db');
        const filePath = path.join(dbDir, `${filename}.json`);

        // Создаем директорию, если она не существует
        await fs.mkdir(dbDir, { recursive: true });

        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.log(`Error reading file ${filename}. Creating a new one.`);

        const dbDir = path.join(__dirname, 'db');
        const filePath = path.join(dbDir, `${filename}.json`);

        // Создаем директорию, если она не существует
        await fs.mkdir(dbDir, { recursive: true });

        // Создаем новый файл с пустым объектом
        await fs.writeFile(filePath, "{}");
        return {};
    }
}