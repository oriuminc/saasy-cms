/*globals window, alert, console*/
/*jslint plusplus: true*/
var $S = {};

$S = (function ($, types, undefined) {
    'use strict';
     
    if (typeof $ === 'undefined') {
        throw "You can't use Saasy without jQuery";
    }
    
    var $formSlot = $('.saasy .form-holder');

    function buildForm(type, fileName) {
        var key,
            obj,
            innerKey,
            myId,
            html = '';
        function buildInput(type, id) {
            return '<input id="' + id + '" type="' + type + '">';
        }
        function loadData() {
            $.ajax({
                url: '/saasy/document/' + fileName
            }).done(function (obj) {
                var key;
                obj.meta.Content = obj.content;
                for (key in obj.meta) {
                    if (obj.meta.hasOwnProperty(key)) {
                        $('#Saasy-' + key).attr('value', obj.meta[key]);
                    }
                }
            });
        }

        type.fields.splice(0, 0, {Content: 'textarea'});
        for (key in type.fields) {
            if (type.fields.hasOwnProperty(key)) {
                obj = type.fields[key];
                innerKey = Object.keys(obj)[0];
                myId = 'Saasy-' + innerKey;
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


/*
$S.save('blog', {title: 'my title', content: 'my content'}, function (err) {
    if(err) {
        return alert("YOU SUCK");
    }
    ..
});*/
