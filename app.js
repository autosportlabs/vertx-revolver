// https://github.com/sockjs/sockjs-node/blob/master/examples/echo/server.js
'use strict';

var http   = require('http');
var faye   = require('faye');
var Static = require('node-static').Server;

var Revolver = require('./lib/RevolverController.js');

var config = require(process.argv[2]);

var files = new Static('./web');

// initialize the web server, with static file serving
var httpServer = http.createServer(function(req, resp) {
    req.addListener('end', function() {
        // serve files
        files.serve(req, resp);
    }).resume();
});


var fayeServer = new faye.NodeAdapter({
    mount: '/faye',
    ping: 45,
});

var fayeClient = fayeServer.getClient();

var revolver = new Revolver({
    duration: config.duration,
    locations: config.locations,
    rotationOrder: config.rotationOrder
});

// bind various EventBus messages to Revolver methods
revolver.on('locationUpdated', function(id, url, reload, containerType) {
    fayeClient.publish(
        '/revolver/locationUpdated',
        {id: id, url: url, reload: reload, containerType: containerType}
    );
});

revolver.on('locationDeleted', function(id) {
    fayeClient.publish('/revolver/locationDeleted', {id: id});
});

revolver.on('rotateTo', function(id) {
    fayeClient.publish('/revolver/rotateTo', {id: id});
});

fayeClient.subscribe('/revolver/getLocations', function(msg, replier) {
    revolver
        .getLocations()
        .then(function(locations) {
            fayeClient.publish(msg.replyAddr, locations);
        });
});

fayeClient.subscribe('/revolver/setLocation', function(msg) {
    revolver.setLocation(msg.id, msg.url, msg.reload, msg.containerType);
});

fayeClient.subscribe('/revolver/removeLocation', function(msg) {
    revolver.removeLocation(msg.id);
});

// == set it off

fayeServer.attach(httpServer);
httpServer.listen(config.httpPort);

revolver.start();
