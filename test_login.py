import urllib.request
import urllib.error
import json

data = json.dumps({'identifier': 'ds@yopmail.com', 'password': 'Test@123'}).encode()
req = urllib.request.Request(
    'https://vybeora.onrender.com/api/auth/login/',
    data=data,
    headers={
        'Content-Type': 'application/json',
        'Origin': 'https://vybeora.vercel.app'
    }
)

try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS:", resp.read().decode())
    print("CORS:", resp.headers.get('Access-Control-Allow-Origin'))
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("CORS:", e.headers.get('Access-Control-Allow-Origin'))
    print("BODY:", e.read().decode())
except Exception as e:
    print("OTHER_ERROR:", e)
