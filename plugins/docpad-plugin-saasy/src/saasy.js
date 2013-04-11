/*globals $S, window, alert, console*/
/*jslint plusplus: true*/

$S.API = (function ($, types) {
    'use strict';
    if (typeof $ === 'undefined') {
        throw 'You can\'t use Saasy without jQuery';
    }

    var $formSlot = $('#saasy .form-holder');

    function buildForm(type, fileName) {
        var key,
            obj,
            innerKey,
            myId,
            html = '';
        function buildInput(type, id) {
            switch (type) {
            case 'textarea':
                return '<textarea id="' + id + '"></textarea>';
            case 'image':
                return '<input id="' + id + '" type="file">';
            default:
                return '<input id="' + id + '" type="' + type + '">';
            }
        }

        function loadData() {
            $.ajax({
                url: '/saasy/document/' + fileName
            }).done(function (result) {
                var key;
                result.meta.Content = result.content;
                for (key in result.meta) {
                    if (result.meta.hasOwnProperty(key)) {
                        $('#saasy-form-' + key).attr('value', result.meta[key]);
                    }
                }
            });
        }

        //Add Content implicitely to all datatypes
        if (type.fields.length && Object.keys(type.fields[0])[0] !== ('Content')) {
            type.fields.splice(0, 0, {Content: 'textarea'});
        }

        for (key in type.fields) {
            if (type.fields.hasOwnProperty(key)) {
                obj = type.fields[key];
                innerKey = Object.keys(obj)[0];
                myId = 'saasy-form-' + innerKey;
                html += '<label for="' + myId + '">' + innerKey + '</label>' + buildInput(type.fields[key][innerKey], myId);
            }
        }

        if (fileName) {
            loadData();
        }
        
        return html;
    }

    return {
        create: function (type) {
            $formSlot.html(buildForm(type));
        },
        edit: function (type, fileName) {
            $formSlot.html(buildForm(type, fileName));
        },
        delete: function () {
        },
        rename: function () {
        },
        curate: function () {
        }
    };
}(window.$, window.contentTypes || {}));
