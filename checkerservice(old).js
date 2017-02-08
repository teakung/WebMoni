var http = require('http');
var amqp = require('amqplib/callback_api');
const readline = require('readline');
const url = require('url');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var dburl = 'mongodb://localhost:27017/test';
var amqpserver = 'amqp://localhost';

var counter = 0;
var interval = 10;
var myTimeout = 20;

var monitoring;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var inputPrompt = function (){
    rl.question('input url: ', (input) => {
    startMonitoring(input);
    exitPrompt();
  });
};

inputPrompt(); //start here

var exitPrompt = function (){
  rl.question('type s to stop or e to exit: ', (input) => {
    if (input == 's'){
      clearInterval(monitoring);
      inputPrompt();
    };
    if (input == 'e'){
        rl.close();
        process.exit(0) 
    }
  });
};

function startMonitoring(input){
    monitoring = setInterval(createMon, interval*1000, '','',input);
}

function createMon(title,description,server){
  var Mon = {
    "title": '', 
    "description": '',
    "codes": '',
    "server": '',
    "times": ''
   };
  //var urlInput = url.parse(server);
  //Mon.server = urlInput.host+urlInput.path;
  Mon.server = server;
  checkStatus(Mon);
  //console.log(Mon.server);
}

function checkStatus(Mon){
  var urlInput = url.parse(Mon.server);
  //console.log(urlInput)
  var req = http.request(urlInput, function(response){
      console.log("statusCode: ", response.statusCode);
      Mon.codes = response.statusCode;
      checkDown(Mon);
    });

  req.on('socket', function (socket) {
      socket.setTimeout(myTimeout*1000);  
      socket.on('timeout', function() {
          req.abort();
      });
  });
  req.on('error', function (err) {
   /* if(err.code=='ENOTFOUND'){
      console.log("Network Error or Name not found");
    }*/
    console.log(err);
  });

  req.end();
}

function checkDown(Mon){
    //console.log('server',Mon.server);
  if(Mon.codes >= 400){
    var now = new Date();
    Mon.times = now.toString();
    //sendEmail(Mon);
    addtoDatabase(Mon);
  }
}

function sendEmail(Mon){
  var txt = JSON.stringify(Mon);
  var buf = new Buffer(txt, "utf-8");
  amqp.connect(amqpserver, function(err, conn) {
    conn.createChannel(function(err, ch) {
      var q = 'queue1';

      ch.assertQueue(q, {durable: false});
      ch.sendToQueue(q, buf);
      console.log(" [x] Sent");
    });
    setTimeout(function() { 
      conn.close();
    }, 500);
  });
}

function addtoDatabase(Mon){
    var insertDocument = function(db, callback) {
    db.collection('incident').insertOne( Mon, function(err, result) {
      assert.equal(err, null);
      //console.log("Inserted a document into the collection.");
      callback();
      });
    };

    MongoClient.connect(dburl, function(err, db) {
      assert.equal(null, err);
      insertDocument(db, function() {
          db.close();
      });
    });
}