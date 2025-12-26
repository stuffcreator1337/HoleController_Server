
const HUBS = {
    hubj: 30000142, // Jita
    huba: 30002187, // Amarr
    hubd: 30002659, // Dodixie
    hubr: 30002510, // Rens
    hubh: 30002053  // Hek
};
const data = {
    color_High: "#4CAF50",
    color_Low: "#FF9800",
    color_Null: "#F44336",
    color_Abyss: "#9C27B0",
    color_C1: "#03A9F4",
    color_C2: "#00BCD4",
    color_C3: "#009688",
    color_C4: "#607D8B",
    color_C5: "#3F51B5",
    color_C6: "#1A237E",
    color_C13: "#795548"
};
function getSystemClass(sys) {
    const id = Number(sys.system_id);

    if (id >= 31000001 && id <= 31002533) {
        // Wormholes
        if (sys.name.startsWith("J")) {
            if (id >= 31002372) return "C13";
            return "C1-C6"; // уточним ниже
        }
    }

    if (id >= 32000001 && id <= 32000200) return "Abyss";

    if (sys.security >= 0.45) return "High";
    if (sys.security > 0) return "Low";
    return "Null";
}
const sleep = ms => new Promise(r => setTimeout(r, ms));



const axios = require("axios");
const fs = require("fs-extra");

const ESI = "https://esi.evetech.net/latest";


async function main() {
    console.log("Loading system list...");
    const systems = (await axios.get(`${ESI}/universe/systems/`)).data;

    const map = {};

    for (let i = 0; i < systems.length; i++) {
        const systemId = systems[i];
        console.log(`System ${i + 1}/${systems.length}: ${systemId}`);

        try {
            const sys = (await axios.get(`${ESI}/universe/systems/${systemId}/`)).data;

            const sysclass = getSystemClass(sys);
            const color = data[`color_${sysclass}`] || "#999";

            const entry = {
                regionID: String(sys.region_id),
                constellationID: String(sys.constellation_id),
                solarSystemName: sys.name,
                security: String(sys.security),
                radius: String(sys.radius),
                sysclass,
                color
            };

            // расстояния до хабов
            for (const [key, hubId] of Object.entries(HUBS)) {
                try {
                    const route = await axios.get(
                        `${ESI}/route/${hubId}/${systemId}/?flag=shortest`
                    );
                    entry[key] = String(route.data.length - 1);
                } catch {
                    entry[key] = "-1";
                }
                await sleep(150);
            }

            map[systemId] = entry;
        } catch (e) {
            console.error("Failed:", systemId);
        }

        await sleep(200); // общая задержка
    }

    await fs.writeJson("mapofeden.json", map, { spaces: 2 });
    console.log("mapofeden.json created");
}

main();
