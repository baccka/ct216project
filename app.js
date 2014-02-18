var express = require('express');
var app = express();

var hbs = require('hbs');

var state = require('./state');

app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));

var dbManager = state.createDBManager();

function renderMessagingView(request, response) {
	response.render('messaging', {user: request.session.user});
}

app.get('/', function(request, response) {
  if(request.session.user)
	renderMessagingView(request, response);
  else
	response.sendfile('./views/index.html');
});

app.get('/users', function(request, response) {
	dbManager.getAllUsers(function(result) {
		response.render('users', {title:"Users", users: result });
	});
	
});

app.get('/logout', function(req, res) {
	if(req.session.user)
		req.session.user = null;
	res.sendfile('./views/index.html');
});

app.get('/registration', function(req, res) {
	res.sendfile('./views/registration.html');
});

app.post('/register', express.bodyParser(), function(req, res) {
    console.log("Calling /register", req.body.user, ":", req.body.pwd);
    dbManager.registerUser(req.body.user, req.body.pwd, function(result){
    	res.sendfile('./views/registerok.html');
});

});

app.post('/login', express.bodyParser(), function(req, res) {
    console.log("Calling /login", req.body.user, ":", req.body.pwd);
    dbManager.login(req.body.user, req.body.pwd, function(result){
    	if(result == null)
			res.sendfile('./views/badlogin.html');
		else {
			req.session.user = req.body.user;
			renderMessagingView(req, res);
		}
	});
});

app.listen(8625);
