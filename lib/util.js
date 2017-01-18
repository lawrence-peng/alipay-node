var xml2js = require('xml2js');
var fs = require('fs');
var crypto = require('crypto');
var moment = require('moment');

exports.buildXML = function (json) {
    var xmlBody = Object.keys(json).sort().filter(function (key) {
            return json[key] !== undefined && json[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key) < 0;
        }).map(function (key) {
            return '<' + key + '>' + json[key] + '</' + key + '>';
        }).join('') + '<sign>' + json.sign + '</sign>';
    return '<xml>' + xmlBody + '</xml>';
    //var builder = new xml2js.Builder();
    //return builder.buildObject(json);
};

exports.parseXML = function (xml, fn) {
    var parser = new xml2js.Parser({trim: true, explicitArray: false, explicitRoot: false});
    parser.parseString(xml, fn || function (err, result) {
        });
};

exports.parseRaw = function () {
    return function (req, res, next) {
        var buffer = [];
        req.on('data', function (trunk) {
            buffer.push(trunk);
        });
        req.on('end', function () {
            req.rawbody = Buffer.concat(buffer).toString('utf8');
            next();
        });
        req.on('error', function (err) {
            next(err);
        });
    }
};

exports.pipe = function (stream, fn) {
    var buffers = [];
    stream.on('data', function (trunk) {
        buffers.push(trunk);
    });
    stream.on('end', function () {
        fn(null, Buffer.concat(buffers));
    });
    stream.once('error', fn);
};

exports.mix = function () {
    var root = arguments[0];
    if (arguments.length == 1) {
        return root;
    }
    for (var i = 1; i < arguments.length; i++) {
        for (var k in arguments[i]) {
            root[k] = arguments[i][k];
        }
    }
    return root;
};

exports.generateNonceString = function (length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var maxPos = chars.length;
    var noceStr = "";
    for (var i = 0; i < (length || 32); i++) {
        noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return noceStr;
};

exports.formatDate = function (dt, format) {
    return moment(dt).format(format || 'YYYY-MM-DD HH:mm:ss');
};

exports.sign = function (param, privateKey, charset, signType) {
    if (!param) {
        throw new Error('missing param');
    }
    if (!privateKey) {
        throw new Error('missing private key');
    }

    var str = buildQueryString(param);

    switch (signType) {
        case 'MD5':
            str += '&key=' + privateKey;
            return crypto.createHash('md5').update(str, charset).digest('hex').toUpperCase();
        case 'RSA':
            return rsa_sha1_Sign(str, privateKey, charset);
        case 'RSA2':
            return rsa_sha256_Sign(str, privateKey, charset);
        default:
            return rsa_sha256_Sign(str, privateKey, charset);
    }
};

exports.verify = function (param, publicKey, charset, signType) {
    if (!param) {
        throw new Error('missing param');
    }
    if (!publicKey) {
        throw new Error('missing public key');
    }

    var str = buildQueryString(param);

    switch (signType) {
        case 'MD5':
            var sign = exports.sign(param, publicKey, charset, "MD5");
            return sign === param.sign;
        case 'RSA':
            return rsa_sha1_verify(str, param.sign, publicKey, charset);
        case 'RSA2':
            return rsa_sha256_Sign(str, param.sign, publicKey, charset);
        default:
            return rsa_sha256_Sign(str, param.sign, publicKey, charset);
    }
};

function buildQueryString(param) {
    var str = Object.keys(param).filter(function (key) {
        return param[key] !== undefined && param[key] !== '' && ['app_private_key', 'partner_key', 'sign', 'key'].indexOf(key) < 0;
    }).sort().map(function (key) {
        var val = param[key];
        if (typeof val === 'object') {
            return key + '=' + JSON.stringify(val);
        } else {
            return key + '=' + val;
        }
    }).join("&");
    return str;
}

function rsa_sha1_Sign(strParam, privateKey, charset) {
    var pKey = fs.readFileSync(privateKey);
    var signer = crypto.createSign('RSA-SHA1');
    signer.update(strParam, charset);
    var sign = signer.sign(pKey.toString(), 'base64');
    return sign;
}

function rsa_sha256_Sign(strParam, privateKey, charset) {
    var pKey = fs.readFileSync(privateKey);
    var signer = crypto.createSign('RSA-SHA256');
    signer.update(strParam, charset);
    var sign = signer.sign(pKey.toString(), 'base64');
    return sign;
}


function rsa_sha1_verify(strParam, sign, publicKey, charset) {
    //var pKey = fs.readFileSync(publicKey);
    var verify = crypto.createVerify('RSA-SHA1');
    verify.update(strParam, charset);
    var result = verify.verify(publicKey, sign, 'base64');
    return result;
}

function rsa_sha256_verify(strParam, sign, publicKey, charset) {
    //var pKey = fs.readFileSync(publicKey);
    var verify = crypto.createVerify('RSA-SHA256');
    verify.update(strParam, charset);
    var result = verify.verify(publicKey, sign, 'base64');
    return result;
}