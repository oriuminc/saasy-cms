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
      saasyFileContents,
      fs = require('fs'),
      config;

  return Saasy = (function(_super) {

    __extends(Saasy, _super);

    function Saasy() {
      return Saasy.__super__.constructor.apply(this, arguments);
    }

    function getContentTypes() {
        var configPath = config.rootPath + '/saasy.config.json';
        if (fs.existsSync(config.rootPath)) {
            return JSON.parse(fs.readFileSync(configPath));
        } else {
            console.log("You have no content types defined in saasy.config.json");
        }
    }

    // Name our plugin
    Saasy.prototype.name = 'saasy';

    // Access our docpad configuration from within our plugin
    Saasy.prototype.docpadReady = function(opts) {
      config = opts.docpad.config;
      config.contentTypes = getContentTypes();
    }

    // Inject our CMS front end to the server 'out' files
    Saasy.prototype.renderDocument = function(opts, next) {
      var extension = opts.extension, 
          file = opts.file;

      function injectJs() {
         opts.content += saasyFileContents;//opts.content.replace('</body>',  saasyFileContents + '</body>');
         return next(); // Move on to the next file 
      }
      
      // Only inject our CMS javascript into Layouts
      if (file.type === 'document' && file.attributes.isLayout) {
        // If we've previously read our saasy cms file then just inject the contents right away
        if (saasyFileContents) {
          injectJs();
        }
        // Read the contents of our Saasy CMS javascript file
        fs.readFile(__dirname + '/saasy.js', function (err, data) {
          if (err) {
            next();
            return console.log(err);
          }
          var cssData = fs.readFileSync(__dirname + '/saasy.css'),
              markup = fs.readFileSync(__dirname + '/saasy.html');
          // Build our JS file contents and inject them into the page markup
          saasyFileContents = '<style data-owner="saasy" type="text/css">' + cssData + '</style>' + markup + '<script data-owner="saasy">var contentTypes=' + JSON.stringify(config.contentTypes) + ';\n' + data + '</script>';
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
        var format;
        if (req.body.type && req.body.url) {
          if (!fs.existsSync(config.documentsPaths + '/' + req.body.type)) {
            fs.mkdirSync(config.documentsPaths + '/' + req.body.type);
          }
          format = req.body.format || 'html';

          fs.writeFileSync(config.documentsPaths + '/' + req.body.type + '/' + req.body.url + '.' + format +'.md', str);
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
      function save() {
         if(fileWriter(fileBuilder(req), req)) {
          return res.send(success);
        }
        return res.send(fail);
      
      }

      server.post('/saasy', function (req, res) {
        save();
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
        save(); 
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
