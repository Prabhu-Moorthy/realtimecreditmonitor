'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var path    = require("path");

var app = express();
app.set('title','Automated Vehicle Diagnosis');
app.set('view engine','ejs');
//app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/public'));

// Bootstrap application settings
//app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = new Conversation({
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: '842921ad-edff-4f0e-a311-4a9a9e8c75d2',
  password: 'DaZjpF4fUI7h',
  url: 'https://gateway.watsonplatform.net/conversation/api',
  version_date: '2016-10-21',
  version: 'v1'
});

app.listen(appEnv.port, '0.0.0.0', function() {
	  console.log("server starting on " + appEnv.url);
	});

app.get('/login',function(req,res){
	console.log('In root get');
	res.render('login.ejs');
});

app.get('/chat',function(req,res){
	console.log('In chat post');
	res.sendFile(path.join(__dirname+'/chat.html'));
});

app.get('/admin',function(req,res){
	console.log('In chat post');
	res.sendFile(path.join(__dirname+'/admin.html'));
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  var workspace = 'b48969f8-dcd2-41f5-aea4-4f6f6587c7c9';
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
    return res.json(updateMessage(payload, data));
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
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

//Speech To Text
/*var speech = new Speech.SpeechToText({
	  watsonTokenUrl: '/api/speech-to-text/token'
});*/
/////////

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/speech-to-text/', require('./stt-token.js'));