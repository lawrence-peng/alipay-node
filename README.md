# alipay-nodejs
支付宝支付 for node.js

## Installation
```
npm install alipay-nodejs
```

## Usage

获取APP支付签名后订单参数
```js
var Alipay = require('alipay-nodejs');

var pay = new Alipay({
	app_id: 'xxxxxxxx',
	notify_url: 'https://xxxxxxxxx',
	app_private_key: fs.readFileSync('./app_private_key.pem'), //支付宝商户应用私钥
	alipay_public_key: fs.readFileSync('./alipay_public_key.pem')
});

var result = pay.buildSignOrderParam({
    boby:'对一笔交易的具体描述信息。如果是多种商品，请将商品描述字符串累加传给body',
	subject: '大乐透',
	out_trade_no: '20140703'+Math.random().toString().substr(2, 10),
	totatimeout_expressl_amount: 9.00,
	: '90m',
	product_code: 'QUICK_MSECURITY_PAY'
});
console.log(result);
```


### 中间件

商户服务端处理支付宝的回调（express为例）
```js

// 支付结果异步通知
router.use('/wxpay/notify', pay.notify(function(msg, req, res, next){
	// 处理商户业务逻辑

    // res.success() 向支付宝返回处理成功信息，res.fail()返回失败信息。
    res.success();
}));
```
