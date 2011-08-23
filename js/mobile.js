"use strict";

function startDrag( event ){

    var over = $("<div />", {
	"class" : "overlay"
    });
    $("body").append ( over );
    over.fadeIn( "fast" );
    over.bind( "click", function ( event ) {
	if ( event.currentTarget == event.target ) {
	    over.fadeOut( "fast" );
	}
    });

    writeMobile ( notes[event.currentTarget.id], over );

}

function compare ( note ) {

    var el = $( "#" + note.id );
    var pos =  el.position();
    if ( pos === null ) { return false; }
    if ( pos.left === 0 ) {
	if ( (pos.top-45) % 35 === 0 ) {
	    el.css({"zIndex" : mobZ++})
	    return true;
	}
    }
    return false;
	
}

var offset = 45;
var mobZ = 0;

function writeNote ( note, fade ) {

    if ( compare ( note ) ){ return; }

    var elm = $('<div />',  {
        "class" : "note",
        "id" : note.id
    });

    elm.css({
        'left' : 0,
        'top' : offset,
	"zIndex" : mobZ++,
        'backgroundColor' : note.color
    });

    offset += 35;

    elm.bind('click', function(event) {
        startDrag( event );
    });

    var h = $('<div />', {
        "class" : "noteHeader"
    });
    var s = $('<div />');
    s.html(note.subject);
    h.append( s );
    elm.append( h );
    elm.append( $("<hr/>" ) );
    var c = $('<div />', {
        "class" : 'noteContent'
    });
    var b = $('<blockquote />');
    b.html(note.content);
    c.append ( b );
    elm.append ( c );
    $( "#" + note.id ).remove();
    $("#noteArea").append ( elm );
}

function writeMobile ( note, over ) {

    var elm = $('<div />',  {
        "class" : "note",
        "id" : "displayed_note"
    });

    elm.css({
        'backgroundColor' : note.color,
	"margin" : "auto",
	"color" : "black",
	"top" : 45,
	"left" : 10
    });

    var h = $('<div />', {
        "class" : "noteHeader"
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
	if ( ! online ){ return; }
	s.attr({"contenteditable" : true});
	s.focus();
	$(document).bind ( "click", function( event ) {
            if ( isEditable ( event.target ) ){ return; }
            event.stopPropagation();
            //s.attr({"contenteditable" : false});
	    s.blur();
            $(document).unbind( "click" );
            //closeSave( event, s );
	});
    });
    s.html(note.subject);

    var o = $('<div />', {
        "class" : "options"
    });
    o.bind( "click", function(event) {
	unToggle();
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
        "class" : 'noteContent'
    });
    var b = $('<blockquote />');
    b.bind ( "blur", function( event ) {
        closeSave(event, b);
        b.attr({"contenteditable" : false});
    });
    b.bind ( "dblclick", function( event ) {
	if ( ! online ){ return; }
	b.attr({"contenteditable" : true});
	b.focus();
	$(document).bind ( "click", function( event ) {
            if ( isEditable ( event.target ) ){ return; }
            event.stopPropagation();
            b.attr({"contenteditable" : false});
            $(document).unbind( "click" );
            closeSave( event, b );
	});
    });
    b.html(note.content);

    c.append ( b );
    elm.append ( c );

    elm.css({"display":"none"});

    over.append ( elm );
    elm.fadeIn( 350 );

}

