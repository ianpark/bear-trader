import abc
from random import randint
import time

from collections import deque
from tornado import gen

def percent(a, b):
    a = float(a)
    b = float(b)
    return round(100 * (b - a) / a, 4)

class Trader(object):
    __metaclass__ = abc.ABCMeta

    @abc.abstractmethod
    def __init__(self, character, log):
        self.character = character
        self.name = character['name']
        self.krw = character['krw']
        self.algo = character['algo']
        self.currency = character['currency']
        self.coin = 0
        self.buying = True
        self.queue = deque()
        self.latest_market_data = None
        self.snapshot = None
        self.run = True
        self.buy_count = 0
        self.sell_count = 0
        self.logger = log

    def log(self, msg):
        self.logger.debug(' %s %s krw:%d %s:%d total:%d] [%d, %d] %s',
                    self.name,
                    'B' if self.buying else 'S',
                    self.krw,
                    self.currency,
                    self.coin,
                    self.krw + self.coin * self.latest_market_data['price'],
                    self.buy_count, self.sell_count,
                    msg)

    def feed(self, data):
        self.queue.append(data)

    def buy(self, market_data):
        price = market_data['price']
        if price > self.krw:
            self.log('Cannot buy!')
            return
        self.coin += int(self.krw / price)
        self.krw -= self.coin * price
        self.snapshot = market_data
        self.buying = False
        self.buy_count += 1

    def sell(self, market_data):
        price = market_data['price']
        if not self.coin:
            self.log('Cannot sell! Have no money.')
            return
        self.krw += self.coin * price
        self.coin = 0
        self.snapshot = market_data
        self.buying = True
        self.sell_count += 1

    @abc.abstractmethod
    def make_decesion(self, market_data):
        self.latest_market_data = market_data
        price = market_data['price']
        if self.algo is 'random':
            if self.buying:
                # Make decision if we want to buy now.
                if randint(0, 3) is 0:
                    self.buy(market_data)
            else:
                # Make decesion if we want to sell now.
                if randint(0, 5) is 0:
                    self.sell(market_data)
        elif self.algo is 'type1':
            if self.buying:
                change = market_data['change']
                if -1 <= change['pc_hour'] <= 0.2:
                    if -1 <= change['pc_5min'] <= 1:
                        self.buy(market_data)
            else:
                sell_margin = 0.2
                cutoff_meargin = -0.2
                margin = percent(self.snapshot['price'], price)
                change = market_data['change']
                #self.log('current margin %f bought:%d now:%d' % (margin, self.snapshot['price'], price))
                if margin > sell_margin:
                    #if -0.1 <= change['pc_5min'] <= 0.1:
                    self.sell(market_data)
                elif margin <= cutoff_meargin:
                    self.sell(market_data)
        elif self.algo is 'type2':
            sell_margin = 2
            cutoff_meargin = -5
            if self.buying:
                if not self.snapshot or percent(self.snapshot['price'], price) < -sell_margin:
                    self.buy(market_data)
            else:
                if percent(self.snapshot['price'], price) > sell_margin or \
                    percent(self.snapshot['price'], price) < cutoff_meargin:
                    self.sell(market_data)

        elif self.algo is 'type3':
            sell_margin = 1
            cutoff_meargin = -2
            if self.buying:
                if not self.snapshot or self.snapshot['price'] > price:
                    self.buy(market_data)
            else:
                if percent(self.snapshot['price'], price) > sell_margin:
                    self.sell(market_data)

    @gen.coroutine
    def think(self):
        """
        Think about BUY/SELL
        """
        while self.run:
            if self.queue:
                data = self.queue.popleft()
                if not data:
                    continue
                self.latest_market_data = data
                self.make_decesion(data)
            yield gen.sleep(1)



