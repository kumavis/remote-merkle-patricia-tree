const StateTrie = require('merkle-patricia-tree')
const inherits = require('util').inherits
const remoteInterface = require('./remote-interface.js')
module.exports = RemoteTrie


inherits(RemoteTrie, StateTrie)

function RemoteTrie(opts) {
  StateTrie.call(this, opts)
  remoteInterface(this)
}