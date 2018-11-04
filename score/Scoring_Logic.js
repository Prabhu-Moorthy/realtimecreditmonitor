/*eslint-disable unknown-require, no-unused-vars*/
const express = require("express");
const app = express();
const path = require("path");
var bodyParser = require('body-parser');

// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser.urlencoded({ extended: false }));

app.set("json spaces", 2);
app.set("json replacer", null);
app.set("views", "./public");
var ibmdb = require('ibm_db');
var Promise = require('promise');

var db2 = {
        db: "BLUDB",
        hostname: "dashdb-txn-flex-yp-dal10-348.services.dal.bluemix.net",
        port: 50000,
        username: "bluadmin",
        password: "MjRjMzI3OWU1ZTUy"     };
	 
var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;	 

var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

var nlu = new NaturalLanguageUnderstandingV1({
  username: "194c409e-028d-43a0-84ed-91aa4007a653",
  password: "uN1OSl1LOFQf",
  version_date: "2017-02-27"
});

// Render the index.html
app.get( "/", function( req, res ) {
    res.sendFile(path.join( __dirname, "public", "index.html"));
  });
  
/**
 * Analyze text
 */

app.post("/engine", (req, res, next) => {	console.log("*************** Received 1 " + req.url);
  
	console.log("*************** Received 2 " + req.body.model_id);
	console.log("Calling function nr_scoring");
	var promises = [];
  
  	  var nr_data = '';
	  try
	  {	  	var conn = ibmdb.openSync(connString);
		  console.log("*************** DB open.");
		   	conn.querySync("set schema RISKMONITORING");
	  	nr_data = conn.querySync("select NR_SEQUENCE_NO, NR_NEWS_URL from NEWS_REPOSITORY, LAST_SEQ_NUMBER where NR_SEQUENCE_NO > LSN_FOR_NR");
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
  	  res.end('<p style="color:green;font-size:200%;">Score updated successfully. You may close the window</p>');
});

function nr_scoring(req, nr_data, j){
	return new Promise(function(resolve, reject){	   	var seq_no = nr_data[j].NR_SEQUENCE_NO;
		console.log("1. Seq No. : ", nr_data[j].NR_SEQUENCE_NO);
		console.log("News URL : ", nr_data[j].NR_NEWS_URL);
	  	var parameters = {
	  	//'text': nr_data[j].NR_NEWS_TEXTS,
	  	'url': nr_data[j].NR_NEWS_URL,
	  	'features': {
	   	 'entities': {
	    	  model: req.body.model_id
	    			}
	  			}	};		nlu.analyze(
		    parameters,
		    function (err, data) {
		    if (err) 
		    {
		    	console.log("*************** ERROR : ", err);
		    	return reject(err);
			}			var sc = 0, x = 0, y = 0, z = 0;

			console.log(" printing ntities");
			console.log(data.entities);
			for(var i = 0; i < data.entities.length ; ++i)			{				if (data.entities[i].type === "Event")
				{					switch(data.entities[i].disambiguation.subtype[0])
					{
						case "Extremely_Alarming":
	    					x++;
	    					break;						case "Alarming":
	    					y++;
	    					break;
						case "Caution":
	    					z++;
	    					break;
					}
				}
			}	          var eas = x*95;	          var as = y*85;
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
	         console.log("Extremely_Alarming : ", x);
	          console.log("Alarming : ", y);
	          console.log("Caution : ", cn);
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
  			var sel_qry = 'select NR_COUNTERPARTY_ID, sum(NR_SCORE) SUM_NR_SCORE, count(NR_COUNTERPARTY_ID) NR_CP_COUNT '
			+ 'from NEWS_REPOSITORY, LAST_SEQ_NUMBER '			+ 'where NR_SEQUENCE_NO>LSN_FOR_NR '
			+ 'and NR_COUNTERPARTY_ID in (select AD_COUNTERPARTY_ID from ANALYTICAL_DETAILS) '			+ 'group by NR_COUNTERPARTY_ID;';
  			nr_sc_data = conn.querySync(sel_qry);  			console.log("NR Score is selected for AD. No of records : ", nr_sc_data.length);
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
            
            var upd_qry = 'update ANALYTICAL_DETAILS '			+ 'set AD_LAST_CPTRTIME=sysdate,AD_SCORE_UPDTIME=sysdate, AD_SCORE = CEILING((AD_SCORE*AD_NUMBER_ARTICLES+' + nr_sc_data[i].SUM_NR_SCORE
			+ ')/(' + nr_sc_data[i].NR_CP_COUNT + '+AD_NUMBER_ARTICLES)), '			+ ' AD_NUMBER_ARTICLES = ' + nr_sc_data[i].NR_CP_COUNT+ '+AD_NUMBER_ARTICLES, '
			+  + datetime + '\''			+ ' where AD_COUNTERPARTY_ID = ' + '\'' + nr_sc_data[i].NR_COUNTERPARTY_ID + '\'';
            
            console.log("Update query AD : ", upd_qry);  			conn1.querySync(upd_qry);
  			console.log("AD Score is updated for CP : ", nr_sc_data[i].NR_COUNTERPARTY_ID);
  			conn1.close();
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
  			var sel_qry1 = 'select NR_COUNTERPARTY_ID, NR_NEWS_SOURCE, sum(NR_SCORE) SUM_NR_SCORE, count(NR_COUNTERPARTY_ID) NR_CP_COUNT, count(NR_NEWS_SOURCE) NR_NS_COUNT '
			+ 'from NEWS_REPOSITORY, LAST_SEQ_NUMBER, NEWS_SOURCE_MASTER '			+ 'where NR_SEQUENCE_NO>LSN_FOR_NR '
			+ 'and NR_COUNTERPARTY_ID = NS_CP_ID '			+ 'and NR_NEWS_SOURCE = NS_DOMAIN_NAME '
			+ 'and NS_TRACKING_STATUS = \'Y\' '			+ 'group by NR_COUNTERPARTY_ID, NR_NEWS_SOURCE';
  			nr_sc_data = conn2.querySync(sel_qry1);
  			console.log("NR Score is selected for NS. No of records : ", nr_sc_data.length);
  			conn2.close();
  	} catch (e) 	{
  		console.error("Error: ", e.message);
	}
	
	for(var j = 0; j < nr_sc_data.length ; j++)	{
		try  		{  			var conn3 = ibmdb.openSync(connString);
			console.log("*************** DB open.");  			conn3.querySync("set schema RISKMONITORING");
  			            
            var upd_qry1 = 'update NEWS_SOURCE_MASTER '
			+ 'set NS_SCORE = CEILING((NS_SCORE*NS_NUMBER_ARTICLES+' + nr_sc_data[j].SUM_NR_SCORE			+ ')/(' + nr_sc_data[j].NR_NS_COUNT + '+NS_NUMBER_ARTICLES)), '
			+ ' NS_NUMBER_ARTICLES = ' + nr_sc_data[j].NR_NS_COUNT+ '+NS_NUMBER_ARTICLES '			+ ' where NS_CP_ID = ' + '\'' + nr_sc_data[j].NR_COUNTERPARTY_ID + '\' and '
			+ ' NS_DOMAIN_NAME = ' + '\'' + nr_sc_data[j].NR_NEWS_SOURCE + '\'';
            
            console.log("Update query NS: ", upd_qry1);
  			conn3.querySync(upd_qry1);
  			console.log("NS Score is updated for CP : ", nr_sc_data[j].NR_COUNTERPARTY_ID);
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
  			            
            var upd_qry2 = 'update LAST_SEQ_NUMBER set LSN_FOR_NR = (select max(NR_SEQUENCE_NO) from NEWS_REPOSITORY)';            console.log("Update query LSN: ", upd_qry2);
  			conn4.querySync(upd_qry2);
  			console.log("LSN updated : ");  			conn4.close();
  		} catch (e)
 		{
  			console.error("Error: ", e.message);
		}
}



module.exports = app;