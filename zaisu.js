var Zaisu = {
    storage: {},
    util: {}
};

(function(z){
    ////////////////////////////////////////
    z.storage.AsyncMock = function(id){
        this._id = id;
        this._raw = {};
    }
    z.storage.prototype.get = function(key, callback){
        var result = this._raw[key];
        setTimeout(function(){
            callback(result);
        }, 1);
    }
    z.storage.prototype.set = function(key, val, callback){
        this._raw[key] = val;
        setTimeout(function(){
            callback(val);
        }, 1);
    }

    ////////////////////////////////////////
    z.DB = function(name, storage){
        this._storage = storage;
        this._name = name;
        this._views = {};
        this._couch = new CouchDB(name);
    }
    z.DB.prototype.get(docid, options, callback){
        this._storage.get(docid, callback);
    }
    z.DB.prototype.save(doc, options, callback){
        if(doc._id == undefined){
            //TODO: something
            doc._id = parseInt(Math.random(1000000) * 1000000);
        }
        this._storage.set(doc._id, doc, callback);

        //re-index - async
        for(var k in this._views){
            this._views[k].index(doc);
        }
    }
    z.DB.prototype.view(viewname, options, callback){
        var view = this._views[viewname];
    }
    z.DB.open(name, callback){
        var storage = new AsyncMock();
        var db = new Zaisu.DB(name, storage);

        //for test impl
        var hoge = {
            map: function(doc){
                emit(doc.name, 1);
            },
            reduce: function(keys, values){
                var temp = {};
                var prev;
                for(var k in keys){
                    prev = temp[keys[k][0]] || 0;
                    temp[keys[k][0]] = prev + values[k];
                }
                return temp;
            }
        };
        db._views = {
            testview: new Zaisu.Viewer({}, hoge.map, hoge.reduce)
        }

        setTimeout(function(){
            callback(db);
        }, 1);
    }

    //////////////////////////////////////////////////
    z.Viewer = function(base_index, map, reduce){
        this._index = base_index || {};
        this._map = map;
        this._reduce = reduce;
    }
    z.Viewer.prototype.emit = function(key, value){
        this._work_space[key] = this._work_space[key] || [];
        this._work_space[key].push(value);
    }
    z.Viewer.prototype.index = function(doc, callback){
        var self = this;
        setTimeout(function(){
            self._work_space = {};
            with(self){ self._map(doc); }
            for(var k in self._work_space){
                var keys = [];
                var values = self._work_space[k];
                for(var i in values){
                    keys.push([k, values[i]]);
                }
                self._index[k] = self._reduce(keys, values);
            }
            if(callback){ callback(true); }
        }, 1);
    }

})(Zaisu);

//for yield///////////////////////////////////////
Function.prototype.do = function(){
    var g = this(function(t) {
        try { g.send(t) } catch(e) { }
    });
    g.next();
}

/*
(function(resume){

  var db = yield Zaisu.DB.open("testdb", resume);

  var doc = yield db.get("112233443", {}, resume);

  yield db.save({name: "hogehoge", age:23}, {}, resume);

}).do();
*/