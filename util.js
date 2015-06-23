module.exports = {
  callTogether: callTogether,
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