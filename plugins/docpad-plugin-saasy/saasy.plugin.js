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

module.exports = function(BasePlugin) {
  var Saasy,
      fs = require('fs');

  return Saasy = (function(_super) {

    __extends(Saasy, _super);

    function Saasy() {
      return Saasy.__super__.constructor.apply(this, arguments);
    }

    Saasy.prototype.name = 'saasy';
    Saasy.prototype.renderDocument = function(opts, next) {

      var extension, file, index, jsFileContents;
      
      extension = opts.extension, file = opts.file;
      
      // Only inject our CMS javascript into Layouts
      if (file.type === 'document' && file.attributes.isLayout) {
        index = opts.content.indexOf('</body>');
        // Read the contents of our Saasy CMS javascript file
        fs.readFile(__dirname + '/src/saasy.js', function (err, data) {
          if (err) {
            next(); // Ensure we move on to the next file
            return console.log(err);
          }
          jsFileContents = '<script>' + data + '</script>';
          if(index > -1) {
            opts.content = opts.content.replace('</body>',  jsFileContents + '</body>');
          }
          else {
            opts.content += jsFileContents;
          }
          // Move on to the next file
          next();
        })
      }
    }

    return Saasy;

  })(BasePlugin);





};