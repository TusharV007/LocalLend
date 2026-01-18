const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');

// Initialize files if not exist
if (!fs.existsSync(ITEMS_FILE)) fs.writeFileSync(ITEMS_FILE, '[]');
if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, '[]');

const readJson = (file) => {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeJson = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

module.exports = {
    getItems: () => readJson(ITEMS_FILE),
    saveItem: (item) => {
        const items = readJson(ITEMS_FILE);
        items.push(item);
        writeJson(ITEMS_FILE, items);
        return item;
    },
    getRequests: () => readJson(REQUESTS_FILE),
    saveRequest: (request) => {
        const requests = readJson(REQUESTS_FILE);
        requests.push(request);
        writeJson(REQUESTS_FILE, requests);
        return request;
    },
    updateRequestStatus: (requestId, status) => {
        const requests = readJson(REQUESTS_FILE);
        const index = requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
            requests[index].status = status;
            writeJson(REQUESTS_FILE, requests);
            return requests[index];
        }
        return null;
    }
};
