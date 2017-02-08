var http = require('http');
var amqp = require('amqplib/callback_api');
const readline = require('readline');
const url = require('url');

var amqpserver = 'amqp://localhost';


var threshold = 5;
var counter = 0;
var interval = 1;
var myTimeout = 20;
var urlInput;


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('input url: ', (input) => {
  //console.log('url:', input);
  urlInput = url.parse(input);
  //console.log(urlInput);
  var Mon1 = setInterval(checkStatus, interval*1000);
  //console.log("Monitoring: ", url.host+url.path);
  rl.close();
});

function checkStatus(){
  var req = http.request(urlInput, function(response){
      console.log("statusCode: ", response.statusCode);
      checkDown(response.statusCode);
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

function checkDown(code){
  if(code >= 400){
    counter = counter + 1;
  }
  else{
    counter = 0;
  }
  console.log("counter:",counter);
  if(counter > threshold){
    sendAlert(code);
    counter = 0;
  }
} 

function sendAlert(code){
  var now = new Date();
  var message = [
    {
        "codes": '',
        "server": '',
        "times": ''
    }
  ];
  message[0].codes = code.toString();
  message[0].server = urlInput.host+urlInput.path;
  message[0].times = now.toString();
  var txt = JSON.stringify(message);
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
      //process.exit(0) 
    }, 500);
  });
}