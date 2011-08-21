if ( notes == undefined )
    var notes = {};
var dragged = {};
var z = 0;
var colorsArr = [ "#F7977A", "#C5E3BF", "#C1F0F6",
		  "#FFF79A", "#FDC68A", "#d8bfd8" ];
var undoStack = new Array();
var redoStack = new Array();
var current;
var trash = {};
try {
    if ( online == undefined ){
	var online = window.navigator.onLine;
	window.applicationCache.onerror=function( event ){
	    event.preventDefault();
	    event.stopPropagation();
	    online = false;
	};
    } else {
	online = false;
    }
}catch ( err ) {
    online = false;
}

if ( window.localStorage.getItem( "notes_" + username ) ){
    var arr = JSON.parse ( window.localStorage['notes_' + username] );
    for ( var a in arr ) {
	z = ( arr[a].z > z ) ? arr[a].z : z;
	writeNote( arr[a], false );
	notes[arr[a].id] = arr[a];
    }
}
if ( online ) {
    getNotes();
    getTrash();
}

function getSize( obj ) {
    var max = 0;
    for ( var i in obj ) {
	max++;
    }
    return max;
}

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
		    var new_Z = resp[index].z;
		    if ( !!notes[resp[index].id] ){
			notes[resp[index].id].z = new_Z;
			$("#" + resp[index].id).css('z-index', new_Z);
		    }
		    writeNote ( resp[index], false );
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

function getTrash () {
    $.ajax ({
	"url" : "/notes/trash",
	"async" : true,
	"type" : "GET",
	"dataType" : "json",
	"success" : function( resp ) {
	    trash = {};
	    $.each(resp, function(index) {
		trash[resp[index].id] = resp[index];
	    });
	    drawTrash();
	}
    });
};

function dumpNotes ( ){
    window.localStorage.setItem ( "notes_" + username, JSON.stringify ( notes ) );
};

function closeSave ( e, obj ) {

    var note = obj.parents(".note");
    var id = note.attr('id');

    var act = new Action ();
    act.setBefore( notes[id] );

    var subject = note.find(".noteHeader").children().html();
    var content = note.find(".noteContent").children().html();
    notes[id].subject = subject;
    notes[id].content = content;

    act.setAfter ( notes[id] );
    act.push();

    var n = { "subject" : subject, "content" : content, "id" : id }
    if( online )
	saveNote ( n, true );
};

function createNote( e ) {

    if ( ! online ) return;

    e.stopPropagation();
    e.preventDefault();

    if ( e.target != e.currentTarget ) return;

    var pos = $("#noteArea").position();

    var x = e.clientX + window.scrollX - pos.left;
    var y = e.clientY + window.scrollY - pos.top;

    content = "";
    $.ajax ({ "type" : "POST",
	     "async" : true,
	     "url" : "/notes",
	     "success" : function( resp ){
		 var note = JSON.parse ( resp );
		 var con = writeNote ( note, true );
		 notes[note.id] = note;
		 var act = new Action ();
		 act.setAfter ( note );
  		 act.push ();
		 dumpNotes();
		 con.attr({"contenteditable" : true});
		 con.focus();
	     },
	      "data" : {"x" : x, "y" : y, "z" : ++z}
    });
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
	$.ajax ({ "url" : "/notes/delete",
	  "type" : "PUT",
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
    drawTrash();
    el.fadeOut ( 350, function () {
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
	      },
	      "error" : function( resp ) {
	          alert(resp);
	      }
            });
};

$('#noteArea').bind('dblclick', function(event) {
    if ( online )
	createNote(event)
});

$("#check_all").bind ( "click", function (event){
    var s = $("#check_all").attr("checked");
    var el = $("#archived_content");
    if ( s == "checked" ){
	el.find(".trash_checkbox").attr({"checked":"checked"});
    } else {
	el.find(".trash_checkbox").removeAttr("checked");
    }
});

$("#archive_delete").bind( "click", function( event ){
    permDelete( $("#archived_content").find(":checked") );
});

$("#archive_restore").bind ( "click", function( event ){
    restoreTrash( $("#archived_content").find(":checked") );
});

$('#undo').bind('click', function( event ) {
	undoAction()
});
$('#redo').bind('click', function( event ) {
	redoAction()
});

$("#manage").bind('click', function( event ){
    var l = $("#managemenu");
    if ( l.is(":hidden") ){
	var el = $("#archived_content");
	$("#noteArea").bind("click", function( event ) {
	    if( event.target != el.get() ) {
		unToggle ( );
	    }
	});
	l.slideDown( "slow", function(){
	    $("#archived_content").css({"overflow-y" : "auto"});
	});
    } else {
	unToggle ( );
    }
});

function drawTrash() {
	var el = $("#archived_content");
	el.html("");
	for ( var a in trash ) {
	    var div = $("<div />",{
		class : "trash_item",
		id : trash[a].id
	    });
	    var ch = $("<input />", {
		type : "checkbox",
		class : "trash_checkbox",
		name : trash[a].id
	    });
	    div.append ( ch );
	    var sp = $("<span />", {
		class : "trash_content"
	    });
	    var subj = $("<div />", {
	    	class: "trash_subject"
	    });
	    var snippet = $("<div />");
	    var subject = trash[a].subject.replace(/<\/?[^>]+(>|$)/g, "");
	    if (subject != "") {
		subj.text(subject);
	    } else {
		subj.html("&nbsp;");
	    }
	    var content = trash[a].content.replace(/<\/?[^>]+(>|$)/g, "");
	    if (content != "") {
		snippet.text(content);
	    } else {
		snippet.html("&nbsp;");
	    }
	    sp.append(subj);
	    sp.append(snippet);
	    div.append ( sp );
	    el.append( div );
	}
	if ( getSize(trash) > 0 ) {
		$("#archive_delete").removeClass("disabled").addClass("enabled");
		$("#archive_restore").removeClass("disabled").addClass("enabled");
	} else {
		$("#archive_delete").removeClass("enabled").addClass("disabled");
		$("#archive_restore").removeClass("enabled").addClass("disabled");
	}
}

function restoreTrash( cs ) {

    var idArr = new Array();
    for( var a = 0; a < cs.length; a++) {
	idArr.push ( {"id" : cs[a].name} );
    	$("#" + cs[a].name).fadeOut();
    }
    if ( idArr.length < 1 ) return;
    var dict = JSON.stringify(idArr);
    $.ajax({
	"url" : "/notes/trash",
	"type" : "PUT",
	"data" : dict,
	"async" : true,
	"success" : function( resp ){
	    for( var a = 0; a < cs.length; a++) {
		writeNote( trash[cs[a].name] );
		notes[cs[a].name] = trash[cs[a].name];
		delete trash[cs[a].name];
		drawTrash();
		dumpNotes();
	    }
	    //unToggle( $("#managemenu") );
	},
	"error" : function( err ) {
	    console.log ( err );
	    alert ( err );
	}
    });

};

function permDelete( cs ){

    var idArr = new Array();
    for( var a = 0; a < cs.length; a++) {
	idArr.push ( {"id" : cs[a].name });
    }
    if ( idArr.length < 1 ) return;
    var dict = JSON.stringify(idArr);

    var c = confirm ( "Are you sure you wish to permanently delete these notes?" );
    if ( c ) {
	for (var a = 0; a < cs.length; a++) {
    	    $("#" + cs[a].name).fadeOut();
	}
	$.ajax({
	    "url" : "/notes/trash/delete",
	    "type" : "PUT",
	    "data" : dict,
	    "async" : true,
	    "success" : function( resp ){
		for( var a = 0; a < cs.length; a++) {
		    delete trash[cs[a].name];
		}
		drawTrash();
	    },
	    "error" : function( err ) {
		console.log ( err );
		alert ( err );
	    }
	});
    }
};

function unToggle( ) {
    $("#noteArea").unbind("click");
    $("#managemenu").slideToggle( 'fast', function() {
	$("#archived_content").css({"overflow-y" : "hidden"});
    });
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
    unToggle();

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

function compare ( note, note2 ) {
    if ( note2 == null ) return false;
    var nA = (note2 == undefined ) ? notes[note.id] : note2;
    if ( !!nA ) {
	if ( nA.z == note.z && nA.x == note.x && nA.y == note.y && nA.content == note.content &&
	     nA.subject == note.subject && nA.color == note.color && nA.trash == note.trash ) {
	    return true;
	}
    }
    return false;
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
	unToggle();
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
    var p = $("<div />");
    p.css({"margin-top" : "10px",
	   "margin-bottom" : "6px"});
    for ( var i = 0; i < colorsArr.length; i++ ){
	var l = $("<div />", {
	    class : "colorSq"
	});
	var col = colorsArr[i];
	l.css({"backgroundColor" : col});
	l.bind( "mouseover", function ( event ) {
	    if ( !! current )
		current.remove();
	    var df = $(event.currentTarget);
	    var big = $("<div />", {
		class: "bigSq"
	    });
	    current = big;
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
	p.append ( l );
    }
    dr.append( p );

    var link = $("<a />", {
	class : "button enabled",
    });
    link.css ({
    	"margin-left" : "auto",
    	"margin-right" : "auto",
    });
    link.text ( "Archive" );
    link.bind ( "click", function ( event ) {
	deleteNote ( el, dr );
	dr.remove();
    });
    dr.append ( link );

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
		$("#undo").removeClass("disabled").addClass("enabled");
	    redoStack = new Array ();
	    $("#redo").removeClass("enabled").addClass("disabled");
	}
    }

};

function undoAction () {

    if ( undoStack.length == 0 ) return;

    var act = undoStack.pop();

    if ( undoStack.length == 0) {
		$("#undo").removeClass("enabled").addClass("disabled");
	}

    console.log ( act );

    if ( act.b != null ){

	writeNote ( act.b, false );
	notes[act.b.id] = act.b;
	delete trash[act.b.id];
	saveNote ( act.b, true );

    } else {

	deleteNote ( $(act.a.id) );

    }

    redoStack.push ( act );

	drawTrash();
    $("#redo").removeClass("disabled").addClass("enabled");
};

function redoAction () {

    if ( redoStack.length == 0 ) return;

    var act = redoStack.pop();

	if ( redoStack.length == 0) {
		$("#redo").removeClass("enabled").addClass("disabled");
	}

    console.log ( act );

    if ( act.a != null ) {

	writeNote ( act.a, false );
	notes[act.a.id] = act.a;
	delete trash[act.b.id];
	saveNote ( act.a, true )

    } else {

	writeNote ( trash[act.b.id], false );
	notes[act.b.id] = trash[act.b.id];
	delete trash[act.b.id];
	drawTrash();
	saveNote( notes[act.b.id], true );

    }

    undoStack.push ( act );

    $("#undo").removeClass("disabled").addClass("enabled");
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
