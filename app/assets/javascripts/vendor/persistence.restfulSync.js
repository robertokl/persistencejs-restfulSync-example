/**
* @license
* Copyright (c) 2013 Roberto Klein <robertokl@gmail.com>
* 
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
* 
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/

if(!window.persistence) { // persistence.js not loaded!
  throw new Error("persistence.js should be loaded before persistence.restfulSync.js");
}

persistence.restfulSync = {};

(function() {
  var argspec = persistence.argspec;

  persistence.restfulSync.NewResources = persistence.define('_RestfulSync_NewResources', {
    entity: "VARCHAR(255)",
    objectId: "VARCHAR(40)",
    attributes: "VARCHAR(1023)"
  });
  persistence.restfulSync.UpdatedResources = persistence.define('_RestfulSync_UpdatedResources', {
    entity: "VARCHAR(255)",
    objectId: "VARCHAR(40)",
    attributes: "VARCHAR(1023)"
  });
  persistence.restfulSync.DeletedResources = persistence.define('_RestfulSync_DeletedResources', {
    entity: "VARCHAR(255)",
    objectId: "VARCHAR(40)"
  });
  persistence.restfulSync.RemoteData = persistence.define('_RestfulSync_RemoteData', {
    entity: "VARCHAR(255)",
    lastSync: "BIGINT"
  });

  persistence.entityDecoratorHooks.push(function(Entity) {
    Entity.enableSync = function(uri) {
      Entity.meta.enableSync = true;
      Entity.meta.syncUri = uri;
    };

    Entity.syncAll = function(session, uri, callback) {
      var args = argspec.getArgs(arguments, [
        { name: 'session', optional: true, check: function(obj) { return obj && obj.flush; }, defaultValue: persistence },
        { name: 'uri', optional: true, check: argspec.hasType('string'), defaultValue: this.meta.syncUri },
        { name: 'callback', check: argspec.isCallback() }
      ]);
      persistence.restfulSync.helpers.syncAdded(args.session, args.uri, this.meta.name);
      persistence.restfulSync.helpers.syncUpdated(args.session, args.uri, this.meta.name);
      persistence.restfulSync.helpers.syncDeleted(args.session, args.uri, this.meta.name);
      persistence.restfulSync.helpers.retrieveFromRemote(args.session, args.uri, this, args.callback);
    };
  });

  persistence.flushHooks.push(function(session, tx, callback) {
    for (var id in session.getTrackedObjects()) {
      if (session.getTrackedObjects().hasOwnProperty(id)) {
        var obj = session.getTrackedObjects()[id];
        var meta = persistence.getEntityMeta()[obj._type];
        if(meta.enableSync) {
          if(obj._fromServer) {
            obj._fromServer = false;
          } else {
            if(persistence.restfulSync.helpers.isPresent(obj._dirtyProperties) && !obj._new) {
              var attributes = {};
              for(var attr in obj._dirtyProperties) {
                if(obj._data.hasOwnProperty(attr)) {
                  attributes[attr] = obj._data[attr];
                }
                persistence.restfulSync.helpers.addSyncObject(session, persistence.restfulSync.UpdatedResources, obj, attributes);
              }
            } else if(obj._new) {
              persistence.restfulSync.helpers.addSyncObject(session, persistence.restfulSync.NewResources, obj, obj._data);
            }
          }
        }
      }
    }
    session.objectsRemoved.forEach(function(rec) {
      var meta = session.getMeta(rec.entity);
      if(meta.enableSync) {
        if(obj._fromServer) {
          obj._fromServer = false;
        } else {
          session.add(new persistence.restfulSync.DeletedResources({objectId: rec.id, entity: rec.entity}));
        }
      }
      session.objectsRemoved=[]
    });
    callback();
  });

  persistence.restfulSync.helpers = {};
  persistence.restfulSync.helpers.isPresent = function(obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) return true;
    }
    return false;
  }
  persistence.restfulSync.helpers.addSyncObject = function(session, model, object, attributes){
    var newObj = new model({entity: object._type, objectId: object.id, attributes: JSON.stringify(attributes)})
    session.add(newObj);
  }
  persistence.restfulSync.helpers.syncAdded = function(session, uri, entity) {
    persistence.restfulSync.helpers.sendData(session, entity, persistence.restfulSync.NewResources, 201, "POST", function(obj){
      return uri;
    }, function(obj){
      var data = JSON.parse(obj.attributes());
      data["persistence_id"] = obj.objectId();
      for(var key in session.getMeta(obj.entity()).hasOne) {
        if(data.hasOwnProperty(key)) {
          data[key + "_id"] = data[key];
          delete data[key];
        }
      }
      console.log(data);
      return data;
    });
  }
  persistence.restfulSync.helpers.syncUpdated = function(session, uri, entity) {
    persistence.restfulSync.helpers.sendData(session, entity, persistence.restfulSync.UpdatedResources, 204, "PUT", function(obj){
      return uri + "/" + obj.objectId();
    }, function(obj){
      return JSON.parse(obj.attributes());
    });
  }
  persistence.restfulSync.helpers.syncDeleted = function(session, uri, entity) {
    persistence.restfulSync.helpers.sendData(session, entity, persistence.restfulSync.DeletedResources, 204, "DELETE", function(obj){
      return uri + "/" + obj.objectId();
    }, function(obj){
      return {};
    });
  }
  persistence.restfulSync.helpers.sendData = function(session, entity, model, successCode, method, uriBuilder, attributesBuilder) {
    model.all().filter("entity", "=", entity).forEach(function(obj) {
      var data = {};
      data[entity.toLowerCase()] = attributesBuilder(obj);
      data["_method"] = method;
      data = JSON.stringify(data);

      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open(method, uriBuilder(obj), true);
      xmlHttp.setRequestHeader('Content-Type', 'application/json');
      xmlHttp.send(data);
      xmlHttp.onreadystatechange = function() {
        if(xmlHttp.readyState == 4 && xmlHttp.status == successCode) {
          session.remove(obj);
        }
      }
    });
  }
  persistence.restfulSync.helpers.retrieveFromRemote = function(session, uri, entity, callback) {
    if(!entity.meta.enableSync) return;
    persistence.restfulSync.RemoteData.all().filter("entity", "=", entity.meta.name).one(function(remoteData) {
      var since = 0;
      if(remoteData) {
        since = remoteData.lastSync();
      }
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open("GET", uri + "?since=" + since, true);
      xmlHttp.setRequestHeader('Content-Type', 'application/json');
      xmlHttp.send();
      xmlHttp.onreadystatechange = function() {
        if(xmlHttp.readyState == 4 && xmlHttp.status == 200) {
          var json = JSON.parse(xmlHttp.responseText);
          persistence.restfulSync.helpers.syncRemoteData(session, json, entity, persistence.restfulSync.helpers.updateLastSync);
          callback();
        }
      }
    });
  }
  persistence.restfulSync.helpers.updateLastSync = function(session, json, entity) {
    persistence.restfulSync.RemoteData.all().filter("entity", "=", entity.meta.name).one(function(remoteData) {
      var newRemoteData;
      if(remoteData) {
        newRemoteData = remoteData;
      } else {
        newRemoteData = new persistence.restfulSync.RemoteData();
      }
      newRemoteData.lastSync(json["now"]);
      newRemoteData.entity(entity.meta.name);
      session.add(newRemoteData);
    });
  }
  persistence.restfulSync.helpers.syncRemoteData = function(session, json, entity, callback) {
    for(var key in json) {
      if(key == "now") continue;
      for(var i in json[key]) {
        var obj = json[key][i];
        persistence.restfulSync.helpers.persistRemoteData(session, obj, entity);
      }
    }
    callback(session, json, entity);
  }
  persistence.restfulSync.helpers.persistRemoteData = function(session, obj, entity) {
    entity.load(obj["persistence_id"], function(databaseObject){
      var persistObject = new entity();
      var filteredObject = {};
      for(var attr in obj) {
        if(attr == "id") continue;
        if(attr == "_removed" && obj[attr]) {
          if(databaseObject){
            session.remove(databaseObject);
            persistObject._fromServer = true;
          }
          return;
        }
        if(persistObject.hasOwnProperty(attr.replace(/_id$/, ""))) filteredObject[attr.replace(/_id$/, "")] = obj[attr];
      }
      if(databaseObject){
        persistObject = databaseObject;
        persistObject._dirtyProperties = filteredObject;
      } else {
        persistObject.id = obj["persistence_id"];
        var dirtyProperties = {}
        for(key in persistence.getMeta(persistObject._type).hasOne) {
          if(filteredObject[key]) {
            dirtyProperties[key] = true
          }
        }
        if(persistence.restfulSync.helpers.isPresent(dirtyProperties)) {
          persistObject._dirtyProperties = dirtyProperties;
        }
      }
      persistObject._data = filteredObject;
      persistObject._fromServer = true;
      session.add(persistObject);
    });
  }
}());

