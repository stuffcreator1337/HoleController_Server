const fs = require('fs');
const { parse } = require('sql-ast'); // Измененный импорт

const sql = fs.readFileSync('db/mapSolarSystemJumps.sql', 'utf8');
var jmps = {};
try {
    const ast = parse(sql);
    // console.log(JSON.stringify(ast, null, 2));
	console.log(ast.length);
    for(var i=0; i<ast.length;i++)
	{
		console.log(i);
		console.log(ast[i].type);
		if(ast[i].type == "INSERT")
		{
			var rows = ast[i].rows;
			for(var j=0; j<rows.length;j++)
			{
				var jmp1 = rows[j].values[2];
				var jmp2 = rows[j].values[3];
				if(jmps[jmp1]==undefined)
				{
					jmps[jmp1] = {};
				}
				if(jmps[jmp2]==undefined)
				{
					jmps[jmp2] = {};
				}
				jmps[jmp1][String(jmp2)] = String(jmp2);
				jmps[jmp2][String(jmp1)] = String(jmp1);
			}
			
		}
	}
	
    // Или сохранить в файл
    fs.writeFileSync('jumps.json', JSON.stringify(jmps, null, 2));
} catch (error) {
    console.error('Error parsing SQL:', error.message);
}