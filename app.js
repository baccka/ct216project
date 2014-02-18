var express = require('express');
var app = express();

var hbs = require('hbs');

var state = require('./state');

app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(express.bodyParser());

var dbManager = state.createDBManager();

app.get('/', function(request, response) {
  state.addMessage(new Date());
  response.render('index', {title:"Hello", messages: state.getMessages()});
});

app.get('/users', function(request, response) {
	dbManager.getAllUsers(function(result) {
		response.render('users', {title:"Users", users: result });
	});
	
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
			res.send('Fail');
		else
			res.send('Ok');
	});
});

app.listen(8625);
