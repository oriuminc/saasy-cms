/*globals window, alert*/
/*jslint plusplus: true*/
var $S = (function (types) {
    'use strict';
    var id = 0;
    function loadData(fileName) {
    }

    return {
        buildForm: function (type, fileName) {
            var key,
                myId,
                obj,
                innerKey,
                html = '';
            function buildInput(type, id) {
                return '<input id="' + id + '" type="' + type + '">';
            }
            type.fields.splice(0, 0, {Content: 'textarea'});
            for (key in type.fields) {
                if (type.fields.hasOwnProperty(key)) {
                    myId = 'id_' + id++;
                    obj = type.fields[key];
                    innerKey = Object.keys(obj)[0];
                    html += '<label for="' +  myId + '">' + innerKey + '</label>' + buildInput(type.fields[key][innerKey], myId);
                }
            }

            if (fileName) {
                loadData(fileName);
            }
            return html;
        }
    };
}(window.contentTypes || {}));


/*
$S.save('blog', {title: 'my title', content: 'my content'}, function (err) {
    if(err) {
        return alert("YOU SUCK");
    }
    ..
});*/
