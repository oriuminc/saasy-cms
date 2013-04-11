/*globals $S, window, alert, console*/
/*jslint plusplus: true*/

$S.API = (function ($) {
    'use strict';
    if (typeof $ === 'undefined') {
        throw 'You can\'t use Saasy without jQuery';
    }

    var $menuSlot = $('#saasy .menu-holder');
    var $formSlot = $('#saasy #ct-form');

    function init () {
        var key,
            html = '';
        for (key in $S.contentTypes) {
            if ($S.contentTypes.hasOwnProperty(key)) {
                html += '<a href=\'javascript:$S.API.createForm($S.contentTypes[' + key + '])\'>' + $S.contentTypes[key].name + '</a>';
            }
        }
        $menuSlot.html(html);


        $formSlot.on( "submit", function( event ) {
          event.preventDefault();
          $S.API.create($(this).serialize());
        });

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

                // TODO: Eventually this data needs to be read from a merge of the global fields
                // and the content type fields as they are the canonical source. 
                result.meta.content = result.content;
                
                for (key in result.meta) {
                    if (result.meta.hasOwnProperty(key)) {
                        $('#saasy-form-' + key).attr('value', result.meta[key]);
                    }
                }
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

        if (fileName) {
            loadData();
        }
        html += '<label for="saasy-form-layout">Layout</label><input id="saasy-form-layout" type="text" name="layout" value="' + type.layout + '">';
        html += '<input type="hidden" name="type" value="' + type.type + '">';
        html += '<input type="submit" value="Submit">';
        
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
        create: function(data) {
            $.ajax({
                url: '/saasy/',
                type: 'POST',
                data: data
            }).done(function (result) {
                console.log(result);
            });
        },
        delete: function () {
        },
        rename: function () {
        },
        curate: function () {
        }
    };
}(window.$));
