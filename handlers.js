const fs = require('fs');

const { App } = require('./app');
const { loadTemplate } = require('./lib/viewTemplate');
const userSessions = [];
let currUser = '';

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
  const users = JSON.parse(fs.readFileSync('./assets/users.json', 'utf8'));
  users.push(body);
  const usersText = JSON.stringify(users);
  fs.writeFileSync('./assets/users.json', usersText, 'utf8');
  res.setHeader('location', 'index.html');
  res.writeHead(301);
  res.end();
};

const loginUser = function(req, res, next) {
  if (req.url !== '/login') {
    next();
    return;
  }
  const body = req.body.split('&').reduce(pickupParams, {});
  const users = JSON.parse(fs.readFileSync('./assets/users.json', 'utf8'));
  const userExists = ({ userId, userName }) =>
    body.userId === userId && body.userName === userName;
  if (users.some(userExists)) {
    const sessionId = `${new Date().getTime()}`;
    userSessions.push({ userName: body.userName, sessionId });
    res.setHeader('Set-Cookie', `sessionId=${sessionId}`);
    res.setHeader('location', 'feedBacks');
    res.writeHead(301);
    res.end();
    return;
  }
  res.setHeader('location', 'index.html');
  res.writeHead(301);
  res.end();
};

const isValidSession = function(userSessions, cookie) {
  const userSession = cookie.split('=');
  return userSessions.some(({ userName, sessionId }) => {
    if (sessionId === userSession[1]) {
      currUser = userName;
      return true;
    }
    return false;
  });
};

const getFeedBackPage = function(req, res, next) {
  console.warn(userSessions, req.headers.cookie);

  if (req.url !== '/feedBacks') {
    next();
    return;
  }
  const documentFolder = `${__dirname}/assets/feedBacks`;
  console.warn(isValidSession(userSessions, req.headers['cookie']));

  if (!isValidSession(userSessions, req.headers['cookie'])) {
    res.setHeader('location', 'sessionExpired.html');
    res.writeHead(301);
    res.end();
    return;
  }
  const path = `${documentFolder}/${currUser}.json`;
  let userFeedBacks = [];
  if (fs.existsSync(path)) {
    userFeedBacks = JSON.parse(
      fs.readFileSync(`${documentFolder}/${currUser}.json`, 'utf8')
    );
  }
  const content = loadTemplate('showFeedBack.html', {
    feedBack: JSON.stringify(userFeedBacks)
  });

  res.setHeader('Content-Type', MIME_TYPES.html);
  res.end(content);
  return;
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
app.post('/login', loginUser);
app.get('/feedBacks', getFeedBackPage);

app.get('', notFound);
app.post('', notFound);
app.use(methodNotAllowed);

module.exports = { app };
