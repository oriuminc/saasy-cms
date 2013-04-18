/*globals $, $S, window, document, alert, console*/
/*jslint plusplus: true*/

document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    var generationLocation,
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
                html2 = '';

            for (key in $S.contentTypes) {
                if ($S.contentTypes.hasOwnProperty(key)) {
                    html += '<a href=\'javascript:$S.API.createForm($S.contentTypes[' + key + '])\'>Form ' + $S.contentTypes[key].name + '</a>';
                    html2 += '<a href=\'javascript:$S.API.createInline($S.contentTypes[' + key + '])\'>Inline ' + $S.contentTypes[key].name + '</a>';
                }
            }
        
            $menuSlot.html(html + '<br>' + html2);

            $formSlot.on('submit', function (event) {
                event.preventDefault();
                $S.API.create($(this).serialize());
            });

            msg();
        }

        function buildForm(type, fileName) {
            var key,
                obj,
                innerKey,
                myId,
                myName,
                html = '';

            function buildInput(type, id, name) {
                switch (type) {
                case 'textarea':
                    return '<textarea id="' + id + '" name="' + name + '"></textarea>';
                case 'image':
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
                    result.meta.Content = result.Content;
                });
            }

            for (key in $S.globalFields) {
                if ($S.globalFields.hasOwnProperty(key)) {
                    obj = $S.globalFields[key];
                    myId = 'saasy-form-' + key;
                    html += '<label for="' + myId + '">' + key + '</label>' + buildInput($S.globalFields[key], myId, key);
                }
            }

            for (key in type.fields) {
                if (type.fields.hasOwnProperty(key)) {
                    obj = type.fields[key];
                    innerKey = Object.keys(obj)[0];
                    myId = 'saasy-form-' + innerKey;
                    html += '<label for="' + myId + '">' + innerKey + '</label>' + buildInput(type.fields[key][innerKey], myId, innerKey);
                }
            }

            //lets leave the layout as a hidden field for now (ie one layout per content type)
            html += '<input type="hidden" name="layout" value="' + type.layout + '">';
            html += '<input type="hidden" name="type" value="' + type.type + '">';
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
                var data = 'Filename=new ' + type.name.toLowerCase() + '&type=' + type.type + '&Content=__loremIpsum&title=New ' + type.name + '&layout=' + type.type;
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
