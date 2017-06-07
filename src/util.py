

def percent(a, b):
    a = float(a)
    b = float(b)
    return round(100 * (b - a) / a, 4)

def diff_recent(sold_list, now_time, seconds):
    for item in reversed(sold_list):
        if int(item['timestamp']) < (now_time - seconds):  # 5min
            price_change = int(sold_list[-1]['price']) - int(item['price'])
            price_change_pc = percent(int(item['price']), int(sold_list[-1]['price']))
            return (price_change, price_change_pc)
    return (0, 0)

def diff_period(begin, end):
    return (int(end)-int(begin), percent(int(begin), int(end)))