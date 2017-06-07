import json
import logging
import tornado.ioloop
import tornado.web
from tornado import gen, httpclient

from coinone import Coinone
from trader import Trader
from trader_eth import EthTrader
from trader_btc import BtcTrader

log = logging.getLogger()
log.setLevel(logging.DEBUG)

TRADER_MAP = {
    'btc': Trader,
    'eth': EthTrader}

def get_trader(character):
    return TRADER_MAP[character['currency']](character, log)

ioloop = tornado.ioloop.IOLoop.current()

class CoinoneTrader(tornado.web.RequestHandler):
    def __init__(self, *args, **kwargs):
        super(CoinoneTrader, self).__init__(*args, **kwargs)

    def get(self):
        self.write('Hello')

def make_app():
    return tornado.web.Application([
        (r"/", CoinoneTrader),
    ])

@gen.coroutine
def init():
    app = make_app()
    app.listen(8888)

@gen.coroutine
def background():
    """
    Run background trading services
    """
    trader_list = [
        {'name': 'Ian', 'krw': 10000000, 'algo': 'random', 'currency': 'eth'}]
    traders = [get_trader(x) for x in trader_list]
    try:
        coinone = Coinone('eth')
        for trader in traders:
            coinone.add_trader(trader)
            trader.think()
        coinone.start()
    except Exception as e:
        log.error('Error: %s', e)

if __name__ == '__main__':
    ioloop.add_callback(init)
    ioloop.add_callback(background)
    ioloop.start()




