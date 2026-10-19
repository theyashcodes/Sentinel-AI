import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.predict import predict_url, get_model

# Pre-load model into memory
print("[*] Pre-loading ML threat model into memory...")
get_model()
print("[*] Sentinel AI ML model loaded into memory.")

class MLPredictHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": "HistGradientBoostingClassifier"}).encode("utf-8"))
            return

        if parsed.path == "/predict":
            qs = urllib.parse.parse_qs(parsed.query)
            url = qs.get("url", [""])[0]
            if not url:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing 'url' query parameter"}).encode("utf-8"))
                return
            
            try:
                result = predict_url(url)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/predict":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode("utf-8"))
                url = body.get("url", "")
                if not url:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing 'url' in request body"}).encode("utf-8"))
                    return
                
                result = predict_url(url)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        # Quiet logger
        pass

def run(port=5001):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, MLPredictHandler)
    print(f"[*] Sentinel AI ML Inference Engine running at http://127.0.0.1:{port}/")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
