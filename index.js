
var Pay = require('./lib/payment');

Pay.mix('Util', require('./lib/util'));

module.exports = Pay;