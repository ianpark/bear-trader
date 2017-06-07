import base64
import hashlib
import hmac
import json
import time

from tornado import gen, httpclient
from tornado.httputil import url_concat


APIURL = 'https://api.coinone.co.kr'
ACCESS_TOKEN = 'd88701ee-1e64-4051-86ea-dfbaffcf5258'
SECRET_KEY = '536c360d-ee64-4376-89f3-9612b15d0f69'

CMD = {
    'balance': '/v2/account/balance/',
    'order_book': '/orderbook/',
    'currency': '/currency/',
    'trades': '/trades/',  # Recent Complete Orders
    'ticker': '/ticker/',
    'complete_order': '/v2/order/complete_orders/',
    'pending_order': '/v2/order/limit_orders/'
}
def cmd_to_url(cmd):
    return APIURL + CMD[cmd]

PAYLOAD = {
    'access_token': ACCESS_TOKEN,
}

http_client = httpclient.AsyncHTTPClient()

def get_encoded_payload(payload):
    #add nonce
    payload[u'nonce'] = int(time.time()*1000)

    dumped_json = json.dumps(payload)
    encoded_json = base64.b64encode(dumped_json)
    return encoded_json

def get_signature(encoded_payload, secret_key):
    signature = hmac.new(str(secret_key).upper(),
    str(encoded_payload), hashlib.sha512)
    return signature.hexdigest()

@gen.coroutine
def get_private(cmd, payload={}):
    payload.update(PAYLOAD)
    url = cmd_to_url(cmd)
    encoded_payload = get_encoded_payload(payload)
    response = yield http_client.fetch(
        url,
        method='POST',
        body=encoded_payload,
        headers={
            'X-COINONE-PAYLOAD': encoded_payload,
            'X-COINONE-SIGNATURE': get_signature(encoded_payload, SECRET_KEY)
        })
    raise gen.Return(json.loads(response.body))

@gen.coroutine
def get_public(cmd, url_param={}):
    url = cmd_to_url(cmd)
    if url_param:
        url = url_concat(url, url_param)
    response = yield http_client.fetch(url, method='GET')
    raise gen.Return(json.loads(response.body))