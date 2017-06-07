
from random import randint
from trader import Trader

class EthTrader(Trader):

    def __init__(self, character, log):
        super(EthTrader, self).__init__(character, log)

    def make_decesion(self, market_data):
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