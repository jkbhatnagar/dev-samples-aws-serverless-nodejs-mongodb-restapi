//'use strict';

const express = require('express')
const sls = require('serverless-http')
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Joi = require('joi');
const MongoClient = require('mongodb').MongoClient;
const uuid = require('uuid');

const mongoUser = 'brmdbdev';
const mongoPass = 'brmdbdev@2019';
const mongoClusterName = 'cluster0-fnrz8.mongodb.net';
const mongoDbName = 'brmdb';
const mongoCollectionName = 'products';

const mongoConnStr = `mongodb+srv://${mongoUser}:${mongoPass}@${mongoClusterName}/${mongoDbName}?retryWrites=true&w=majority`;

const client = new MongoClient(mongoConnStr, {
  useNewUrlParser: true,
});
let db, collection;

const app = express()

app.use(helmet());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

app.get('/products/:id', async (req, res, next) => {
  try {    
    await createConn();
    collection.findOne( {id: req.params.id}, (error, result) => {
      if(error) {
        return res.status(500).send(error);
      }else if(result){
        res.send(result);
      }else{
        return res.status(500).send("NO ITEM");
      }
    });
    return;
  }
  catch (e) {
    return { error: "ERROR MESSAGE : " + e.message };
  }
});

app.get('/products', async (req, res, next) => {
  try {
    await createConn();
    collection.find({}).toArray((error, result) => {
      if(error) {
          return res.status(500).send(error);
      }
      res.send(result);
    });
  }
  catch (e) {
    return { error: "ERROR MESSAGE : " + e.message };
  }
});

app.post('/products', async (req, res, next) => {
  var productOut;
  validateProductJSON(req.body, function(product, error) {
    if(product){
      productOut = product;
    }
    else{
      productOut = null;
      return res.status(500).send(error);
    }
  });

  validateProduct(productOut, function(error) {
    if(error){
      productOut = null;
      return res.status(500).send(error);
    }
  });

  if(productOut == null)
    return;

  try {
    await createConn();
    collection.insert(productOut, (error, result) => {
      if(error) {
        return res.status(500).send(error);
      }
      else{
        return res.send(productOut);
      }
    });
  }
  catch (e) {
    return { error: "ERROR MESSAGE : " + e.message };
  }
});

app.put('/products/:id', async (req, res, next) => {
  var productOut;

  validateProductJSON(req.body, function(product, error) {
    if(product){
      productOut = product;
    }
    else{
      productOut = null;
      return res.status(500).send(error);
    }
  });

  validateProduct(productOut, function(error) {
    if(error){
      productOut = null;
      return res.status(500).send(error);
    }
  });

  if(productOut == null)
    return;

  try {
    await createConn();
    productOut.id = req.params.id;
    collection.updateOne({ id: req.params.id }, { $set: productOut }, (error, result) => {
      if(error) {
        return res.status(500).send(error);
      }
      else{
        return res.json(productOut);
      }
    });
  }
  catch (e) {
    return { error: "ERROR MESSAGE : " + e.message };
  }
});

app.delete('/products/:id', async (req, res, next) => {
  try {
    await createConn();

    collection.deleteOne({ id: req.params.id }, function(error, result) {
        if (error || !result)
          return res.status(500).send(error);

        res.send({"Deleted" : req.params.id});
    });  
  }
  catch (e) {
    return { error: "ERROR MESSAGE : " + e.message };
  }
});

const createConn = async () => {
  if (!client.isConnected()) {
    await client.connect();
    db = client.db(mongoDbName);
    collection = db.collection(mongoCollectionName);    
  }
}

// const releaseConn = async () => {
//   if (client.isConnected()) {
//     await client.close();
//   }
// }

function validateProductJSON(data, callback){
  try {
    const timestamp = new Date().getTime();
    var id = data.id ? data.id : uuid.v4();
    callback( {
      "id" : id,
      "title" : data.title,
      "description" : data.description,
      "unit" : data.unit,
      "price" : data.price,
      "updatedat" : timestamp,
    }, null)
  } catch (e) {
    callback(null, e);
  }
}

function validateProduct(data, callback){
  const schema = Joi.object().keys({
    id: Joi.string().guid().required(),
    title: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(50),
    unit: Joi.string().min(1).max(10).required(),
    price: Joi.number().positive().greater(0).required(),
    updatedat: Joi.date().timestamp(),
  });

  Joi.validate(data, schema, (err, value) => {
    if (err) {
      callback(err);
    }
    else{
      callback(null);
    }
  });
}

module.exports.server = sls(app)
