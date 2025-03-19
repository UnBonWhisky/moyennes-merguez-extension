const net = require('net');
const url = require('url');

function customHttpRequest(options, callback) {
    const parsedUrl = url.parse(options.url);
    const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
    const path = parsedUrl.path || '/';
    
    // Construction de la requête HTTP avec les credentials si fournis
    let request = `GET ${path} HTTP/1.1\r\nHost: ${parsedUrl.hostname}\r\nConnection: close\r\n`;

    // Ajout des credentials dans l'en-tête Authorization si fournis
    if (options.credentials) {
        const encodedCredentials = Buffer.from(options.credentials).toString('base64');
        request += `Authorization: Basic ${encodedCredentials}\r\n`;
    }

    // Fin de la requête
    request += `\r\n`;

    // Connexion au serveur
    const client = net.createConnection({ host: parsedUrl.hostname, port }, () => {
        client.write(request); // Envoie la requête
    });

    // Stockage de la réponse
    let responseData = '';
    client.on('data', (data) => {
        responseData += data;
    });

    client.on('end', () => {
        // Parse et retourne seulement les headers
        const [header] = responseData.split('\r\n\r\n');
        const headers = parseHeaders(header);
        callback(null, headers);
    });

    client.on('error', (err) => {
        callback(err, null);
    });
}

// Fonction auxiliaire pour parser les headers
function parseHeaders(headerStr) {
    const headers = {};
    const lines = headerStr.split('\r\n');

    headers['status'] = lines[0]; // Première ligne est le status (e.g. HTTP/1.1 200 OK)

    for (let i = 1; i < lines.length; i++) {
        const [key, value] = lines[i].split(': ');
        if (key && value) {
            headers[key.toLowerCase()] = value;
        }
    }

    return headers;
}