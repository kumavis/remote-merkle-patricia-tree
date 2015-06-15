const StateTrie = require('merkle-patricia-tree')
const inherits = require('util').inherits
const hostInterface = require('./host-interface.js')
module.exports = HostTrie


inherits(HostTrie, StateTrie)

function HostTrie(opts) {
  StateTrie.call(this, opts)
  hostInterface(this)
}