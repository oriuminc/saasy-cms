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
      throw 'You can\'t use Saasy without jQuery, please add it to your pages (for now, we\'ll deal with it later)...';
    }

    var $menuSlot = $('#saasy .menu-holder'),
      $formSlot = $('#saasy #ct-form');

    function init() {
      var key,
        html = '',
        html2 = '',
        $body = $('body'),
        $editableAreas = $body.find('[data-saasy-editable], [data-saasy-editable] *'),
        $everythingElse = $('*'),
        inlineOpenRegex = /{editable}/,
        inlineCloseRegex = /{\/editable}/,
        inlineRegex = /{editable}(.*){\/editable}/,
        inlineReplacement = '<div style=\'display:inline\' contenteditable=\'false\' />';
   
      function replaceContentHolders(elems, notEditable) {
          var $elems = elems.contents().filter(function () {
              return this.nodeType === Node.TEXT_NODE && this.data.match(inlineOpenRegex);
            }),
            len = $elems.length;
        while(len--) {
            if($elems[len].data.match(inlineRegex)) {
              $elems[len].data = $elems[len].data.replace(inlineRegex, '$1');
            } else {
              $elems[len].data = $elems[len].data.replace(inlineOpenRegex, '');
              $elems[len] = $($elems[len]);
              if(!notEditable) {
                $elems[len].add($elems[len].siblings()).wrapAll(inlineReplacement);
                return $elems[len].parent().parent().contents().filter(function() {
                    return this.nodeType === Node.TEXT_NODE; 
                }).first().remove();
              } 
              $elems[len].parent().contents().last().remove();
            }
        }
        if (!notEditable) {
          $elems.wrap(inlineReplacement);
        }
      }
      
      replaceContentHolders($editableAreas, false);
      replaceContentHolders($everythingElse, true);
      $body.show();

      for (key in $S.contentTypes) {
        if ($S.contentTypes.hasOwnProperty(key)) {
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
    var inputTypes = ['text', 'textarea', 'checkbox', 'datetime', 'date', 'email', 'url'];
    function buildForm(type, fileName) {
      var key,
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
  $('.edit-page').show();
  $('.save-page').hide();
  $('.exit-edit').hide();

  console.log(CKEDITOR.instances);
  if (CKEDITOR.instances) {
    for (name in CKEDITOR.instances){
      CKEDITOR.instances[name].destroy();
    }
  }
  $('[contenteditable="true"]').attr("contenteditable", "false");
}

// Exit edit mode (without saving)
function exitEdit() {
  $('.edit-page').show();
  $('.save-page').hide();
  $('.exit-edit').hide();

  if (CKEDITOR.instances) {
    for (name in CKEDITOR.instances){
      CKEDITOR.instances[name].destroy();
    }
  }
  $('[contenteditable="true"]').attr("contenteditable", "false");
}
