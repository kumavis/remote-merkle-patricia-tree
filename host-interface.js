const RPC = require('multiplex-rpc')
// const through2 = require('through2')

module.exports = HostInterface


function HostInterface (trie) {
  
  var rpc = trie._rpc = RPC({
    get: get.bind(trie),
    put: put.bind(trie),
    del: del.bind(trie),
    batch: batch.bind(trie),
    checkpoint: checkpoint.bind(trie),
    commit: commit.bind(trie),
    revert: revert.bind(trie),
    createReadStream: createReadStream.bind(trie),
  })

  Object.defineProperty(trie, 'isConnected', {
    get: function() {
      return !!trie._remote
    }
  })
  
  // new methods
  trie.createNetworkStream = createNetworkStream

  // overwrites
  superify(trie, 'copy', copy)

}


// local methods

// creates a duplex stream for networking
function createNetworkStream() {
  var rpc = this._rpc
  // var dup = through2()
  // dup.pipe(rpc).pipe(dup)
  // dup.on('data', function() {
  //   console.log('host: '+data.toString())
  // })
  return rpc
}

// adds the interface when copying the trie
function copy(_super) {
  var trie = _super()
  HostInterface(trie)
  return trie
}


// remote methods

// gets the value and returns it
function get(root, key, cb) {
  this.root = decode(root)
  key = decode(key)
  this.get(key, function(err, value) {
    if (err) return cb(err)
    cb(null, encode(value))
  }.bind(this))
}

// sets the value and returns the new root
function put(root, key, value, cb) {
  this.root = decode(root)
  key = decode(key)
  value = decode(value)
  this.put(key, value, function() {
    cb(null, encode(this.root))
  }.bind(this))
}

// removes the value and returns the new root
function del(root, key, cb) {
  this.root = decode(root)
  key = decode(key)
  this.del(key, function() {
    cb(null, encode(this.root))
  }.bind(this))
}

// performs the batch operations, then return the new root
function batch(root, ops, cb) {
  this.root = decode(root)
  ops = decodeOps(ops)
  this.batch(ops, function() {
    cb(null, encode(this.root))
  }.bind(this))
}

// syncs the root then checkpoints
function checkpoint(root) {
  this.root = decode(root)
  this.checkpoint()
}

// syncs the root then commits
function commit(root) {
  this.root = decode(root)
  this.commit()
}

// simply reverts
function revert() {
  this.rever()
}

// syncs the root then creates a readstream
function createReadStream(root) {
  this.root = decode(root)
  return this.createReadStream()
}


// util

function superify(trie, key, fn) {
  var _super = trie[key].bind(trie)
  trie[key] = fn.bind(trie, _super)
}

function noop() {}

function encode(value) {
  return value && value.toString('binary')
}

function decode(value) {
  return new Buffer(value, 'binary')
}

function decodeOps(ops) {
  return ops.map(function(op) {
    return {
      type: op.type,
      key: decode(op.key),
      value: decode(op.value),
    }
  })
}

/**
 * Take two or more functions and returns a function  that will execute all of
 * the given functions
 */
function callTogether() {
  var funcs = arguments,
    length = funcs.length,
    index = length;

  if (!length) {
    return function() {};
  }

  return function() {
    length = index;

    while (length--) {
      var fn = funcs[length];
      if (typeof fn === 'function') {
        var result = funcs[length].apply(this, arguments);
      }
    }
    return result;
  };
};