var util = require('./util');
var request = require('request');
var querystring = require('querystring');

exports = module.exports = Payment;

function Payment() {

    if (!(this instanceof Payment)) {
        return new Payment(arguments[0]);
    }
    this.rquestUrl = 'https://openapi.alipay.com/gateway.do';
    this.options = arguments[0];
    this.options.charset = this.options.charset || 'utf-8';
    this.options.sign_type = this.options.sign_type || 'RSA2';
    this.options.version = this.options.version || '1.0';
    this.alipayCommonParam = {
        app_id: this.options.app_id,
        charset: this.options.charset,
        sign_type: this.options.sign_type,
        version: this.options.version,
        notify_url: this.options.notify_url
    };
};

Payment.mix = function () {

    switch (arguments.length) {
        case 1:
            var obj = arguments[0];
            for (var key in obj) {
                if (Payment.prototype.hasOwnProperty(key)) {
                    throw new Error('Prototype method exist. method: ' + key);
                }
                Payment.prototype[key] = obj[key];
            }
            break;
        case 2:
            var key = arguments[0].toString(), fn = arguments[1];
            if (Payment.prototype.hasOwnProperty(key)) {
                throw new Error('Prototype method exist. method: ' + key);
            }
            Payment.prototype[key] = fn;
            break;
    }
};


Payment.mix('option', function (option) {
    for (var k in option) {
        this.options[k] = option[k];
    }
});

Payment.mix('sign', function (param) {
    var sign = util.sign(param, this.options.app_private_key, this.options.charset, this.options.sign_type);

    return sign;
});

Payment.mix('buildSignOrderParam', function (opts, fn) {
    var param = {};
    param.method = 'alipay.trade.app.pay';
    param.timestamp = opts.timestamp || util.formatDate(Date.now());
    param.nonce_str = opts.nonce_str || util.generateNonceString();
    param.biz_content = opts;
    util.mix(param, this.alipayCommonParam);
    param.sign = this.sign(param);

    return querystring.stringify(param);
});

Payment.mix('createUnifiedOrder', function (opts, fn) {
    opts.method = 'alipay.trade.app.pay';
    opts.timestamp = opts.timestamp || util.formatDate(Date.now());
    opts.nonce_str = opts.nonce_str || util.generateNonceString();
    util.mix(opts, this.alipayCommonParam);
    opts.sign = this.sign(opts);
    request({
        url: this.rquestUrl,
        method: 'POST',
        body: util.buildXML(opts),
        agentOptions: {
            pfx: this.options.pfx,
            passphrase: this.options.mch_id
        }
    }, function (err, response, body) {
        util.parseXML(body, fn);
    });
});

Payment.mix('notify', function (callback) {

    return function (req, res, next) {
        var _this = this;
        res.success = function () {
            res.end('success');
        };
        res.fail = function () {
            res.end('fail');
        };

        util.pipe(req, function (err, data) {
            var xml = data.toString('utf8');
            util.parseXML(xml, function (err, msg) {
                req.alipayMessage = msg;
                callback.apply(_this, [msg, req, res, next]);
            });
        });
    };
});

