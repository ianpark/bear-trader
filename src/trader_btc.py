from trader import Trader

class BtcTrader(Trader):

    def __init__(self, character, log):
        super(BtcTrader, self).__init__(character, log)

    def make_decesion(self, market_data):
        self.log("I am BTC")