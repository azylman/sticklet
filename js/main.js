var notes = new Object ();
var dragged = {};
var z = 0;
(function(){
    z = 0;
    for ( var a in notes ) {
	z = (notes[a].z > z) ? notes[a].z : z;
    }
})(z);
if ( window.localStorage.getItem( "notes_" + username ) ){
    var arr = JSON.parse ( window.localStorage['notes_' + username] );
    for ( var a in arr ) {
	z = ( arr[a].z > z ) ? arr[a].z : z;
	writeNote ( arr[a] );
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
	    var tmp = new Object ();
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
	    window.localStorage.setItem ( "notes_" + username, JSON.stringify( resp ) );
	}
    });
};

function dumpNotes ( ){
    var arr = new Array();
    for ( var a in notes ) {
	arr.push ( notes[a] );
    }
    window.localStorage.setItem ( "notes_" + username, JSON.stringify ( arr ) );
    //return arr;
};

function isChild ( l, str ) {
    while ( l != null && l.tagName.toUpperCase() != str.toUpperCase() && l.nodeName != "BODY" )
	l = l.parentNode;
    if ( l.tagName.toUpperCase() == str.toUpperCase() ) {
	return $(l).attr("contenteditable") == "true";
    }
    return false;
};

function startDrag ( e ) {

    var el = e.currentTarget;
    if ( e.button != 0 ) return;
    //fix this
    if ( isChild ( e.target, "DIV" ) || isChild ( e.target, "BLOCKQUOTE" ) ) {
	return;
    }
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
    $.ajax ({ "url" : "/notes/" + dragged.el.id,
    	     "async" : true,
    	     "type" : "PUT",
    	     "data" : {"x" : parseInt( dragged.el.style.left ),
    	     	       "y" : parseInt ( dragged.el.style.top ),
    	     	       "z" : parseInt ( dragged.el.style.zIndex )}
    	   });

    notes[dragged.el.id].x = parseInt( dragged.el.style.left );
    notes[dragged.el.id].y = parseInt( dragged.el.style.top );
    notes[dragged.el.id].z = parseInt( dragged.el.style.zIndex );
    dumpNotes();

    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

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

    $.ajax ({ "url" : "/notes/" + id,
    	      "async" : true,
    	      "type" : "PUT",
    	      "data" : {"content" : content,
    	     		"subject" : subject },
    	      "success" : function() {
    	     	  dumpNotes();
    	      }
    	    });

};

function submitNote (x, y, content) {
    if ( content == undefined || content == null ) content = "";
    $.ajax ({ "type" : "POST",
	     "async" : true,
	     "url" : "/notes",
	     "success" : function( resp ){
		     var note = JSON.parse ( resp );
		     writeNote ( note );
		     notes[note.id] = note;
		     dumpNotes();
	     },
	     "data" : {"content" : content, "x" : x, "y" : y}
    });

};

function createNote( e ) {

    e.stopPropagation();
    e.preventDefault();

    if ( e.target != e.currentTarget ) return;

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;

    submitNote ( x, y );

};

function writeNote ( note ) {
    // TODO(alex): compare the objects and only remove them if they're different
    var no = $( "#" + note.id );
    if ( no ){
	//still need to check content and subject.  Is there a more jquery-y way to do this?
	if ( no.css("left") != note.x || no.css("top") != note.y ||
	     no.css("zIndex") != note.z ){
	    $('#' + note.id).remove();
	} else {
	    return;
	}
    }
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
	dropDown( event.currentTarget.parentNode );
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
    //b.attr({"contenteditable" : true});
    b.bind ( "dblclick", function( event ) {
	b.attr({"contenteditable" : true});
	b.focus();
    });
    b.html(note.content);
    c.append ( b );
    elm.append ( c );
    $("#noteArea").append ( elm );
};

function dropDown ( el ) {

    var dr = $('<div />', {
	class : "menu",
    });

    dr.css ({ "width" : "200px",
	      "height" : "200px",
	      "position" : "absolute",
	      "left" : parseInt ( $(el).css("left") ) + parseInt ( $(el).css("width") ) + "px",
	      "top" : parseInt ( $(el).css("top") ) + "px",
	      "backgroundColor" : "#00FFFF",
	      "zIndex" : "1000",
	      "opacity" : ".82",
	      "border-radius" : "8px"
	    });

    var link = $("<button />", {
	type : "submit"
    });
    link.text ( "Delete" );
    link.bind ( "click", function ( event ) {
	deleteNote ( $(el), dr );
    });
    dr.append ( link );

    var link2 = $("<button />", {
	type : "submit"
    });
    link2.text ( "Change Color" );
    link2.bind ( "click", function ( event ) {
	colorNote ( $(el), dr );
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

function colorNote ( el, dd ) {
    $.ajax ({ "url" : "/notes/" + el.attr('id'),
    	      "async" : true,
    	      "type" : "PUT",
    	      "data" : {"color" : "#00FF00"},
    	      "success" : function() {
		  notes[el.attr('id')].color = "#00FF00";
		  dumpNotes();
		  el.css({"backgroundColor" : "#00FF00"});
		  dd.remove();
    	      }
    	    });
}

function deleteNote ( el, dd ) {

    $.ajax ({ "url" : "/notes/" + el.attr('id'),
    	      "async" : true,
    	      "type" : "PUT",
    	      "data" : {"trash" : 1},
    	      "success" : function() {
		  delete notes[el.attr('id')];
		  dumpNotes();
		  dd.remove();
		  el.remove();
    	      }
    	    });

};

$('#noteArea').bind('dblclick', function(event) {
	createNote(event)
});
