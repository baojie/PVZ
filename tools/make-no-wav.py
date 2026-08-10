#!/usr/bin/env python3
"""生成 sounds/no.wav —— 游戏失败时那一声「No—！」。

和 SoundManager 里原来那套 Web Audio 合成是同一个配方，只是离线算好存成文件：
  声带   —— 锯齿波基频，150Hz 顶一下再垮到 100Hz
  共振峰 —— 三个带通并联，F1/F2 在 0.22 秒内从鼻音 n 滑到元音 o，
            听感就是「呢——哦——」
纯标准库，没有任何外部素材，重新跑一遍就能得到同样的文件。

用法: python3 tools/make-no-wav.py
"""
import math
import struct
import wave

SR = 44100
DUR = 1.25
PATH = 'sounds/no.wav'


def saw(phase):
    """锯齿波：一个周期内从 -1 线性升到 +1"""
    return 2.0 * (phase - math.floor(phase + 0.5))


class BandPass:
    """双二阶带通（RBJ cookbook），和 Web Audio 的 BiquadFilter 同一套公式"""

    def __init__(self, q):
        self.q = q
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def process(self, x, f0):
        w0 = 2 * math.pi * f0 / SR
        alpha = math.sin(w0) / (2 * self.q)
        b0, b1, b2 = alpha, 0.0, -alpha
        a0, a1, a2 = 1 + alpha, -2 * math.cos(w0), 1 - alpha
        y = (b0 / a0) * x + (b1 / a0) * self.x1 + (b2 / a0) * self.x2 \
            - (a1 / a0) * self.y1 - (a2 / a0) * self.y2
        self.x2, self.x1 = self.x1, x
        self.y2, self.y1 = self.y1, y
        return y


def envelope(t):
    """先冲一下，拖住，再垮掉"""
    if t < 0.08:
        return (t / 0.08) ** 0.5
    if t < 0.75:
        return 1.0
    k = (t - 0.75) / (DUR - 0.75)
    return max(0.0, 1.0 - k) ** 1.6


def formant_freq(t, f_from, f_to):
    """张嘴：0.22 秒内从起始共振峰滑到目标共振峰"""
    k = min(1.0, t / 0.22)
    return f_from + (f_to - f_from) * k


FORMANTS = [
    # (起始 Hz, 目标 Hz, Q, 权重)
    (320.0, 500.0, 9.0, 1.00),    # F1：n → o
    (900.0, 900.0, 11.0, 0.70),   # F2
    (2400.0, 2500.0, 8.0, 0.25),  # F3：一点人声的亮度
]


def main():
    n = int(SR * DUR)
    filters = [BandPass(q) for _, _, q, _ in FORMANTS]
    phase = 0.0
    raw = []

    for i in range(n):
        t = i / SR
        # 基频：顶住 0.35 秒，然后一路垮到 100Hz
        f0 = 150.0 if t < 0.35 else 150.0 + (100.0 - 150.0) * ((t - 0.35) / (DUR - 0.35))
        phase += f0 / SR
        src = saw(phase)

        s = 0.0
        for (a, b, _, w), filt in zip(FORMANTS, filters):
            s += w * filt.process(src, formant_freq(t, a, b))

        raw.append(s * envelope(t))

    peak = max(abs(v) for v in raw) or 1.0
    scale = 0.89 / peak          # 归一化，留点余量不削顶

    with wave.open(PATH, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(b''.join(
            struct.pack('<h', int(max(-1.0, min(1.0, v * scale)) * 32767)) for v in raw))

    print(f'{PATH}: {n} 帧 / {DUR}s / 峰值归一到 0.89')


if __name__ == '__main__':
    main()
