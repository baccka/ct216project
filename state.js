
var mysql = require('mysql');

var array = [];
var userID = 0;

// Create the DB Manager object
exports.createDBManager = function() {
	console.log('Creating DBManager object...');
	return new DBManager();
}

function DBManager() {
	this.connection = mysql.createConnection({
		host: 'danu6.it.nuigalway.ie',
		user: 'mydb1491i',
		password: 'mydb1491i',
		database: 'mydb1491'
	});
	this.findUserID();
}

DBManager.prototype.closeConnection = function() {
	this.connection.end();
}

DBManager.prototype.getAllUsers = function(callback) {
	var queryString = 'SELECT * FROM User;';
	this.connection.query(queryString, function(err, results, fields) {
		if(err) throw err;

		callback(results);
	});
}

DBManager.prototype.findUserID = function() {
	var queryString = 'SELECT COUNT(*) AS Number FROM User;';
	this.connection.query(queryString, function(err, results, fields) {
		if(err) throw err;
		
		userID = results[0].Number + 1;
		console.log('setting user id: ' + userID);
	});
}

// This function registers a new user
DBManager.prototype.registerUser = function(username, password, callback) {
	//user tries to create a profile with a used username
	var self = this;
	var uniqueLogin = 'SELECT * FROM User WHERE UserName = ("'+username+'")';
	this.connection.query(uniqueLogin, function(err, results, fields){
		if(err) throw err;
		console.log(results);
		if(results.length == 0){

			//inputs user into the database
			var queryString = 'INSERT INTO User VALUES (' + userID + ',"' + username + '", "' + password + '")';
			self.connection.query(queryString, function(err, results, fields) {
			if(err) throw err;
			userID += 1;
			callback(results);
		});
		

		}
		else
			callback(null);
	});
}

// This function tries to login a user
DBManager.prototype.login = function(username, password, callback) {
	var queryString = 'SELECT * FROM User WHERE UserName = "' + username + '";'
	this.connection.query(queryString, function(err, results, fields) {
		if(err) throw err;
		
		if(results == null || results.length == 0 ||
		   results[0].Password != password)
			callback(null);
		else
			callback(results[0]);
	});
}

exports.addMessage = function(t) {
        // comments
	array.push({ time: t });
}

exports.getMessages = function() {
	return array;
}	
