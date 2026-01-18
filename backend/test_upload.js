
const http = require('http');

const data = JSON.stringify({
    title: "Test Item Large",
    description: "Testing large payload",
    image: "a".repeat(1024 * 1024), // 1MB string
    owner: { id: "test-user", name: "Test User" }
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/items',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
