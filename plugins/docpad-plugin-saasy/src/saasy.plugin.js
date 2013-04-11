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

    // Access our docpad configuration from within our plugin
    Saasy.prototype.docpadReady = function(opts) {
      docpad = opts.docpad;
      config = opts.docpad.config;
      getContentTypes(function (result) {
        config.contentTypes = result;
      });
    };

    // Inject our CMS front end to the server 'out' files
    Saasy.prototype.renderDocument = function(opts, next) {
      var file = opts.file;

      function injectJs() {
         console.log('inject');
         opts.content = opts.content.replace('</body>',  saasyInjection + '</body>');
         next();
      }
      
      // Only inject Saasy into Layouts with a closing body tag
      if (file.type === 'document' && file.attributes.isLayout && opts.content.indexOf('</body>') > -1) {
        // If we've previously read our saasy cms files, then just inject the contents right away
        if (saasyInjection) {
          return injectJs();
        }

        // Read the contents of our Saasy CMS javascript file
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
              // Build our JS file contents and inject them into the page markup
              saasyInjection = '<style data-owner="saasy" type="text/css">' + cssData + '</style>' + markupData + '<script data-owner="saasy">var $S = { contentTypes:' + JSON.stringify(config.contentTypes) + '};\n' + data + '</script>';
              injectJs();
            });
          });
        });
      }
      next();
    };


    // Add REST like calls for file CRUD operations on the express server
    Saasy.prototype.serverExtend = function(opts) {

      var server = opts.server,
          success = '{"success": true}',
          fail =  '{"success": false}';

      // Build the contents of a file to be saved as a string
      function fileBuilder(req) {
        var key,
            toReturn = '---\n';
        for (key in req.body) {
          if (req.body.hasOwnProperty(key) && key !== 'content') {
            toReturn += key + ': "' + req.body[key] + '"\n';
          }
        }

        return toReturn += '---\n\n' + req.body.content;
      }

      // Write the contents of a file to DOCPATH documents folder
      function fileWriter(str, req, cbSuccess, cbFail) {
        
        function write () {
          var filePath = config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.' + (req.body.format || 'html') +'.md';  
          fs.writeFile(filePath, str, function (err) {
            if(err) {
              cbFail();
              return console.log('couldnt write file at ' + filePath); 
            }
            cbSuccess();
          });
        }

        if (req.body.type && req.body.url) {
          var dirPath = config.documentsPaths + '/' + req.body.type;
          return fs.exists(dirPath, function (exists) {
            if (!exists) {
              return fs.mkdir(dirPath, function (err) {
                  if(err) {
                     cbFail();
                     return console.log('couldnt make directory at ' + dirPath); 
                  }
                  write();
              });
            }
            write();
          }); 
        }
        cbFail();
      }

      // Deletes a document in the DOCPATH documents folder
      function fileDeleter(req, cbSuccess, cbFail) {
        var filePath = config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.html.md';
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
              cbSuccess();
            }); 
          });
        }
        cbFail();
      }

      // Renames an existing file in the DOCPATH documents folder
      function fileRenamer(req, cbSuccess, cbFail) {
        var oldPath = config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.html.md';
        if (req.body.type && req.body.url && req.body.urlNew) {
          return fs.exists(oldPath, function (exists) {
           if (!exists) {
             console.log('cannot rename ' + oldPath + ' as it does not exist');
             return cbFail();
           }
           
           var newPath = config.documentsPaths + '/' + req.body.type + '/' + req.body.urlNew + '.html.md';
           fs.rename(oldPath, newPath, function(err) {
             if (err) {
                console.log(err);
                return cbFail();
             }
             cbSuccess();
           });
          });
        }
        cbFail();
      }



      // Express REST like CRUD operations
      function save(req, res) {
        fileWriter(fileBuilder(req), req, function() {
          res.send(success);
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
        fileDeleter(req, function () {
          res.send(success);
        }, function () {
          res.send(fail);
        });
      });
    
      // Rename a file
      server.post('/saasy/rename', function (req, res) {
        fileRenamer(req, function () {
          res.send(success);
        }, function () {
          res.send(fail);
        });
      });
      
      //Get a Document 
      server.get('/saasy/document/:type?/:filename?', function(req, res) {
      if(req.params.type && req.params.filename) {
        //res.send(docpad.getFileAtPath(req.params.type + '/' + req.params.filename));
        res.send(docpad.getFile({type: req.params.type, basename: req.params.filename}));
      } else if (req.params.type) {
        res.send(docpad.getFiles({type: req.params.type}));
      }
      else {
        res.send(docpad.getCollection('documents'));
      }  
    });

    };

    return Saasy;
  
  })(BasePlugin);
};
