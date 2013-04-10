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
      jsFileContents,
      fs = require('fs'),
      config;

  return Saasy = (function(_super) {

    __extends(Saasy, _super);

    function Saasy() {
      return Saasy.__super__.constructor.apply(this, arguments);
    }

    // Name our plugin
    Saasy.prototype.name = 'saasy';

    // Access our docpad configuration from within our plugin
    Saasy.prototype.docpadReady = function(opts) {
      config = opts.docpad.config;
    }

    // Inject our CMS front end to the server 'out' files
    Saasy.prototype.renderDocument = function(opts, next) {
      var extension = opts.extension, 
          file = opts.file, 
          index = opts.content.indexOf('</body>'),
          injectJs = function () {
            // If we have a </body> tag present
            if(index > -1) {
              // Add the jsFileContents before the </body> tag
              opts.content = opts.content.replace('</body>',  jsFileContents + '</body>');
            } else {
              // Just inject the jsFileContents to the end of the layout
              opts.content += jsFileContents;
            }
            return next(); // Move on to the next file 
          };
      
      // Only inject our CMS javascript into Layouts
      if (file.type === 'document' && file.attributes.isLayout) {
        // If we've previously read our saasy cms file then just inject the contents right away
        if (jsFileContents) {
          injectJs();
        }

        // Read the contents of our Saasy CMS javascript file
        return fs.readFile(__dirname + '/saasy.js', function (err, data) {
          if (err) {
            next();
            return console.log(err);
          }
          // Build our JS file contents and inject them into the page markup
          jsFileContents = '<script data-owner="saasy">' + data + '</script>';
          injectJs();
        });
      } 

      next();
    };


    // Add REST like calls for file CRUD operations on the express server
    Saasy.prototype.serverExtend = function(opts){

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
      function fileWriter(str, req) {
        if (req.body.type && req.body.url) {
          if (!fs.existsSync(config.documentsPaths + '/' + req.body.type)) {
            fs.mkdirSync(config.documentsPaths + '/' + req.body.type);
          }
          fs.writeFileSync(config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.html.md', str);
          return true;
        }
        return false;
      }

      // Deletes a document in the DOCPATH documents folder
      function fileDeleter(req) {
        var filePath = config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.html.md';
        if (req.body.type && req.body.url) {
          if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('File at ' + filePath + ' deleted');
            return true;
          }
        }
        return false;
      }

      // Renames an existing file in the DOCPATH documents folder
      function fileRenamer(req) {
        var oldPath = config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.html.md';
        var newPath = config.documentsPaths + '/' + req.body.type + '/' + req.body.urlNew + '.html.md';
        if (req.body.type && req.body.url && req.body.urlNew) {
          if(fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath)
            return true;
          }
        }
        return false;
      }

      // Express REST like CRUD operations

      // Save a file
      server.post('/saasy', function (req, res) {
        if(fileWriter(fileBuilder(req), req)) {
          return res.send(success);
        }
        return res.send(fail);
      });

      // Delete a file
      server.delete('/saasy', function (req, res) {
        if(fileDeleter(req)) {
          return res.send(success);
        }
        return res.send(fail);
      });
      
      // Edit a file
      server.post('/saasy/edit', function (req, res) {
        res.send('API is running');
      });
      
      // Rename a file
      server.post('/saasy/rename', function (req, res) {
        if(fileRenamer(req)) {
          return res.send(success);
        }
        return res.send(fail);
      });

    };

    return Saasy;

  })(BasePlugin);

};