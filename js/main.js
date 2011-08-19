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

    if ( dragged.el.style.zIndex < z )
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

    var act = new Action();

    var note = notes[dragged.el.id];
    act.setBefore ( note );

    if ( note == undefined ) {
    	alert ( "Note not found in array. You, sir, have a bug." );
    }

	var newX = parseInt( dragged.el.style.left );
	var newY = parseInt( dragged.el.style.top );
	var newZ = parseInt( dragged.el.style.zIndex );

    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

	if (note.x == newX && note.y == newY) { // If only the z-index has changed
		var overlap = false;
		for(var n in notes) {
			if ($("#" + note.id).overlaps("#" + notes[n].id)) { // Check if the note overlaps with any others
				if (note.z < notes[n].z) { // If it overlaps and it's not on top
					overlap = true;
				}
			}
		}
		if (!overlap) // If we didn't find any overlap, that means that there was no visual change - stop everything
			return;
	}

    note.x = newX;
    note.y = newY;
    note.z = newZ;

    act.setAfter ( note );
    act.push ( );

    var n = { "x" : note.x, "z" : note.z, "y" : note.y, "id" : note.id };

    if ( online )
	saveNote ( n, true );

};

function writeNote ( note, fade ) {

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
        'backgroundColor' : note.color
    });

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
    });
    s.bind( "dblclick", function ( event ) {
	if ( ! online ) return;
	s.attr({"contenteditable" : true});
	s.focus();
	$(document).bind ( "click", function( event ) {
	    if ( isEditable ( event.target ) ) return;
	    event.stopPropagation();
	    s.attr({"contenteditable" : false});
	    $(document).unbind( "click" );
    	    closeSave( event, s );
	});
    });
    s.html(note.subject);
    var o = $('<div />', {
    	class : "options"
    });
    o.bind( "click", function(event) {
	event.preventDefault();
	event.stopPropagation();
	dropDown( elm );
    });
    elm.append( o );
    elm.bind( "mouseover", function( event ) {
	o.css({"display":"inline"});
	elm.bind( "mouseout", function ( event ) {
	    o.css({"display":"none"});
	    elm.unbind( "mouseout" );
	});
    });
    h.append( s );
    elm.append( h );
    elm.append( $("<hr/>" ) );
    var c = $('<div />', {
    	class : 'noteContent'
    });
    var b = $('<blockquote />');
    b.bind ( "blur", function( event ) {
    	closeSave(event, b);
    	b.attr({"contenteditable" : false});
    });
    b.bind ( "dblclick", function( event ) {
	if ( ! online ) return;
	b.attr({"contenteditable" : true});
	b.focus();
	$(document).bind ( "click", function( event ) {
	    if ( isEditable ( event.target ) ) return;
	    event.stopPropagation();
	    b.attr({"contenteditable" : false});
	    $(document).unbind( "click" );
    	    closeSave( event, b );
	});
    });
    b.html(note.content);
    c.append ( b );
    elm.append ( c );
    $( "#" + note.id ).remove();
    if ( fade )
	elm.css({"display":"none"});
    $("#noteArea").append ( elm );
    if ( fade ) {
	elm.fadeIn( 350 );
    }
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
    var link = $("<a />", {
		class : "button",
    });
    link.css ({
    	"margin-left" : "auto",
    	"margin-right" : "auto",
    	"margin-top" : "10px",
    	"margin-bottom" : "10px",
    });
    link.text ( "Delete" );
    link.bind ( "click", function ( event ) {
	deleteNote ( el, dr );
	dr.remove();
    });
    dr.append ( link );

    for ( var i = 0; i < colorsArr.length; i++ ){
	var l = $("<div />", {
	    class : "colorSq"
	});
	var col = colorsArr[i];
	l.css({"backgroundColor" : col});
	l.bind( "mouseover", function ( event ) {
	    var df = $(event.currentTarget);
	    var big = $("<div />", {
		class: "bigSq"
	    });
	    var pos = df.position();
	    big.css ({ "top" : pos.top-3,
		       "left" : pos.left-3,
		       "background-color" : df.css("background-color")
		     });
	    big.bind( "mouseout", function ( event ) {
		big.remove();
	    });
	    big.bind ( "click", function ( event ) {
		colorNote ( el, event );
		dr.remove();
	    });
	    dr.append ( big );
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

function colorNote ( el, event ) {
    color = $(event.currentTarget).css("backgroundColor");
    var n = notes[el.attr( 'id' )];
    var act = new Action ();
    act.setBefore ( n );
    n.color = color;
    act.setAfter ( n );
    act.push ( );
    var note = { "id" : n.id, "color" : color };
    if ( online )
	saveNote ( note, true );
    el.css({"backgroundColor" : color});
};

function deleteNote ( el ) {

    var n = notes[el.attr('id')];
    var act = new Action();
    act.setBefore ( n );
    n.trash = 1;
    act.setAfter ( n );
    act.push ( );
    var note = { "id" : n.id };
    if ( online ) {
	$.ajax ({ "url" : "/notes",
	  "type" : "DELETE",
	  "data" : JSON.stringify ( [note] ),
	  "success" : function ( resp ) {
		dumpNotes();
	  },
	  "error" : function( resp ) {
		  alert(resp);
	  }
		});
	}
    delete notes[ n.id ];
    trash[n.id] = n;
    el.fadeOut ( 350, function () {
	el.remove();
    });

};

function Action (){

    this.b = null;
    this.a = null;

    this.setBefore = function ( before ) {
	this.b = jQuery.extend ( true, {}, before );
    }
    this.setAfter = function ( after ) {
	this.a = jQuery.extend ( true, {}, after );
    }
    this.push = function () {
	if ( ! compare ( this.a, this.b ) ) {
	    undoStack.push ( this );
	    redoStack = new Array ();
	}
    }

};

function undoAction () {

    if ( undoStack.length == 0 ) return;

    var act = undoStack.pop();

    if ( act.b != null ){

	writeNote ( act.b, false );
	notes[act.b.id] = act.b;
	delete trash[act.b.id];
	saveNote ( act.b, true );

    } else {

	deleteNote ( $(act.a.id) );

    }

    redoStack.push ( act );
};

function redoAction () {

    if ( redoStack.length == 0 ) return;

    var act = redoStack.pop();

    if ( act.a != null ) {

	writeNote ( act.a, false );
	notes[act.a.id] = act.a;
	delete trash[act.b.id];
	saveNote ( act.a, true )

    } else {
	console.log ( "hi" );
	deleteNote ( $(act.b.id) );

    }

    undoStack.push ( act );
};

$(document).bind("keypress", function( event ) {

    if ( event.ctrlKey ) {
	if ( event.keyCode == 26 ) {
	    undoAction();
	} else if ( event.keyCode == 25 ) {
	    redoAction();
	}
    }
});
