var notes = {};
var dragged = {};
var z = 0;
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
		    notes[resp[index].id] = null;
		    tmp[resp[index].id] = resp[index];
		});
	    for ( var d in notes ) {
	    	if ( notes[d] != null )
	    	    $( "#" + notes[d].id ).remove();
	    }
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

    saveNote ( note, true, function ( resp ) {
	document.removeEventListener( "mousemove", dragging, true );
	document.removeEventListener( "mouseup", stopDrag, true );
	dragged = {};
    });

};

function closeSave ( e, obj ) {

    var el = e.currentTarget;
    $(el).attr({"contenteditable" : false});
    var note = obj.parents(".note");
    var id = note.attr('id');

    var subject = note.find(".noteHeader").children().html();
    var content = note.find(".noteContent").children().html();
    notes[id].subject = subject;
    notes[id].content = content;

    saveNote ( notes[id], true );
    
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
    if ( notes[note.id] ) {
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
    });
    s.bind( "keypress", function ( event ) {
	if (event.keyCode == 13 ) {
	    event.preventDefault();
	    event.stopPropagation();
	    return;
	}
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
    b.bind ( "blur", function(event) {
    	closeSave(event, $(this));
    });
    b.bind ( "dblclick", function( event ) {
	b.attr({"contenteditable" : true});
	b.focus();
    });
    b.html(note.content);
    c.append ( b );
    elm.append ( c );
    $("#noteArea").append ( elm );
    return b;
};

function dropDown ( el ) {

    var dr = $('<div />', {
	class : "menu",
    });

    dr.css ({ "width" : "100px",
	      "height" : "100px",
	      "position" : "absolute",
	      "left" : parseInt ( $(el).css("left") ) + parseInt ( $(el).css("width") ) + "px",
	      "top" : parseInt ( $(el).css("top") ) + "px",
	      "backgroundColor" : "#00FFFF",
	      "zIndex" : "1000",
	      "opacity" : "1",
	      "border-radius" : "5px"
	    });

    var link = $("<button />", {
	type : "submit"
    });
    link.text ( "Delete" );
    link.bind ( "click", function ( event ) {
	deleteNote ( $(el), dr );
    });
    dr.append ( link );
    var ss = $("<br />")
    dr.append ( ss );
    var link2 = $("<button />", {
	type : "submit"
    });
    link2.text ( "Change Color" );
    link2.bind ( "click", function ( event ) {
	colorNote ( $(el), dr, "rgb(0,255,0)" );
    });
    dr.append ( link2 );
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

function colorNote ( el, dd, color ) {
    var n = notes[el.attr( 'id' )];
    n.color = color;
    saveNote ( n, true, function ( resp ) {
	el.css({"backgroundColor" : color});
	dd.remove();
    });
}

function deleteNote ( el, dd ) {

    var n = notes[el.attr('id')];
    n.trash = 1;
    saveNote ( n, true, function ( resp ) {
	delete notes[ n.id ];
	dd.remove();
	el.remove();
    });

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
	      }
            });
};

$('#noteArea').bind('dblclick', function(event) {
	createNote(event)
});

$(window).unload(function(event){

    var n = JSON.parse(window.localStorage['notes_' + username]);
    var arr = [];
    for ( var a in n ) {
	arr.push ( n[a] );
    }
    arr = arr.sort ( function ( a, b ) {
	if ( a.z > b.z ) return 1;
	if ( a.z < b.z ) return -1;
	if ( a.z == b.z ) return 0;
    });
    for ( var i = 0; i < arr.length; i++ ) {
	arr[i].z = i;
	notes[arr[i].id].z = i;
    }
    var dict = JSON.stringify ( arr );
    $.ajax ({ "url" : "/notes",
	      "async" : false,
	      "type" : "PUT",
	      "data" : dict,
	      "success" : function ( resp ) {
		  if ( resp != "true" )
		      alert ( "failed to save!" );
	      }
            });
    dumpNotes();
});
