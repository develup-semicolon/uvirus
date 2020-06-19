const request = require('request');
const cheerio = require('cheerio');
var express = require("express");
var session = require('express-session')
var MemoryStore = require('memorystore')(session)
const bodyParser = require('body-parser')
var fs = require("fs");
var url = require("url");

var app = express();

var apiRouter = require('./apiRouter')
const settings = require('./settings.json')

//크롤링
var infectInfo = {};
var deathInfo = {};
var recInfo = {};
var ctrss = {};

var kotype = ["의사환자", "조사대상유증상자", "격리해제", "검사중", "격리중교민", "격리해제교민"];
var koinfo = [[],[],[],[],[],[],[]];
var kojson = {};

var newsinfo = [[],[],[]];
var newsjsontitle = {};
var newsjsontsor = {};
var newsjsonurl = {};
var countInfo = 0;

var ctrsname = {'China': "중국", 'Japan': "일본", 'Thailand': "태국", 'Singapore': "싱가포르", 'Hong Kong': "홍콩", 'South Korea': "한국", 'Australia': "호주", 'Taiwan': "대만", 'Malaysia': "말레이시아", 'Macau': "마카오", 'France': "프랑스", 'United States': "미국", 'Germany': "독일", 'Vietnam': "베트남", 'United Arab Emirates': "아랍 에미리트", 'Canada': "캐나다", 'Italy': "이탈리아", 'Cambodia': "캄보디아", 'Finland': "핀란드", 'India': "인도", 'Nepal': "네팔", 'Philippines': "필리핀", 'Sri Lanka': "스리랑카"};

app.use('/static', express.static('static'));

// Body Parser
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// Session
app.use(session({
  cookie: {maxAge: 3600000}, // 1 Hour
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
  secret: settings.sessionSecret || '(keyboard cat) / PLEASE SET THE SECRET',
  rolling: true,
  saveUninitialized: true,
  resave: false
}))

/*app.get ("/", function(req, res) {
	res.end(fs.readFileSync(__dirname + '/static/index.html'));
});*/

app.get ("/", function(req, res) {
	res.end(fs.readFileSync(__dirname + '/static/newindex.html'));
});

app.get ("/sitemap", function(req, res) {
	res.end(fs.readFileSync(__dirname + '/static/data/sitemap.xml'));
});

app.get ("/world", function(req, res) {
	res.end(fs.readFileSync(__dirname + '/static/indexbk.html'));
});

app.get ("/mobile", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/mobile.html'));
});

app.get ("/appmobile", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/appmobile.html'));
});


app.get ("/nmobile", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/new_mobile.html'));
});

app.get ("/remobile", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/remobile.html'));
});

app.get ("/nmobile_edit", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/new_mobile_edit.html'));
});

app.get ("/pc", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/index.html'));
});

/*app.get ("/new_mobile", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/new_mobile.html'));
});

app.get ("/newindex", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/newindex.html'));
});*/

app.get ("/about", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/about.html'));
});

app.get ("/robots.txt", function(req, res) {
  res.end(fs.readFileSync(__dirname + '/static/robots.txt'));
});

// Admin Page

app.set('view engine', 'ejs')
app.get('/admin', (req, res) => {
  if(req.session.adminLogin) {
    res.render('./admin/index')
  } else {
    res.render('./admin/login')
  }
})

app.post('/admin/login', (req, res) => {
  console.log(req.body)
  if(!req.body.username || !req.body.password) res.status(400).send('Username or password not provided.')
  else if(req.body.username !== settings.adminUser || req.body.password !== settings.adminPass) res.status(401).send('Username or password does not match.')
  else {
    // Logged in
    console.log('[Admin/Login] ' + req.ip + ' logged in to the Admin Panel')
    req.session.adminLogin = true
    res.redirect('/admin')
  }
})

app.get('/admin/logout', (req, res) => {
  req.session.adminLogin = false
  res.redirect('/admin')
})

app.get('/admin/route', (req, res) => {
  if(req.session.adminLogin) {
    // Data Processing
    if(!fs.existsSync('./static/data/data.json')) {
      console.error('[ERROR] Cannot find route.json')
      res.status(500).send('Internal Server Error: Cannot find data.json')
      return
    }

    var data = JSON.parse(fs.readFileSync('./static/data/data.json').toString())

    res.render('./admin/route', {data})
  } else {
    res.redirect('/admin')
  }
})

app.use('/api', apiRouter)

app.listen(3000, function () {
  console.log("server start");
  getInfec();
});


var inter = setInterval(function(){getInfec();}, 30*1000);

function getInfec() {
	setTimeout(function() {
		getWorld();
	}, 1000);
	setTimeout(function() {
		getNews();
	}, 1000);
	setTimeout(function() {
		getKorea();
	}, 1000);
}

var sendNotification = function(data) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": "Basic NGEwMGZmMjItY2NkNy0xMWUzLTk5ZDUtMDAwYzI5NDBlNjJj"
  };
  
  var options = {
    host: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: headers
  };
  
  var https = require('https');
  var req = https.request(options, function(res) {  
    res.on('data', function(data) {
      console.log("Response:");
      console.log(JSON.parse(data));
    });
  });
  
  req.on('error', function(e) {
    console.log("ERROR:");
    console.log(e);
  });
  
  req.write(JSON.stringify(data));
  req.end();
};


/*크롤링*/
function getKorea() {
	const kourl = "https://docs.google.com/spreadsheets/d/1VsTh88cLo6PcjUs9xTvWi2b0D4okDfTDqwqdJQVrGe4/htmlview?usp=sharing&sle=true";
	var infectedData = "";
	
	request(kourl, (error, response, body) => {
  if (error) throw error;
  let $ = cheerio.load(body);
	try {
		var getTable = $('div > table > tbody > tr > td').text().split("|");file:///opt/Ramme/resources/app.asar/src/assets/icon.png
		var count = 0;
		for (var i=0;i<getTable.length;i++) {
			if (getTable[i].indexOf(kotype[i]) != -1) {
				koinfo[i][0] = kotype[i];
				koinfo[i][1] = getTable[i].replace(kotype[i], "");
				kojson[kotype[i]] = getTable[i].replace(kotype[i], "");
			}
		}
		
		var putterkoreainfo = JSON.stringify(kojson);
		infectedData = "{\"koreainfo\":"+putterkoreainfo+"}";
		
		fs.readFile(__dirname + '/static/data/koreainfo.json', 'utf-8', function(err, data) {
    if (err) throw err;
 
    fs.writeFile(__dirname + '/static/data/koreainfo.json', infectedData, 'utf-8', function(err, data) {
        if (err) throw err;
        

        console.log('json file updated.');
    });
});

	} catch (error) {
		console.error(error);
	}
});
}

function getNews() {
	const newsurl = "https://search.naver.com/search.naver?sm=tab_dts&where=news&query=%EC%9A%B0%ED%95%9C%ED%8F%90%EB%A0%B4+%7C+%EC%8B%A0%EC%A2%85%EC%BD%94%EB%A1%9C%EB%82%98+&oquery=%EC%9A%B0%ED%95%9C%ED%8F%90%EB%A0%B4&tqi=UBqbuwprvmsssu2SiaGssssstmN-092165&qdt=1&nso=so%3Add%2Cp%3Aall%2Ca%3Aall&field=0&mynews=0&pd=0&photo=0&sort=1";
	var infectedData = "";
	
	 request(newsurl, (error, response, body) => {
if (error) throw error;
  let $ = cheerio.load(body);
	try {
		var count=0;
		$('a._sp_each_title').each(function(post) {
			newsinfo[0][count]=$(this).text();
			//console.log($(this).text());
			count=count+1;
		});
		count=0;
		$('span._sp_each_source').each(function(post) {
			//console.log($(this).text());
			newsinfo[1][count]=$(this).text();
			count=count+1;
		});
		count=0;
		$('a._sp_each_title').each(function(post) {
			newsinfo[2][count]=$(this).attr("href");
			//console.log($(this).text());
			count=count+1;
		});
		for (var i =0; i<count;i++) {
			newsinfo[1][i]=newsinfo[1][i].replace(/선정/gi,"").replace(/언론사/gi,"").replace(/\s/g,'');
			newsinfo[0][i]=newsinfo[0][i].replace(/\(종합\)/gi,"").replace(/\(공식\)/gi,"").replace(/\[단독\]/gi,"").replace(/\[전문\]/gi,"").replace(/^\s+|\s+$/g,'');
			newsjsontitle[i]=newsinfo[0][i];
			newsjsontsor[i]=newsinfo[1][i];
			newsjsonurl[i]=newsinfo[2][i];
		}
		var putternewstitle = JSON.stringify(newsjsontitle);
		var putternewssor = JSON.stringify(newsjsontsor);
		var putternewsurl = JSON.stringify(newsjsonurl);
		infectedData = "{\"title\":"+putternewstitle+",\"sor\":"+putternewssor+",\"url\":"+putternewsurl+"}";
fs.readFile(__dirname + '/static/data/news.json', 'utf-8', function(err, data) {
    if (err) throw err;
 
    fs.writeFile(__dirname + '/static/data/news.json', infectedData, 'utf-8', function(err, data) {
        if (err) throw err;
        console.log('json file updated.');
    });
});
} catch (error) {
console.error(error);
}
});
}

function getWorld() {
	const url = "https://en.wikipedia.org/wiki/2019%E2%80%9320_Wuhan_coronavirus_outbreak";
	countInfo = 0;
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
	
	fs.readFile(__dirname + '/static/data/infectionData.json', 'utf-8', function(err, data) {
    if (err) throw err;
 
    fs.writeFile(__dirname + '/static/data/infectionData.json', infectedData, 'utf-8', function(err, data) {
        if (err) throw err;
        console.log('json file updated.');
    });
});
}

function getEmergencyWorld() {
	const kourl = "https://docs.google.com/spreadsheets/d/1A8ehkMY4YvKmW3aeFNFY118i3J_lH3hjahNRGLbuYbw/htmlview?usp=sharing&sle=true";
	var info = Array(500).fill(null).map(() => Array());

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