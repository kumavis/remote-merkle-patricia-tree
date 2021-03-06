const async = require('async')
const RPC = require('multiplex-rpc')
const PassThrough = require('readable-stream').PassThrough
// const through2 = require('through2')

module.exports = RemoteInterface


function RemoteInterface (trie) {
  
  // detach from put db
  trie._putDBs = []
  
  var rpc = trie._rpc = RPC()

  // used to connect a trie to the network
  // especially when making copies of the trie
  // should return a duplex stream to a hostTrie
  // it is called synchronously
  this._connectFn = null

  trie._remote = rpc.wrap([
    'get',
    'put',
    'del',
    'batch',
    'checkpoint',
    'commit',
    'revert',
    'createReadStream:s',
  ])

  Object.defineProperty(trie, 'isConnected', {
    get: function() {
      return !!trie._remote
    }
  })

  // new methods
  trie.connect = connect
  trie.createNetworkStream = createNetworkStream
  
  // overwrites
  superify(trie, 'get', get)
  superify(trie, 'put', put)
  superify(trie, 'del', del)
  superify(trie, 'batch', batch)
  superify(trie, 'checkpoint', checkpoint)
  superify(trie, 'commit', commit)
  superify(trie, 'revert', revert)
  superify(trie, 'createReadStream', createReadStream)
  superify(trie, 'copy', copy)

}

// uses _connectFn to setup a connection
// to a host trie
// automatically called when creating a copy
function connect() {
  var connectFn = this._connectFn
  if (!connectFn) return console.log('no connectionFn!')
  var rpcStream = this.createNetworkStream()
  var transport = connectFn()
  rpcStream.pipe(transport).pipe(rpcStream)
}

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

// gets from remote db
function get(_super, key, cb) {
  cb = cb || noop
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    key = encode(key)
    var root = encode(this.root)
    remote.get(root, key, function(err, value) {
      if (err) return cb(err)
      value = decode(value)
      cb(null, value)
    })
  }.bind(this))
}

// puts to remote db
function put(_super, key, value, cb) {
  cb = cb || noop
  if (!value) return this.del(key, cb)
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    // encode key and value
    key = encode(key)
    value = encode(value)
    var root = encode(this.root)
    remote.put(root, key, value, function(err, root) {
      if (err) return cb(err)
      this.root = decode(root)
      cb()
    }.bind(this))
  }.bind(this))
}

function del(_super, key, cb) {
  cb = cb || noop
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    key = encode(key)
    var root = encode(this.root)
    remote.del(root, key, function(err, root) {
      if (err) return cb(err)
      this.root = decode(root)
      cb()
    }.bind(this))
  }.bind(this))
}

function batch(_super, ops, cb) {
  cb = cb || noop
  // serialize ops
  ops = encodeOps(ops)
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    var root = encode(this.root)
    remote.batch(root, ops, function(err, root) {
      if (err) return cb(err)
      this.root = decode(root)
      cb()
    }.bind(this))
  }.bind(this))
}

function createReadStream() {
  var passthrough = new PassThrough()
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    var root = encode(this.root)
    remote.createReadStream(root, function(readStream) {
      readStream.pipe(passthrough)
    })
  }.bind(this))
  return passthrough
}

function checkpoint(_super) {
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    var root = encode(this.root)
    remote.checkpoint(root)
    _super()
  }.bind(this))
}

function commit(_super, cb) {
  cb = cb || noop
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    var root = encode(this.root)
    async.parallel([
      remote.commit.bind(remote, root),
      _super,
    ], cb)
  }.bind(this))
}

function revert(_super, cb) {
  cb = cb || noop
  this.sem.take(function() {
    this.sem.leave()
    var remote = this._remote
    async.parallel([
      remote.revert.bind(remote),
      _super.bind(this),
    ], function(err, results) {
      if (err) return cb(err)
      this.root = decode(results[0])
      cb(null)
    })
  }.bind(this))
}

// adds the interface when copying the trie
// consumer must setup the remote connection
function copy(_super) {
  var trie = _super()
  RemoteInterface(trie)
  // initialize networking if provided
  trie._connectFn = this._connectFn
  trie.connect()
  return trie
}

// util

function noop(){}

function superify(trie, key, fn) {
  var _super = trie[key].bind(trie)
  trie[key] = fn.bind(trie, _super)
}

function encode(value) {
  if (value && !Buffer.isBuffer(value)) {
    value = (new Buffer(value, 'utf8'))
  }
  return value && value.toString('binary')
}

function decode(value) {
  return value && new Buffer(value, 'binary')
}

function encodeOps(ops) {
  return ops.map(function(op) {
    return {
      type: op.type,
      key: encode(op.key),
      value: encode(op.value),
    }
  })
}