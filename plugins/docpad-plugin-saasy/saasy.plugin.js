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
      fs = require('fs');

  return Saasy = (function(_super) {

    __extends(Saasy, _super);

    function Saasy() {
      return Saasy.__super__.constructor.apply(this, arguments);
    }

    Saasy.prototype.name = 'saasy';

    Saasy.prototype.renderDocument = function(opts, next) {
      var extension = opts.extension, 
          file = opts.file, 
          index = opts.content.indexOf('</body>'),
          injectJs = function () {
            if(index > -1) {
              // Add the jsFileContents before the body tag
              opts.content = opts.content.replace('</body>',  jsFileContents + '</body>');
            } else {
              // Just inject the jsFileContents to the end of the layout
              opts.content += jsFileContents;
            }
            return next(); // Move on to the next file 
          };
      
      // Only inject our CMS javascript into Layouts
      if (file.type === 'document' && file.attributes.isLayout) {
        if (jsFileContents) {
          injectJs();
        }

        // Read the contents of our Saasy CMS javascript file
        return fs.readFile(__dirname + '/src/saasy.js', function (err, data) {
          if (err) {
            next(); // Ensure we move on to the next file
            return console.log(err);
          }

          jsFileContents = '<script data-owner="saasy">' + data + '</script>';
          injectJs();
        });
      } 

      next(); // Move on to the next file 
    }

    return Saasy;

  })(BasePlugin);

};