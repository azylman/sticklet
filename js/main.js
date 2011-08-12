var notes = new Object ();
var dragged = {};
var z = 0;

if ( window.localStorage.getItem( "notes_" + username ) ){
    var arr = JSON.parse ( window.localStorage['notes_' + username] );
    for ( var a in arr ) {
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
};

function startDrag ( e ) {

    var el = e.currentTarget;
    if ( e.target.tagName == "TEXTAREA" ) return;
    if ( e.button != 0 ) return;
    e.stopPropagation();
    e.preventDefault();
    dragged.el = el;

    el.style.zIndex = ++z;

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

function editText ( e, obj ) {
    e.stopPropagation();
    e.preventDefault();

    var el = obj;
    var tx = $("<textarea />");
    tx.css({
    	"background-color" : el.css('background-color'),
    	"border-style" : "none",
    	"border-color" : "transparent",
    	"overflow" : "auto"});

	tx.width(el.width());
	tx.height(el.height());
	tx.text(el.text());

    el.replaceWith(tx);
	tx.bind('mouseout', function(event) {
		closeSave(event, tx);
	});
    tx.focus();
};

function closeSave ( e, obj ) {

    //fix this-> right now it only works for content. Same in notes.py.
    //forgot about subject when I made this.

    var el = e.currentTarget;
    var note = obj.parents(".note");
    obj.unbind("mouseout");
    obj.unbind("blur");

    var edd = $( "<blockquote />" );
    edd.text(obj.val());
    edd.bind('dblclick', function(event) {
    	editText(event, $(this));
    });
    var id = note.attr('id');
    obj.replaceWith(edd);

    var subject = note.find(".noteHeader").children().text();
    var content = note.find(".noteContent").children().text();
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
        'backgroundColor' : note.color});
    elm.bind('mousedown', function(event) {
    	startDrag(event);
    });

    var h = $('<div />', {
    	class : "noteHeader"
    });
    //h.css({'border-bottom' : '2px solid black'});
    var s = $('<span />');
    s.bind("dblclick", function(event) {
    	editText(event, $(this));
    });
    s.text(note.subject);
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
    b.bind ( "dblclick", function(event) {
    	editText(event, $(this));
    });
    b.text(note.content);
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
	      "backgroundColor" : "red",
	      "zIndex" : "1000"
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
