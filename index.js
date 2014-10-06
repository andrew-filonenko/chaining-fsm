var EventEmitter = require('eventemitter3');
var inherits = require('inherits');

function Fsm(states, initial) {

  EventEmitter.call(this);
  var self       = this;
  self.state     = initial;
  self._states   = states;
  self._initial  = initial.slice();
  var eventNames = {};

  
  self._handlers = states.reduce(function (memo, item) {
    var stateName = item.name;
    return item.handlers.reduce(function (memo2, handler) {
      if (handler.name !== '*') eventNames[handler.name] = true;
      var key = [stateName, handler.name].join('.');
      memo2[key] = handler.handler;
      return memo2;
    }, memo);
  }, {});
  
  self.eventNames = Object.keys(eventNames);

}

util.inherits(Fsm, EventEmitter);


Fsm.prototype.handle = function (eventName, payload) {
  var $state = this.state.slice();
  var fullKey = [$state, eventName].join('.');
  var eventKey = '*.' +  eventName;
  var stateKey = $state + '.*';
  var context = {
    eventName: eventName,
    currentState: $state,
    fsm: this
  };

  var key = fullKey in this._handlers
        ? fullKey
        : eventKey in this._handlers
        ? eventKey
        : stateKey in this._handlers
        ? stateKey
        : false;

  if (key) {
    var res = this._handlers[key].call(context, payload);
    if (res) {
      this.transition(res, $state, eventName, payload);
      return true;
    }
  }
  return false;
};

Fsm.prototype.transition = function (to, from, event, payload) {
  to = to.slice();
  this.state = to;
  this.emit('transition', to, from, event, payload);
  this.emit('state-change', to, payload);
};

Fsm.prototype.getTransiitons = function () {
  return this._states.reduce(function (memo, state) {
    var transitions =  state.handlers.reduce(function (memo, handler) {
      if (handler.to) return memo.concat({
        from: state.name,
        to: handler.to,
        event: handler.name
      });
      return memo;
    }, []);
    return memo.concat(transitions);
  }, []);
};


function fsm(initialState) {
  var states = [];
  var currentState = null;
  var self = {};

  self._states = states;
  self.state = function (name) {
    currentState = {
      name: name,
      handlers: []
    };
    states.push(currentState);
    return self;
  };

  self.event = function (name, handler) {
    var event = {
      name: name,
      handler: typeof handler === 'function'
        ? handler
        : function () {return handler;}
    };
    if (typeof handler === 'string')
      event.to = handler;
    currentState.handlers.push(event);
    return self;
  };

  self.run = function () {
    return new Fsm(states, initialState);
  };


  return self;
}

fsm.Fsm = Fsm;
module.exports = fsm;
