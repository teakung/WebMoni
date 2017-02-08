var http = require('http');
var amqp = require('amqplib/callback_api');
const readline = require('readline');
const url = require('url');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var dburl = 'mongodb://localhost:27017/test';
var amqpserver = 'amqp://localhost';
var db;

var counter = 0;
var interval = 5;
var reqTimeout = 20;

MongoClient.connect(dburl, function(err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
});


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var urlList = [];

var inputPrompt = function (){
    rl.question('input url: ', (input) => {
    if(input == 'e'){
/*        var url;
        for (url in urlList) {
            console.log(Mons[url]);
        }*/
        rl.close();
    }
    else{
        addUrl(input);
        inputPrompt();
    }
  });
};
inputPrompt();

//example of nested realine
/*rl.question('input url: ', (input) => {
  if(input == 'e'){
      rl.question('e again: ', (input) => {
        if(input == 'e'){
          console.log('double e =');
          rl.close();
        }
      });
  }
  else{
    rl.close();
  }
});*/

function addUrl(input){
  var urlMonitor = {};
  urlMonitor.timer = setInterval(createMon, interval*1000, '','',input);
  urlMonitor.url = input;
  urlMonitor.attempt = 0;
  urlMonitor.success = 0;
  urlMonitor.fail = 0;
  urlList.push(urlMonitor);
  //console.log(urlMonitor);
  //console.log(typeof urlMonitor);
}

/*function deleteUrl(){
  var url;
  for (url in urlList) {
    console.log('test');}
}
*/
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
  //console.log(urlInput);
  var req = http.request(urlInput, function(response){
      Mon.codes = response.statusCode;
      checkDown(Mon);
    });

  req.on('socket', function (socket) {
      socket.setTimeout(reqTimeout*1000);  
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
    console.log('server', Mon.server);
    //console.log('status : down');
    var now = new Date();
    Mon.times = now.toString();
    calAva(Mon.server,false);
    sendEmail(Mon);
    addtoDatabase(Mon);
  }
  else{
    console.log('server', Mon.server);
    calAva(Mon.server,true);
    //console.log('status : up');
  }
}

function calAva(target,result){
  for (var i =0; i < urlList.length; i++){
     if (urlList[i].url === target) {
        urlList[i].attempt +=1;
        if(result){
          urlList[i].success +=1;
        }
        else{
          urlList[i].fail +=1;
        }
        console.log('attempt',urlList[i].attempt);
        console.log('success',urlList[i].success);
        console.log('fail',urlList[i].fail);
        break;
     }
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
  db.collection('incident').insertOne( Mon, function(err, result) {
    assert.equal(err, null);
      //console.log("Inserted a document into the collection.");
  });

}

//cleanup section
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) console.log('clean');
    db.collection('incident').deleteMany( {}, function(err, results) {
      console.log(results);
    });
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));