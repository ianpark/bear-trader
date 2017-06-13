'use strict'

let co = require('co'),
    Bluebird = require('bluebird'),
    autobahn = require('autobahn'),
    Poloniex = require("poloniex.js");

class MarketData {
    constructor() {
        this.ticker = {};
        this.count = 0;
        this.connection = new autobahn.Connection({
            url: 'wss://api.poloniex.com',
            realm: 'realm1'}
        );
        this.polo = Bluebird.promisifyAll(new Poloniex());
    }
    open_websocket() {
       this.connection.onopen = (session) => {
           console.log("Websocket connected!");
            this.session = session;
            this.session.subscribe('ticker', (args, kwargs) => {
                let ticker = args;
                let pos = (parseFloat(ticker[8]) - parseFloat(ticker[1]))/(parseFloat(ticker[8]) - parseFloat(ticker[9]));
                this.ticker[ticker[0]] = {
                    last: parseFloat(ticker[1]),
                    lowestAsk: parseFloat(ticker[2]),
                    highestBid: parseFloat(ticker[3]),
                    percentChange: parseFloat(ticker[4]),
                    baseVolume: parseFloat(ticker[5]),
                    quoteVolume: parseFloat(ticker[6]),
                    isFrozen: ticker[7],
                    high24hr: parseFloat(ticker[8]),
                    low24hr: parseFloat(ticker[9]),
                    pos: pos
                };
            });
        };
        this.connection.onclose = () => {
            console.log("Websocket connection closed");
            setTimeout(this.connection.open, 1000);
        };
        this.connection.open();
    }
    start() {
        return this.polo.returnTickerAsync()
        .then((ticker_data) => {
            Object.keys(ticker_data).forEach(function(key) {
                ticker_data[key].pos = (ticker_data[key].high24hr - ticker_data[key].last)/(ticker_data[key].high24hr - ticker_data[key].low24hr);
            });
            this.ticker = ticker_data;
            this.open_websocket();
        });
    }
}

module.exports = MarketData;