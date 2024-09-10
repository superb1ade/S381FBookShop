//HTML 
const html = require('html');
const url = require('url');
const assert = require('assert');
//File
const fs = require('fs'); 
const formidable = require('express-formidable');
//MongoDB
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const mongourl = 'mongodb+srv://study:study@cluster0.85m2yws.mongodb.net/?retryWrites=true&w=majority'; 
const dbName = 'test';

const express = require('express');
const app = express();
const session = require('cookie-session');

const bodyParser = require('body-parser');

const { Buffer } = require('safe-buffer');

var users = new Array(
	{name: "123", password: "123"},
    {name: "demo", password: ""},
    {name: "student", password: ""}
);
var DOC = {};

//photo
app.use('/public/images/', express.static('./public/images'));

//css
app.use('/public/css/', express.static('./public/css'));


//Main Body
app.set('view engine', 'ejs');                   
app.use(formidable());

//Middleware
app.use(bodyParser.json());
//Cookie
app.use(session({
    userid: "session",  
    keys: ['th1s!sA5ecretK3y'],
    //maxAge: 90 * 24 * 60 * 60 * 1000
}));

//functions
    //create new inventory docs
const createDocument = (db, createDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) =>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);

        db.collection('inventory').insertOne(createDoc, (error, results)=>{
            if(error) throw error;
            console.log(results);
            callback();
        });
    });
}
    //find doc with criteria
const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('inventory').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err, docs)=>{
        assert.equal(err, null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}
const deleteDocument = (db, criteria, callback) => {
    db.collection('inventory').deleteOne(
       criteria, 
       (err, results) => {
          assert.equal(err, null);
          console.log(results);
          callback();
       }
    );
};
const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('inventory').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Find = (req, res, criteria) =>{
    const client = new MongoClient(mongourl);
    client.connect((err)=>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        //callback()
        findDocument(db, {}, (docs)=>{
            client.close();
            console.log("Closed DB connection.");
            res.status(200).render('home', {name: `${req.session.userid}`, ninventory: docs.length, inventory: docs});
        });
    });
}

const handle_Details = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to DB server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {inventory: docs[0]});
        });
    });
}

const handle_Delete = (res, criteria) =>{
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        DOCID['owner'] = criteria.owner;
        deleteDocument(db, DOCID, (results)=>{
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('info', {message: "Document successfully deleted."});
        })     
    });
    client.close();
    res.status(200).render('info', {message: "Document successfully deleted."});
}
//handling requests
app.get('/', (req, res)=>{
    if(!req.session.authenticated){
        console.log("...Not authenticated; directing to login");
        res.redirect("/login");
    }
    console.log("...Hello, welcome back");
    handle_Find(req, res, {});
});
//login
app.get('/login', (req, res)=>{
    console.log("...Welcome to login page");
    res.sendFile(__dirname + '/public/login.html');
    res.status(200).render("login");
});

app.post('/login', (req, res)=>{
    console.log("...Handling your login request");
    users.forEach((user) => {
		if (user.name == req.fields.username && user.password == req.fields.password) {
        req.session.authenticated = true;
        req.session.userid = req.fields.username;
        console.log(req.session.userid);
        res.status(200).redirect("/home");
        }
    });
    res.redirect("/");
});
app.use((req, res, next) => {
    console.log("...Checking login status");
    if (req.session.authenticated){
      next();
    } else {
      res.redirect("/login");
    }
});

app.get('/logout', (req, res)=>{
    req.session = null;
    req.authenticated = false;
    res.redirect('/');
});
//Home page
app.get('/home', (req, res)=>{
    console.log("...Welcome to the home page!")
    const client = new MongoClient(mongourl);
    client.connect((err)=>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        //callback()
        findDocument(db, {}, (docs)=>{
            client.close();
            console.log("Closed DB connection.");
            res.status(200).render('home', {name: `${req.session.userid}`, ninventory: docs.length, inventory: docs});
        });
    });
    //res.status(200).render('home', {name: `${req.session.userid}`});
});
//details
app.get('/details', (req,res) => {
    handle_Details(res, req.query);
});

app.get("/map", (req, res) => {
    console.log("...returning the map leaflet.");
	res.status(200).render("map", {
		lat:`${req.query.lat}`,
		lon:`${req.query.lon}`,
		zoom:`${req.query.zoom ? req.query.zoom : 15}`
	});
});

app.get('/create', (req, res)=>{
    res.status(200).render("create");
});
app.post('/create', (req, res)=>{
    console.log("...create a new document!");
    const client = new MongoClient(mongourl);
    client.connect((err)=>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
                
// Get a timestamp in seconds
var timestamp = Math.floor(new Date().getTime()/1000);
// Create a date with the timestamp
var timestampDate = new Date(timestamp*1000);

// Create a new ObjectID with a specific timestamp
var objectId = new ObjectID(timestamp);

	DOC["_id"] = objectId;

        DOC['inv_id']= "";
        DOC['name']= req.fields.name;
        DOC['inv_type']= req.fields.inv_type;
        DOC['quantity']= req.fields.quantity;
        DOC['owner']= `${req.session.userid}`;
        console.log("...putting data into DOC");
        var adoc ={};
        adoc['building'] = req.fields.building;
		adoc['country'] = req.fields.country;
        if(req.fields.latitude && req.fields.longitude){
            adoc['coord'] = [req.fields.latitude, req.fields.longitude];
        }
        adoc['street'] = req.fields.street;
        adoc['zipcode'] = req.fields.zipcode;
        DOC['address'] = adoc;

        var pdoc = {};
        if (req.files.photo && req.files.photo.size > 0 && (pdoc['mimetype'] == 'image/jpeg' || pdoc['mimetype'] == 'image/png')) {
            fs.readFile(req.files.photo.path, (err, data) => {
                assert.equal(err,null);
                pdoc['title'] = req.fields.title;
                pdoc['data'] = new Buffer.from(data).toString('base64');
                pdoc['mimetype'] = req.files.photo.type;
                    
            });
        } 
        DOC['photo'] = pdoc;
        
        if(DOC.name &&  DOC.owner){
            console.log("...Creating the document");
            createDocument(db, DOC, (docs)=>{
                client.close();
                console.log("Closed DB connection");
                res.status(200).render('info', {message: "Document created successfully!"});
            });
        } else{
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('info', {message: "Invalid entry - Name & Owner is compulsory!"});
        }
    });
    client.close();
    console.log("Closed DB connection");
    res.status(200).render('info', {message: "Document created"}); 
});

app.get('/edit', (req, res)=>{
    console.log("...Enter update page");
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(req.query._id);
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            console.log(docs[0]);
            res.status(200).render('edit', {inventory: docs[0]});
        });
    });

}); 
app.post('/update', (req, res)=>{
    var updateDOC={};
    console.log("...handle Update");
    const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            console.log("...checking owner");
            
            if(req.fields.owner == req.session.userid){
                if(req.fields.name){
                updateDOC['name']= req.fields.name;
                updateDOC['inv_type']= req.fields.inv_type;
                updateDOC['quantity']= req.fields.quantity;
                updateDOC['owner']= `${req.session.userid}`;
                var adoc ={};
                adoc['building'] = req.fields.building;
				adoc['country'] = req.fields.country;
                adoc['street'] = req.fields.street;
                adoc['zipcode'] = req.fields.zipcode;
                adoc['coord'] = [req.fields.latitude, req.fields.longitude];
                updateDOC['address'] = adoc;
                var DOCID = {};
                DOCID['_id'] = ObjectID(req.fields._id);
                if (req.files.photo.size > 0) {
                    var pdoc = {};
                    fs.readFile(req.files.photo.path, (err, data) => {
                        assert.equal(err,null);
                        pdoc['title'] = req.fields.title;
                        pdoc['data'] = new Buffer.from(data).toString('base64');
                        pdoc['mimetype'] = req.files.photo.type;
                            
                    });
                    updateDOC['photo'] = pdoc;
                    updateDocument(DOCID, updateDOC, (docs) => {
                        client.close();
                        console.log("Closed DB connection");
                        res.status(200).render('info', {message: "Document updated successfully!."});
                    });
                }else{
                    updateDocument(DOCID, updateDOC, (docs) => {
                        client.close();
                        console.log("Closed DB connection");
                        res.status(200).render('info', {message: "Document updated successfully!."});
                    });
                }
            }else{
                res.status(200).render('info', {message: "Invalid entry - Name is compulsory!"});}
              
    }else{
                res.status(200).render('info', {message: "Invalid owner - Only the owner can update the page!"});
            }
    });
    
});

app.get('/delete', (req, res)=>{
    if(req.session.userid == req.query.owner){
        console.log("...hello owner of the document");
        handle_Delete(res, req.query);
    }else{
        res.status(200).render('info', {message: "Access denied - You don't have the access right!"}); 
    }
});


//Rest API
//name
app.get('/api/inventory/name/:name', function(req,res)  {
    console.log("...Rest Api");
	console.log("name: " + req.params.name);
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
});
///inv_type
app.get('/api/inventory/inv_type/:inv_type', (req,res) => {
    console.log("...Rest Api");
	console.log("inv_type: " + req.params.inv_type);
    if (req.params.inv_type) {
        let criteria = {};
        criteria['inv_type'] = req.params.inv_type;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing inv_type"});
    }
});

app.get('/*', (req, res)=>{
    res.status(404).render("info", {message: `${req.path} - Unknown request!`})
});

app.listen(process.env.PORT || 8099);
