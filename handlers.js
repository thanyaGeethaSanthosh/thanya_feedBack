const fs = require('fs');

const { App } = require('./app');

const MIME_TYPES = {
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf'
};

const serveStaticPage = function(req, res, next) {
  const publicFolder = `${__dirname}/public`;
  const path = req.url === '/' ? '/index.html' : req.url;
  const absolutePath = publicFolder + path;
  const stat = fs.existsSync(absolutePath) && fs.statSync(absolutePath);
  if (!stat || !stat.isFile()) {
    next();
    return;
  }
  const content = fs.readFileSync(absolutePath);
  const extension = path.split('.').pop();
  res.setHeader('Content-Type', MIME_TYPES[extension]);
  res.end(content);
};

const decodeUriText = function(encodedText) {
  return decodeURIComponent(encodedText.replace(/\+/g, ' '));
};

const pickupParams = (query, keyValue) => {
  const [key, value] = keyValue.split('=');
  query[key] = decodeUriText(value);
  return query;
};

const registerNewUser = function(req, res, next) {
  if (req.url !== '/register') {
    next();
    return;
  }
  const body = req.body.split('&').reduce(pickupParams, {});
  const users =
    JSON.parse(fs.readFileSync('./assets/users.json', 'utf8')) || [];
  users.push(body);
  const usersText = JSON.stringify(users);
  fs.writeFileSync('./assets/users.json', usersText, 'utf8');
  res.setHeader('location', 'index.html');
  res.writeHead(301);
  res.end();
};

const notFound = function(req, res) {
  res.writeHead(404);
  res.end('Not Found');
};

const methodNotAllowed = function(req, res) {
  res.writeHead(400, 'Method Not Allowed');
  res.end();
};

const readBody = function(req, res, next) {
  let data = '';
  req.on('data', chunk => (data += chunk));
  req.on('end', () => {
    req.body = data;
    next();
  });
};

const app = new App();

app.use(readBody);

app.get('', serveStaticPage);
app.post('/register', registerNewUser);

app.get('', notFound);
app.post('', notFound);
app.use(methodNotAllowed);

module.exports = { app };
