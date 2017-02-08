var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/test';
var express = require('express');
var app = express();
var db;

MongoClient.connect(url, function(err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

  })
});    
    
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/javascript'));
app.use(express.static(__dirname + '/css'));

app.get('/index.html', function (req, res) {
   res.sendFile( __dirname + "/" + "index.html" );
})
  
app.get('/listIncident', function (req, res) {
  db.collection('incident').find({}).toArray(function(err,docs){
    if(err){
      handleError(res, err.message, "Failed to get incident.");
    }
    else{
      res.status(200).json(docs);
    }
  });
})