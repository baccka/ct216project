var express = require('express');
var http = require('http');
var hbs = require('hbs');
var connect = require('connect');
var io = require('socket.io');

var state = require('./state');

var app = express();

app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(express.bodyParser());
var cookieParser = express.cookieParser();
var sessionStore = new express.session.MemoryStore();
app.use(cookieParser);
var sessionConfig = {
	secret: '45w387y0398vnumtj[,x932*45ym', 
    store: sessionStore
};
app.use(express.session(sessionConfig));
app.use(express.static('./static'));

var dbManager = state.createDBManager();

app.get('/', function(request, response) {
  if(request.session.user) 
	response.render('messaging', {user: request.session.user});
  else
	response.sendfile('./views/index.html');
});

app.on('request', function (req, res){
    console.log('Dealing with a request...', req.method);	
	res.writeHead(200, {'Content-type': 'text/html'});
	res.end(sockFile);
});

app.get('/users', function(request, response) {
	dbManager.getAllUsers(function(result) {
		response.render('users', {title:"Users", users: result });
	});
	
});

app.get('/logout', function(req, res) {
	if(req.session) {
		req.session.destroy();
		req.session = null;
	}
	// Redirect to main page
	res.redirect('');
});

app.get('/registration', function(req, res) {
	res.sendfile('./views/registration.html');
});

app.post('/register', express.bodyParser(), function(req, res) {
    console.log("Calling /register", req.body.user, ":", req.body.pwd);
    dbManager.registerUser(req.body.user, req.body.pwd, function(result){
    	if(result == null)
    		res.sendfile('./views/badregistration.html')
    	else{
    		res.sendfile('./views/registerok.html');
    	}
});

});

app.post('/login', express.bodyParser(), function(req, res) {
    console.log("Calling /login", req.body.user, ":", req.body.pwd);
    dbManager.login(req.body.user, req.body.pwd, function(result){
    	if(result == null)
			res.sendfile('./views/badlogin.html');
		else {
			req.session.user = req.body.user;
			req.session.userID = result.UserID;
			// Redirect to main page
			res.redirect('');
		}
	});
});

var server = http.createServer(app);
server.listen(8625);

// This is our websocket server

var sio = io.listen(server);

sio.set('authorization', function (data, callback) {
    if(!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
    }

    // We use the Express cookieParser created before to parse the cookie
    // Express cookieParser(req, res, next) is used initialy to parse data in "req.headers.cookie".
    // Here our cookies are stored in "data.headers.cookie", so we just pass "data" to the first argument of function
    cookieParser(data, {}, function(parseErr) {
        if(parseErr) { return callback('Error parsing cookies.', false); }

        // Get the SID cookie
        var sidCookie = (data.secureCookies && data.secureCookies['connect.sid']) ||
                        (data.signedCookies && data.signedCookies['connect.sid']) ||
                        (data.cookies && data.cookies['connect.sid']);
        
        var sessionId = connect.utils.parseSignedCookie(sidCookie, sessionConfig.secret);
        
        // Then we just need to load the session from the Express Session Store
        sessionStore.load(sessionId, function(err, session) {
            // And last, we check if the used has a valid session and if he is logged in
            if (err || !session) {
                callback('Not logged in.', false);
            } else {
                // If you want, you can attach the session to the handshake data, so you can use it again later
                // You can access it later with "socket.handshake.session"
                data.session = session;

                callback(null, true);
            }
        });
    });
});

sio.on('connection', function(client){
	console.log('TEST>>> Client Connected...');
	var session = client.handshake.session;
	// send the message history
	dbManager.getMessages(function(results) {
		for(var i = 0; i < results.length; ++i) {
			(function() {
				var j = i;
				dbManager.getUser(results[j].UserID, function(user) {
					var msg = {time: results[j].TimeStamp.getTime(), sender: user.UserName, text: results[j].Message};
					client.emit('message', msg);
				});
			})();
		}
	});
	client.on('message', function (data) {
		console.log(data);
		var timestamp = new Date();
		var msg = {time: timestamp.getTime(), sender: session.user, text: data.text};
		client.broadcast.emit('message', msg);
		dbManager.addMessage({time: timestamp, senderID: session.userID, text: msg.text});
	});
	client.on('disconnect', function() {
		var msg = {time: new Date().getTime(), sender: null, text: session.user + ' disconnected!'};
		client.broadcast.emit('message', msg);
	});
});
