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
var bodyParser = require('body-parser');

//Crawling Logic
var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var MAX_PAGES_TO_VISIT=2;
var numPagesVisited = 0;
var pagesVisited = {};
var pagesToVisit = [];
var url = " ";
var baseUrl = " ";
 var news_header=" ";
 var SEARCH_WORD =" ";
var START_URL=" ";
var CRAWL_CP_ID =" ";
var DOMAIN_NAME=" ";
var domain_level="";
var login_client = "";
		  
var max_seq_no=" ";
var param = new Object();

//var detected_language=" ";
var news_body=" ";

//Scoring Logic
const path = require("path");
app.set("json spaces", 2);
app.set("json replacer", null);
var Promise = require('promise');

//Discovery
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
var discovery1 = new DiscoveryV1({
	username: '6fc767dc-0ae5-4543-b997-7b89f806fee5',
	password: 'lFieDVyaZJNe',
	version_date: '2016-12-01'
});


var dashboard_query = "SELECT distinct CM_CP_ID,CM_CP_NAME,CM_ULT_PARNT_NAME,CM_CRNT_OBLI_RATING,CM_CRNT_SHORT_SCORE_OBLI,CM_PREV_OBLI_RATING,CM_PREV_CLTRL_RATING,CM_CRNT_CLTRL_RATING,CM_CRNT_MR_IR,CM_PREV_MR_IR,CM_LAST_REFRESH_TIME FROM COUNTERPARTY_MASTER ORDER BY CM_CP_NAME";
var newsonly_query = "SELECT distinct CM.CM_CP_ID,CM.CM_CNCTD_CP_ID,CM.CM_CP_NAME,CM.CM_ULT_PARNT_NAME,AD_SCORE,AD_SCORE_UPDTIME,AD_PROBABILITY FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT,ANALYTICAL_DETAILS,TRACKING_TABLE WHERE CM.CM_CP_ID = TT_COUNTERPARTY_ID and TT_CLIENT_ID = ? and CDC_CLIENT_ID=TT_CLIENT_ID AND CDC_CP_ID = CM.CM_CP_ID  AND TT_TRACKING_STATUS = 'Y'  AND CM.CM_CP_ID=AD_COUNTERPARTY_ID ORDER BY AD_SCORE DESC";
var counterparty_query = "SELECT distinct CM.CM_CNCTD_CP_ID, CM.CM_CP_ID, CM.CM_CP_NAME, CM.CM_ULT_PARNT_NAME, CM.CM_NTR_RLTN, CDC.CDC_LEGAL_ENTITYTYPE, CDC.CDC_MTM_NET, CDC.CDC_CVA, AD.AD_SCORE, AD.AD_SCORE_UPDTIME   FROM COUNTERPARTY_MASTER CM   JOIN DETAILS_FROM_CLIENT CDC ON(CM.CM_CP_ID = CDC.CDC_CP_ID)   JOIN ANALYTICAL_DETAILS AD ON(AD.AD_COUNTERPARTY_ID = CM.CM_CP_ID )  WHERE CM.CM_CNCTD_CP_ID = ? ORDER BY AD_SCORE DESC";
var portfoliodetails_query = "SELECT DISTINCT CDC_LEGAL_ENTITYTYPE, CDC_PRODUCTS, cast(CDC_DEAL_COUNT as INTEGER) as CDC_DEAL_COUNT, CDC_EXP_TYPE, CDC_MEASURE, CDC_TIME_BAND, CDC_LIMIT, CDC_EXPOSURE, CDC_AVAILABLE, CDC_LIMIT_EXP, CDC_TENOR   FROM DETAILS_FROM_CLIENT  WHERE CDC_CP_ID  = ?";
var counterpartyother_query = "SELECT distinct CM.CM_CP_NAME, CM.CM_CP_ID, CM.CM_ULT_PARNT_NAME, CM.CM_ULT_PARENT_ID, CLM.CLM_RISK_OFFICER, CDC.CDC_INT_RATING, CDC.CDC_CNTRY_RISK, CDC.CDC_CNTRY_DMCILE   FROM COUNTERPARTY_MASTER CM   JOIN DETAILS_FROM_CLIENT CDC ON (CDC.CDC_CP_ID = CM.CM_CP_ID)   JOIN CLIENT_MASTER CLM ON (CLM.CLM_CLIENT_ID = CDC.CDC_CLIENT_ID)  WHERE CM.CM_CP_ID = ?"
var counterpartyName_Query = "SELECT CM_CP_NAME from COUNTERPARTY_MASTER WHERE CM_CP_ID = ?"; 
var analyticsMainSourcs_query = "SELECT NS_DOMAIN_NAME, 'News' as \"Type\",  NS_GEOGRAPHY,  NS_NUMBER_ARTICLES AS NR_SCORE,  NS_SCORE,  sysdate AS NR_CAPTURE_DTTIME    FROM NEWS_SOURCE_MASTER   WHERE NS_CP_ID = ? ORDER BY NS_SCORE DESC";
var analyticsNewsHeader_query = "SELECT NR_NEWS_HEADER,sysdate as NR_PBLSH_DTTIME FROM NEWS_REPOSITORY WHERE NR_COUNTERPARTY_ID = ?";
var tagcloud_query = "select text,weight,orientation from tag_cloud where CP_ID = ?";
var borrowerlevel_query = "SELECT BR_CP_ID,BR_CRNT_OBLI_RATING,BR_OBLI_RISK_RATING_TRANSITION,BR_HIGHEST_CHANGE_ORR,BR_DRIVERS_OF_CHANGE,BR_CRRS_BREACHED,BR_CRAWLING_DATE FROM BORROWER_LEVEL WHERE BR_CP_ID = ? ORDER BY BR_CRAWLING_DATE";
var borrowerlevel_query_desc = "SELECT BR_CP_ID,BR_CRNT_OBLI_RATING,BR_OBLI_RISK_RATING_TRANSITION,BR_HIGHEST_CHANGE_ORR,BR_DRIVERS_OF_CHANGE,BR_CRRS_BREACHED,BR_CRAWLING_DATE FROM BORROWER_LEVEL WHERE BR_CP_ID = ? ORDER BY BR_CRAWLING_DATE DESC LIMIT 2";
var borrowerlevel_query_max = "SELECT * from BORROWER_LEVEL where BR_CRNT_OBLI_RATING = (SELECT MAX(BR_CRNT_OBLI_RATING) FROM BORROWER_LEVEL WHERE BR_CP_ID = ?) LIMIT 1";
var IR_Query = "SELECT PR_CP_ID,PR_RATING_MR_AND_IR,PR_TRANSITION_MR_AND_IR,PR_DRIVERS_OF_CHANGE_MR_AND_IR,PR_HIGHEST_CHANGE_MR_AND_IR,PR_MR_AND_IR_BREACHED,PR_CRAWLING_DATE FROM PORTFOLIO_LEVEL where PR_CP_ID = ?";
var IR_Query_desc = "SELECT PR_CP_ID,PR_RATING_MR_AND_IR,PR_TRANSITION_MR_AND_IR,PR_DRIVERS_OF_CHANGE_MR_AND_IR,PR_HIGHEST_CHANGE_MR_AND_IR,PR_MR_AND_IR_BREACHED,PR_CRAWLING_DATE FROM PORTFOLIO_LEVEL where PR_CP_ID = ? ORDER BY PR_CRAWLING_DATE DESC LIMIT 2";
var IR_Query_max = "SELECT * FROM PORTFOLIO_LEVEL WHERE PR_RATING_MR_AND_IR= (SELECT MAX(PR_RATING_MR_AND_IR) FROM PORTFOLIO_LEVEL WHERE PR_CP_ID = ?) LIMIT 1";
var collateral_Query = "SELECT CR_CP_ID,CR_CRNT_CLTRL_RATING,CR_HIGHEST_CHANGE_ORR,CR_CRRS_BREACHED,CR_CLTRL_RISK_RATING_TRANSITION,CR_DRIVERS_OF_CHANGE,CR_IF_ANALYSIS,CR_CRAWLING_DATE FROM COLLATERAL_RISK_RATING where CR_CP_ID = ?";
var collateral_Query_desc = "SELECT CR_CP_ID,CR_CRNT_CLTRL_RATING,CR_HIGHEST_CHANGE_ORR,CR_CRRS_BREACHED,CR_CLTRL_RISK_RATING_TRANSITION,CR_DRIVERS_OF_CHANGE,CR_IF_ANALYSIS,CR_CRAWLING_DATE FROM COLLATERAL_RISK_RATING where CR_CP_ID = ? ORDER BY CR_CRAWLING_DATE DESC LIMIT 2";
var collateral_Query_max = "SELECT * FROM COLLATERAL_RISK_RATING WHERE CR_CRNT_CLTRL_RATING = (SELECT MAX(CR_CRNT_CLTRL_RATING) FROM COLLATERAL_RISK_RATING WHERE CR_CP_ID = ?) LIMIT 1";
var newsLinks_Query = "SELECT NR_NEWS_URL,NR_NEWS_HEADER, NR_SCORE, NR_PBLSH_DTTIME, NR_CAPTURE_DTTIME, DECODE(SIGN(NR_SCORE-80),1,'Ben Osmow',' ') AS CLM_RISK_OFFICER FROM NEWS_REPOSITORY NR WHERE NR_COUNTERPARTY_ID =? AND NR_NEWS_SOURCE = ?";
var barChart_Query = "SELECT date,sentimentScore,creditScore FROM BAR_CHART WHERE CP_ID = 'CIDFNP'";
var sentiChart_Query = "SELECT positive,negative,neutral FROM SENTIMENT_CHART WHERE CP_ID = 'CIDFNP'";
var enquireChat_Query = "SELECT distinct CDC_MTM_NET AS CDC_MTM_NET, AD_SCORE AS AD_SCORE FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT,ANALYTICAL_DETAILS AD, TRACKING_TABLE TT  WHERE CM.CM_CP_ID = ?  and TT_CLIENT_ID = ?  and CDC_CLIENT_ID=TT_CLIENT_ID  AND CDC_CP_ID = CM.CM_CP_ID    AND TT_TRACKING_STATUS = 'Y'    AND  CM.CM_CP_ID=AD_COUNTERPARTY_ID  ORDER BY AD_SCORE DESC";
var connectedCounterpartyChat_Query = "SELECT distinct CM.CM_CP_NAME FROM COUNTERPARTY_MASTER CM  WHERE CM.CM_CNCTD_CP_ID = (SELECT CM_CNCTD_CP_ID FROM COUNTERPARTY_MASTER WHERE CM_CP_ID = 'CIDGOPRO') AND CM_NTR_RLTN != 'Self'";
var collateralData_Query = "SELECT CLD_CP_ID,CLD_COLLATERAL_HAIRCUT_MCS_EQUITY_10,CLD_COLLATERAL_HAIRCUT_MCS_INTEREST_RATE_10,CLD_AVAILABLE_COLLATERAL_10,CLD_COLLATERAL_HAIRCUT_MCS_EQUITY_20,CLD_COLLATERAL_HAIRCUT_MCS_INTEREST_RATE_20,CLD_AVAILABLE_COLLATERAL_20 FROM COLLATERAL_DATA WHERE CLD_CP_ID = ?";
var growthMaster_query = "SELECT * FROM GROWTH_MASTER WHERE GR_CP_ID = ?";

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
	fetchBorrowerLevel(res,queryArgs);
});


app.get('/tag',function(req,res){
	console.log("In the charts Query");
	var cp_id = req.query.cp_id;
	var queryArgs = [];
	queryArgs.push(cp_id);
	fetchTagClouds(res,queryArgs);
});


var fetchTagClouds = function(res,queryArgs){
	var tagData;
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
						tagData = rows;
						console.log("Fetching Tag Clouds");
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				var pgdata = {
					tags:tagData
				};
				res.setHeader('Content-Type', 'application/json');
				res.send(pgdata);
				/*var pgdata = {
					tags:tagData,
					bar : [{"date": "2016-11","sentimentScore": 47,"creditScore": 50}, {"date": "2016-12","sentimentScore": 42,"creditScore": 40}, {"date": "2017-01","sentimentScore": 53,"creditScore": 50},{"date": "2017-02","sentimentScore": 47,"creditScore": 50}, {"date": "2017-03","sentimentScore": 42,"creditScore": 40}, {"date": "2017-04","sentimentScore": 53,"creditScore": 50},{"date": "2017-05","sentimentScore": 47,"creditScore": 50}, {"date": "2017-06","sentimentScore": 42,"creditScore": 40}, {"date": "2017-07","sentimentScore": 53,"creditScore": 50},{"date": "2017-08","sentimentScore": 47,"creditScore": 50}, {"date": "2017-09","sentimentScore": 42,"creditScore": 40}, {"date": "2017-10","sentimentScore": 53,"creditScore": 50}],
					sent_pos : 33,
					sent_neg : 33,
					sent_neu : 34
				};*/
			});
		}
	});
}

var fetchBorrowerLevel = function(res,queryArgs){
	var data;
	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query(borrowerlevel_query,queryArgs, function(err, rows) {
				if ( !err ) {
					console.log(rows.length + "is the number of rows");
					if(rows.length == 0){
						console.log("There are NO values");
					}else{
						data = rows;
						console.log("Fetching Borrower Level Records");
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				//console.log(data);
				var y = [];
				data.map(function(x){
					var val = parseInt(x.BR_CRNT_OBLI_RATING);
					if(val <= 40){
						var d = { y: parseInt(x.BR_CRNT_OBLI_RATING), color: "green",name:"Hello World" };
					}else if(val >  40 && val <= 80){
						var d = { y: parseInt(x.BR_CRNT_OBLI_RATING), color: "orange" };
					}else{
						var d = { y: parseInt(x.BR_CRNT_OBLI_RATING), color: "red" };
					}
					
					y.push(d);
				})
				var pgdata = {
					borrowerLevelData : y
				};
				fetchIRMRData(res,queryArgs,pgdata);
			});
		}
	});
}

var fetchIRMRData = function(res,queryArgs,pgdata){
	var IRMRData;
	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query(IR_Query,queryArgs, function(err, rows) {
				if ( !err ) {
					console.log(rows.length + "is the number of rows");
					if(rows.length == 0){
						console.log("There are NO values");
					}else{
						IRMRData = rows;
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				var y = [];
				IRMRData.map(function(x){
					var val = parseInt(x.PR_RATING_MR_AND_IR);
					if(val <= 40){
						var d = { y: parseInt(x.PR_RATING_MR_AND_IR), color: "green" };
					}else if(val >  40 && val <= 80){
						var d = { y: parseInt(x.PR_RATING_MR_AND_IR), color: "orange" };
					}else{
						var d = { y: parseInt(x.PR_RATING_MR_AND_IR), color: "red" };
					}
					y.push(d);
				})
				//pgdata.IRMRData =  IRMRData;
				pgdata.IRMRData =  y;
				fetchCollateralChartData(res,queryArgs,pgdata);
				
			});
		}
	});
}

var fetchCollateralChartData = function(res,queryArgs,pgdata){
	var collateralData;
	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query(collateral_Query,queryArgs, function(err, rows) {
				if ( !err ) {
					console.log(rows.length + "is the number of rows");
					if(rows.length == 0){
						console.log("There are NO values");
					}else{
						collateralData = rows;
					}
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				var y = [];
				collateralData.map(function(x){
					var val = parseInt(x.CR_CRNT_CLTRL_RATING);
					if(val <= 2){
						var d = { y: parseInt(x.CR_CRNT_CLTRL_RATING), color: "green" };
					}else if(val >  2 && val <= 4){
						var d = { y: parseInt(x.CR_CRNT_CLTRL_RATING), color: "orange" };
					}else{
						var d = { y: parseInt(x.CR_CRNT_CLTRL_RATING), color: "red" };
					}
					y.push(d);
				})
				pgdata.collateralData =  y;
				//pgdata.collateralData = [{ y: 30, color: "green" }, { y: 25, color: "green" }, { y: 60, color: "green" }, { y: 55, color: "green" }, { y: 45, color: "green" }, { y: 47, color: "green" }, { y: 37, color: "green" }, { y: 80, color: "#bd0d0d" }, { y: 90, color: "#bd0d0d" }, { y: 75, color: "#bd0d0d" }, { y: 65, color: "green" }, { y: 60, color: "green" }, { y: 55, color: "green" }, { y: 50, color: "green" }, { y: 54, color: "green" }, { y: 60, color: "green" }, { y: 40, color: "green" }, { y: 65, color: "green" }, { y: 48, color: "green" }, { y: 69, color: "green" }, { y: 62, color: "green" }, { y: 45, color: "green" }, { y: 70, color: "green" }, { y: 70, color: "green" }, { y: 70, color: "green" }, { y: 80, color: "#bd0d0d" }, { y: 90, color: "#bd0d0d" }, { y: 50, color: "#bd0d0d" }, { y: 50, color: "green" }, { y: 45, color: "green" }, { y: 50, color: "green" }];
				res.setHeader('Content-Type', 'application/json');
				res.send(pgdata);
			});
		}
	});
}

var fetchConnectedCounterpartyList = function(conn,selectedCNCTDCP,otherDetails,res){
	console.log("In the method $$ " + selectedCNCTDCP);
	var connectedCounterPartyList;
	conn.query(counterparty_query,selectedCNCTDCP,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				connectedCounterPartyList = parseMTM(rows);
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

app.get('/bootstrap',function(req,res){
	console.log("The counterparty id is  : " + req.query.cp_id)
	var cp_id = req.query.cp_id;
	//var cp_name = req.query.cp_name;
	var queryArgs = [];
	//var otherDetails = [];
	//otherDetails.push(cp_name);
	//otherDetails.push(cp_id);
	queryArgs.push(cp_id);
	//queryArgs.push(cp_id);
	//queryArgs.push(cp_id);
	console.log("Counterparty Id is : " + cp_id);

	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchBootstrapMainSourceList(conn,queryArgs,res);
		}
	});
});

var fetchBootstrapMainSourceList = function(conn,queryArgs,res){
	var pgdata = {};
	conn.query(borrowerlevel_query_desc,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				borrowerList = rows;
				var latestRating = parseInt(borrowerList[0].BR_CRNT_OBLI_RATING);
				var yesterdayRating = parseInt(borrowerList[1].BR_CRNT_OBLI_RATING);

				var difference = latestRating - yesterdayRating;

				pgdata = {
					cp_id:queryArgs[0],
					BR_CRNT_OBLI_RATING: borrowerList[0].BR_CRNT_OBLI_RATING,
					BR_OBLI_RISK_RATING_TRANSITION: borrowerList[0].BR_OBLI_RISK_RATING_TRANSITION,
					BR_DIFFERENCE:difference,
					BR_HIGHEST_CHANGE_ORR: borrowerList[0].BR_HIGHEST_CHANGE_ORR,
					BR_DRIVERS_OF_CHANGE: borrowerList[0].BR_DRIVERS_OF_CHANGE,
					BR_CRRS_BREACHED: borrowerList[0].BR_CRRS_BREACHED,
					BR_CRAWLING_DATE: borrowerList[0].BR_CRAWLING_DATE
				};
			}
		}else{
			console.log("error occurred " + err.message);
		}

		//fetchBorrowerMax(conn,queryArgs,res,pgdata);
	});

	conn.query(borrowerlevel_query_max,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				borrowerMax = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		pgdata.BR_HIGHEST_CHANGE_ORR_MAX = borrowerMax[0].BR_CRNT_OBLI_RATING;
	});

	conn.query(IR_Query_desc,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				IRList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}

		var latestRating = parseInt(IRList[0].PR_TRANSITION_MR_AND_IR);
		var yesterdayRating = parseInt(IRList[1].PR_TRANSITION_MR_AND_IR);

		var difference = latestRating - yesterdayRating;
		
		pgdata.PR_TRANSITION_MR_AND_IR=IRList[0].PR_TRANSITION_MR_AND_IR;
		pgdata.PR_RATING_MR_AND_IR = IRList[0].PR_RATING_MR_AND_IR;
		pgdata.PR_DRIVERS_OF_CHANGE_MR_AND_IR=IRList[0].PR_DRIVERS_OF_CHANGE_MR_AND_IR;
		pgdata.PR_DIFFERENCE = difference;
		pgdata.PR_HIGHEST_CHANGE_MR_AND_IR=IRList[0].PR_HIGHEST_CHANGE_MR_AND_IR;
		pgdata.PR_MR_AND_IR_BREACHED=IRList[0].PR_MR_AND_IR_BREACHED;
		pgdata.PR_CRAWLING_DATE=IRList[0].PR_CRAWLING_DATE;
	});

	conn.query(IR_Query_max,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				IRMax = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		pgdata.PR_RATING_MR_AND_IR_MAX = IRMax[0].PR_RATING_MR_AND_IR;

	});

	conn.query(collateral_Query_desc,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				collateralList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}

		var latestRating = parseInt(collateralList[0].CR_CRNT_CLTRL_RATING);
		var yesterdayRating = parseInt(collateralList[1].CR_CRNT_CLTRL_RATING);

		var difference = latestRating - yesterdayRating;
	
		pgdata.CR_CRNT_CLTRL_RATING=collateralList[0].CR_CRNT_CLTRL_RATING;
		pgdata.CR_HIGHEST_CHANGE_ORR=collateralList[0].CR_HIGHEST_CHANGE_ORR;
		pgdata.CR_DIFFERENCE = difference;
		pgdata.CR_CRRS_BREACHED=collateralList[0].CR_CRRS_BREACHED;
		pgdata.CR_CLTRL_RISK_RATING_TRANSITION=collateralList[0].CR_CLTRL_RISK_RATING_TRANSITION;
		pgdata.CR_DRIVERS_OF_CHANGE=collateralList[0].CR_DRIVERS_OF_CHANGE;
		pgdata.CR_IF_ANALYSIS=collateralList[0].CR_IF_ANALYSIS;
		pgdata.CR_CRAWLING_DATE=collateralList[0].CR_CRAWLING_DATE;

	});

	conn.query(collateral_Query_max,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				CollateralMax = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}

		pgdata.CR_CRNT_CLTRL_RATING_MAX = CollateralMax[0].CR_CRNT_CLTRL_RATING;

	});

	conn.query(collateralData_Query,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				collateralDataReport = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		conn.close(function(){
			console.log("Connection Closed");
		});

		pgdata.CLD_COLLATERAL_HAIRCUT_MCS_EQUITY_10 = collateralDataReport[0].CLD_COLLATERAL_HAIRCUT_MCS_EQUITY_10;
		pgdata.CLD_COLLATERAL_HAIRCUT_MCS_INTEREST_RATE_10 = collateralDataReport[0].CLD_COLLATERAL_HAIRCUT_MCS_INTEREST_RATE_10;
		pgdata.CLD_AVAILABLE_COLLATERAL_10 = collateralDataReport[0].CLD_AVAILABLE_COLLATERAL_10;
		pgdata.CLD_COLLATERAL_HAIRCUT_MCS_EQUITY_20 = collateralDataReport[0].CLD_COLLATERAL_HAIRCUT_MCS_EQUITY_20;
		pgdata.CLD_COLLATERAL_HAIRCUT_MCS_INTEREST_RATE_20 = collateralDataReport[0].CLD_COLLATERAL_HAIRCUT_MCS_INTEREST_RATE_20;
		pgdata.CLD_AVAILABLE_COLLATERAL_20 = collateralDataReport[0].CLD_AVAILABLE_COLLATERAL_20;

	});

	conn.query(counterpartyName_Query,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				counterparty_name = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}

		pgdata.CM_CP_NAME = counterparty_name[0].CM_CP_NAME;

		res.render('bootstrap',{page_title:"Bootstrap",data:pgdata});

	});

}


var fetchBorrowerMax = function(conn,queryArgs,res,pgdata){

	conn.query(borrowerlevel_query_max,queryArgs,function(err, rows) {
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				borrowerMax = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		pgdata.BR_HIGHEST_CHANGE_ORR = borrowerMax[0].BR_CRNT_OBLI_RATING;
	});
}


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
	var pgdata = {};	
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
		pgdata = {
			msl:analyticsMainSourceList,
			nhl:analyticsNewsHeaderList,
			cp_name:otherDetails[0],
			cp_id:otherDetails[1]
		};
	});

	conn.query(growthMaster_query,queryArgs,function(err, rows) {
		console.log("*******************************************")
		console.log(queryArgs);
		if ( !err ) {
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				growthMasterList = rows;
				console.log(growthMasterList);
			}
		}else{
			console.log("error occurred " + err.message);
		}
		conn.close(function(){
			console.log("Connection Closed");
		});
		pgdata.gm = growthMasterList;
		res.render('analyticsdetails',{page_title:"Analytics Details",data:pgdata});
	});
}

var parseMTM = function(rows){
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
	return rows;
}

app.post('/auth', function(req, res) {
	var pgdata = {};
	var client = req.body.username;
	if(client === "internal"){
		client = login_client;
	}else{
		login_client = client;
	}
	if(client == "credit-user"){
		client_id = "C27";
		var queryArgs = [];
		queryArgs.push(client_id);
		ibmdb.open(connString, function(err, conn) {
			if (err ) {
				res.send("error occurred " + err.message);
			}
			else{
				conn.query(IR_Query_max,queryArgs,function(err, rows) {
					if ( !err ) {
						if(rows.length == 0){
							console.log("There are NO values");
						}else{
							IRList = rows;
						}
					}else{
						console.log("error occurred " + err.message);
					}
					conn.close(function(){
						console.log("Connection Closed");
					});
			
					pgdata.PR_RATING_MR_AND_IR = IRList[0].PR_RATING_MR_AND_IR;
					
					res.render('graphs',{page_title:"Home",data:pgdata});
				});
			}
		});
	}
	else if(client == "admin"){
		res.render('admin',{page_title:"Admin"});
	}
});

app.get('/dashboard', function(req, res) {
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
						rows = parseMTM(rows);
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
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@Scoring Logic@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

var nlu = new NaturalLanguageUnderstandingV1({
  username: "194c40`9e-028d-43a0-84ed-91aa4007a653",
  password: "uN1OSl1LOFQf",
  version_date: "2017-02-27"
});

app.post('/score', function(req, res) {
	console.log("*************** Received 1 " + req.url);

  console.log("*************** Received 2 " + req.body.model_id);
  console.log("Calling function nr_scoring");
  var promises = [];

	  var nr_data = '';
	try
	{	  	var conn = ibmdb.openSync(connString);
		console.log("*************** DB open.");
		conn.querySync("set schema RISKMONITORING");
		nr_data = conn.querySync("select NR_SEQUENCE_NO, NR_NEWS_URL from NEWS_REPOSITORY");
		conn.close();
	} catch (e)
	{
		console.error("Error: ", e.message);
	}
	console.log("Data is selected. No of records : ", nr_data.length);
	
	for (var j=0;j<nr_data.length;j++)  {
		(function(j) {	  		promises.push(nr_scoring(req, nr_data, j));  		})(j);
	  }
	  
Promise.all(promises).then(function(resp){  		cp_ns_scoring();
	});
	console.log("In the function that does hit");
setTimeout(function(){
	console.log("Returning the values");
	res.status(200).send('OK');
}, 8000);
});

function nr_scoring(req, nr_data, j){
  return new Promise(function(resolve, reject){	   	var seq_no = nr_data[j].NR_SEQUENCE_NO;
	  console.log("1. Seq No. : ", nr_data[j].NR_SEQUENCE_NO);
	  console.log("News URL : ", nr_data[j].NR_NEWS_URL);
	  //console.log("Text" , nr_data[j].NR_NEWS_TEXTS);
		var parameters = {
		//'text': nr_data[j].NR_NEWS_TEXTS,		
		'url': nr_data[j].NR_NEWS_URL,
		'features': {
		  'entities': {
			model:"fedc0ed1-09ed-4af5-bfd8-ac34208d28d7"
				  }
				}	};		nlu.analyze(
		  parameters,
		  function (err, data) {
		  if (err) 
		  {
			  console.log("*************** ERROR : ", err);
			  return reject(err);
		  }		
		 console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
		 //console.log(data.entities.length);
		 //console.log(data);
		  var sc = 0, x = 0, y = 0, z = 0, a = 0, b = 0, c = 0, d = 0;
		  for(var i = 0; i < data.entities.length ; ++i)			{				
			// console.log("Printing type"+ data.entities[i].type); 
			 var strtrim = data.entities[i].type;
			 var datatrim = strtrim.trim();
			 //console.log(datatrim);
			switch(datatrim)
			  {
				  case "RiskType_Extremely_Negative":	
				  x++;
				  break;
				  case "RiskType_Highly_Negative":
				  y++;
				  break;
				  case "RiskType_Negative":
				  z++;
				  break;
				  case "RiskType_Neutral":
				  a++;
				  break;
				  case "RiskType_Extremely_Positive": 
				  b++;
				  break;
				  case "RiskType_Highly_Positive":
				  c++;
				  break;
				  case "RiskType_Positive": 
				  d++;
				  break;

			  } 
			
			  
			
		  }	          var eas = x*95;	          var as = y*85;			var neg = z*75;
						var neut = a*50;			  var epos = b*(-90);		var hpos = c*(-80);	var pos = d*(-70);
			

 
// var eas = x*95;             var as = y*85;
  var t_cn = 0;
  var t_cp = 0;
  t_cn = Math.abs(x-z);
var cn = Math.min(t_cn, z);
var cs = cn*40;
t_cp = Math.abs(b-d);
var cp = Math.min(t_cp, d);
var csp = cp*40;
  if ((x+y+cn+a+b+c+cp) === 0)
	sc = 0;
  else
	sc = (eas+as+cs+epos+hpos+csp)/(x+y+cn+b+c+cp);
  sc = Math.ceil(sc);      

 /* 
			var t_cn = 0;
			if (x > z)	          	t_cn = x-z;
			else	            t_cn = z-x;
			  
			var cn = Math.min(t_cn, z);
			var cs = cn*40;
			if ((x+y+cn) === 0)
				sc = 0;
			else
			  sc = (eas+as+cs)/(x+y+cn);
			//sc = sc.toFixed(2);
			sc = Math.ceil(sc); 
			
*/     
		   console.log("RiskType_Extremely_Negative : ", x);
			console.log("RiskType_Highly_Negative : ", y);
			console.log("RiskType_Negative : ", cn);
			console.log("RiskType_Extremely_Positive : ", b);
			console.log("RiskType_Highly_Positive : ", c);
			console.log("RiskType_Positive : ", cp);
			console.log("printing" + d); 
			console.log("printing" + t_cp);
			console.log("printing" + t_cn);

			console.log("Score : ", sc);
						
			data["score"] = sc;
			//console.log("Data : ", data);
			console.log("2. Sequence no : ", seq_no);
			var upd_qry = "update NEWS_REPOSITORY set NR_SCORE = " + sc + " where NR_SEQUENCE_NO = " + seq_no;
			console.log("Update query : ", upd_qry);
			try
			  {  				var conn = ibmdb.openSync(connString);
				console.log("*************** DB open.");
				conn.querySync("set schema RISKMONITORING");
				conn.querySync(upd_qry);
				console.log("Score updated");
				conn.close();
				setTimeout(function(){ return resolve(1); }, 500);
			  } catch (e)
				{  					console.error("Error: ", e.message);
				}
	  });
  });
}

function cp_ns_scoring()
{	var nr_sc_data = '';
  try
	{  			var conn = ibmdb.openSync(connString);			console.log("*************** DB open.");
			conn.querySync("set schema RISKMONITORING");
			var sel_qry = "SELECT AVG(NR_SCORE) AS AVG_NR_SCORE, NR_COUNTERPARTY_ID  FROM NEWS_REPOSITORY WHERE NR_DOMAIN_LEVEL = 'MR and IR' GROUP BY NR_COUNTERPARTY_ID";
			nr_sc_data = conn.querySync(sel_qry);  			
			console.log("The Range of NR Score for selected records : ", nr_sc_data);
			conn.close();
	} catch (e)
   {
		console.error("Error: ", e.message);
  }
  for(var i = 0; i < nr_sc_data.length ; i++)
  {
	  try
		{
			var conn1 = ibmdb.openSync(connString);
		  console.log("*************** DB open.");  			conn1.querySync("set schema RISKMONITORING");
			var currentdate = new Date(); 
		  var datetime = currentdate.getDate() + '/'                + (currentdate.getMonth()+1)  + '/'
			  + currentdate.getFullYear() + ' @ '                + currentdate.getHours() + ':'                + currentdate.getMinutes() + ':'                + currentdate.getSeconds();
		  
		  var upd_qry = "INSERT INTO PORTFOLIO_LEVEL (PR_CP_ID,PR_RATING_MR_AND_IR,PR_HTRY_RATING_MR_IR,PR_TRANSITION_MR_AND_IR,PR_DRIVERS_OF_CHANGE_MR_AND_IR,PR_HIGHEST_CHANGE_MR_AND_IR,PR_CRAWLING_DATE,PR_SHORT_RISK_SCORE) VALUES('C27',(SELECT AVG(PR_RATING_MR_AND_IR) FROM PORTFOLIO_LEVEL),(SELECT AVG (PR_HTRY_RATING_MR_IR) FROM PORTFOLIO_LEVEL),(SELECT AVG(PR_TRANSITION_MR_AND_IR) FROM PORTFOLIO_LEVEL),'Industry Factors',(SELECT  PR_CRAWLING_DATE FROM PORTFOLIO_LEVEL WHERE PR_RANGE_MR_IR = (SELECT MAX(PR_RANGE_MR_IR) FROM PORTFOLIO_LEVEL)),CURRENT TIMESTAMP,(SELECT AVG(NR_SCORE) FROM NEWS_REPOSITORY ))";
		  
		  console.log("Data Inserted : ", upd_qry);  			conn1.querySync(upd_qry);
			console.log("Data Inserted for : ", nr_sc_data[i].NR_COUNTERPARTY_ID);
			conn1.close();

			var conn2 = ibmdb.openSync(connString);
		  console.log("*************** DB open.");
			conn2.querySync("set schema RISKMONITORING");
			var sel_qry1 = "UPDATE COUNTERPARTY_MASTER SET CM_CRNT_SHORT_SCORE_MR_IR = (SELECT MAX(PR_SHORT_RISK_SCORE) FROM PORTFOLIO_LEVEL WHERE PR_CP_ID=CM_CP_ID)";

			console.log(nr_sc_data[i].NR_COUNTERPARTY_ID);
			nr_sc_data = conn2.querySync(sel_qry1);
			console.log(" Records updated for  : ", nr_sc_data);
			conn2.close();
		} catch (e)
	   {
			console.error("Error: ", e.message);
	  }
  }
  nr_sc_data = '';
  try
	{
			var conn2 = ibmdb.openSync(connString);
		  console.log("*************** DB open.");
			conn2.querySync("set schema RISKMONITORING");
			var sel_qry1 = 'update COUNTERPARTY_MASTER '
			+ 'CM_CRNT_SHORT_SCORE_MR_IR = (SELECT MAX(PR_SHORT_RISK_SCORE) FROM PORTFOLIO_LEVEL)'			+ ' where CM_CP_ID = ' + '\'' + nr_sc_data[i].NR_COUNTERPARTY_ID ;
			nr_sc_data = conn2.querySync(sel_qry1);
			//console.log("NR Score is selected for NS. No of records : ", nr_sc_data.length);
			conn2.close();
	} catch (e) 	{
		console.error("Error: ", e.message);
  }
  
  for(var j = 0; j < nr_sc_data.length ; j++)	{
	  try  		{  			var conn3 = ibmdb.openSync(connString);
		  console.log("*************** DB open.");  			conn3.querySync("set schema RISKMONITORING");
						
		  /*var upd_qry1 = 'update COUNTERPARTY_MASTER '
		  + 'CM_CRNT_SHORT_SCORE_MR_IR = (SELECT MAX(PR_SHORT_RISK_SCORE) FROM PORTFOLIO_LEVEL)'			+ ' where CM_CP_ID = ' + '\'' + nr_sc_data[j].NR_COUNTERPARTY_ID ;
		  
		  console.log("Update query NS: ", upd_qry1);
			conn3.querySync(upd_qry1);
			console.log("NS Score is updated for CP : ", nr_sc_data[j].NR_COUNTERPARTY_ID);*/
			conn3.close();
		} catch (e)
	   {
			console.error("Error: ", e.message);
	  }
  }
	  try
		{
			var conn4 = ibmdb.openSync(connString);
		  console.log("*************** DB open.");
			conn4.querySync("set schema RISKMONITORING");
						
		  var upd_qry2 = "UPDATE PORTFOLIO_LEVEL SET PR_MR_AND_IR_BREACHED = CASE WHEN ( PR_RATING_MR_AND_IR ) > 65 THEN 'YES' ELSE 'NO' END";
		  
		  console.log("Update query PR_MR_AND_IR_BREACHED: ", upd_qry2);
			conn4.querySync(upd_qry2);
			console.log("PR_MR_AND_IR_BREACHED updated : ");  			conn4.close();
		} catch (e)
	   {
			console.error("Error: ", e.message);
	  }
}
		try
		{
			var conn5 = ibmdb.openSync(connString);
		  console.log("*************** DB open.");
			conn4.querySync("set schema RISKMONITORING");
						
		  var upd_qry3 = 'update COUNTERPARTY_MASTER '
		  + 'CM_CRNT_SHORT_SCORE_MR_IR = (SELECT MAX(PR_SHORT_RISK_SCORE) FROM PORTFOLIO_LEVEL)' + ' where CM_CP_ID = ' + '\'' + nr_sc_data[i].NR_COUNTERPARTY_ID ;
		  
		  console.log("Update query PR_MR_AND_IR_BREACHED: ", upd_qry3);
			conn4.querySync(upd_qry3);
			console.log("PR_MR_AND_IR_BREACHED updated : ");  			conn5.close();
		} catch (e)
	   {
			console.error("Error: ", e.message);
	  }

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@Crawling Logic@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
var language_translator = watson.language_translator({
	username: "fced617e-2776-4b28-89d4-f1d50508ef8c",
	password: "47W7mgLPM7Dx",
	version: 'v2',
	url: "https://gateway.watsonplatform.net/language-translator/api"
  });

app.post('/crawl', function(req, res) {
	console.log("Crawling Starting");
	  var crawl_data = '';
	  try
	  {
	  	var conn = ibmdb.openSync(connString);
	  	console.log("*************** DB open.");
	  	conn.querySync("set schema RISKMONITORING");
		  var queryString = "select CM_CP_NAME, NS_DOMAIN_URL, NS_DOMAIN_LEVEL, CM_CP_ID,NS_DOMAIN_NAME,NS_NEWS_HEADER_TEMP from COUNTERPARTY_MASTER, NEWS_SOURCE_MASTER WHERE CM_CP_ID=NS_CP_ID and NS_TRACKING_STATUS='Y' and CM_TRACKING_STATUS='Y'";
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
			if ( crawl_data[j].NS_DOMAIN_LEVEL == 'ORR') {
			
				SEARCH_WORD = crawl_data[j].CM_CP_NAME;
						
				} else  {
					SEARCH_WORD = "Oil Price";
				}
			//SEARCH_WORD='IE';
			SEARCH_WORD = crawl_data[j].CM_CP_NAME;
	 		START_URL = crawl_data[j].NS_DOMAIN_URL;
			//START_URL='https://www.ie.edu/landings/bs-masters-en-gestion-esp/?gclid=CjwKCAjw9O3NBRB3EiwAK6wPT3wMZFsNveNUFe8To4dFtTCHk13koNPCKx6JMiZOr0lGEsxfXkJmQhoCYNUQAvD_BwE';
	 		CP_ID=crawl_data[j].CM_CP_ID;
	 		DOMAIN_NAME=crawl_data[j].NS_DOMAIN_NAME;
			news_header=crawl_data[j].NS_NEWS_HEADER_TEMP;
			domain_level=crawl_data[j].NS_DOMAIN_LEVEL;
	 		param.numPagesVisited = 0;
	 		console.log("Searching for ", crawl_data[j].CM_CP_NAME,"on ", START_URL= crawl_data[j].NS_DOMAIN_URL, "CP ID : ", crawl_data[j].CM_CP_ID,domain_level=crawl_data[j].NS_DOMAIN_LEVEL);
			pagesVisited = {};
			pagesToVisit = [];
 			url = new URL(START_URL);
 			baseUrl = url.protocol + "//" + url.hostname;
 			pagesToVisit.push(START_URL);
 			crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME,domain_level);
	  	})(j);
	  }
  	  console.log("Crawler ran successfully.");


function visitPage(url, SEARCH_WORD, CP_ID, DOMAIN_NAME,domain_level, callback) {
  // Add page to our set
  pagesVisited[url] = true;
  param.numPagesVisited++;
  // Make the request
  console.log("Visiting Page " + url);
  
  //*problem is here
  request(url, function(error, response, body) {
     // Check statuscode (200 is HTTP OK)
	// console.log("reached here");
	 console.log("Status code: " + response.statusCode);
	 console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
	 console.log(domain_level);
	   if(response.statusCode !== 200) {  
	   
	   try
	   {
	          callback(SEARCH_WORD, CP_ID, DOMAIN_NAME);
       return;  
	   }catch (e)
	  	{
	  		console.error("Error: ", e.message);
	  	}
	   
     }
     // Parse the document body
     var $ = cheerio.load(body);
	 
	 translate($, function($orText,l){
		  var isWordFound = searchForWord($orText, SEARCH_WORD,l);
		  
		  if(isWordFound) {
       console.log('Word ' + SEARCH_WORD + ' found at page ' + url);
	   	   
	   console.log("Inserting records into the database");
	   	try
	  	{
			var detected_language=l;
	  		var conn = ibmdb.openSync(connString);
			  console.log("*************** DB open.");
			  console.log(news_body);
	  		conn.querySync("set schema RISKMONITORING");
	  		var insertString = "Insert into NEWS_REPOSITORY (NR_SEQUENCE_NO,NR_COUNTERPARTY_ID,NR_NEWS_URL,NR_DOMAIN_LEVEL,NR_NEWS_SOURCE,NR_NEWS_HEADER,NR_PBLSH_DTTIME,NR_CAPTURE_DTTIME,NR_NEWS_LANGUAGE,NR_NEWS_TEXTS) VALUES (" +
			"nvl((select max(NR_SEQUENCE_NO) from NEWS_REPOSITORY)+1,0)"+",'"+CP_ID+"', '"+url+"','"+domain_level+"','"+DOMAIN_NAME+"','"+news_header+"',sysdate,sysdate,'"+detected_language+"','"+news_body+"')";
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
	 
	 
     //var isWordFound = searchForWord($, SEARCH_WORD);
     
  });
}

function crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME,domain_level) {
  if(param.numPagesVisited >= MAX_PAGES_TO_VISIT) {
    console.log("Reached max limit of number of pages to visit.");
    return;
  }
  var nextPage = pagesToVisit.pop();
  if (nextPage in pagesVisited) {
    // We've already visited this page, so repeat the crawl
    crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME,domain_level);
  } else {
    // New page we haven't visited
    visitPage(nextPage, SEARCH_WORD, CP_ID, DOMAIN_NAME, domain_level,crawl);
  }
}

function searchForWord($orText, word,l) {
	
	if (l=='en')
	{
		var bodyText = $orText('html > body').text().toLowerCase();
	
		console.log(word);
	}
		else
		{
			var bodyText = $orText;
			
		}
		
	
		
    
   console.log("word found status \n :",bodyText.indexOf(word.toLowerCase()) !== -1);
   
  return(bodyText.indexOf(word.toLowerCase()) !== -1);
  
}

function collectInternalLinks($) {
    var relativeLinks = $("a[href^='/']");
    console.log("Found " + relativeLinks.length + " relative links on page");
    relativeLinks.each(function() {
        pagesToVisit.push(baseUrl + $(this).attr('href'));
    });
}

function translate($,callback)
{
	console.log("Inside the translator");
	
	var news_text = $('html > body').text().toLowerCase().substring(0,50000);
	
	//console.log(news_text);
	
	 language_translator.identify({ text: news_text},
  function( err,identifiedLanguages) {
     if (err)
      console.log(err)
    else
       
      var l = identifiedLanguages.languages[0].language;
    
   console.log(l);
   
   if (l=='en') 
   {
	
	//console.log (news_text);

	news_body=removeSpecialChars(news_text.substring(0,31990));

	callback($,l);
	   
   }
   
   else  {
    language_translator.translate({
    text: news_text,
    source: l,
    target: 'en'
  }, function(err, translation)

    {
 //console.log(l);
 //console.log(news_text);
	var translatedText = translation.translations[0].translation;
	
	console.log(news_text);
	
	 news_body=removeSpecialChars(translatedText.substring(0,31990));
	
	
		

	
	  //console.log(translatedText);
  //res.send(translation.translations[0].translation);
  
  callback(news_text,l);

     callback(translatedText,l);
 })
  };
    
 
  });
	
}

function removeSpecialChars(str) {
  return str.replace(/(?!\w|\s)./g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(\s*)([\W\w]*)(\b\s*$)/g, '$2');
}



setTimeout(function(){
	res.status(200).send('OK');
	//score(req,res);
}, 35000);
});

//DB2 Connection
var db2 = {
	db: "BLUDB",
	hostname: "dashdb-txn-flex-yp-dal10-348.services.dal.bluemix.net",
	port: 50000,
	username: "bluadmin",
	password: "MjRjMzI3OWU1ZTUy",
	schema: "RISKMONITORING"
 };

var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port + ";CurrentSchema=" + db2.schema;

//Chat
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk

// Create the service wrapper
var conversation = new Conversation({
	// If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
	// After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
	username: '479ec2dc-087f-43e9-a693-7e76febcf768',
	password: 'Pjk4AKR6WhJ7',
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
	var workspace = 'd0be947b-67bc-4ebc-ac00-bff355c31446';
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
			data.context.news = false;
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
								if(newdata.url != undefined && newdata.text != undefined && newsdata.results[0].enrichedTitle != undefined && newsdata.results[0].enrichedTitle.text != undefined){
									newdata.url = newsdata.results[0].url;	
									newdata.text = newsdata.results[0].enrichedTitle.text ;
									//console.log(newdata);
									data.output.text = "";
									data.output.text = newsdata.results[0].enrichedTitle.text +"\n"+ newsdata.results[0].url;
									data.context.news = false;
								}else{
									data.output.text = "I am sorry. I am not able to fetch any news related to your query. Please try again later."
									data.context.news = false;
								}
							  return res.json(updateMessage(payload, data));
						}
					});
	  }else if(data.context.enquire == true) // set depending on response
	  {		
			data.context.enquire = false;
			var querydata = data.context.counterparty ; // based on response
			var company = data.context.company;
			var queryArg = [];
			queryArg.push(querydata);
			queryArg.push('CLID1');
			console.log("In the pqrt to fetch enquire" + querydata);
			ibmdb.open(connString, function(err, conn) {
				if (err ) {
					return res.json(updateMessage(payload, err));
				}
				else{
					conn.query(enquireChat_Query,queryArg,function(err, rows) {
						if ( !err ) {
							if(rows.length == 0){
								data.output.text = "I am sorry. Please try again later."
								console.log("There are NO values");
							}else{
								var opt;
								opt = "MTM Net(MN $) : " + rows[0].CDC_MTM_NET + " </br> CNA Score : " + rows[0].AD_SCORE + " </br> for the counterparty " + company;
								data.output.text = "";
								data.output.text = opt;
							}
							return res.json(updateMessage(payload, data));
						}else{
							return res.json(updateMessage(payload, err));
						}
					});
				}
			});
	  }else if(data.context.connected == true) // set depending on response
	  {
			data.context.connected = false;
			var querydata = data.context.counterparty ; // based on response
			var company = data.context.company;
			var queryArg = [];
			queryArg.push(querydata);
			ibmdb.open(connString, function(err, conn) {
				if (err ) {
					return res.json(updateMessage(payload, err));
				}
				else{
					conn.query(connectedCounterpartyChat_Query,queryArg,function(err, rows) {
						if ( !err ) {
							if(rows.length == 0){
								data.output.text = "I am sorry. Please try again later."
								console.log("There are NO values");
							}else{
								var opt;
								opt = "The Connected counterparties for " + company + " are:";
								for(i = 0;i<rows.length;i++){
									var name = rows[i].CM_CP_NAME;
									opt = opt + "</br>" + name;
								}
								data.output.text = "";
								data.output.text = opt;
							}
							return res.json(updateMessage(payload, data));
						}else{
							return res.json(updateMessage(payload, err));
						}
					});
				}
			});
	  }
	  else {
			console.log("Just printing the cotext " + data.context.enquire);
			return res.json(updateMessage(payload, data));
		}
	});
  });
   
  /**
   * Updates the response text using the intent confidence
   * @param  {Object} input The request to the Conversation service
   * @param  {Object} response The response from the Conversation service
   * @return {Object}          The response with the updated message
   */
  function updateMessage(input, response) {
	//console.log("input",input);
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