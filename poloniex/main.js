'use strict'
let path = require('path'),
    co = require('co'),
    Bluebird = require("bluebird"),
    fs = Bluebird.promisifyAll(require("fs")),
    Poloniex = require("poloniex.js"),
    MarketData = require("./market_data");

const config_file_path = path.resolve(__dirname, 'config.json');
let poloniex = null;
let balance = {};
let open_order = {};
let config = {};
let trade_history = {};
let market_data = new MarketData();

function * init() {
    try {
        config = JSON.parse(yield fs.readFileAsync(config_file_path, 'utf8'));
        var cred = JSON.parse(yield fs.readFileAsync(config.keyfile_path, 'utf8'));
        poloniex = Bluebird.promisifyAll(new Poloniex(cred.key, cred.secret));
        yield market_data.start();
        balance = yield poloniex.returnCompleteBalancesAsync();
        open_order = yield poloniex.returnAllOpenOrdersAsync();
        trade_history = yield poloniex.returnAllTradeHistoryAsync();
        console.log('Module Initialised');
    } catch(e) {
        console.log('Error ' + e.stack);
    }
}


function coins() {
    console.log('haha');
}

co(function *() {
    yield init();
    console.log('Ready');
});


