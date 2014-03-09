/**
 * Module Dependencies
 */
// ...
// e.g.
// var _ = require('lodash');
// var mysql = require('node-mysql');
// ...

var Vogels = require('vogels');
var AWS = Vogels.AWS;

/**
 * Sails Boilerplate Adapter
 *
 * Most of the methods below are optional.
 * 
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 * 
 * For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * and load them at the top of the file with other dependencies.  e.g. var update = `require('./lib/update')`;
 */
module.exports = (function () {


  // You'll want to maintain a reference to each collection
  // (aka model) that gets registered with this adapter.
  var _modelReferences = {};

    var _definedTables = {};

    // You may also want to store additional, private data
  // per-collection (esp. if your data store uses persistent
  // connections).
  //
  // Keep in mind that models can be configured to use different databases
  // within the same app, at the same time.
  // 
  // i.e. if you're writing a MariaDB adapter, you should be aware that one
  // model might be configured as `host="localhost"` and another might be using
  // `host="foo.com"` at the same time.  Same thing goes for user, database, 
  // password, or any other config.
  //
  // You don't have to support this feature right off the bat in your
  // adapter, but it ought to get done eventually.
  // 
  // Sounds annoying to deal with...
  // ...but it's not bad.  In each method, acquire a connection using the config
  // for the current model (looking it up from `_modelReferences`), establish
  // a connection, then tear it down before calling your method's callback.
  // Finally, as an optimization, you might use a db pool for each distinct
  // connection configuration, partioning pools for each separate configuration
  // for your adapter (i.e. worst case scenario is a pool for each model, best case
  // scenario is one single single pool.)  For many databases, any change to 
  // host OR database OR user OR password = separate pool.
  var _dbPools = {};

  var adapter = {
    keyId: "id"
    , indexPrefix: "-Index"

    // Set to true if this adapter supports (or requires) things like data types, validations, keys, etc.
    // If true, the schema for models using this adapter will be automatically synced when the server starts.
    // Not terribly relevant if your data store is not SQL/schemaful.
    , syncable: true,


    // Default configuration for collections
    // (same effect as if these properties were included at the top level of the model definitions)
    defaults: {
	  accessKeyId: null
	  , secretAccessKey: null
	  , region: 'us-west-1'
        , credentialsFilePath: './credentials.json'
      // For example:
      // port: 3306,
      // host: 'localhost',
      // schema: true,
      // ssl: false,
      // customThings: ['eh']

      // If setting syncable, you should consider the migrate option, 
      // which allows you to set how the sync will be performed.
      // It can be overridden globally in an app (config/adapters.js)
      // and on a per-model basis.
      // 
      // IMPORTANT:
      // `migrate` is not a production data migration solution!
      // In production, always use `migrate: safe`
      //
      // drop   => Drop schema and data, then recreate it
      // alter  => Drop/add columns as necessary.
      // safe   => Don't change anything (good for production DBs)
      , migrate: 'alter'
//      , schema: false
    }

    , _getModel: function(collectionName){
        return Vogels.define(collectionName, function (schema) {
//console.log("_getModel", collectionName);
            var columns = global.Hook.models[collectionName].attributes;
            var primaryKey = false;
            var indexes = [];
            // set columns
            for(var columnName in columns){
                var attributes = columns[columnName];

//                console.log(columnName+":", attributes);
                if(typeof attributes !== "function"){
                    adapter._setColumnType(schema, columnName, attributes);

                    // search primarykey
                    if(!primaryKey){
                        if("primaryKey" in attributes)
                            primaryKey = columnName;
                    }
                    // search index
                    if("index" in attributes) indexes.push(columnName);
                }
            }

            if(!primaryKey)
              schema.UUID( adapter.keyId, {hashKey: true});
            else
              adapter._setColumnType(schema, primaryKey, columns[primaryKey], {hashKey: true});
//                  schema.String( primaryKey, {hashKey: true});
            for(var i = 0; i < indexes.length; i++){
                var key = indexes[i];
                schema.globalIndex(key + adapter.indexPrefix, { hashKey: key});
            }

            schema.Date('createdAt', {default: Date.now});
            schema.Date('updatedAt', {default: Date.now});
          });
    }

    ,
    /**
     * 
     * This method runs when a model is initially registered
     * at server-start-time.  This is the only required method.
     * 
     * @param  string   collection [description]
     * @param  {Function} cb         [description]
     * @return {[type]}              [description]
     */
    registerCollection: function(collection, cb) {
//console.log("adapter::registerCollection:", collection);
        AWS.config.loadFromPath('./credentials.json');
/*
 adapter::registerCollection: { keyId: 'id',
 syncable: true,
 defaults:
 { accessKeyId: null,
 secretAccessKey: null,
 region: 'us-west-1',
 migrate: 'alter',
 adapter: 'sails-dynamodb' },
 _getModel: [Function],
 registerCollection: [Function],
 teardown: [Function],
 define: [Function],
 describe: [Function],
 drop: [Function],
 find: [Function],
 create: [Function],
 update: [Function],
 destroy: [Function],
 _setColumnType: [Function],
 _resultFormat: [Function],
 _searchCondition: [Function],
 config:
 { accessKeyId: null,
 secretAccessKey: null,
 region: 'us-west-1',
 migrate: 'alter',
 adapter: 'sails-dynamodb' },
 definition:
 { id:
 { type: 'integer',
 autoIncrement: true,
 defaultsTo: 'AUTO_INCREMENT',
 primaryKey: true,
 unique: true },
 createdAt: { type: 'datetime', default: 'NOW' },
 updatedAt: { type: 'datetime', default: 'NOW' } },
 identity: 'user' }

 */
      // Keep a reference to this collection
      _modelReferences[collection.identity] = collection;
        cb();
    },


    /**
     * Fired when a model is unregistered, typically when the server
     * is killed. Useful for tearing-down remaining open connections,
     * etc.
     * 
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
    teardown: function(cb) {
      cb();
    },



    /**
     * 
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     * 
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   definition     [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    define: function(collectionName, definition, cb) {
//console.info("adaptor::define");
//console.info("::collectionName", collectionName);
//console.info("::definition", definition);
//console.info("::model", adapter._getModel(collectionName));

      // If you need to access your private data for this collection:
      var collection = _modelReferences[collectionName];

        if(! _definedTables[collectionName] ){
            var table = adapter._getModel(collectionName);

            _definedTables[collectionName] = table;
            Vogels.createTables({
                collectionName: {readCapacity: 1, writeCapacity: 1}
            }, function (err) {
                if(err) {
                    console.warn('Error creating tables', err);
                    cb(err);
                } else {
//                    console.log('table are now created and active');
                    cb();
                }
            });
        }
        else{
            cb();
        }

      // Define a new "table" or "collection" schema in the data store
    },

    /**
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     * 
     * @param  {[type]}   collectionName [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    describe: function(collectionName, cb) {
//console.info("adaptor::describe");
//console.info(collectionName);

      // If you need to access your private data for this collection:
      var collection = _modelReferences[collectionName];

      // Respond with the schema (attributes) for a collection or table in the data store
      var attributes = {};

        // extremly simple table names
        var tableName = collectionName.toLowerCase() + 's'; // 's' is vogels spec
        (new AWS.DynamoDB()).describeTable({TableName:tableName}, function(err, res){
            if (err) {
                if('code' in err && err['code'] === 'ResourceNotFoundException'){
                    cb();
                }
                else{
                    console.warn('Error describe tables'+__filename, err);
                    cb(err);
                }
//                console.log(err); // an error occurred
            } else {
//                console.log(data); // successful response
                cb(null, attributes);
            }
        });
    },


    /**
     *
     *
     * REQUIRED method if integrating with a schemaful
     * (SQL-ish) database.
     * 
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   relations      [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    drop: function(collectionName, relations, cb) {
//console.info("adaptor::drop", collectionName);
      // If you need to access your private data for this collection:
      var collection = _modelReferences[collectionName];
//console.warn('drop: not supported')
      // Drop a "table" or "collection" schema from the data store
      cb();
    },




    // OVERRIDES NOT CURRENTLY FULLY SUPPORTED FOR:
    // 
    // alter: function (collectionName, changes, cb) {},
    // addAttribute: function(collectionName, attrName, attrDef, cb) {},
    // removeAttribute: function(collectionName, attrName, attrDef, cb) {},
    // alterAttribute: function(collectionName, attrName, attrDef, cb) {},
    // addIndex: function(indexName, options, cb) {},
    // removeIndex: function(indexName, options, cb) {},



    /**
     * 
     * REQUIRED method if users expect to call Model.find(), Model.findOne(),
     * or related.
     * 
     * You should implement this method to respond with an array of instances.
     * Waterline core will take care of supporting all the other different
     * find methods/usages.
     * 
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   options        [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    find: function(collectionName, options, cb) {
console.info("adaptor::find", collectionName);
console.info("::option", options);

        // Options object is normalized for you:
        //
        // options.where
        // options.limit
        // options.skip
        // options.

        // Filter, paginate, and sort records from the datastore.
        // You should end up w/ an array of objects as a result.
        // If no matches were found, this will be an empty array.

        if ('limit' in options && options.limit < 2 ){
            // query mode
            // search primary key
            for(var key in options.where){
                var pValue = options.where[key];
            }
            var query = adapter._getModel(collectionName).query(pValue);
        }
        else{
        // scan mode
            var query = adapter._getModel(collectionName).scan();
            // If you need to access your private data for this collection:
            var collection = _modelReferences[collectionName];

            if ('where' in options){
                for(var key in options['where']){
                    //console.log(options['where'][key]);
                    query = query.where(key).contains(options['where'][key]);
                }

                query = adapter._searchCondition(query, options);
            }
            else{
                query = adapter._searchCondition(query, options);
            }
        }

        query.exec( function(err, res){
           if(!err){
//               console.log("success", res.Items[0].attrs);
               cb(null, adapter._resultFormat(res));
           }
           else{
               console.warn('Error exec query'+__filename, err);
               cb(err);
           }
        });
      // Respond with an error, or the results.
//      cb(null, []);
    }
      /**
       * search condition
       * @param query
       * @param options
       * @returns {*}
       * @private
       */
      , _searchCondition: function(query, options){
          if ('limit' in options){
//            query = query.limit(1);
          }

          if ('skip' in options){
          }

          if ('sort' in options){
          }

          return query
      }

    ,
    /**
     *
     * REQUIRED method if users expect to call Model.create() or any methods
     * 
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   values         [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    create: function(collectionName, values, cb) {
console.info("adaptor::create", collectionName);
console.info("values", values);
console.log(collectionName, global.Hook.models[collectionName].attributes);
        var Model = adapter._getModel(collectionName);

      // If you need to access your private data for this collection:
      var collection = _modelReferences[collectionName];

      // Create a single new model (specified by `values`)
        var current = Model.create(values, function(err, res){
            if(err) {
                console.warn('Error add data'+__filename, err);
                cb(err);
            } else {
//                console.log('add model data',res.attrs);
                // Respond with error or the newly-created record.
                cb(null, res.attrs);
            }
        });
    },



    // 

    /**
     *
     * 
     * REQUIRED method if users expect to call Model.update()
     *
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   options        [description]
     * @param  {[type]}   values         [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    update: function(collectionName, options, values, cb) {
//console.info("adaptor::update", collectionName);
//console.info("options", options);
//console.info("values", values);
        var Model = adapter._getModel(collectionName);

      // If you need to access your private data for this collection:
      var collection = _modelReferences[collectionName];

      // id filter (bug?)
        if (adapter.keyId in values && typeof values[adapter.keyId] === 'number'){
            if ('where' in options && adapter.keyId in options.where){
                values[adapter.keyId] = options.where[adapter.keyId];
            }
        }

      // 1. Filter, paginate, and sort records from the datastore.
      //    You should end up w/ an array of objects as a result.
      //    If no matches were found, this will be an empty array.
      //    
      // 2. Update all result records with `values`.
      // 
      // (do both in a single query if you can-- it's faster)
        var current = Model.update(values, function(err, res){
            if(err) {
                console.warn('Error update data'+__filename, err);
                cb(err);
            } else {
//                console.log('add model data',res.attrs);
                // Respond with error or the newly-created record.
                cb(null, [res.attrs]);
            }
        });

      // Respond with error or an array of updated records.
//      cb(null, []);
    },
 
    /**
     *
     * REQUIRED method if users expect to call Model.destroy()
     * 
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   options        [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    destroy: function(collectionName, options, cb) {
//console.info("adaptor::destory", collectionName);
//console.info("options", options);
        var Model = adapter._getModel(collectionName);

      // If you need to access your private data for this collection:
      var collection = _modelReferences[collectionName];


      // 1. Filter, paginate, and sort records from the datastore.
      //    You should end up w/ an array of objects as a result.
      //    If no matches were found, this will be an empty array.
      //    
      // 2. Destroy all result records.
      // 
      // (do both in a single query if you can-- it's faster)

      // Return an error, otherwise it's declared a success.
        if ('where' in options && adapter.keyId in options.where){
            var values = {};
            values[adapter.keyId] = options.where[adapter.keyId];
            var current = Model.destroy(values, function(err, res){
                if(err) {
                    console.warn('Error destory data'+__filename, err);
                    cb(err);
                } else {
//                    console.log('add model data',res.attrs);
                    // Respond with error or the newly-created record.
                    cb();
                }
            });
        }
        else
            cb();
    }



    /*
    **********************************************
    * Optional overrides
    **********************************************

    // Optional override of built-in batch create logic for increased efficiency
    // (since most databases include optimizations for pooled queries, at least intra-connection)
    // otherwise, Waterline core uses create()
    createEach: function (collectionName, arrayOfObjects, cb) { cb(); },

    // Optional override of built-in findOrCreate logic for increased efficiency
    // (since most databases include optimizations for pooled queries, at least intra-connection)
    // otherwise, uses find() and create()
    findOrCreate: function (collectionName, arrayOfAttributeNamesWeCareAbout, newAttributesObj, cb) { cb(); },
    */


    /*
    **********************************************
    * Custom methods
    **********************************************

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // > NOTE:  There are a few gotchas here you should be aware of.
    //
    //    + The collectionName argument is always prepended as the first argument.
    //      This is so you can know which model is requesting the adapter.
    //
    //    + All adapter functions are asynchronous, even the completely custom ones,
    //      and they must always include a callback as the final argument.
    //      The first argument of callbacks is always an error object.
    //      For core CRUD methods, Waterline will add support for .done()/promise usage.
    //
    //    + The function signature for all CUSTOM adapter methods below must be:
    //      `function (collectionName, options, cb) { ... }`
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////


    // Custom methods defined here will be available on all models
    // which are hooked up to this adapter:
    //
    // e.g.:
    //
    foo: function (collectionName, options, cb) {
      return cb(null,"ok");
    },
    bar: function (collectionName, options, cb) {
      if (!options.jello) return cb("Failure!");
      else return cb();
    }

    // So if you have three models:
    // Tiger, Sparrow, and User
    // 2 of which (Tiger and Sparrow) implement this custom adapter,
    // then you'll be able to access:
    //
    // Tiger.foo(...)
    // Tiger.bar(...)
    // Sparrow.foo(...)
    // Sparrow.bar(...)


    // Example success usage:
    //
    // (notice how the first argument goes away:)
    Tiger.foo({}, function (err, result) {
      if (err) return console.error(err);
      else console.log(result);

      // outputs: ok
    });

    // Example error usage:
    //
    // (notice how the first argument goes away:)
    Sparrow.bar({test: 'yes'}, function (err, result){
      if (err) console.error(err);
      else console.log(result);

      // outputs: Failure!
    })


    

    */

      /**
       * set column attributes
       * @param schema  vogels::define return value
       * @param name    column name
       * @param attr    columns detail
       * @private
       */
      , _setColumnType: function(schema, name, attr, options){
          options = (typeof options !== 'undefined') ? options : {};

          // set columns
          var type = (!attr.type)?attr:attr.type;

          switch (type){
              case "date":
              case "time":
              case "datetime":
//                  console.log("Set Date:", name);
                  schema.Date(name, options);
                  break;

              case "integer":
              case "float":
//                  console.log("Set Number:", name);
                  schema.Number(name, options);
                  break;

              case "boolean":
//                  console.log("Set Boolean:", name);
                  schema.Boolean(name, options);
                  break;

//              case "string":
//              case "binary":
//              case "array":   // not support
//              case "json":
              default:
//                  console.log("Set String", name);
                  schema.String(name, options);
                  break;
          }
      }

      /**
       * From Object to Array
       * @param results response data
       * @returns {Array} replaced array
       * @private
       */
      , _resultFormat: function(results){
          var items = []

          for(var i in results.Items){
              items.push(results.Items[i].attrs);
          }

//console.log(items);
          return items;
      }

  };


  // Expose adapter definition
  return adapter;

})();

