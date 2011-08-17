var notes = {};
var dragged = {};
var z = 0;
var colorsArr = [ "#FF5555", "#92CCA6", "#C1F0F6", 
		  "#FFF046", "#FDC68A", "#FF00FF" ];
if ( window.localStorage.getItem( "notes_" + username ) ){
    var arr = JSON.parse ( window.localStorage['notes_' + username] );
    for ( var a in arr ) {
	writeNote( arr[a] );
	notes[arr[a].id] = arr[a];
    }
}

getNotes();

function getNotes () {
    $.ajax ({
	"url" : "/notes",
	"async" : true,
	"type" : "GET",
	"dataType" : "json",
	"success" : function( resp ) {
	    var tmp = {};
		$.each(resp, function(index) {
		    z = ( resp[index].z > z ) ? resp[index].z : z;
		    writeNote ( resp[index] );
		    delete notes[resp[index].id];
		    tmp[resp[index].id] = resp[index];
		});
	    for ( var d in notes )
	    	    $( "#" + notes[d].id ).remove();
	    notes = tmp;
	    dumpNotes();
	}
    });
};

function dumpNotes ( ){
    window.localStorage.setItem ( "notes_" + username, JSON.stringify ( notes ) );
};

function isEditable ( l ) {
    while ( l != null && l.nodeName != "BODY" ) {
	if ( $(l).attr('contenteditable') == "true" )
	    return true;
	l = l.parentNode;
    }
    return false;
};

function startDrag ( e ) {

    var el = e.currentTarget;

    if ( e.button != 0 || isEditable ( e.target ) ) return;

    e.stopPropagation();
    e.preventDefault();

    dragged.el = el;

    dragged.el.style.zIndex = ++z;

    dragged.x = e.clientX + window.scrollX;
    dragged.y = e.clientY + window.scrollY;
    dragged.sx = parseInt( el.style.left );
    dragged.sy = parseInt( el.style.top );

    document.addEventListener( "mousemove", dragging, true );
    document.addEventListener( "mouseup", stopDrag, true );
};

function dragging ( e ) {

    e.stopPropagation();
    e.preventDefault();

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;

    dragged.el.style.left = (dragged.sx + x - dragged.x) + "px";
    dragged.el.style.top = (dragged.sy + y - dragged.y) + "px";

};

function stopDrag ( e ) {

    e.stopPropagation();
    e.preventDefault();

    var note = notes[dragged.el.id];
    if ( note == undefined ) alert ( "Note not found in array. You, sir, have a bug." );
    note.x = parseInt( dragged.el.style.left );
    note.y = parseInt( dragged.el.style.top );
    note.z = parseInt( dragged.el.style.zIndex );

    var n = { "x" : note.x, "z" : note.z, "y" : note.y, "id" : note.id };

    saveNote ( n, true );
    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

};

function closeSave ( e, obj ) {

    var note = obj.parents(".note");
    var id = note.attr('id');

    var subject = note.find(".noteHeader").children().html();
    var content = note.find(".noteContent").children().html();
    notes[id].subject = subject;
    notes[id].content = content;

    var n = { "subject" : subject, "content" : content, "id" : id }

    saveNote ( n, true );

};

function createNote( e ) {

    e.stopPropagation();
    e.preventDefault();

    if ( e.target != e.currentTarget ) return;

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;

    content = "";
    $.ajax ({ "type" : "POST",
	     "async" : true,
	     "url" : "/notes",
	     "success" : function( resp ){
		     var note = JSON.parse ( resp );
		     var con = writeNote ( note );
		     notes[note.id] = note;
		     dumpNotes();
		     con.attr({"contenteditable" : true});
		     con.focus();
	     },
	      "data" : {"x" : x, "y" : y, "z" : ++z}
    });
};

function compare ( note ) {
    var nA = notes[note.id];
    if ( !!nA ) {
	if ( nA.z == note.z && nA.x == note.x && nA.y == note.y && nA.content == note.content &&
	     nA.subject == note.subject && nA.color == note.color && nA.trash == note.trash ) {
	    return true;
	}
    }
    return false;
};

function writeNote ( note ) {

    if ( compare ( note ) )
	return;

    var elm = $('<div />',  {
    	class : "note",
    	id : note.id
    });
    elm.css({
    	'left' : note.x + 'px',
    	'top' : note.y + 'px',
	"zIndex" : note.z,
        'backgroundColor' : note.color});
    elm.bind('mousedown', function(event) {
    	startDrag(event);
    });

    var h = $('<div />', {
    	class : "noteHeader"
    });
    var s = $('<div />');
    s.bind("blur", function(event) {
    	closeSave(event, $(this));
	$(this).attr({"contenteditable" : false});
    });
    s.bind( "keypress", function ( event ) {
	if (event.keyCode == 13 ) {
	    event.preventDefault();
	    event.stopPropagation();
	    return;
	}
	closeSave(event, $(this));
    });
    s.bind( "dblclick", function ( event ) {
	s.attr({"contenteditable" : true});
	s.focus();
    });
    s.html(note.subject);
    var o = $('<div />', {
    	class : "options"
    });
    o.bind ( 'click', function(event) {
	event.preventDefault();
	event.stopPropagation();
	dropDown( elm );
    });
    o.text("^");
    h.append( s );
    elm.append( o );
    elm.append( h );
    elm.append( $("<hr/>" ) );
    var c = $('<div />', {
    	class : 'noteContent'
    });
    var b = $('<blockquote />');
    b.bind ( "keypress", function( event ) {
    	closeSave(event, $(this));
    });
    b.bind ( "blur", function( event ) {
    	closeSave(event, b);
	this.attr({"contenteditable" : false});
    });
    b.bind ( "dblclick", function( event ) {
	b.attr({"contenteditable" : true});
	b.focus();
    });
    b.html(note.content);
    c.append ( b );
    elm.append ( c );
    $( "#" + note.id ).remove();
    $("#noteArea").append ( elm );
    return b;
};

function dropDown ( el ) {

    var dr = $('<div />', {
	class : "menu",
    });

    var el = $(el);

    dr.css ({ 
	      "left" : parseInt ( el.css("left") ) + parseInt ( el.css("width") ) + "px",
	      "top" : parseInt ( el.css("top") ) + "px"
	    });

    var link = $("<button />", {
	type : "submit"
    });
    link.text ( "Delete" );
    link.bind ( "click", function ( event ) {
	deleteNote ( el, dr );
    });
    dr.append ( link );
    var ss = $("<br />")
    dr.append ( ss );
    var ss = $("<br />")
    dr.append ( ss );

    for ( var i = 0; i < colorsArr.length; i++ ){
	var l = $("<div />", {
	    class : "colorSq"
	});
	var col = colorsArr[i];
	l.css({"backgroundColor" : col});
	l.bind ( "click", function ( event ) {
	    colorNote ( el, dr, event );
	});
	dr.append ( l );
    }
    $("#noteArea").bind ( "click", function ( event ) {
	$("#noteArea").unbind ( "click" );
	dr.remove();
    });
    dr.bind ( "click", function ( event ) {
	event.preventDefault();
	event.stopPropagation();
    });
    $("#noteArea").append ( dr );
};

function colorNote ( el, dd, event ) {
    color = $(event.currentTarget).css("backgroundColor");
    var n = notes[el.attr( 'id' )];
    n.color = color;
    var note = { "id" : n.id, "color" : color };
    saveNote ( note, true );
    el.css({"backgroundColor" : color});
    dd.remove();
}

function deleteNote ( el, dd ) {

    var n = notes[el.attr('id')];
    n.trash = 1;
    var note = { "id" : n.id, "trash" : n.trash };
    saveNote ( note, true );
    delete notes[ n.id ];
    dd.remove();
    el.remove();

};

function saveNote ( note, sync, fn ) {

    var dict = JSON.stringify ( [note] );

    $.ajax ({ "url" : "/notes",
	      "async" : sync,
	      "type" : "PUT",
	      "data" : dict,
	      "success" : function ( resp ) {
		  if ( fn != undefined )
		      fn ( resp );
		  dumpNotes();
	      },
	      "error" : function( resp ) {
	      	alert(resp);
	      }
            });
};

$('#noteArea').bind('dblclick', function(event) {
	createNote(event)
});

// $(window).unload(function(event){

//     var n = JSON.parse(window.localStorage['notes_' + username]);
//     var arr = [];
//     for ( var a in n ) {
// 	arr.push ( {"id" : n[a].id, "z" : n[a].z });
//     }
//     arr = arr.sort ( function ( a, b ) {
// 	if ( a.z > b.z ) return 1;
// 	if ( a.z < b.z ) return -1;
// 	if ( a.z == b.z ) return 0;
//     });
//     for ( var i = 0; i < arr.length; i++ ) {
// 	arr[i].z = i;
// 	notes[arr[i].id].z = i;
//     }
//     var dict = JSON.stringify ( arr );
//     // $.ajax ({ "url" : "/notes",
//     // 	      "async" : false,
//     // 	      "type" : "PUT",
//     // 	      "data" : dict,
//     // 	      "success" : function ( resp ) {
//     // 		  if ( resp != "true" )
//     // 		      alert ( "failed to save!" );
//     // 	      }
//     //         });
//     dumpNotes();
// });
