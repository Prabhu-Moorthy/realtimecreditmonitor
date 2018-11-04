/* var ibmdb = require('ibm_db');
var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var express = require('express');
var app = express();

var MAX_PAGES_TO_VISIT=10;
var numPagesVisited = 0;
var pagesVisited = {};
var pagesToVisit = [];
var url = " ";
var baseUrl = " ";
var SEARCH_WORD = [];
var START_URL= [];
var CP_ID =" ";
var DOMAIN_NAME=" ";
var param = new Object();
 */

 var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var ibmdb = require('ibm_db');
var express = require('express');
var watson = require('watson-developer-cloud');
var bodyParser = require('body-parser');
var MAX_PAGES_TO_VISIT=2;
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
var app = express();
var param = new Object();
var news_header = " ";
//var detected_language=" ";
var news_body=" ";


app.use(bodyParser.urlencoded());
 
 
var db2 = {
        db: "BLUDB",
        hostname: "dashdb-txn-flex-yp-dal10-348.services.dal.bluemix.net",
        port: 50000,
        username: "bluadmin",
        password: "MjRjMzI3OWU1ZTUy"
     };
	 
	 	  var language_translator = watson.language_translator({
  username: "fced617e-2776-4b28-89d4-f1d50508ef8c",
  password: "47W7mgLPM7Dx",
  version: 'v2',
  url: "https://gateway.watsonplatform.net/language-translator/api"
});
	 
var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;	 
 
//added for language translation

	 

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
				
		
				} else {
					SEARCH_WORD = "Oil price" ;
				}
		
	  		SEARCH_WORD = crawl_data[j].CM_CP_NAME;
			//SEARCH_WORD='IE';
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
     console.log("Status code: " + response.statusCode);
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

function crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME) {
  if(param.numPagesVisited >= MAX_PAGES_TO_VISIT) {
    console.log("Reached max limit of number of pages to visit.");
    return;
  }
  var nextPage = pagesToVisit.pop();
  if (nextPage in pagesVisited) {
    // We've already visited this page, so repeat the crawl
    crawl(SEARCH_WORD, CP_ID, DOMAIN_NAME);
  } else {
    // New page we haven't visited
    visitPage(nextPage, SEARCH_WORD, CP_ID, DOMAIN_NAME, crawl);
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