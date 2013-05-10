/*globals $, $S, window, document, alert, console*/
/*jslint plusplus: true*/

document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var generationLocation,
      $slot = $('#saasy'),
      $msgSlot = $('#saasy .saasy-msg');

  function msg(str) {
    if (str) {
      $msgSlot.html(str).show();
    } else {
      $msgSlot.hide();
    }
  }

  $S.onGenerate = function () {
    if (generationLocation) {
      document.location.href = generationLocation;
    } else {
      document.location.reload();
    }
  };

  $S.API = (function () {
    if (typeof $ === 'undefined') {
      throw 'You can\'t use Saasy without jQuery, please add it to your pages (for now)...';
    }

    var $menuSlot = $('#saasy .menu-holder'),
        $formSlot = $('#saasy #ct-form');

    function init() {
        var key,
            html = '',
            html2 = '',
            $body = $('body');
 
          
      function replaceEscapedContentHolders($node) {
        var $elems = $('body *').contents().filter(function () {
                return this.nodeType === Node.TEXT_NODE && this.data.match(/class='saasy-wrap'/);
            }),
            len = $elems.length,
            wrap,
            item;
        while(len--) {
            wrap = $('<div>' + $elems[len].data + '</div>');
            $($elems[len]).replaceWith(wrap);
            item = wrap.find('div.saasy-wrap');
            item.text(item.html());
            wrap.contents().unwrap();
        }
      }
      
      replaceEscapedContentHolders();
      $body.show();

      for (key in $S.contentTypes) {
        if ($S.contentTypes.hasOwnProperty(key) && !$S.contentTypes.partial) {
          html += '<a href=\'javascript:$S.API.createForm($S.contentTypes[' + key + '])\'>Form ' + $S.contentTypes[key].name + '</a>';
          if($S.contentTypes[key].layout && $S.contentTypes[key].layout.length) {
            html2 += '<a href=\'javascript:$S.API.createInline($S.contentTypes[' + key + '])\'>Inline ' + $S.contentTypes[key].name + '</a>';
          }
        }
      }
    
      $menuSlot.html(html + '<br>' + html2);
      $formSlot.on('submit', function (event) {
        event.preventDefault();
        $S.API.create($(this).serialize());
      });
    }

    function isCompoundType(type) {
        var len = $S.contentTypes.length;
        while(len--) {
            if($S.contentTypes[len].name.toLowerCase() === type.toLowerCase()) {
                return true;
            }    
        }

        return false;
    }
    
    function buildForm(type, fileName) {
      var key,
          inputTypes = ['text', 'textarea', 'checkbox', 'datetime', 'date', 'email', 'url'],
          obj,
          myId,
          myName,
          html = '';

      function buildInput(type, id, name) {
          type = type.toLowerCase();
          if(type === 'image' || type === 'video' || type === 'movie' || type === 'file') {
            type = 'media';
          }
          if(isCompoundType(type)) {
            return '<button>Choose</button>';
          }
          if(inputTypes.indexOf(type) === -1) {
            console.log("Saasy doesn't know how to draw an input of type=" + type + " - using type=text as default");
            type = 'text';
          }
          switch (type) {
            case 'textarea':
              return '<textarea id="' + id + '" name="' + name + '"></textarea>';
            case 'media':
              return '<input id="' + id + '" name="' + name + '" type="file">';
            default:
              return '<input id="' + id + '" name="' + name + '" type="' + type + '">';
          }
      }

      function loadData() {
          $.ajax({
              url: '/saasy/document/' + fileName
          }).done(function (result) {
              var key;
              for (key in result.meta) {
                  if (result.meta.hasOwnProperty(key)) {
                      $('#saasy-form-' + key).attr('value', result.meta[key]);
                  }
              }
              //Content isn't stored in the meta
              result.meta.content = result.content;
          });
      }

      for (key in $S.globalFields) {
          if ($S.globalFields.hasOwnProperty(key)) {
              obj = $S.globalFields[key];
              myId = 'saasy-form-' + key;
              html += '<label for="' + myId + '">' + key + '</label>' + buildInput(obj, myId, key);
          }
      }

      for (key in type.fields) {
          if (type.fields.hasOwnProperty(key)) {
              obj = type.fields[key];
              myId = 'saasy-form-' + key;
              html += '<label for="' + myId + '">' + key + '</label>' + buildInput(obj, myId, key);
          }
      }

      html += '<input type="hidden" name="type" value="' + type.type + '">';
      if (type.layout) {
          html += '<input type="hidden" name="layout" value="' + (Array.isArray(type.layout) ? type.layout[0] : type.layout) + '">';
      }
      html += '<input type="submit" value="Submit">';
      
      if (fileName) {
          loadData();
      }
    
      return html;
    }

    init();

    return {
        createForm: function (type) {
            $formSlot.html(buildForm(type));
        },
        editForm: function (type, fileName) {
            $formSlot.html(buildForm(type, fileName));
        },
        create: function (data, done) {
            msg('Creating Page...');
            $.ajax({
                url: '/saasy/',
                type: 'POST',
                data: data
            }).done(function (result) {
                window.setTimeout(function () {
                    msg('Generating Static Site...');
                }, 800);

                result = JSON.parse(result);
                if (result.fileName) {
                    generationLocation = result.fileName;
                }

                if (done) {
                    return done(result);
                }
            });
        },
        createInline: function (type) {
            var data = 'filename=new ' + type.name.toLowerCase() + '&type=' + type.type + '&content=__loremIpsum&title=New ' + type.name;
            if (type.layout) {
                data += '&layout=' + (Array.isArray(type.layout) ? type.layout[0] : type.layout);
            }
            this.create(data);
        },
        delete: function () {
        },
        rename: function () {
        },
        curate: function () {
        }
    };
    
    }());

});


/*
  Edit mode
*/
// Disable ckeditor automatic inline editing mode
CKEDITOR.disableAutoInline = true;

// Enable inline editing on current page
function enableInlineAll() {
  $('[contenteditable="false"]').attr("contenteditable", "true");
  $('.edit-page').hide();
  $('.save-page').show();
  $('.exit-edit').show();
  CKEDITOR.inlineAll();
}

// Save edited content
function saveAll() {
  // Transform the page, get rid of all the inline editing panels and stuffs
  $('.edit-page').show();
  $('.save-page').hide();
  $('.exit-edit').hide();
  for (name in CKEDITOR.instances){
    if (CKEDITOR.instances.hasOwnProperty(name))
      CKEDITOR.instances[name].destroy();
  }
  $('[contenteditable="true"]').attr("contenteditable", "false");

  // Grab file name from url, use REST api to update file
  var urlTokens = document.URL.split('/');
  var pageFileName = urlTokens.pop() + '.md';
  var pageFileType = urlTokens.pop();
  var models = {};
  // models format:
  // models = {
  //   filenameA: {
  //     type: 'type',
  //     meta: { ... },
  //     content: 'content'
  //   },
  //   filenameB: {
  //     ...
  //   }
  // }

  $('[contenteditable="false"]').each(function() {
    var fileName = pageFileName,
      fileType = pageFileType,
      container = $(this).closest('.saasy-partial');

    if (container.length > 0) {
      fileName = container.data('filename');
      fileType = container.data('type');
    }

    if (typeof models[fileName] === 'undefined') {
      models[fileName] = { type: fileType, meta: {} };
    }

    var key = $(this).data('key');
    var content = $(this).text();

    // WARNING: Make the user aware that they should not use 'content' as a meta key!!
    if (key !== 'content') {
      models[fileName].meta[key] = content;

    } else {
      models[fileName].content = content;
    }

  });

  // $.ajax({
  //   url: '/saasy/edit',
  //   type: 'POST',
  //   data: model
  // }).done(function (result) {
  //   if (result.fileName) {
  //     generationLocation = result.fileName;
  //   }

  //   if (done) {
  //     return done(result);
  //   }
  // });

}

// Exit edit mode (without saving)
function exitEdit() {
  $('.edit-page').show();
  $('.save-page').hide();
  $('.exit-edit').hide();

  for (name in CKEDITOR.instances){
    if (CKEDITOR.instances.hasOwnProperty(name))
      CKEDITOR.instances[name].destroy();
  }

  $('[contenteditable="true"]').attr("contenteditable", "false");
}
