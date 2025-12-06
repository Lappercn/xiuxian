from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    response = send_from_directory('.', path)
    # 对 vendor 目录下的文件（模型、库）设置长期缓存 (1年)
    if 'vendor' in path:
        response.headers['Cache-Control'] = 'public, max-age=31536000'
    return response

if __name__ == '__main__':
    print("启动服务器: http://localhost:5000")
    print("请在浏览器中打开上述链接，并允许使用摄像头。")
    app.run(port=5000, debug=True)
