var amqp = require('amqplib/callback_api');
var nodemailer = require('nodemailer');

var amqpserver = 'amqp://localhost';

amqp.connect(amqpserver, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'queue1';

    ch.assertQueue(q, {durable: false});

    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);

    ch.consume(q, function(msg) {
      var Mon = JSON.parse(msg.content.toString());
      //var times = new Date(Mon.times);
      //console.log("error code:",Mon.codes);
      //console.log(times.toUTCString());
      sendEMail(Mon);
    }, {noAck: true});
  });
});

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport('smtps://black.teakung@gmail.com:xbjeprwwtypqldpw@smtp.gmail.com');

// setup e-mail data with unicode symbols
var mailOptions = {
    from: '"blackteakung" <black.teakung@gmail.com>', // sender address
    to: 'nathee.chok, nathee.chok@gmail.com', // list of receivers
    subject: 'Site Down', // Subject line
    text: '', // plaintext body
    html: '' // html body
};

function sendEMail(Mon){
  // send mail with defined transport object
  mailOptions.text = 'site: '+Mon.server+'code:'+Mon.codes.toString();
  mailOptions.html = '<b>site: '+Mon.server+' error code: '+Mon.codes.toString()+'</b>';
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
  });
}