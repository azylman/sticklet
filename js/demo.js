for ( var a in window.localStorage ) {
    if ( /^notes_.*/.test ( a ) ) {
	window.localStorage.removeItem ( a );
    }
}

var note = { "id" : "demo_note", "x" : 600, "y" : 370, "z" : 100,
         "subject" : "Click Subject here", "content" : "Click Content here" };
var online = false;
var notes = {};
notes[note.id] = note;
window.localStorage.setItem ( "notes_demo", JSON.stringify(notes) );
username = "demo";

$(document).ready(function(){

    var el = $("#demo_note");
    var s = el.children(".noteHeader").children("div");
    var c = el.children(".noteContent").children("blockquote");
    s.bind("dblclick", function( event ) {
    s.attr({"contenteditable" : true});
    s.focus();
    $(document).bind("click", function ( event ) {
        if ( isEditable ( s.get() ) ) return
        s.attr({"contenteditable" : false});
        $(document).unbind("click");
    });
    });
    s.bind("blur", function( event ) {
    s.attr({"contenteditable" : false});
    s.focus();
    });

    c.bind("dblclick", function ( event ) {
    c.attr({"contenteditable":true});
    c.focus();
    $(document).bind("click", function ( event ) {
        if ( isEditable ( c.get() ) ) return
        c.attr({"contenteditable" : false});
        $(document).unbind("click");
    });
    });
    c.bind("blur", function( event ) {
    c.attr({"contenteditable" : false});
    });

});
