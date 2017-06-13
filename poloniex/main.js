'use strict'
let path = require('path'),
    co = require('co'),
    _ = require('lodash'),
    Bluebird = require("bluebird"),
    fs = Bluebird.promisifyAll(require("fs")),
    Poloniex = require("poloniex.js"),
    MarketData = require("./market_data"),
    express = require('express'),
    bodyParser = require('body-parser'),
    rp = require('request-promise');

// Utils
Object.filter = (obj, predicate) => 
    Object.keys(obj)
          .filter( key => predicate(obj[key]) )
          .reduce( (res, key) => (res[key] = obj[key], res), {} );

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

// Variables
const config_file_path = path.resolve(__dirname, 'config.json');
let poloniex = null;
let balance = {};
let open_order = {};
let config = {};
let trade_history = {};
let market_data = new MarketData();

let coinone_day = {};
let coinone_price_change = [];

var app = express();
app.use(express.static('static'));
app.use(bodyParser.json());
app.get('/', function(req, res) {
      res.sendFile(__dirname + "/static/viewer.html");
});


app.get('/polo/ticker/:currency?', function(req, res) {
    let currency = req.params.currency;
    if (!currency) {
        res.status(200).json(market_data.ticker);
    } else {
        res.status(200).json(market_data.ticker[currency]);
    }
});

app.get('/polo/balance/:currency?', function(req, res) {
    let currency = req.params.currency;
    if (!currency) {
        res.status(200).json(balance);
    } else {
        res.status(200).json(market_data.ticker[currency]);
    }
});
app.get('/polo/openorder/:currency?', function(req, res) {
    let currency = req.params.currency;
    if (!currency) {
        res.status(200).json(open_order);
    } else {
        res.status(200).json(market_data.ticker[currency]);
    }
});
app.get('/polo/trade_history/:currency?', function(req, res) {
    let currency = req.params.currency;
    if (!currency) {
        res.status(200).json(trade_history);
    } else {
        res.status(200).json(market_data.ticker[currency]);
    }
});

// Coinone
app.get('/coinone/price_change', function(req, res) {
    if (!isEmptyObject(coinone_price_change)) {
        res.status(200).json(coinone_price_change);
    } else {
        res.status(404).send('Not Ready');
    }
});
coinone_price_change

app.get('/region/:name', function(req, res) {
    /*
      let region_name = req.params.name;
      data_handler.populate_region_data_json(region_name)
      .then(function(info) {
            logger.info({event:'region-data-sent', region_name: region_name});
            res.send(info);
      })
      .catch(function(error) {
            logger.error({event: 'fail-to-get-region-data', region_name: region_name, error: error});
            res.status(400)
            .json({region_name: region_name, error: 'no data'})
      })
      .done();
    */
});


var port = process.env.PORT || 7540;
app.listen(port, function() {
      console.log('Listening on ' + port);
});

function get_index(t, ts) {
  var p = 0, q = t.length-1;
  while(p < q) {
    var mid = p + parseInt((q-p)/2);
    var mid_time = parseInt(t[mid].timestamp);
    if ( mid_time == ts) {
      return mid;
    } else if (mid_time > ts) {
      q = mid - 1;
    } else {
      p = mid + 1;
    }
  }
  return p;
}

function get_change_percent(t, i) {
    return ((_.last(t).price - t[i].price)/t[i].price * 100);
}

function get_coinone_price_change() {
    var now = Math.round((new Date()).getTime() / 1000);
    var cases = [
        {name: 'min_1', delta: now - 60 },
        {name: 'min_5', delta: now - 300 },
        {name: 'min_30', delta: now - 1800 },
        {name: 'hour_1', delta: now - 3600 },
        {name: 'hour_6', delta: now - 3600 * 6 },
        {name: 'hour_24', delta: now - 3600 * 24 }
    ];
    var collection = [];
    for (var key in coinone_day) {
        var price_trend = {currency : key, cases: {}};
        var data = coinone_day[key].completeOrders;
        cases.forEach(function(time_case) {
            var idx = get_index(data, time_case.delta);
            price_trend.cases[time_case.name] = get_change_percent(data, idx);
        });
        collection.push(price_trend);
    }
    coinone_price_change = collection;
}

function * coinone_history() {
    try {
        if (isEmptyObject(coinone_day)) {
            coinone_day = yield {
                btc: rp({uri: 'https://api.coinone.co.kr/trades/?currency=btc&period=day', json: true}),
                xrp: rp({uri: 'https://api.coinone.co.kr/trades/?currency=xrp&period=day', json: true}),
                eth: rp({uri: 'https://api.coinone.co.kr/trades/?currency=eth&period=day', json: true}),
                etc: rp({uri: 'https://api.coinone.co.kr/trades/?currency=etc&period=day', json: true})
            };
        } else {
            var tmp = yield {
                btc: rp({uri: 'https://api.coinone.co.kr/trades/?currency=btc&period=hour', json: true}),
                xrp: rp({uri: 'https://api.coinone.co.kr/trades/?currency=xrp&period=hour', json: true}),
                eth: rp({uri: 'https://api.coinone.co.kr/trades/?currency=eth&period=hour', json: true}),
                etc: rp({uri: 'https://api.coinone.co.kr/trades/?currency=etc&period=hour', json: true})
            };
            for (var key in tmp) {
                var old_data = coinone_day[key].completeOrders;
                var new_data = tmp[key].completeOrders;
                var time_stamp = _.last(old_data).timestamp;
                for (var i = new_data.length-1; i >= 0; --i ) {
                    if (new_data[i].timestamp <= time_stamp) {
                        old_data.push.apply(old_data, new_data.slice(i+1));
                        break;
                    }
                }
                // Shrink the day list
                var a_day = _.last(old_data).timestamp - 3600*24;
                for (var i = 0 ; i < old_data.length; i++) {
                    if (old_data[i].timestamp > a_day) {
                        old_data.splice(0, i);
                        break;
                    }
                }
            }
        }
        get_coinone_price_change();
    } catch(e) {
        console.log('Error ' + e.stack);
    }

}


function * init() {
    try {
        config = JSON.parse(yield fs.readFileAsync(config_file_path, 'utf8'));
        var cred = JSON.parse(yield fs.readFileAsync(config.keyfile_path, 'utf8'));
        poloniex = Bluebird.promisifyAll(new Poloniex(cred.key, cred.secret));
        //yield market_data.start(); 
        console.log('Module Initialised');
    } catch(e) {
        console.log('Error ' + e.stack);
    }
}

function * sync() {
    try {
        balance = yield poloniex.returnCompleteBalancesAsync();
        open_order = yield poloniex.returnAllOpenOrdersAsync();
        trade_history = yield poloniex.returnAllTradeHistoryAsync();   
    } catch(e) {
        console.log('Error ' + e.stack);
    }
}

co(function *() {
    yield init();
    yield sync();
    yield coinone_history();
    console.log('Ready');
    while (true) {
        yield Bluebird.delay(5000);
        yield coinone_history();
    }
});

