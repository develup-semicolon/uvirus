const request = require('request');
const cheerio = require('cheerio');

const kourl = "https://docs.google.com/spreadsheets/d/1VsTh88cLo6PcjUs9xTvWi2b0D4okDfTDqwqdJQVrGe4/htmlview?usp=sharing&sle=true";
var kotype = ["의사환자", "조사대상유증상자", "격리해제", "검사중", "격리중교민", "격리해제교민"];
var koinfo = [[],[],[],[],[],[],[]];
var kojson = {};
var infectedData = "";

request(kourl, (error, response, body) => {
  if (error) throw error;
  let $ = cheerio.load(body);
	try {
		var getTable = $('div > table > tbody > tr > td').text().split("|");
		var count = 0;
		for (var i=0;i<getTable.length;i++) {
			if (getTable[i].indexOf(kotype[i]) != -1) {
				koinfo[i][0] = kotype[i];
				koinfo[i][1] = getTable[i].replace(kotype[i], "");
				kojson[kotype[i]] = getTable[i].replace(kotype[i], "");
			}
		}
		
		console.log(JSON.stringify(kojson));
		
	} catch (error) {
		console.error(error);
	}
});