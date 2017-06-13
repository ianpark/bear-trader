var POLO_TICKER = 'https://poloniex.com/public?command=returnTicker'
var CO_TICKER = 'https://api.coinone.co.kr/ticker/?currency=all'
var FX_USD = 'http://api.fixer.io/latest?base=USD&symbols=KRW,EUR,GBP'
var FX_KRW = 'http://api.fixer.io/latest?base=KRW&symbols=USD,EUR,GBP'


var polo_ticker = {};
var coinone_ticker = {};
var coinone_price_trend = {};
var fx = {};
var USDT = 1.01;

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

var get_premium = function (key) {
    var polo_krw = polo_ticker['USDT_' + key.toUpperCase()].last / USDT * fx.USD.KRW;
    var co = coinone_ticker[key].last;
    return (co - polo_krw)/polo_krw * 100;
}

var btc_to_usd = function (btc) {
    return btc * polo_ticker['USDT_BTC'].last / USDT;
}

var usd_to_krw = function (usd) {
    return usd * fx.USD.KRW;
}

var btc_to_krw = function (btc) {
    return usd_to_krw(btc_to_usd(btc));
}

function get_coinone_ticker(){
    $.get(CO_TICKER, function(data, status) {
        coinone_ticker = data;
        delete coinone_ticker.timestamp;
        delete coinone_ticker.errorCode;
        delete coinone_ticker.result;
        for (key in coinone_ticker) {
            coinone_ticker[key].premium = get_premium(key);
        }
        $.get('/coinone/price_change', function(data, status) {
            coinone_price_trend = data;
            coinone_price_trend.forEach(function(item){
                coinone_ticker[item.currency].trend = item.cases;
            });
            var scope = angular.element($("#coinone_ticker")).scope();
            scope.$apply(function() {
                scope.coinone_ticker = coinone_ticker;
            });
        });
    });
};
setInterval(get_coinone_ticker, 5000);

function get_polo_ticker() {
    $.get(POLO_TICKER, function(data, status) {
        polo_ticker = data;
        var scope = angular.element($("#polo_ticker")).scope();
        scope.$apply(function() {
            scope.polo_ticker = convert_to_list(polo_ticker);
        });
    });
}
setInterval(get_polo_ticker, 5000);

function get_fx() {
    $.get(FX_USD, function(data, status) {
        fx[data.base] = data.rates;
    });
    $.get(FX_KRW, function(data, status) {
        fx[data.base] = data.rates;
    });
}
setInterval(get_fx, 10000);

var app = angular.module('myApp', []);
app.controller('coinone_ticker_ctrl', ['$scope', '$window', function($scope, $window) {
    $scope.plus_minus = $window.plus_minus;
}]);
app.controller('polo_ticker_ctrl', ['$scope', '$window', function($scope, $window) {
    $scope.plus_minus = $window.plus_minus;
    $scope.btc_to_usd = $window.btc_to_usd;
    $scope.btc_to_krw = $window.btc_to_krw;
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
    get_coinone_ticker();
    get_polo_ticker();
    get_fx();
});