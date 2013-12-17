var Q    = require('q');
var util = require('util');

var EventEmitter = require('events').EventEmitter;

/*global console:true */
function Revolver(config) {
    "use strict";

    var self = this;

    // how long to display each location for
    var displayLinger = 30;

    if (config.duration) {
        displayLinger = config.duration;
    }

    // the locations to display
    var locations = config.locations;

    // The order the locations will be rotated through
    var rotationOrder = config.rotationOrder;

    // the item currently being displayed
    var currentLocationIndex = 0;

    // rotation timer id
    var rotationTimerId = null;

    /**
     * Sets the linger duration.
     *
     * @param duration how long to linger on each location
     */
    self.setLinger = function(duration) {
        displayLinger = duration;

        self.pause();
        self.start();
    };

    /**
     * Starts rotation.
     */
    self.start = function() {
        rotationTimerId = setInterval(self.next, displayLinger * 1000);
    };

    /**
     * Disables rotation.
     */
    self.pause = function() {
        if (rotationTimerId) {
            clearInterval(rotationTimerId);
            rotationTimerId = null;
        }
    };

    /**
     * Rotates to the next location.
     */
    self.next = function() {
        currentLocationIndex += 1;

        if (currentLocationIndex >= rotationOrder.length) {
            currentLocationIndex = 0;
        }

        self.emit('rotateTo', rotationOrder[currentLocationIndex]);
    };

    /**
     * Rotates to the previous location.
     */
    self.prev = function() {
        currentLocationIndex -= 1;

        if (currentLocationIndex < 0) {
            currentLocationIndex = (rotationOrder.length - 1);
        }

        self.emit('rotateTo', rotationOrder[currentLocationIndex]);
    };

    /**
     * Returns a promse that when fulfilled provides the list of configured
     * locations.
     */
    self.getLocations = function() {
        // @todo use persistence store
        return Q.fcall(function() {
            return {
                locations: locations,
                current: rotationOrder[currentLocationIndex]
            };
        });
    };

    /**
     * Adds or modifies a location.  Emits 'locationUpdated' upon completion.
     *
     * @param id the identifier; must be element-ID-safe
     * @param url the url
     * @param reload boolean; if true, location will be reloaded when displayed
     * @param containerType iframe or div; defaults to iframe if not provided
     */
    self.setLocation = function(id, url, reload, containerType) {
        // add to rotation order if not already exists
        if (rotationOrder.indexOf(id) === -1) {
            rotationOrder.push(id);
        }

        if (containerType && ((containerType !== 'iframe') || (containerType !== 'div'))) {
            containerType = null;
        }

        locations[id] = {
            url: url,
            reload: reload,
            containerType: containerType ? containerType : 'iframe'
        };

        self.emit('locationUpdated', id, url, reload, containerType);
    };

    /**
     * Removes a location.  Emits 'locationDeleted' upon completion if it
     * existed.
     *
     * @param id the identifier
     */
    self.removeLocation = function(id) {
        if (locations[id]) {
            delete locations[id];

            // remove the id from the rotation order
            var orderInd = rotationOrder.indexOf(id);
            if (orderInd !== -1) {
                rotationOrder.splice(orderInd, 1);
            }

            self.emit('locationDeleted', id);
        }
    };
}

util.inherits(Revolver, EventEmitter);

module.exports = Revolver;
