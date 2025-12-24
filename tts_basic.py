# DashScope SDK 版本不低于 1.24.6

import os

import dashscope

# 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1

dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

text = "那我来给大家推荐一款T恤，这款呢真的是超级好看，这个颜色呢很显气质，而且呢也是搭配的绝佳单品，大家可以闭眼入，真的是非常好看，对身材的包容性也很好，不管啥身材的宝宝呢，穿上去都是很好看的。推荐宝宝们下单哦。"

# 使用 qwen TTS 接口
response = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
    model="qwen-tts",  # 使用标准的 qwen-tts 模型
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：api_key = "sk-xxx"
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    text=text,
    voice="Cherry",
    language_type="Chinese",  # 建议与文本语种一致，以获得正确的发音和自然的语调。
    stream=False
)

print(response)

