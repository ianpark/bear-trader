var POLO_TICKER = 'https://poloniex.com/public?command=returnTicker'
var CO_TICKER = 'https://api.coinone.co.kr/ticker/?currency=all'
var FX_USD = 'http://api.fixer.io/latest?base=USD&symbols=KRW,EUR,GBP'
var FX_KRW = 'http://api.fixer.io/latest?base=KRW&symbols=USD,EUR,GBP'

var ls = {
    set: function (key, obj) {
        localStorage.setItem(key, JSON.stringify(obj));
    },
    get: function (key) {
        var result = localStorage.getItem(key);
        return result?JSON.parse(result):{};
    },
    clear: function () {
        window.localStorage.clear();
    }
}

var polo_ticker = {};
var coinone_ticker = {};
var fx = {};
var USDT = 1.02;

var convert_to_list = function(input) {
    return Object.keys(input).map(function(key) {
        return {name: key, data: input[key]};
    });
};

var plus_minus = function(myValue){
    if(myValue < 0){
        return { 'color':'red' };
    } else {
        return { 'color':'green' };
    }
}

var calculate_premium = function () {
    for (key in coinone_ticker.data) {
        var polo_krw = polo_ticker['USDT_' + key.toUpperCase()].last * USDT * fx.USD.KRW;
        var co = coinone_ticker.data[key].last;
        coinone_ticker.data[key].premium = (co - polo_krw)/polo_krw * 100;
    };
}

var btc_to_usdt = function (btc) {
    return btc * polo_ticker['USDT_BTC'].last;
}

var btc_to_usd = function (btc) {
    return btc * polo_ticker['USDT_BTC'].last * USDT;
}

var usdt_to_btc = function (usdt) {
    return usdt/polo_ticker['USDT_BTC'].last;
}

var usdt_to_krw = function (usdt) {
    return usd_to_krw(usdt * USDT);
}

var usd_to_krw = function (usd) {
    return usd * fx.USD.KRW;
}

var btc_to_krw = function (btc) {
    return usd_to_krw(btc_to_usd(btc));
}

function applyCoinoneData() {
    var scope = angular.element($("#coinone_ticker")).scope();
    scope.$apply(function() {
        scope.coinone_ticker = coinone_ticker;
    });
}

function get_coinone_ticker(){
    $.get(CO_TICKER, function(data, status) {
        coinone_ticker.lastUpdate = data.timestamp;
        coinone_ticker.data = data;
        delete data.timestamp;
        delete data.errorCode;
        delete data.result;
        $.get('/coinone/price_change', function(trend, status) {
            trend.forEach(function(item){
                data[item.currency].trend = item.cases;
            });
            calculate_premium();
            applyCoinoneData();
            // Save ticker
            ls.set('coinone_ticker', coinone_ticker);
        });
    });
};
setInterval(get_coinone_ticker, 5000);

function applyPoloData() {
    var scope = angular.element($("#polo_ticker")).scope();
    scope.$apply(function() {
        scope.polo_ticker = convert_to_list(polo_ticker);
    });
}

function get_polo_ticker() {
    $.get(POLO_TICKER, function(data, status) {
        polo_ticker = data;
        applyPoloData();
        ls.set('polo_ticker', polo_ticker);
    });
}
setInterval(get_polo_ticker, 5000);

function get_fx() {
    $.get(FX_USD, function(data, status) {
        fx[data.base] = data.rates;
        ls.set('fx', fx);
    });
    $.get(FX_KRW, function(data, status) {
        fx[data.base] = data.rates;
        ls.set('fx', fx);
    });
}
setInterval(get_fx, 10000);

function title_updator() {
    if (coinone_ticker.data) {
        top.document.title = parseInt(coinone_ticker.data['btc'].last/1000) + 'k ' + 
                            parseInt(coinone_ticker.data['eth'].last/1000) + 'k ' +
                            parseInt(coinone_ticker.data['xrp'].last);
    }
}
setInterval(title_updator, 1000);

var app = angular.module('myApp', []);
app.controller('coinone_ticker_ctrl', ['$scope', '$window', function($scope, $window) {
    $scope.plus_minus = $window.plus_minus;
    $scope.getLink = function(key) {
        if (key == 'btc') {
            return 'https://coinone.co.kr/chart/?site=Coinone&unit_time=15m';
        } else {
            return 'https://coinone.co.kr/chart/?site=Coinone' + key + '&unit_time=15m';
        }
    }
}]);
app.controller('polo_ticker_ctrl', ['$scope', '$window', function($scope, $window) {
    $scope.currency_option = ['USDT', 'BTC'];
    $scope.plus_minus = $window.plus_minus;
    $scope.btc_to_usd = $window.btc_to_usd;
    $scope.btc_to_usdt = $window.btc_to_usdt;
    $scope.btc_to_krw = $window.btc_to_krw;
    $scope.usdt_to_btc = $window.usdt_to_btc;
    $scope.usdt_to_krw = $window.usdt_to_krw;

    $scope.show_btc = function(money) {
        if ($scope.currency=='BTC') {
            return money;
        } else if ($scope.currency=='USDT'){
            return usdt_to_btc(money);
        } else {
            return '-';
        }
    }

    $scope.show_usdt = function(money) {
        if ($scope.currency=='BTC') {
            return $scope.btc_to_usdt(money);
        } else if ($scope.currency=='USDT'){
            return money;
        } else {
            return '-';
        }
    }
    $scope.show_krw = function(money) {
        if ($scope.currency=='BTC') {
            return $scope.btc_to_krw(money);
        } else if ($scope.currency=='USDT'){
            return $scope.usdt_to_krw(money);
        } else {
            return '-';
        }
    }
}]);


app.filter('key_starts_with', function(){
	return function(arr, searchString){
		if(!searchString){
			return arr;
		}
		var result = [];
		searchString = searchString.toLowerCase();
		// Using the forEach helper method to loop through the array
		angular.forEach(arr, function(item){
			if(item.title.toLowerCase().indexOf(searchString) !== -1){
				result.push(item);
			}
		});
		return result;
	};
});


$(function() {
    fx = ls.get('fx');
    polo_ticker = ls.get('polo_ticker');
    if (polo_ticker) applyPoloData();
    coinone_ticker = ls.get('coinone_ticker');
    if (coinone_ticker) applyCoinoneData();
    get_fx();
    get_coinone_ticker();
    get_polo_ticker();

});
