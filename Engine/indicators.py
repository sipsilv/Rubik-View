import talib
import numpy as np
import pandas as pd

def _norm(val, lo, hi):
    """Normalize val between lo (=-100) and hi (=+100)"""
    if np.isnan(val):
        return 0
    return max(-100, min(100, 200 * (val - lo) / (hi - lo) - 100))

def calculate_rsi(close, period):
    s = talib.RSI(close, timeperiod=period)
    # RSI <30: strong buy (+100), RSI>70: strong sell (-100)
    val = s.iloc[-1]
    if np.isnan(val): return 0
    if val <= 30:
        pct = _norm(val, 0, 30)      # +100 to 0
    elif val >= 70:
        pct = _norm(val, 70, 100)    # 0 to -100
    else:
        pct = 0
    return pct

def calculate_mfi(high, low, close, volume, period):
    s = talib.MFI(high, low, close, volume, timeperiod=period)
    val = s.iloc[-1]
    if np.isnan(val): return 0
    if val <= 20:
        pct = _norm(val, 0, 20)
    elif val >= 80:
        pct = _norm(val, 80, 100)
    else:
        pct = 0
    return pct

def calculate_cci(high, low, close, period):
    s = talib.CCI(high, low, close, timeperiod=period)
    val = s.iloc[-1]
    return np.clip(val, -100, 100)  # already bounded

def calculate_stochrsi(close, rsi_period, k_period, d_period):
    rsi = talib.RSI(close, timeperiod=rsi_period)
    k = ((rsi - rsi.rolling(k_period).min()) /
         (rsi.rolling(k_period).max() - rsi.rolling(k_period).min())) * 100
    val = k.iloc[-1]
    # 0 = oversold, 100 = overbought
    if val <= 20:
        pct = _norm(val, 0, 20)
    elif val >= 80:
        pct = _norm(val, 80, 100)
    else:
        pct = 0
    return pct

def calculate_roc(close, period):
    val = talib.ROC(close, timeperiod=period).iloc[-1]
    return np.clip(val, -100, 100)

def calculate_macd(close, fastperiod, slowperiod, signalperiod):
    macd, macdsignal, _ = talib.MACD(close, fastperiod, slowperiod, signalperiod)
    # MACD minus Signal: scale to -100/+100
    v = macd.iloc[-1] - macdsignal.iloc[-1]
    vmax = np.nanmax(np.abs(macd - macdsignal))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((v / vmax) * 100, -100, 100)

def calculate_ema_crossover(close, short_period, long_period):
    ema_short = talib.EMA(close, timeperiod=short_period)
    ema_long = talib.EMA(close, timeperiod=long_period)
    diff = ema_short.iloc[-1] - ema_long.iloc[-1]
    vmax = np.nanmax(np.abs(ema_short - ema_long))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((diff / vmax) * 100, -100, 100)

def calculate_sma_crossover(close, short_period, long_period):
    sma_short = talib.SMA(close, timeperiod=short_period)
    sma_long = talib.SMA(close, timeperiod=long_period)
    diff = sma_short.iloc[-1] - sma_long.iloc[-1]
    vmax = np.nanmax(np.abs(sma_short - sma_long))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((diff / vmax) * 100, -100, 100)

def calculate_atr(high, low, close, period):
    val = talib.ATR(high, low, close, timeperiod=period).iloc[-1]
    vmax = np.nanmax(talib.ATR(high, low, close, timeperiod=period))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((val / vmax) * 100, 0, 100)

def calculate_williams_r(high, low, close, period):
    val = talib.WILLR(high, low, close, timeperiod=period).iloc[-1]
    return np.clip(val, -100, 0)  # -100 (buy) to 0 (sell), invert as needed

def calculate_adx(high, low, close, period):
    val = talib.ADX(high, low, close, timeperiod=period).iloc[-1]
    # 0 (weak trend), 100 (strong trend)
    return np.clip(val, 0, 100)

def calculate_vwap(df):
    pv = (df['High'] + df['Low'] + df['Close']) / 3 * df['Volume']
    cum_pv = pv.cumsum()
    cum_vol = df['Volume'].cumsum()
    vwap = cum_pv / cum_vol
    val = df['Close'].iloc[-1] - vwap.iloc[-1]
    vmax = np.nanmax(np.abs(df['Close'] - vwap))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((val / vmax) * 100, -100, 100)

def calculate_supertrend(df, period=10, multiplier=3):
    hl2 = (df['High'] + df['Low']) / 2
    atr = talib.ATR(df['High'], df['Low'], df['Close'], timeperiod=period)
    upperband = hl2 + (multiplier * atr)
    lowerband = hl2 - (multiplier * atr)
    st = pd.Series(index=df.index, dtype='float64')
    st.iloc[0] = upperband.iloc[0]
    for i in range(1, len(df)):
        st.iloc[i] = lowerband.iloc[i] if df['Close'].iloc[i] > st.iloc[i-1] else upperband.iloc[i]
    diff = df['Close'].iloc[-1] - st.iloc[-1]
    vmax = np.nanmax(np.abs(df['Close'] - st))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((diff / vmax) * 100, -100, 100)

def calculate_parabolic_sar(high, low, af=0.02, max_af=0.2, init_af=0.02):
    psar = talib.SAR(high, low, acceleration=af, maximum=max_af)
    return np.clip(psar.iloc[-1], -100, 100)

def calculate_ichimoku(df, conv=9, base=26, span=52):
    high9 = df['High'].rolling(window=conv).max()
    low9 = df['Low'].rolling(window=conv).min()
    tenkan_sen = (high9 + low9) / 2
    high26 = df['High'].rolling(window=base).max()
    low26 = df['Low'].rolling(window=base).min()
    kijun_sen = (high26 + low26) / 2
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(base)
    senkou_span_b = ((df['High'].rolling(window=span).max() + df['Low'].rolling(window=span).min()) / 2).shift(base)
    close = df['Close'].iloc[-1]
    # Compare with span A & B
    above = close > senkou_span_a.iloc[-1] and close > senkou_span_b.iloc[-1]
    below = close < senkou_span_a.iloc[-1] and close < senkou_span_b.iloc[-1]
    return 100 if above else -100 if below else 0

def calculate_bollinger(close, period, num_std):
    upper, middle, lower = talib.BBANDS(close, timeperiod=period, nbdevup=num_std, nbdevdn=num_std, matype=0)
    val = close.iloc[-1]
    if val < lower.iloc[-1]:
        return -100
    elif val > upper.iloc[-1]:
        return 100
    else:
        mid = (upper.iloc[-1] + lower.iloc[-1]) / 2
        pct = (val - mid) / (upper.iloc[-1] - lower.iloc[-1]) * 100
        return np.clip(pct, -100, 100)

def calculate_donchian(high, low, period):
    upper = high.rolling(window=period).max()
    lower = low.rolling(window=period).min()
    val = high.iloc[-1]
    pct = (val - lower.iloc[-1]) / (upper.iloc[-1] - lower.iloc[-1]) * 200 - 100
    return np.clip(pct, -100, 100)

def calculate_keltner(df, period):
    typical_price = (df['High'] + df['Low'] + df['Close']) / 3
    ema = typical_price.ewm(span=period, adjust=False).mean()
    atr = talib.ATR(df['High'], df['Low'], df['Close'], timeperiod=period)
    upper = ema + 2 * atr
    lower = ema - 2 * atr
    val = df['Close'].iloc[-1]
    pct = (val - lower.iloc[-1]) / (upper.iloc[-1] - lower.iloc[-1]) * 200 - 100
    return np.clip(pct, -100, 100)

def calculate_obv(close, volume):
    obv = talib.OBV(close, volume)
    v = obv.iloc[-1] - obv.iloc[-2]
    vmax = np.nanmax(np.abs(obv.diff()))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((v / vmax) * 100, -100, 100)

def calculate_vma(volume, period):
    """Volume spike = bullish if current > moving average, else bearish. Returns -100/+100."""
    ma = pd.Series(volume).rolling(window=period).mean()
    curr = volume.iloc[-1]
    avg = ma.iloc[-1]
    vmax = ma.max()
    if np.isnan(avg) or vmax == 0 or np.isnan(curr):
        return 0
    vma_score = (curr - avg) / vmax * 100
    return np.clip(vma_score, -100, 100)

def calculate_adl(high, low, close, volume):
    import talib
    adl = talib.AD(high, low, close, volume)
    # Change from previous day as a signal
    val = adl.iloc[-1] - adl.iloc[-2]
    vmax = np.nanmax(np.abs(adl.diff()))
    if vmax == 0 or np.isnan(vmax): return 0
    return np.clip((val / vmax) * 100, -100, 100)

