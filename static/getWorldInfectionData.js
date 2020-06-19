const request = require('request');
const cheerio = require('cheerio');
var fs = require("fs");
const url = "https://en.wikipedia.org/wiki/2019%E2%80%9320_Wuhan_coronavirus_outbreak";
var infectInfo = {};
var deathInfo = {};
var recInfo = {};
var countInfo = 0;
var ctrss = {};
var ctrsname = {'China': "중국", 'Japan': "일본", 'Thailand': "태국", 'Singapore': "싱가포르", 'Hong Kong': "홍콩", 'South Korea': "한국", 'Australia': "호주", 'Taiwan': "대만", 'Malaysia': "말레이시아", 'Macau': "마카오", 'France': "프랑스", 'United States': "미국", 'Germany': "독일", 'Vietnam': "베트남", 'United Arab Emirates': "아랍 에미리트", 'Canada': "캐나다", 'Italy': "이탈리아", 'Cambodia': "캄보디아", 'Finland': "핀란드", 'India': "인도", 'Nepal': "네팔", 'Philippines': "필리핀", 'Sri Lanka': "스리랑카", 'United Kingdom': "영국"};

getInfec();

function getInfec() {
	var cut1;
	var cut2;
request(url, (error, response, body) => {
  if (error) throw error;
  let $ = cheerio.load(body);
	var info = Array(500).fill(null).map(() => Array());
	
	//table의 모든 정보를 긁어온다
	try {
		var getTable = $('#mw-content-text > div > table > tbody > tr').text();
		getTable = replaceAll(getTable,"\n","|");
		var proc = getTable.trim().split("|");
		for (var i=0;i<proc.length-1;i++) {
			if (proc[i].indexOf("[")==0)
				if (i > -1) proc.splice(i, 1)
		}
		
		//반점 제거
		for (var i=0;i<proc.length;i++) {
			if (proc[i].includes(",")) {
			proc[i] = replaceAll(proc[i], ",", "");
			}
		}
		
		//시작 지점 찾기
		for (var i=0;i<proc.length;i++) {
			if (!isNaN(proc[i]) && proc[i].trim().length!=0) {
				cut2 = i;
				break;
			}
		}
		
		//끝 지점 찾기
		for (var i=0;i<proc.length-1;i++) {
			if (proc[i].includes("territories"))
				cut1 = i;
		}
		
		//긴급 시 임시 테이블 - 먹통일 때 주석 풀기
		// getEmergencyWorld(); return 0;
		
		if (cut2 != undefined && cut1 != undefined)
			proc = proc.slice(cut2, cut1);
		else {
			console.log("[오류 발생] 테이블 양식이 변경되었습니다. EmergencyWorld로 크롤링을 진행합니다. 사이트에서는 예전의 수치가 표시될 것 입니다. 양식을 변경해주세요.");
			getEmergencyWorld(); return 0;
		}
		
		//공백 삭제
		for (var i=0;i<proc.length;i++) {
			if (proc[i].length==0) {
				if (i > -1) proc.splice(i, 1)
			}
		}
		
		//첫번째 데이터 China(mainland) 가 예외라서 따로 처리
		var count = 0;
		for (var i=0;i<(proc.length-1)/4;i++) {
			for (var j=0;j<4;j++) {
				if (count==0) {
					info[0][0] = "China";
					j++;
				}
				info[i][j] = proc[count].trim();
				count++;
			}
		}
		
		//국가 수 파악
		while (true) {
			if (info[countInfo][0]!=undefined) {
				countInfo++;
			} else {
				console.log("Countries : "+countInfo);
				break;
			}
		}
		
		filter(info);
		
	} catch (error) {
		console.error(error);
	}
});
}

function filter (info) {
//codes, ctrs는 새 국가가 감염될때마다 추가해줘야 함.	
	var codes = ["CN", "TH", "HK", "TW", "JP", "MO", "MY", "SG", "AU", "US", "FR", "DE", "KR", "AE", "CA", "VN", "IT", "GB", "KH", "IN", "NP", "FI", "PH", "LK", "RU", "SE", "BE", "EG", "IR", "IL", "CH", "RO", "NO", "MK", "GR", "GE", "BR", "DZ", "AF", "PK", "LB", "HR", "OM", "KW", "BH", "AT", "UA", "TN", "TG", "PE", "PY", "NG", "MC", "MD", "LT", "LI", "LV", "JO", "CR", "CO", "CM", "BT", "AM", "AD", "ZA", "MA", "MV", "LU", "DO", "BG", "SK", "MT", "BA", "SN", "ID", "NZ", "HU", "GF", "PL", "MX", "BY", "SA", "CL", "AR", "AZ", "EE", "SI", "QA", "EC", "IE", "PT", "SM", "DK", "IS"];
var ctrs = ["China", "Thailand", "Hong Kong", "Taiwan", "Japan", "Macau", "Malaysia", "Singapore", "Australia", "United States", "France", "Germany", "South Korea", "United Arab Emirates", "Canada", "Vietnam", "Italy", "United Kingdom", "Cambodia", "India", "Nepal", "Finland", "Philippines", "Sri Lanka", "Russia", "Sweden", "Belgium", "Egypt", "Iran", "Israel", "Switzerland", "Romania", "Norway", "North Macedonia", "Greece", "Georgia", "Brazil", "Algeria", "Afghanistan", "Pakistan", "Lebanon", "Croatia", "Oman", "Kuwait", "Bahrain", "Austria", "Ukraine", "Tunisia", "Togo", "Peru", "Paraguay", "Nigeria", "Monaco", "Moldova", "Lithuania", "Liechtenstein", "Latvia", "Jordan", "Costa Rica", "Colombia", "Cameroon", "Bhutan", "Armenia", "Andorra", "South Africa", "Morocco", "Maldives", "Luxembourg", "Dominican Republic", "Bulgaria", "Slovakia", "Malta", "Bosnia and Herzegovina", "Senegal", "Indonesia", "New zealand", "Hungary", "French Guiana", "Poland", "Mexico", "Belarus", "Saudi Arabia", "Chile", "Argentina", "Azerbaijan", "Estonia", "Slovenia", "Qatar", "Ecuador", "Ireland", "Portugal", "San Marino", "Denmark", "Iceland"];
	var infectedData = "";
	
	// [ ] 짜르기
	for (var i=0;i<countInfo;i++) {
		if (info[i][1].indexOf("[") != -1) {
			info[i][1] = info[i][1].substring(0, info[i][1].indexOf("["));
		}
		if (info[i][2].indexOf("[") != -1) {
			info[i][2] = info[i][2].substring(0, info[i][2].indexOf("["));
		}
		if (info[i][3].indexOf("[") != -1) {
			info[i][3] = info[i][3].substring(0, info[i][3].indexOf("["));
		}
		if (info[i][0].indexOf("[") != -1) {
			info[i][0] = info[i][0].substring(0, info[i][0].indexOf("["));
		}
		if (info[i][0].indexOf("(") != -1) {
			info[i][0] = info[i][0].substring(0, info[i][0].indexOf("("));
		}
		if (info[i][1].indexOf("(") != -1) {
			info[i][1] = info[i][1].substring(0, info[i][1].indexOf("("));
		}
		if (info[i][2].indexOf("(") != -1) {
			info[i][2] = info[i][2].substring(0, info[i][2].indexOf("("));
		}
		if (info[i][3].indexOf("(") != -1) {
			info[i][3] = info[i][3].substring(0, info[i][3].indexOf("("));
		}
		if (info[i][3].length==0) {
			info[i][3] = "0";
		}
		if (info[i][2].length==0) {
			info[i][2] = "0";
		}
		if (info[i][2] == "–") {
			info[i][2] = "0";
		}
		if (info[i][3] == "–") {
			info[i][3] = "0";
		}
	}

	
	//감염자, 사망자, ctrs 구하기
	for (var i=0;i<countInfo;i++) {
		for (var j=0;j<countInfo;j++) {
			if (info[i][0] == ctrs[j]) {
				infectInfo[codes[j]] = info[i][1];
				deathInfo[codes[j]] = info[i][2];
				recInfo[codes[j]] = info[i][3];
				ctrss[codes[j]] = ctrs[j];
			}
		}
	}
	
	
	
	var putterInfect = JSON.stringify(infectInfo);
	var putterDeath = JSON.stringify(deathInfo);
	var putterRec = JSON.stringify(recInfo);
	var putterctrs = JSON.stringify(ctrss);
	
	infectedData = "{ \"infected\":"+putterInfect+",\"death\":"+putterDeath+",\"ctrs\":"+putterctrs+",\"recoveries\":"+putterRec+"}";
	
	fs.readFile(__dirname + '/data/infectionData.json', 'utf-8', function(err, data) {
    if (err) throw err;
 
    fs.writeFile(__dirname + '/data/infectionData.json', infectedData, 'utf-8', function(err, data) {
        if (err) throw err;
        console.log('json file updated.');
    });
});
}

function getEmergencyWorld() {
	const kourl = "https://docs.google.com/spreadsheets/d/1A8ehkMY4YvKmW3aeFNFY118i3J_lH3hjahNRGLbuYbw/htmlview?usp=sharing&sle=true";
	var info = Array(100).fill(null).map(() => Array());

	request(kourl, (error, response, body) => {
  		if (error) throw error;
  		let $ = cheerio.load(body);
		try {
			var emergencyTable = $('div > table > tbody > tr > td').text().split("|");
			
			//첫번째 데이터 China(mainland) 가 예외라서 따로 처리
			var count = 0;
			for (var i=0;i<(emergencyTable.length-1)/3;i++) {
				for (var j=0;j<3;j++) {
					if (count==0) {
						info[0][0] = "China";
						j++;
					}
				info[i][j] = emergencyTable[count].trim();
				count++;
			}
		}
			while (true) {
				if (info[countInfo][0]!=undefined) {
					countInfo++;
				} else {
					break;
				}
			}
		filter(info);
			
		} catch (error) {
		console.error(error);
	}
});
}


function replaceAll(str, searchStr, replaceStr) {
  return str.split(searchStr).join(replaceStr);
}
