const test = require('tape')
const RemoteTrie = require('../remote')
const HostTrie = require('../host')

test('basic functionality', function(t){
  t.plan(6)

  var host = null
  var remote = new RemoteTrie(connect)

  function connect(){
    var newHost = new HostTrie()
    if (!host) host = newHost
    return newHost.createNetworkStream()
  }

  remote.checkpoint()
  remote.put('beans', 'cakes', function(){
    t.equals(remote.root.toString('hex'), host.root.toString('hex'), 'roots match')
    remote.get('beans', function(err, result){
      t.equals(remote.root.toString('hex'), host.root.toString('hex'), 'roots match')
      t.equals(result.toString(), 'cakes', 'value should be as set, "cakes"')
      remote.revert(function(){
        t.equals(remote.root.toString('hex'), host.root.toString('hex'), 'roots match')
        remote.get('beans', function(err, result){
          t.equals(remote.root.toString('hex'), host.root.toString('hex'), 'roots match')
          t.equals(result, null, 'value should be null')
        })
      })
    })
  })

})

test('checkpoint + commit + revert', function(t){
  t.plan(5)

  var host = null
  var remote = new RemoteTrie(connect)

  function connect(){
    var newHost = new HostTrie()
    if (!host) host = newHost
    return newHost.createNetworkStream()
  }

  t.equals(remote.isCheckpoint, false, 'NOT a checkpoint')
  remote.checkpoint()
  t.equals(remote.isCheckpoint, true, 'YES a checkpoint')
  remote.commit(function(){
    t.equals(remote.isCheckpoint, false, 'NOT a checkpoint')
    remote.checkpoint()
    t.equals(remote.isCheckpoint, true, 'YES a checkpoint')
    remote.revert(function(){
      t.equals(remote.isCheckpoint, false, 'NOT a checkpoint')
    })
  })

})

test('remoteTrie.copy', function(t){
  t.plan(14)

  var host = null
  var copyHost = null
  var remote = new RemoteTrie(connect)
  var copy = remote.copy()

  function connect(){
    var newHost = new HostTrie()
    if (host && !copyHost) copyHost = newHost
    if (!host) host = newHost
    return newHost.createNetworkStream()
  }

  var initialRoot = remote.root.toString('hex')

  copy.checkpoint()
  copy.put('beans', 'cakes', function(){
    t.equals(remote.root.toString('hex'), initialRoot, 'remote root unchanged')
    t.equals(host.root.toString('hex'), initialRoot, 'original host root unchanged')
    t.equals(copy.root.toString('hex'), copyHost.root.toString('hex'), 'roots match')
    copy.get('beans', function(err, result){
      t.equals(remote.root.toString('hex'), initialRoot, 'remote root unchanged')
      t.equals(host.root.toString('hex'), initialRoot, 'original host root unchanged')
      t.equals(copy.root.toString('hex'), copyHost.root.toString('hex'), 'roots match')
      t.equals(result.toString(), 'cakes', 'value should be as set, "cakes"')
      copy.revert(function(){
        t.equals(remote.root.toString('hex'), initialRoot, 'remote root unchanged')
        t.equals(host.root.toString('hex'), initialRoot, 'original host root unchanged')
        t.equals(copy.root.toString('hex'), copyHost.root.toString('hex'), 'roots match')
        copy.get('beans', function(err, result){
          t.equals(remote.root.toString('hex'), initialRoot, 'remote root unchanged')
          t.equals(host.root.toString('hex'), initialRoot, 'original host root unchanged')
          t.equals(copy.root.toString('hex'), copyHost.root.toString('hex'), 'roots match')
          t.equals(result, null, 'value should be null')
        })
      })
    })
  })

})

test('root override', function(t){
  t.plan(3)

  var host = null
  var remote = new RemoteTrie(connect)

  function connect(){
    var newHost = new HostTrie()
    if (!host) host = newHost
    return newHost.createNetworkStream()
  }

  remote.put('beans', 'cakes', function(){
    var oldRoot = remote.root
    remote.put('beans', 'gross', function(){
      remote.get('beans', function(err, result){
        t.equals(result.toString(), 'gross', 'value should be as overwritten, "gross"')
        remote.root = oldRoot
        // need to perform another operation before roots sync
        remote.get('beans', function(err, result){
          t.equals(result.toString(), 'cakes', 'value should be as originally set, "cakes"')
          t.equals(remote.root.toString('hex'), host.root.toString('hex'), 'roots match')
        })
      })
    })
  })

})