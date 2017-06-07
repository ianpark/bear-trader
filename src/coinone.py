# -*- coding: utf-8 -*-
"""
Coinone trader
"""

import base64
import hashlib
import hmac
import json
import logging
import time
import sys
import os

from tornado import gen

from coinone_core import get_private, get_public

from util import percent, diff_recent, diff_period

log = logging.getLogger(__name__)
log.setLevel(logging.DEBUG)

class Coinone(object):
    """
    Coinone Wrapper
    """
    ticker = {}
    traders = []

    def __init__(self, currency='btc'):
        log.info('Coinone module start')
        self.currency = currency
        self.run = True
        self.completed_order = None
        self.pending_order = None
        self.balance = None
        self.latest_analytics = None

    @gen.coroutine
    def start(self):
        """
        Start coinone trader
        """
        self.start_collection()
        self.start_sync()
        self.start_ticker()
        log.debug('[%s] Coinone trader started!', self.currency)

    @gen.coroutine
    def start_ticker(self):
        while self.run:
            if self.completed_order:
                log.debug(self.completed_order)
            if self.latest_analytics:
                log.debug(self.latest_analytics)
            if self.pending_order:
                log.debug(self.pending_order)
            if self.balance:
                log.debug(self.balance)
            yield gen.sleep(5)

    def add_trader(self, trader):
        """
        Add a trader
        """
        if trader.currency is not self.currency:
            log.error('Failed to add %s due to the different currency', trader.name)
        log.debug('Added %s:%d to Coinone:%s', trader.name, trader.coin, self.currency)
        self.traders.append(trader)

    def analyze_trade_list(self, trades):
        """
        Parse the trade JSON and calculate the currrent trade trend
        """
        now_time = int(trades.get('timestamp'))
        sold_list = trades.get('completeOrders', [])
        if sold_list:
            price_change_60, price_change_60_pc = diff_period(sold_list[0]['price'], sold_list[-1]['price'])
            price_change_day, price_change_day_pc = diff_period(self.ticker['first'], self.ticker['last'])
            price_change_5, price_change_5_pc = diff_recent(sold_list, now_time, 300)
            price_change_1, price_change_1_pc = diff_recent(sold_list, now_time, 60)

            analytics = {
                'price': int(self.ticker['last']),
                'change': {
                    'day': price_change_day,
                    'pc_day': price_change_day_pc,
                    'hour': price_change_60,
                    'pc_hour' : price_change_60_pc,
                    '5min': price_change_5,
                    'pc_5min': price_change_5_pc,
                    '1min' : price_change_1,
                    'pc_1min': price_change_1_pc
                }
            }
            self.latest_analytics = analytics
            for trader in self.traders:
                trader.feed(analytics)

    @gen.coroutine
    def start_collection(self):
        """
        Collect ticker and trades every 5 secs
        """
        while self.run:
            try:
                self.ticker = yield get_public('ticker', {'currency' : self.currency})
                trades = yield get_public('trades', {'currency' : self.currency})
                self.analyze_trade_list(trades)
                yield gen.sleep(5)
            except Exception as e:
                exc_type, exc_obj, exc_tb = sys.exc_info()
                fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
                log.error('Exceptio: %s %s %s', exc_type, fname, exc_tb.tb_lineno)
                log.error('Failed collecting trade information %s', e.message)
                yield gen.sleep(1)

    @gen.coroutine
    def start_sync(self):
        while self.run:
            try:
                self.sync_completed_order()
                self.sync_pending_order()
                self.sync_balance()
                yield gen.sleep(5)
            except Exception as e:
                exc_type, exc_obj, exc_tb = sys.exc_info()
                fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
                log.error('Exceptio: %s %s %s', exc_type, fname, exc_tb.tb_lineno)
                log.error('Failed collecting trade information %s', e.message)
                yield gen.sleep(1)

    @gen.coroutine
    def get_trade(self):
        """
        Calculate trade trend
        """
        log.debug('Get trade trend')
        trade = yield get_public('trades')
        sold_list = trade.get('completeOrders', [])
        if sold_list:
            start_time = int(sold_list[0]['timestamp'])
            end_time = int(sold_list[-1]['timestamp'])
            log.debug('Time range: %d', (end_time - start_time))

    @gen.coroutine
    def sync_balance(self):
        """
        Return balance JSON
        """
        self.balance = yield get_private('balance')

    @gen.coroutine
    def sync_completed_order(self):
        """
        Get the completed order and save to member variable
        """
        self.completed_order = yield get_private('complete_order', {'currency': self.currency})

    @gen.coroutine
    def sync_pending_order(self):
        """
        Get the pending order and save to member variable
        """
        self.pending_order = yield get_private('pending_order', {'currency': self.currency})
"""
    a. 1시간 등락폭 모니터
      event: 1%이상 하락시
        action: 추가 1% 아래로 구매 걸음 (10분 타이머)
            구매 안됨 -> 취소, go to (a)
            구매 됨 -> 즉시 5% 상승에 판매 걸음

    b. 구매가격 대비 하락폭 모니터
       event: 1% 이상 하락시
              2% 이상 하락시
              5% 이상 하락시 - 위험 - 환매, 모든 거래 중단 (현재)

구매조건
- 5분
- 5분 가격차 아주 작을때
- 1시간 가격차도 마이너스일때
- 하루 가격차 마이너스 
"""
