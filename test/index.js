const RemoteTrie = require('../remote')
const HostTrie = require('../host')

var remote = new RemoteTrie()
var host = new HostTrie()

var transport = remote.createNetworkStream()
transport.pipe(host.createNetworkStream()).pipe(transport)

console.log('starting test...')

remote.checkpoint()
remote.put('beans', 'cakes', function(){
  console.log('remote.put -', remote.root.toString('hex'))
  console.log('host.put -', host.root.toString('hex'))
  remote.get('beans', function(err, result){
    console.log('remote.get -', remote.root.toString('hex'))
    console.log('host.get -', host.root.toString('hex'))
    console.log(result.toString())
    remote.revert(function(){
      console.log('remote.revert -', remote.root.toString('hex'))
      console.log('host.revert -', host.root.toString('hex'))
      remote.get('beans', function(err, result){
        console.log('remote.get -', remote.root.toString('hex'))
        console.log('host.get -', host.root.toString('hex'))
        console.log(result && result.toString())
        process.exit()
      })
    })
  })
})
