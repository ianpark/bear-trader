import random
from collections import deque
from tornado import gen, ioloop

from util import percent
from trader import Trader

def price_gen(seed, limit=100):
    price = seed
    min = seed - seed * 0.2
    max = seed + seed * 0.2

    while (limit):
        weight = 0.5
        volatility = 0.01
        rnd = random.uniform(0, 1) - weight
        change_percent = 2 * volatility * rnd
        change_amount = price * change_percent
        price = price + change_amount
        yield price
        limit -= 1
        if price < min:
            price = min
            weight = 0.0
        if price > max:
            price = max
            weight = 0.5

@gen.coroutine
def main():
    trader_list = [
        {'name': 'Tom', 'krw': 10000000, 'algo': 'random', 'currency': 'xrp'},
        {'name': 'Ian', 'krw': 10000000, 'algo': 'type1', 'currency': 'xrp'},
        {'name': 'JDY', 'krw': 10000000, 'algo': 'type2', 'currency': 'xrp'},
        {'name': 'YKK', 'krw': 10000000, 'algo': 'type3', 'currency': 'xrp'}]
    traders = [Trader(x) for x in trader_list]
    for trader in traders:
        trader.think()

    price = price_gen(1000, 24*360*1000)
    queue = deque()
    # Collect for one day
    for _ in range(360*24):
        queue.append(int(next(price)))

    for i in price:
        queue.append(int(next(price)))
        queue.popleft()
        analytics = {
            'price': queue[-1],
            'change': {
                'day': queue[-1] - queue[0],
                'pc_day': percent(queue[0], queue[-1]),
                'hour': queue[-1] - queue[-360],
                'pc_hour' : percent(queue[-360], queue[-1]),
                '5min': queue[-1] - queue[-30],
                'pc_5min': percent(queue[-30], queue[-1])
            }
        }
        for trader in traders:
            trader.make_decesion(analytics)
    
    for trader in traders:
        trader.log('completed')
    ioloop.stop()

if __name__ == '__main__':
    ioloop = ioloop.IOLoop.current()
    ioloop.add_callback(main)
    ioloop.start()