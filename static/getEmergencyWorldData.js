const request = require('request');
const cheerio = require('cheerio');

function getEmergencyWorld() {
	const kourl = "https://docs.google.com/spreadsheets/d/1A8ehkMY4YvKmW3aeFNFY118i3J_lH3hjahNRGLbuYbw/htmlview?usp=sharing&sle=true";
	var infectedData = "";

	request(kourl, (error, response, body) => {
  		if (error) throw error;
  		let $ = cheerio.load(body);
		try {
			var emergencyTable = $('div > table > tbody > tr > td').text().split("|");
		} catch (error) {
		console.error(error);
	}
});
}