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
      if (generationLocation === -1) {
        return msg();
      }
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
      CKEDITOR.disableAutoInline = true;
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
          inputTypes = ['text', 'file', 'textarea', 'checkbox', 'datetime', 'date', 'email', 'url'],
          obj,
          myId,
          myName,
          html = '';

      function buildInput(type, id, name) {
          var pattern = '';
          var hiddenID = '';
          if(typeof type === 'object') {
            console.log(type);
            name = type.validationType || name;
            pattern = type.validationPattern || type.validation || type.pattern;
            if(pattern) {
                pattern = 'pattern="' + pattern + '"'
            } else {
                pattern = '';
            }
            if (type.primaryid) {
              hiddenID = '<input type="hidden" name="primaryid" value="' + name + '">';
            }
            type = type.type || 'text';
          }
          
          type = type.toLowerCase();
          if(type === 'media' || type === 'image' || type === 'video' || type === 'movie' || type === 'file') {
            type = 'file';
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
              return '<textarea required id="' + id + '" title="' + name + '" name="' + name + '" ' + pattern + '></textarea>' + hiddenID;
            default:
              return '<input required id="' + id + '" title="' + name + '" name="' + name + '" type="' + type + '" ' + pattern + '>' + hiddenID;
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

    var $editable = $('[contenteditable="false"]'), 
        $editPage = $('.edit-page'),
        $savePage = $('.save-page'),
        $exitEdit = $('.exit-edit');

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
                } else {
                    generationLocation = null;
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
        },

        enableInlineAll: function () {
          $editable.attr("contenteditable", "true");
          $editPage.hide();
          $savePage.show();
          $exitEdit.show();

          CKEDITOR.inlineAll();
        },

        // Save edited content
        saveAll: function () {
          // Transform the page, get rid of all the inline editing panels and stuffs
          $('.edit-page').show();
          $('.save-page').hide();
          $('.exit-edit').hide();
          for (name in CKEDITOR.instances){
            if (CKEDITOR.instances.hasOwnProperty(name))
              CKEDITOR.instances[name].destroy();
          }
          $('[contenteditable="true"]').attr("contenteditable", "false");

          // Grab file path from body, use REST api to update file
          var pageFilePath = $('body').data('filepath'),
              models = {},
              key,
              content,
              pageFileType;
          if ($('body').hasClass('saasy-document')) {
            pageFileType = 'document';
          } else if ($('body').hasClass('saasy-partial')) {
            pageFileType = 'partial';
          } else {
            // add other file type cases here
          }

          $('[contenteditable="false"]').each(function() {
            var filePath = pageFilePath,
              fileType = pageFileType,
              container = $(this).closest('.saasy-partial');

            if (container.length > 0) {
              filePath = container.data('filepath');
              fileType = 'partial';
            }

            if (typeof models[filePath] === 'undefined') {
              models[filePath] = { type: fileType };
            }

            key = $(this).data('key');
            content = $(this).html();

            // WARNING: Make the user aware that they should not use 'content' as a meta key!!
            if (key !== 'content') {
              models[filePath][key] = content;

            } else {
              models[filePath].content = content;
            }

          });

          msg('Saving...');
          generationLocation = -1; 
          $.ajax({
            url: '/saasy/edit',
            type: 'POST',
            data: models
          }).complete(function() {
            window.setTimeout(function () {
                msg('Generating Static Site...');
            }, 800);
          });

        },

        exitEdit: function () {
          $editPage.show();
          $savePage.hide();
          $exitEdit.hide();

          for (name in CKEDITOR.instances){
            if (CKEDITOR.instances.hasOwnProperty(name))
              CKEDITOR.instances[name].destroy();
          }

          $editable.attr("contenteditable", "false");
        }
    };
    
    }());

});

