"""
"""
import json
from tornado import gen, httpclient


'''
{"base":"GBP","date":"2017-05-30","rates":{"KRW":1447.1,"EUR":1.1522}}
'''

class EXManager(object):
    def __init__(self):
        self.http_client = httpclient.AsyncHTTPClient()
        self.url = 'http://api.fixer.io/latest?base=GBP&symbols=EURO,KRW'
        self.result = None

    """
    Collect exchange rate
    """
    @gen.coroutine
    def start(self):
        while(True):
            response = yield self.http_client.fetch(self.url)
            print response.body
            self.result = json.loads(response.body)
            yield gen.sleep(5)