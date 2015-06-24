const test = require('tape')
const RemoteTrie = require('../remote')
const HostTrie = require('../host')

test('basic functionality', function(t){
  t.plan(6)

  var remote = new RemoteTrie()
  var host = new HostTrie()
  var transport = remote.createNetworkStream()
  transport.pipe(host.createNetworkStream()).pipe(transport)

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

test('root override', function(t){
  t.plan(3)

  var remote = new RemoteTrie()
  var host = new HostTrie()
  var transport = remote.createNetworkStream()
  transport.pipe(host.createNetworkStream()).pipe(transport)

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