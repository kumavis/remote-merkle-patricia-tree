const StateTrie = require('merkle-patricia-tree')
const inherits = require('util').inherits
const secureInterface = require('merkle-patricia-tree/secure-interface.js')
const remoteInterface = require('./remote-interface.js')
module.exports = RemoteTrie


inherits(RemoteTrie, StateTrie)

function RemoteTrie(opts) {
  StateTrie.call(this, opts)
  remoteInterface(this)
  secureInterface(this)
}