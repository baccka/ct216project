
var mysql = require('mysql');//import sql module to state.js

var array = [];
var userID = 0;
var messageID = 0;

// Create the DB Manager object
exports.createDBManager = function() {
	console.log('Creating DBManager object...');
	return new DBManager();
}



function DBManager() {
	this.dbConfig = {//settings for database
		host: 'danu6.it.nuigalway.ie',
		user: 'mydb1491i',
		password: 'mydb1491i',
		database: 'mydb1491'
	};
	this.connection = null;
	var self = this;
	
	function handleDisconnect() {
		self.connection = mysql.createConnection(self.dbConfig);

		self.connection.connect(function(err) {              // The server is either down
		if(err) {                                     // or restarting (takes a while sometimes).
		  console.log('error when connecting to db:', err);
		  setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
		}                                     // to avoid a hot loop, and to allow our node script to
		});                                     // process asynchronous requests in the meantime.
											  // If you're also serving http, display a 503 error.
		self.connection.on('error', function(err) {
		console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
		  handleDisconnect();                         // lost due to either server restart, or a
		} else {                                      // connnection idle timeout (the wait_timeout
		  throw err;                                  // server variable configures this)
		}
		});
	}
	handleDisconnect();

	this.findUserID();
	this.findMessageID();
}

DBManager.prototype.closeConnection = function() {//ends connection to db
	this.connection.end();
}

DBManager.prototype.getAllUsers = function(callback) {//get all users
	var queryString = 'SELECT * FROM User;';
	this.connection.query(queryString, function(err, results, fields) {
		if(err) throw err;

		callback(results);
	});
}

DBManager.prototype.findUserID = function() {//find user
	var queryString = 'SELECT COUNT(*) AS Number FROM User;';
	this.connection.query(queryString, function(err, results, fields) {
		if(err) throw err;
		
		userID = results[0].Number + 1;
		console.log('setting user id: ' + userID);
	});
}

DBManager.prototype.findMessageID = function() {//find message
	var queryString = 'SELECT COUNT(*) AS Number FROM Messages;';
	this.connection.query(queryString, function(err, results, fields) {
		if(err) throw err;
		
		messageID = results[0].Number + 1;
		console.log('setting message id: ' + messageID);
	});
}

// This function registers a new user
DBManager.prototype.registerUser = function(username, password, callback) {
	//user tries to create a profile with a used username
	var self = this;
	this.connection.query('SELECT * FROM User WHERE UserName = ?', [username], function(err, results, fields){
		if(err) throw err;
		console.log(results);
		if(results.length == 0){

			//inputs user into the database
			self.connection.query('INSERT INTO User VALUES (?, ?, ?)', 
			[userID, username, password], 
			function(err, results, fields) {
			if(err) throw err;
			userID += 1;//for future registers
			callback(results);
		});
		

		}
		else
			callback(null);
	});
}

// This function tries to login a user
DBManager.prototype.login = function(username, password, callback) {
	this.connection.query('SELECT * FROM User WHERE UserName = ?', [username], function(err, results, fields) {
		if(err) throw err;
		
		if(results == null || results.length == 0 ||
		   results[0].Password != password)
			callback(null);
		else
			callback(results[0]);
	});
}

//function tries to find a user
DBManager.prototype.getUser = function(userID, callback) {
	this.connection.query('SELECT * FROM User WHERE UserID = ?', [userID], function(err, results, fields) {
		if(err) throw err;
		
		callback(results[0]);
	});	
}

//function puts message into db
DBManager.prototype.addMessage = function(msg) {
	this.connection.query('INSERT INTO Messages SET ?', 
	{MessageID: messageID, UserID: msg.senderID, Message: msg.text, TimeStamp: msg.time }, 
	function(err, results, fields) {
		if(err) throw err;
		
		messageID += 1;
	});
}

//function gets all messages from db
DBManager.prototype.getMessages = function(callback) {
	this.connection.query('SELECT * FROM Messages', function(err, results, fields) {
		if(err) throw err;
		
		callback(results);
	});	
}
