var express = require('express'),
  router = express.Router(),
  vcapServices = require('vcap_services'),
  extend = require('util')._extend,
  watson = require('watson-developer-cloud');

var sttConfig = extend({
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api',
  username: process.env.STT_USERNAME || '036aba35-6198-4a77-83f7-f00d3be044f2',
  password: process.env.STT_PASSWORD || 'zhvFNdDaDBNl',
}, vcapServices.getCredentials('speech_to_text'));

var sttAuthService = watson.authorization(sttConfig);

router.get('/token', function(req, res) {
  sttAuthService.getToken({url: sttConfig.url}, function(err, token) {
    if (err) {
      console.log('Error retrieving token: ', err);
      res.status(500).send('Error retrieving token');
      return;
    }
    res.send(token);
  });
});

module.exports = router;
