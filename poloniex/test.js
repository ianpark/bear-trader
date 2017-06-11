'use strict'
let co = require('co'),
    Bluebird = require('bluebird'),
    Poloniex = require("poloniex.js"),
    poloAsync = Bluebird.promisifyAll(new Poloniex());

/*
function * get_ticker() {
    var data = yield poloniex.returnTickerAsync()
    console.log(data);
    console.log('Hello');
}

co(function*() {
    yield get_ticker()
});
*/


poloAsync.returnTickerAsync().then(function(data) {
    if (!data.BTC_ETH2) {
        console.log(data.BTC_ETH);
    }
}).catch(function(err) {
    console.log(err);
})

setTimeout(function(){}, 2000);