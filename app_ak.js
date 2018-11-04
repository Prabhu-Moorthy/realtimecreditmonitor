var express = require('express');
var watson = require('watson-developer-cloud');
var fs     = require('fs');
var cfenv = require('cfenv');
var app = express();
app.set('title','Early Warning System');
app.set('view engine','ejs');
app.use(express.static(__dirname + '/public'));
var ibmdb = require('ibm_db');
var appEnv = cfenv.getAppEnv();
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');

var discovery1 = new DiscoveryV1({
  username: '6fc767dc-0ae5-4543-b997-7b89f806fee5',
  password: 'lFieDVyaZJNe',
  version_date: '2016-12-01'
});

//
var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var MAX_PAGES_TO_VISIT=10;
var numPagesVisited = 0;
var pagesVisited = {};
var pagesToVisit = [];
var url = " ";
var baseUrl = " ";
var SEARCH_WORD =" ";
var START_URL=" ";
var CP_ID =" ";
var DOMAIN_NAME=" ";
var max_seq_no=" ";
var client_id =  "";
var login_client = "";

var param = new Object();

var bodyParser = require('body-parser');
var dashboard_query = "SELECT distinct CM.CM_CP_ID, (CDC_CNTRY_RISK) AS CDC_CNTRY_RISK, CM.CM_CNCTD_CP_ID, CM.CM_CP_NAME, CM.CM_ULT_PARNT_NAME,    CDC_LEGAL_ENTITYTYPE AS CDC_LEGAL_ENTITYTYPE, CDC_MTM_NET AS CDC_MTM_NET,    CDC_CVA  AS CDC_CVA,  AD_SCORE AS AD_SCORE, AD_SCORE_UPDTIME AS AD_SCORE_UPDTIME, CM.CM_CURRENT_RATING   FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT,ANALYTICAL_DETAILS,TRACKING_TABLE  WHERE CM.CM_CP_ID = TT_COUNTERPARTY_ID  and TT_CLIENT_ID = ?  and CDC_CLIENT_ID=TT_CLIENT_ID  AND CDC_CP_ID = CM.CM_CP_ID    AND TT_TRACKING_STATUS = 'Y'    AND  CM.CM_CP_ID=AD_COUNTERPARTY_ID  ORDER BY AD_SCORE DESC";
var newsonly_query = "SELECT distinct CM.CM_CNCTD_CP_ID,CM.CM_CP_NAME,CM.CM_ULT_PARNT_NAME,AD_SCORE,AD_SCORE_UPDTIME,CM.CM_CURRENT_RATING FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT,ANALYTICAL_DETAILS,TRACKING_TABLE WHERE CM.CM_CP_ID = TT_COUNTERPARTY_ID and TT_CLIENT_ID = ? and CDC_CLIENT_ID=TT_CLIENT_ID AND CDC_CP_ID = CM.CM_CP_ID  AND TT_TRACKING_STATUS = 'Y'  AND CM.CM_CP_ID=AD_COUNTERPARTY_ID ORDER BY AD_SCORE DESC";
var counterparty_query = "SELECT distinct CM.CM_CNCTD_CP_ID, CM.CM_CP_ID, CM.CM_CP_NAME, CM.CM_ULT_PARNT_NAME, CM.CM_NTR_RLTN, CDC.CDC_LEGAL_ENTITYTYPE, CDC.CDC_MTM_NET, CDC.CDC_CVA, AD.AD_SCORE, AD.AD_SCORE_UPDTIME, CM.CM_CURRENT_RATING   FROM COUNTERPARTY_MASTER CM   JOIN DETAILS_FROM_CLIENT CDC ON(CM.CM_CP_ID = CDC.CDC_CP_ID)   JOIN ANALYTICAL_DETAILS AD ON(AD.AD_COUNTERPARTY_ID = CM.CM_CP_ID )  WHERE CM_NTR_RLTN != 'Self' AND CM.CM_CNCTD_CP_ID = ? ORDER BY AD_SCORE DESC";
var portfoliodetails_query = "SELECT DISTINCT CDC_LEGAL_ENTITYTYPE, CDC_PRODUCTS, CDC_DEAL_COUNT, CDC_EXP_TYPE, CDC_MEASURE, CDC_TIME_BAND, CDC_LIMIT, CDC_EXPOSURE, CDC_AVAILABLE, CDC_LIMIT_EXP, CDC_TENOR   FROM DETAILS_FROM_CLIENT  WHERE CDC_CP_ID  = ?";
var counterpartyother_query = "SELECT distinct CM.CM_CP_NAME, CM.CM_CP_ID, CM.CM_ULT_PARNT_NAME, CM.CM_ULT_PARENT_ID, CM.CM_CURRENT_RATING, CLM.CLM_RISK_OFFICER, CDC.CDC_INT_RATING, CDC.CDC_CNTRY_RISK, CDC.CDC_CNTRY_DMCILE   FROM COUNTERPARTY_MASTER CM   JOIN DETAILS_FROM_CLIENT CDC ON (CDC.CDC_CP_ID = CM.CM_CP_ID)   JOIN CLIENT_MASTER CLM ON (CLM.CLM_CLIENT_ID = CDC.CDC_CLIENT_ID)  WHERE CM.CM_CP_ID = ?"
var analyticsMainSourcs_query = "SELECT NS_DOMAIN_NAME, 'News' as \"Type\",  NS_GEOGRAPHY,  NS_NUMBER_ARTICLES AS NR_SCORE,  NS_SCORE,  sysdate AS NR_CAPTURE_DTTIME    FROM NEWS_SOURCE_MASTER   WHERE NS_CP_ID = ?";
var analyticsNewsHeader_query = "SELECT NR_NEWS_HEADER,NR_PBLSH_DTTIME FROM NEWS_REPOSITORY WHERE NR_COUNTERPARTY_ID = ?";
var tagcloud_query = "select text,weight,orientation from tag_cloud where CP_ID = ?";
var newsLinks_Query = "SELECT NR_NEWS_HEADER, NR_SCORE, NR_PBLSH_DTTIME, NR_CAPTURE_DTTIME, 'Risk Officer 1' AS CLM_RISK_OFFICER   FROM NEWS_REPOSITORY NR  WHERE NR_COUNTERPARTY_ID = ?    AND NR_NEWS_SOURCE = ?";

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

app.get('/',function(req,res){
	res.render('login');
});

app.get('/charts',function(req,res){
	console.log("In the charts Query");
	var cp_id = req.query.cp_id;
	var queryArgs = [];
	queryArgs.push(cp_id);
	fetchTagClouds(res,queryArgs);
});

var fetchTagClouds = function(res,queryArgs){
	var tags_raw;
	ibmdb.open(connString, function(err, conn) { 
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query(tagcloud_query,queryArgs, function(err, rows) {
				if ( !err ) {
					console.log(rows.length + "is the number of rows");
					if(rows.length == 0){
						console.log("There are NO values");
					}else{
						tags_raw = rows;
						console.log("Fetching Tag Clouds");
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				var pgdata = {
					tags:tags_raw,
				};
				//fetchBarChartData(res,queryArgs,pgdata);
				res.setHeader('Content-Type', 'application/json');
				res.send(pgdata);
			});
		}
	});
}

var fetchBarChartData = function(res,queryArgs,pgdata){
	var barChartData;
	/*ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query(tagcloud_query,queryArgs, function(err, rows) {
				if ( !err ) {
					console.log(rows.length + "is the number of rows");
					if(rows.length == 0){
						console.log("There are NO values");
					}else{
						barChartData = rows;
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				var pgdata = {
					tags:tags_raw,
					barChart:barChartData
				};
				fetchSentiChartData(res,queryArgs,pgdata);
				//res.setHeader('Content-Type', 'application/json');
				//res.send(tags_raw);
			});
		}
	});*/
}

var fetchSentiChartData = function(res,queryArgs,pgdata){
	var sentiChartData;
	/*ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query(tagcloud_query,queryArgs, function(err, rows) {
				if ( !err ) {
					console.log(rows.length + "is the number of rows");
					if(rows.length == 0){
						console.log("There are NO values");
					}else{
						sentiChartData = rows;
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				var pgdata = {
					tags:tags_raw,
					barChart:barChartData,
					sentiChart:sentiChartData
				};
				res.setHeader('Content-Type', 'application/json');
				res.send(pgdata);
			});
		}
	});*/
}

var fetchConnectedCounterpartyList = function(conn,selectedCNCTDCP,otherDetails,res){
	console.log("In the method $$ " + selectedCNCTDCP);
	var connectedCounterPartyList;
	conn.query(counterparty_query,selectedCNCTDCP,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				connectedCounterPartyList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		fetchConnectedcounterpartyOther(conn,connectedCounterPartyList,otherDetails,res);
	});
}

var fetchConnectedcounterpartyOther = function(conn,connectedCounterPartyList,otherDetails,res){
	var pgdata = {
		ccpl:connectedCounterPartyList,
		cp_name:otherDetails[0],
		ult_parnt_name:otherDetails[1],
		ad_score:otherDetails[2],
		cdc_cntry_risk:otherDetails[3]
	};
	res.render('connectedcounterparty',{page_title:"Connected Counterparty",data:pgdata});
}

var fetchPortfolioDetailsList = function(conn,portfolioDetailsQueryArgs,otherDetails,res){
	var portfolioDetailsList;
	conn.query(portfoliodetails_query,portfolioDetailsQueryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				console.log(rows.length + " is the number of rows " + rows[0].CM_CNCTD_CP_ID);
				portfolioDetailsList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		fetchCounterpartyDetailsOther(conn,portfolioDetailsList,portfolioDetailsQueryArgs,otherDetails,res);
	});
}

var fetchCounterpartyDetailsOther = function(conn,portfolioDetailsList,portfolioDetailsQueryArgs,otherDetails,res){
	var counterpartyOtherDetails;
	console.log("THis is the Counterparty ID : " + portfolioDetailsQueryArgs[0]);
	conn.query(counterpartyother_query,portfolioDetailsQueryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				console.log(rows.length + " is the number of rows ###### " + rows[0].CM_CNCTD_CP_ID);
				counterpartyOtherDetails = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		var pgdata = {
			pdl:portfolioDetailsList,
			cod:counterpartyOtherDetails,
			cp_name:otherDetails[0],
			ult_parnt_name:otherDetails[1],
			ad_score:otherDetails[2],
		};
		res.render('counterpartydetails',{page_title:"Counterparty Details",data:pgdata});
	});
}

app.get('/connectedcounterparty',function(req,res){
	var cp_name = req.query.cp_name;
	var cnctd_cp_id = req.query.cnctd_cp_id;
	var ult_parnt_name = req.query.ult_parnt_name;
	var ad_score = req.query.ad_score;
	//var cdc_cntry_risk = req.query.cdc_cntry_risk;
	var cdc_cntry_risk = "United States";
	var selectedCNCTDCP = [];
	var otherDetails = [];
	selectedCNCTDCP.push(cnctd_cp_id);
	otherDetails.push(cp_name);
	otherDetails.push(ult_parnt_name);
	otherDetails.push(ad_score);
	otherDetails.push(cdc_cntry_risk);
	var pageData;
	ibmdb.open(connString, function(err, conn) { 
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchConnectedCounterpartyList(conn,selectedCNCTDCP,otherDetails,res);
		}
	});
});

app.get('/counterpartydetails',function(req,res){
	var cp_id = req.query.cp_id;
	var cp_name = req.query.cp_name;
	var ult_parnt_name = req.query.ult_parnt_name;
	var ad_score = req.query.ad_score;
	var portfolioDetailsQueryArgs = [];
	var otherDetails = [];
	otherDetails.push(cp_name);
	otherDetails.push(ult_parnt_name);
	otherDetails.push(ad_score);
	console.log("***********The logged in client ID is : " + client_id);
	portfolioDetailsQueryArgs.push(cp_id);
	console.log("Counterparty Id is : " + cp_id);
	ibmdb.open(connString, function(err, conn) { 
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchPortfolioDetailsList(conn,portfolioDetailsQueryArgs,otherDetails,res);
		}
	}); 
});

app.get('/analytics',function(req,res){
	var cp_id = req.query.cp_id;
	var cp_name = req.query.cp_name;
	var queryArgs = [];
	var otherDetails = [];
	otherDetails.push(cp_name);
	otherDetails.push(cp_id);
	queryArgs.push(cp_id);
	queryArgs.push(cp_id);
	queryArgs.push(cp_id);
	console.log("Counterparty Id is : " + cp_id);
	ibmdb.open(connString, function(err, conn) { 
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchAnalyticsMainSourceList(conn,queryArgs,otherDetails,res);
		}
	});
});

app.get('/newslinks',function(req,res){
	var cp_id = req.query.cp_id;
	var cp_name = req.query.cp_name;
	var domain = req.query.domain;
	var queryArgs = [];
	var otherDetails = [];
	otherDetails.push(cp_name);
	otherDetails.push(domain);
	queryArgs.push(cp_id);
	queryArgs.push(domain);
	console.log("Counterparty Id is : " + cp_id);
	ibmdb.open(connString, function(err, conn) { 
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchNewsLinksList(conn,queryArgs,otherDetails,res);
		}
	});
});

var fetchNewsLinksList = function(conn,queryArgs,otherDetails,res){
	var newsLinksList;
	conn.query(newsLinks_Query,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				newsLinksList = rows;
				console.log("News link is  : " + newsLinksList[0].NR_SCORE);
			}
		}else{
			console.log("error occurred " + err.message);
		}
		var pgdata = {
			nll:newsLinksList,
			cp_name:otherDetails[0],
			domain:otherDetails[1]
		};
		res.render('newslinks',{page_title:"News Links",data:pgdata});
	});
}

var fetchAnalyticsMainSourceList = function(conn,queryArgs,otherDetails,res){
	var analyticsMainSourceList;
	conn.query(analyticsMainSourcs_query,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				console.log(rows.length + " is the number of rows " + rows[0].NS_CP_ID);
				analyticsMainSourceList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		fetchAnalyticsNewsHeader(conn,analyticsMainSourceList,queryArgs,otherDetails,res);
	});
}

var fetchAnalyticsNewsHeader = function(conn,analyticsMainSourceList,queryArgs,otherDetails,res){
	var analyticsNewsHeaderList;
	conn.query(analyticsNewsHeader_query,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				analyticsNewsHeaderList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		var pgdata = {
			msl:analyticsMainSourceList,
			nhl:analyticsNewsHeaderList,
			cp_name:otherDetails[0],
			cp_id:otherDetails[1]
		};
		res.render('analyticsdetails',{page_title:"Analytics Details",data:pgdata});
	});
}

app.post('/auth', function(req, res) {
	var client = req.body.username;
	if(client === "internal"){
		client = login_client;
	}else{
		login_client = client;
	}
	if(client == "chris@MS.com"){
		client_id = "CLID1";
		var queryArgs = [];
		queryArgs.push(client_id);
		ibmdb.open(connString, function(err, conn) { 
			if (err ) {
				res.send("error occurred " + err.message);
			}
			else{
				conn.query(dashboard_query,queryArgs,function(err, rows) {
					if ( !err ) {
						console.log(rows.length + "is the number of rows");
						if(rows.length == 0){
							console.log("There are NO values");
						}else{
							rows.map(function(elem){
								var mtmString = elem.CDC_MTM_NET;
								if(null !== mtmString){
									mtmNumber = parseInt(elem.CDC_MTM_NET);
									if(mtmNumber < 0) {
										mtmNumber = Math.abs(mtmNumber);
										mtmString = "(" + mtmNumber + ")";
									}
									elem.CDC_MTM_NET = mtmString;
								}
								return elem;
							});
						}
					}else{
						console.log("error occurred " + err.message);
					}
					conn.close(function(){
						console.log("Connection Closed");
					});
					res.render('dashboard',{page_title:"Dashboard",data:rows});
				});
			}
		});
	}else if(client == "mark@CS.com"){
		client_id = "CLID2";
		var queryArgs = [];
		queryArgs.push(client_id);
		ibmdb.open(connString,function(err, conn) { 
			if (err ) {
				res.send("error occurred " + err.message);
			}
			else{
				conn.query(newsonly_query,queryArgs,function(err, rows) {
					if ( !err ) {
						console.log(rows.length + " is the number of rows");
						if(rows.length == 0){
							console.log("There are NO values");
						}
					}else{
						console.log("error occurred " + err.message);
					}
					conn.close(function(){
						console.log("Connection Closed");
					});
					res.render('newsonly',{page_title:"News Only",data:rows});
				});
			}
		}); 
	}
	else if(client == "admin"){
		res.render('admin',{page_title:"Admin"});
	}
});

app.post('/crawl', function(req, res) {
	var crawl_data = '';
	try
	{
		var conn = ibmdb.openSync(connString); 
		console.log("*************** DB open.");
		conn.querySync("set schema EWS_DATABASE");
		var queryString = "select CM_CP_NAME, NS_DOMAIN_URL, CM_CP_ID,NS_DOMAIN_NAME from COUNTERPARTY_MASTER, NEWS_SOURCE_MASTER WHERE CM_CP_ID=NS_CP_ID and NS_TRACKING_STATUS='Y' and CM_TRACKING_STATUS='Y'";
		crawl_data = conn.querySync(queryString);
		conn.close();
	} catch (e)
	{
		console.error("Error: ", e.message);
	}
	console.log("Data is selected. No of records : ", crawl_data.length);
	
	for (var j=0;j<crawl_data.length;j++)
	{
		(function(j) {
			SEARCH_WORD = crawl_data[j].CM_CP_NAME;
		   START_URL = crawl_data[j].NS_DOMAIN_URL;
		   CP_ID=crawl_data[j].CM_CP_ID;
		   DOMAIN_NAME=crawl_data[j].NS_DOMAIN_NAME;
		   param.numPagesVisited = 0;
		   console.log("Searching for ", crawl_data[j].CM_CP_NAME,"on ", START_URL= crawl_data[j].NS_DOMAIN_URL, "CP ID : ", crawl_data[j].CM_CP_ID);
		  pagesVisited = {};
		  pagesToVisit = [];
		   url = new URL(START_URL);
		   baseUrl = url.protocol + "//" + url.hostname;
		   pagesToVisit.push(START_URL);
		   crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME);
		})(j);
	}
	  console.log("Crawler ran successfully.");


function visitPage(url, SEARCH_WORD, CP_ID, DOMAIN_NAME, callback) {
// Add page to our set
pagesVisited[url] = true;
param.numPagesVisited++;
// Make the request
console.log("Visiting Page " + url);

//*problem is here
request(url, function(error, response, body) {
   // Check statuscode (200 is HTTP OK)
  // console.log("reached here");
   //console.log("Status code: " + response.statusCode);

//if (response == undefined || response.statusCode != 200){ console.log("there is a prob"); }  ---plz do not delete


//if (!error && response.statusCode == 200) {      ---plz do not delete //}

	 if(response == undefined || response.statusCode !== 200) {  
	 
	 try
	 {
			callback(SEARCH_WORD, CP_ID, DOMAIN_NAME);
	 return;  
	 }catch (e)
		{
	  console.error("Error: ", e.message);
		callback(SEARCH_WORD, CP_ID, DOMAIN_NAME);
		  }
	 
   }
   // Parse the document body
   var $ = cheerio.load(body);
   
   var isWordFound = searchForWord($, SEARCH_WORD);
   if(isWordFound) {
	 console.log('Word ' + SEARCH_WORD + ' found at page ' + url);
			
	 console.log("Inserting records into the database");
		 try
		{
			var conn = ibmdb.openSync(connString); 
			console.log("*************** DB open.");
			conn.querySync("set schema EWS_DATABASE");
			var insertString = "insert into NEWS_REPOSITORY (NR_SEQUENCE_NO,NR_COUNTERPARTY_ID,NR_NEWS_URL,NR_NEWS_SOURCE) VALUES (" +
			"nvl((select max(NR_SEQUENCE_NO) from NEWS_REPOSITORY),0)+1"+",'"+CP_ID+"', '"+url+"','"+DOMAIN_NAME+"')";
			console.log("Insert Query : ", insertString);
			conn.querySync(insertString);
			console.log("Inserted successfully");
			conn.close();
		} catch (e)
		{
			console.error("Error: ", e.message);
		}
	 //console.log($('html > body').text()); // get text from news website
   } else {
	 //collectInternalLinks($);
	 // In this short program, our callback is just calling crawl()
	 //callback(SEARCH_WORD, CP_ID, DOMAIN_NAME);
   }
});
}

function crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME) {
if(param.numPagesVisited >= MAX_PAGES_TO_VISIT) {
  console.log("Reached max limit of number of pages to visit.");
  return;
}
var nextPage = pagesToVisit.pop();

if (nextPage in pagesVisited) {
  // We've already visited this page, so repeat the crawl
  crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME);
  conn.close();
} 
else {
  // New page we haven't visited
  visitPage(nextPage, SEARCH_WORD, CP_ID, DOMAIN_NAME, crawl);
}
}

function searchForWord($, word) {
var bodyText = $('html > body').text().toLowerCase();
return(bodyText.indexOf(word.toLowerCase()) !== -1);
}

function collectInternalLinks($) {
  var relativeLinks = $("a[href^='/']");
  console.log("Found " + relativeLinks.length + " relative links on page");
  relativeLinks.each(function() {
	  pagesToVisit.push(baseUrl + $(this).attr('href'));
  });
}

res.status(200).send('OK');
});

//DB2 Connection
var db2 = {
        db: "BLUDB",
        hostname: "dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net",
        port: 50000,
        username: "bluadmin",
        password: "Yjg1ZThkNjA5YThh",
        schema: "EWS_DATABASE"
     };

var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port + ";CurrentSchema=" + db2.schema;

//Chat
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var path    = require("path");

// Create the service wrapper
var conversation = new Conversation({
	// If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
	// After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
	username: 'd1fbca2a-da62-4d75-8d61-363284774fc0',
	password: 'm0Jz0onQNVoV',
	url: 'https://gateway.watsonplatform.net/conversation/api',
	version_date: '2016-10-21',
	version: 'v1'
  });

  app.get('/chat',function(req,res){
	console.log('In chat post');
	//res.sendFile(path.join(__dirname+'/chat.html'));
	res.render("chat");
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
	var workspace = 'a41ebcc2-fbd8-4743-89d9-7120d706cfc3';
	if (!workspace) {
	  return res.json({
		'output': {
		  'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
		}
	  });
	}
	var payload = {
	  workspace_id: workspace,
	  context: req.body.context || {},
	  input: req.body.input || {}
	};
  
	// Send the input to the conversation service
	conversation.message(payload, function(err, data) {
	  if (err) {
		return res.status(err.code || 500).json(err);
	  }
	  else if(data.context.news == true) // set depending on response
	  {
		  var querydata = data.context.company ; // based on response
		  discovery1.query({
						environment_id: '0d322587-8eb3-4650-bfbf-8c39f4bcc63b',
						collection_id : '9e385ba7-973f-43f1-96ec-074de0299949',
						  "count": 1,
						  "return": "title,enrichedTitle.concepts.text,enrichedTitle.keywords.text,enrichedTitle.text,url,host,blekko.chrondate",
						  "query": querydata +",language:english",
							
						  "aggregations": [
							"nested(enrichedTitle.entities).filter(enrichedTitle.entities.type:Company).term(enrichedTitle.entities.text)",
							"nested(enrichedTitle.entities).filter(enrichedTitle.entities.type:Person).term(enrichedTitle.entities.text)",
							"term(enrichedTitle.concepts.text)",
							"term(blekko.basedomain).term(docSentiment.type::positive)",
							"term(docSentiment.type::positive)",
							"min(docSentiment.score)",
							"max(docSentiment.score)",
							"filter(enrichedTitle.entities.type::Company).term(enrichedTitle.entities.text).timeslice(blekko.chrondate,1day).term(docSentiment.type::positive)",

						  ],
						  "filter": "blekko.hostrank>20,blekko.chrondate>1500316200,blekko.chrondate<1500921000"

					}, function(error, newsdata) {
						if(error)
							return res.json(updateMessage(payload, error));
						else {
						      var newdata = { url : "" , text : ""};
							  newdata.url = newsdata.results[0].url;	
							  newdata.text = newsdata.results[0].enrichedTitle.text ;
							  console.log(newdata);
							  data.output.text = "";
							  data.output.text = newsdata.results[0].enrichedTitle.text +"\n"+ newsdata.results[0].url;
							  return res.json(updateMessage(payload, data));
						}
					});
	  }
	  else return res.json(updateMessage(payload, data));
	});
  });
   
  /**
   * Updates the response text using the intent confidence
   * @param  {Object} input The request to the Conversation service
   * @param  {Object} response The response from the Conversation service
   * @return {Object}          The response with the updated message
   */
  function updateMessage(input, response) {
	  console.log("input",input);
	  console.log("response",response);
	var responseText = null;
	if (!response.output) {
	  response.output = {};
	} else {
	  return response;
	}
	if (response.intents && response.intents[0]) {
	  var intent = response.intents[0];
	  // Depending on the confidence of the response the app can return different messages.
	  // The confidence will vary depending on how well the system is trained. The service will always try to assign
	  // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
	  // user's intent . In these cases it is usually best to return a disambiguation message
	  // ('I did not understand your intent, please rephrase your question', etc..)
	  if (intent.confidence >= 0.75) {
		responseText = 'I understood your intent was ' + intent.intent;
	  } else if (intent.confidence >= 0.5) {
		responseText = 'I think your intent was ' + intent.intent;
	  } else {
		responseText = 'I did not understand your intent';
	  }
	}
	response.output.text = responseText;
	return response;
  }

  app.use('/api/speech-to-text/', require('./stt-token.js'));