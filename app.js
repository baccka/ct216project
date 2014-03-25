var express = require('express');//adds express module to app.js
var http = require('http');//adds http module to app.js
var hbs = require('hbs');//adds hbs module to app.js
var connect = require('connect');//adds connect module to app.js
var io = require('socket.io');//adds socket.io module to app.js

var state = require('./state');//adds state.js as a module to app.js

var app = express();//loads express package into app

app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(express.bodyParser());//install plug ins
var cookieParser = express.cookieParser();//install plug ins
var sessionStore = new express.session.MemoryStore();
app.use(cookieParser);
var sessionConfig = {//session details
	secret: '45w387y0398vnumtj[,x932*45ym', 
    store: sessionStore
};
app.use(express.session(sessionConfig));//store user session
app.use(express.static('./static'));//import files from static

var dbManager = state.createDBManager();//set a variable called dbManager

app.get('/', function(request, response) {//function to be called at start of session
  if(request.session.user)//if session.user has data
	response.render('messaging', {user: request.session.user});//take user to chat room
  else
	response.sendfile('./views/index.html');//return session to home page
});

app.on('request', function (req, res){
    console.log('Dealing with a request...', req.method);
	res.writeHead(200, {'Content-type': 'text/html'});
	res.end(sockFile);
});

app.get('/users', function(request, response) {//function to show all users
	dbManager.getAllUsers(function(result) {//call dbManager to return all names
		response.render('users', {title:"Users", users: result });//render list of users
	});
	
});

app.get('/logout', function(req, res) {//function to log out user
	if(req.session) {
		req.session.destroy();//ends user session 
		req.session = null;//sets session to null
	}
	// Redirect to main page
	res.redirect('');
});

app.get('/registration', function(req, res) {//function to render registration.html
	res.sendfile('./views/registration.html');//render registration page
});

app.post('/register', express.bodyParser(), function(req, res) {//function to attempt to register new user
    console.log("Calling /register", req.body.user, ":", req.body.pwd);//take in inputs from user
    dbManager.registerUser(req.body.user, req.body.pwd, function(result){//call dbManager to do sql to check if there is a user with that name already
    	if(result == null)												 //if dbManager returns at least one value in sql query, it will return null
    		res.sendfile('./views/badregistration.html');//render badregistration.html
    	else{
    		res.sendfile('./views/registerok.html');//render registerok.html
    	}
});

});

app.post('/login', express.bodyParser(), function(req, res) {//function to attempt to login user
    console.log("Calling /login", req.body.user, ":", req.body.pwd);//take in inputs from user
    dbManager.login(req.body.user, req.body.pwd, function(result){//call dbManager to do sql query on inputs to check if the name and password match 
    	if(result == null)										  //any details in the db	
			res.sendfile('./views/badlogin.html');//if no details match render badlogin.html
		else {
			req.session.user = req.body.user;//set session.user to user name
			req.session.userID = result.UserID;//set session.userID to the result of the sql query
			// Redirect to main page
			res.redirect('');
		}
	});
});

var server = http.createServer(app);
server.listen(8625);//serber port number

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
	client.on('message', function (data) {//function to broadcast message and enter to db
		console.log(data);
		var timestamp = new Date();
		var msg = {time: timestamp.getTime(), sender: session.user, text: data.text};
		client.broadcast.emit('message', msg);
		dbManager.addMessage({time: timestamp, senderID: session.userID, text: msg.text});
	});
	client.on('disconnect', function() {//display user has disconnected
		var msg = {time: new Date().getTime(), sender: null, text: session.user + ' disconnected!'};
		client.broadcast.emit('message', msg);
	});
});
