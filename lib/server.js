import http from 'http';
import { utils } from './utils.js';
import { file } from './file.js';
import config from '../config.js';

import { pageHome } from '../pages/home.js';
import { page404 } from '../pages/404.js';
import { pageRegister } from '../pages/register.js';
import { pageLogin } from '../pages/login.js';

const server = {};

server.httpServer = http.createServer(async (req, res) => {
    const baseURL = `http${req.socket.encryption ? 's' : ''}://${req.headers.host}/`;
    const parsedURL = new URL(req.url, baseURL);
    const httpMethod = req.method;
    const parsedPathName = parsedURL.pathname;
    const trimmedPath = parsedPathName.replace(/^\/+|\/+$/g, '');   // regex

    /*
    Tekstiniai failai:
        - css
        - js
        - svg
    Binary failai:
        - jpg, png, gif, ico (nuotraukos)
        - woff, eot, ttf (sriftai)
        - audio, video
    API (formos, upload file, t.t.)
    HTML turinys (puslapis)
    */

    const fileExtension = utils.fileExtension(trimmedPath);
    const textFileExtensions = ['css', 'js', 'svg', 'webmanifest', 'txt'];
    const binaryFileExtensions = ['jpg', 'png', 'ico', 'mp3'];
    const isTextFile = textFileExtensions.includes(fileExtension);
    const isBinaryFile = binaryFileExtensions.includes(fileExtension);
    const isAPI = trimmedPath.indexOf('api/') === 0;
    const isPage = !isTextFile && !isBinaryFile && !isAPI;

    const MIMES = {
        html: 'text/html',
        css: 'text/css',
        js: 'text/javascript',
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        ico: 'image/x-icon',
        woff2: 'font/woff2',
        woff: 'font/woff',
        ttf: 'font/ttf',
        otf: 'font/otf',
        eot: 'application/vnd.ms-fontobject',
        webmanifest: 'application/manifest+json',
        pdf: 'application/pdf',
        json: 'application/json',
    };

    const maxAge = config.cache.periods[fileExtension] || config.cache.default;

    let responseContent = '';

    if (isTextFile) {
        responseContent = await file.readPublic(trimmedPath);
        if (responseContent === false) {
            res.writeHead(404);
        } else {
            res.writeHead(200, {
                'Content-Type': MIMES[fileExtension],  //parodo musu puslapio tipa
                'Cache-Control': `max-age=${maxAge}`,  //360 sek laikysim cashe, kad nenaudoti resursu
            })
        }
    }

    if (isBinaryFile) {
        responseContent = await file.readPublicBinary(trimmedPath);
        if (responseContent === false) {
            res.writeHead(404);
        } else {
            res.writeHead(200, {
                'Content-Type': MIMES[fileExtension] || MIMES.html, //jei pamatys mp3 tai turetu itraukti i musus sarasa
                'Cache-Control': `max-age=${maxAge}`,
            })
        }
    }

    if (isAPI) {
        res.writeHead(503, {
            'Content-Type': MIMES.json,
        })
        responseContent = 'STAI TAU API ATSAKYMAS...';
    }

    if (isPage) {
        res.writeHead(200, {
            'Content-Type': MIMES.html,
        })

        //1 versija
        // responseContent = server.routes[trimmedPath] ? server.routes[trimmedPath]() : server.routes[404](); //jei trimmes Path egzistuoja tai mes iskvieciam atitinkama funkcija ,priesingu atveju iskvieciam 404
        //2 versija
        let pageFunction = server.routes[404];
        if (trimmedPath in server.routes) {  //we are ckeking if trimmedPath is in server.routes
            pageFunction = server.routes[trimmedPath]; //iskvieciam ta f-ja
        }
        responseContent = pageFunction;

    }

    return res.end(responseContent);
});

server.routes = {
    '': pageHome,
    'register': pageRegister,
    '404': page404,
    'login': pageLogin,
}

server.init = () => {
    server.httpServer.listen(config.httpPort, () => {
        console.log(`Sveikiname, tavo serveris sukasi ant http://localhost:${config.httpPort}`);
    });
}

export { server };