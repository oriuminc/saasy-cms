// JS version of CoffeeScript extends
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) {
    for (var key in parent) { 
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        } 
        function ctor() { 
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
  };

// Pure JS module for DOCPAD
module.exports = function(BasePlugin) {
  var Saasy,
      saasyInjection,
      collections = {},
      gitpad = require('gitpad'),
      fs = require('fs'),
      docpad,
      config;

  return Saasy = (function(_super) {

    __extends(Saasy, _super);

    function Saasy() {
      return Saasy.__super__.constructor.apply(this, arguments);
    }

    // Name our plugin
    Saasy.prototype.name = 'saasy';

    //remove spaces from filenames and give them a max length
    function fixFilePath(str) {
        return str.trim().split(' ').join('-').substring(0, 40).toLowerCase();
    }

  // Build the contents of a file to be saved as a string
   function fileBuilder(req) {
    var key,
        loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque aliquam est convallis nibh vestibulum lacinia. Vestibulum dolor arcu, vulputate ut molestie sit amet, laoreet vitae mi. Suspendisse venenatis, quam at lacinia luctus, libero turpis molestie arcu, sed feugiat leo risus ac quam. Donec vel neque id tortor lacinia viverra. Pellentesque mollis justo purus. Cras quis tortor sed nibh fringilla gravida vitae eu diam. Ut erat elit, volutpat sed eleifend non, hendrerit vel tortor. Etiam facilisis sollicitudin venenatis. Morbi convallis tincidunt ligula, id tempor metus eleifend eu. Integer a risus ipsum, eu congue magna.'
        toReturn = '---\n';

        //maybe we shouldn't do this - title is not a saasy concept - but title is lowercase in the metadata
        //of all standard docpad modules/code
        if(req.body.Title && ! req.body.title) {
            req.body.title = req.body.Title;
            delete req.body.Title;
        }

        for (key in req.body) {
          if (req.body.hasOwnProperty(key) && key !== 'Content') {
            toReturn += key + ': "' + req.body[key] + '"\n';
          }
        }

        return toReturn += '---\n\n' + (req.body.Content ? req.body.Content.replace('__loremIpsum', loremIpsum) : '');
      }

    function getContentTypes(cb) {
        var configPath = config.rootPath + '/saasy.config.json';
        fs.readFile(configPath, function(err, data) {
          if (err) {
            console.log('Error reading your content types from ' + configPath);
            return cb({});
          }
          cb(JSON.parse(data));
        });
    }

    function initGitPad(cb) {
      //Initialize our Git Repo
      gitpad.init(config.rootPath + '/src/contents', cb);
    }

    // Access our docpad configuration from within our plugin - for now, this is all to deal with content types
    Saasy.prototype.docpadReady = function(opts) {
      docpad = opts.docpad;
      config = opts.docpad.config;

      
      // Extend the template functions
      config.templateData.getCuratedCollection = function(name, curatedList, maxLength) {

        var curation = docpad.getCollection('documents').findOne({type: 'curation', name: curatedList});
        curation = curation ? curation.attributes.curation: [];
        var collection = this.getCollection(name);

        collection.comparator = function(a) {
          return curation.indexOf(a.relativeBase);
        };

        function trim(collection) {
          if (typeof maxLength === 'undefined') {
            return collection;
          }
          // Trim our collections to the maxLength
          collection.models = collection.models.slice(0, maxLength);
          collection.length = maxLength;
          return collection;
        }

        return trim(collection.findAll({relativeBase: {$in: curation}}));
      }

      getContentTypes(function (result) {
        //get all content types and push special saasy gloabal fields to all types
        var key,
            len,
            len2,
            data,
            apiData,
            type,
            fileName,
            catCollection,
            cat;
        config.contentTypes = result.types;
        //special saasy global fields
        config.globalFields = {
            "Filename": "text",
            "Content": "textarea"
        };
        //add saasy global fields and user specified global fields to all types
        for(key in result.globalTypes) {
            if(result.globalTypes.hasOwnProperty(key)) {
                config.globalFields[key] = result.globalTypes[key];
            }    
        }

        //create a live collection for each content type for use in paginated lists
        len = result.types.length;
        while(len--) {
            type = result.types[len].type;
            docpad.setCollection(type, docpad.getCollection('documents').findAllLive({type: type},{date:-1}));
            len2 = result.types[len].categories;
            if(len2) {
                catCollection = new docpad.Collection();
                result.types[len].categories.forEach(function(cat) {
                  catCollection.add({cat: cat});
                });
                docpad.setCollection(type + '-categories', catCollection); 
                len2 = len2.length;
                while(len2--) {
                    cat = result.types[len].categories[len2];
                    docpad.setCollection(type + ',' + cat, docpad.getCollection('documents').findAllLive({type:type, category: {$in:[cat]}},{date:-1}));                     fileName = config.documentsPaths + '/' + type + '/category-' + cat + '.html.md';

                    //we need to block here as docpad doesn't wait for a callback after letting you know it's ready, super sweet!
                    console.log('Blocking Docpad while creating categories...');
                    if(! fs.existsSync(fileName)) {
                       fs.writeFileSync(fileName, fileBuilder({ body: {  
                        category: cat,
                        parentType: type,
                        pagedCollection: type + ',' + cat,
                        layout: 'paginated-landing',
                        isPaged: true,
                        pageSize: 1
                       }}));
                    }
                } 
            }
        }
      });

      //setup our git repository
      initGitPad();
    };

    /* we may be able to use this to prevent generations from clobbering other generations */
    Saasy.prototype.generateBefore = function (opts) {
        //opts.reset = true;
        //console.log(arguments);
    };

    // Inject our CMS front end to the server 'out' files
    Saasy.prototype.renderDocument = function(opts, next) {
      var file = opts.file;

      function injectJs() {
         opts.content = opts.content.replace('<body>',  '<body>' + saasyInjection);
         next();
      }
      
      // Only inject Saasy into Layouts with a opening body tag
      if (file.type === 'document' && file.attributes.isLayout && opts.content.indexOf('<body>') > -1) {
        // If we've previously read our saasy cms files, then just inject the contents right away
        if (saasyInjection) {
          return injectJs();
        }

        // Read the contents of our Saasy JS/CSS/HTML
        return fs.readFile(__dirname + '/saasy.js', function (err, data) {
          if (err) {
            next();
            return console.log(err);
          }
          fs.readFile(__dirname + '/saasy.css', function (err, cssData) {
            if (err) {
              next();
              return console.log(err);
            }
            fs.readFile(__dirname + '/saasy.html', function (err, markupData) {
              if (err) {
                next();
                return console.log(err);
              }
              // Build our file contents and inject them into the page markup
              saasyInjection = '<style data-owner="saasy" type="text/css">' + cssData + '</style>' + markupData + '<script data-owner="saasy">var $S = { contentTypes:' + JSON.stringify(config.contentTypes) + ', globalFields:' + JSON.stringify(config.globalFields) +'};\n' + data + '</script>';
              injectJs();
            });
          });
        });
      }
      if (file.attributes.type === 'curation') {
        file.attributes.write = false;
      }
      next();
    };


    // Add REST like calls for file CRUD operations on the express server
    Saasy.prototype.serverExtend = function(opts) {

      var server = opts.server,
          successStr = '{"success": true, "fileName": "[name]"}',
          fail =  '{"success": false}';

      function success(fileName) {
        return successStr.replace("[name]", fileName);
      }

      // Write the contents of a file to DOCPATH documents folder
      function fileWriter(str, req, cbSuccess, cbFail) {
        var fileName = fixFilePath(req.body.Filename)
            type = fixFilePath(req.body.type);

        function write () {
          var filePath = config.documentsPaths + '/' + type + '/' + fileName + '.' + (req.body.format || 'html') + '.md';  
          fs.writeFile(filePath, str, function (err) {
            if(err) {
              cbFail();
              return console.log('couldnt write file at ' + filePath); 
            }
            cbSuccess(filePath.replace(config.documentsPaths, '').replace('.md', ''));
          });
        }

        if (type && fileName) {
          var dirPath = config.documentsPaths + '/' + type;
          return fs.exists(dirPath, function (exists) {
            if (!exists) {
              return fs.mkdir(dirPath, function (err) {
                  if(err) {
                     cbFail();
                     return console.log('couldnt make directory at ' + dirPath); 
                  }
                  //docpad.action('generate', function(err,result){
                    //if (err) {
                      //console.log(err.stack);
                    //}
                    write();
                  //});
              });
            }
            write();
          }); 
        }
        cbFail();
      }

      // Deletes a document in the DOCPATH documents folder
      function fileDeleter(req, cbSuccess, cbFail) {
        var filePath = config.documentsPaths + '/' + fixFilePath(req.body.type) + '/' + req.body.url + '.html.md';
        if (req.body.type && req.body.url) {
          return fs.exists(filePath, function (exists) {
            if (!exists) {
              cbFail();
              return console.log('couldnt delete file at ' + filePath + ' as it does not exist'); 
            }
            fs.unlink(filePath, function (err) {
              if (err) {
                cbFail();
                return console.log(err);
              }
              console.log('File at ' + filePath + ' deleted');
              cbSuccess(filePath.replace(config.documentsPaths, '').replace('.md', ''));
            }); 
          });
        }
        cbFail();
      }

      // Renames an existing file in the DOCPATH documents folder
      function fileRenamer(req, cbSuccess, cbFail) {
        var oldPath = config.documentsPaths + '/' + fixFilePath(req.body.type) + '/' + req.body.url + '.html.md';
        if (req.body.type && req.body.url && req.body.urlNew) {
          return fs.exists(oldPath, function (exists) {
           if (!exists) {
             console.log('cannot rename ' + oldPath + ' as it does not exist');
             return cbFail();
           }
           
           var newPath = config.documentsPaths + '/' + fixFilePath(req.body.type) + '/' + req.body.urlNew + '.html.md';
           fs.rename(oldPath, newPath, function(err) {
             if (err) {
                console.log(err);
                return cbFail();
             }
             cbSuccess(newPath.replace(config.documentsPaths, '').replace('.md', ''));
           });
          });
        }
        cbFail();
      }

      // Express REST like CRUD operations
      function save(req, res) {
        fileWriter(fileBuilder(req), req, function(fileName) {
          gitpad.saveFile(config.documentsPaths + fileName + '.md', 'User initiated save of ' + fileName, 
            function(err) {
              console.log(err);
            });
          res.send(success(fileName));
        }, function () {
          res.send(fail);
        }); 
      }

      // Save a file
      server.post('/saasy', function (req, res) {
        save(req, res);
      });

      // Edit a file
      server.post('/saasy/edit', function (req, res) {
        save(req, res); 
      });
      
      // Delete a file
      server.delete('/saasy', function (req, res) {
        fileDeleter(req, function (fileName) {
          res.send(success(fileName));
        }, function () {
          res.send(fail);
        });
      });
    
      // Rename a file
      server.post('/saasy/rename', function (req, res) {
        fileRenamer(req, function (fileName) {
          res.send(success(fileName));
        }, function () {
          res.send(fail);
        });
      });
      
      //Get a Document 
      server.get('/saasy/document/:type?/:filename?', function(req, res) {
        if(req.params.type && req.params.filename) {
            res.send(docpad.getFile({type: req.params.type, basename: req.params.filename}));
        } else if (req.params.type) {
            var filter = {},
                sort = {};
            for(key in req.query) {
                if(req.query.hasOwnProperty(key)) {
                    filter[key] = {$in:req.query[key].split(',')};
                }
            }
            sort[req.query.sort || 'date'] = req.query.sortOrder || -1;
            res.send(docpad.getCollection(req.params.type).findAll(filter, sort));
        } else {
            res.send(docpad.getFiles({}));
        }  
    });

    };

    /* Add Support for Multiple Layouts per Document */
    Saasy.prototype.renderAfter = function(opts, next) {
        var noneToRender = true,
            document,
            database = docpad.getDatabase('html');
        opts.collection.models.forEach(function(model) {
            if(model.attributes.additionalLayouts) {
              model.attributes.additionalLayouts.forEach(function(layout) {
                document = docpad.createDocument(model.toJSON());
                
                document.id = document.id.replace('.html', '.json'); 
                document.set('basename', document.get('basename').replace('.html', '.json'));
                document.render({
                    templateData: docpad.getTemplateData()
                }, function () {
                    database.add(document);
                    next();
                });
                noneToRender = false;
              }); 
            }
        });
        if (noneToRender) {
          next();
        }
    };
    
    
    return Saasy;
  
  })(BasePlugin);
};
