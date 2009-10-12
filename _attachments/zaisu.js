var Zaisu = {
    storage: {}
};

(function(z){
    //private util functions ///////////////////////
    var forkProc = function(func){
        setTimeout(func, 1);
    }

    //for test impl ///////////////////////////
    var hoge_view = {
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

    //B-tree//////////////////////////////////////
    //TODO: Impl
    var btree = function(left, right){
        this._left = left;
        this._right = right;
    }
    btree.build = function(list){

    }

    ///////////////////////////////////////////////
    //Storage//////////////////////////////////////
    //TODO: Btree
    z.storage.AsyncMock = function(id){
        //TODO: complex key (array? list? hash?)
        this._id = id;
        this._raw = {};
    }
    z.storage.AsyncMock.prototype.get = function(key, callback){
        var result = this._raw[key];
        forkProc(function(){
            callback(result);
        });
    }
    z.storage.AsyncMock.prototype.set = function(key, val, callback){
        this._raw[key] = val;
        forkProc(function(){
            callback(val);
        });
    }

    //////////////////////////////////////////////
    //DB//////////////////////////////////////////
    z.DB = function(name, storage){
        this._storage = storage;
        this._name = name;
        this._views = {};
        this._couch = new CouchDB(name);
    }
    z.DB.prototype.get = function(docid, options, callback){
        this._storage.get(docid, callback);
    }
    z.DB.prototype.set = function(doc, options, callback){
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
    z.DB.prototype.view = function(viewname, options, callback){
        var view = this._views[viewname];
    }
    z.DB.open = function(name, options, callback){
        var storage = options.storage || new z.storage.AsyncMock();
        var viewerBase = options.viewer || z.Viewer;
        var db = new Zaisu.DB(name, storage);

        //TODO: for test impl!!/////////////////////////
        db._views = {
            testview: new viewerBase({},
                                     hoge_view.map.toSource(),
                                     hoge_view.reduce.toSource())
        };
        //////////////////////////////////////////

        forkProc(function(){
            callback(db);
        });
    }

    ///////////////////////////////////////////////////
    //Viewer a.k.a Indexer ////////////////////////////
    //TODO: SORT
    z.Viewer = function(base_index, map, reduce){
        this._index = base_index || {};
        with(this){
            this._map = eval(map);       //TODO: secure..
            this._reduce = eval(reduce); //TODO: secure..
        }
    }
    z.Viewer.prototype.emit = function(key, value){
        this._work_space[key] = this._work_space[key] || [];
        this._work_space[key].push(value);
    }
    z.Viewer.prototype.index = function(doc, callback){
        var self = this;
        forkProc(function(){
            self._work_space = {};
            self._map(doc);
            for(var k in self._work_space){
                var keys = [];
                var values = self._work_space[k];
                for(var i in values){
                    keys.push([k, doc._id]);
                }
                if(self._reduce){
                    self._index[k] = self._reduce(keys, values);
                }else{
                    //TODO: 実装する、おそらくnon-hashなデータType is need
                    //self._index[k] = values;
                }
            }
            if(callback){ callback(true); }
        });
    }

})(Zaisu);

//for yield///////////////////////////////////////
Function.prototype.doGen = function(){
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