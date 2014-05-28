var _ = require('underscore');

YClient = function(opts) {
  var DDPClient = require('ddp');
  var self = this;
  self.isReady = false;
  self.authToken = '';

  self.ddpclient = new DDPClient({
    host: "y.hyperbotics.org", 
    port: 3000,
    /* optional: */
    auto_reconnect: true,
    auto_reconnect_timer: 500,
    use_ejson: true,           // Use Meteor's EJSON to preserve certain data types.
    use_ssl: false,
    maintain_collections: true // Set to false to maintain your own collections.
  });

  self.ddpclient.connect(function(error) {
    if (error) {
      console.log('DDP connection error!');
      return;
    }

    self.ddpclient.loginWithUsername("", "", function(err, result) {
      var authToken = result;
    });

    console.log('connected!');

    self.ddpclient.subscribe(
      'stones',                  // name of Meteor Publish function to subscribe to
      [],                       // any parameters used by the Publish function
      function () {             // callback when the subscription is complete
        console.log('stones complete:');
        console.log(self.ddpclient.collections.stones);
      }
    );

    self.ddpclient.subscribe(
      'moves',                  // name of Meteor Publish function to subscribe to
      [],                       // any parameters used by the Publish function
      function () {             // callback when the subscription is complete
        console.log('moves complete:');
        console.log(self.ddpclient.collections.moves);
        self.isReady = true;
      }
    );
  });

  /*
   * Useful for debugging and learning the ddp protocol
   */
  self.ddpclient.on('message', function (msg) {
    console.log("ddp message: " + msg);
  });

  /* 
   * If you need to do something specific on close or errors.
   * You can also disable auto_reconnect and 
   * call self.ddpclient.connect() when you are ready to re-connect.
  */
  self.ddpclient.on('socket-close', function(code, message) {
    console.log("Close: %s %s", code, message);
  });

  self.ddpclient.on('socket-error', function(error) {
    console.log("Error: %j", error);
  });
};

YClient.prototype.move = function(position) {
  var self = this;
  var error;
  self.ddpclient.call('move', [position], function(err, result) {
    console.log('err: ' + err);
    console.log('result: ' + err);
    error = err;
  }, function() {}, 3000);
  return error;
};

YClient.prototype.onMove = function(fn) {
  var self = this;
  self.ddpclient.addSubscriptionCallback('moves', fn);
};


var client = new YClient();

var move = function(collection, message) {
  if(client.isReady && message.msg === 'added') {
    console.log('intantiated move: ' + collection, message);
    var played = _.map(collection, function(m) {
      return m.name;
    });
    var stones = _.map(client.ddpclient.collections.stones, function(m) {
      return m.name;
    });
    var unplayed = stones.filter(function(item) {
      return played.indexOf(item) === -1
    });
    var randomMove = _.sample(unplayed);
    console.log(played);
    console.log(_.isEmpty(played));
    console.log(_.size(played));
    if(!_.isEmpty(played) && _.size(played) % 2 == 1 && randomMove) {
      console.log(randomMove);
      console.log('Move: ' + randomMove);
      client.move(randomMove);
    }
  }
};

client.onMove(move);
