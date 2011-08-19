var notes = {};
var dragged = {};
var z = 0;
var colorsArr = [ "#F7977A", "#C5E3BF", "#C1F0F6",
		  "#FFF79A", "#FDC68A", "#d8bfd8" ];
var undoStack = new Array();
var redoStack = new Array();
var trash = {};
var online = window.navigator.onLine;

window.applicationCache.onerror=function( event ){
    event.preventDefault();
    event.stopPropagation();
    online = false;
};

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

$("#managemenu").height($(window).height() - $("#toolbar").height() - 30);
// the 30 is the padding on the menu*2. For some reason, it doesn't count that towards the height...

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

$('#undo').bind('click', function( event ) {
	undoAction()
});
$('#redo').bind('click', function( event ) {
	redoAction()
});

$("#manage").bind('click', function( event ){
    var el = $("#managemenu");
    if ( el.is(":hidden") ){
	for ( var a in trash ) {
	    var div = $("<div />",{
		class : "trash_item"
	    });
	    var ch = $("<input />", {
		type : "checkbox",
		class : "trash_checkbox"
	    });
	    div.append ( ch );
	    var sp = $("<span />", {
		class : "trash_content"
	    });
	    var subj = $("<div />", {
	    	class: "trash_subject"
	    });
	    var snippet = $("<div />");
	    var subject = trash[a].subject;
		if (subject != "") {
			subj.text(subject);
		} else {
			subj.html("&nbsp;");
		}
	    var content = trash[a].content;
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
	el.slideDown( "slow" );
    } else {
	el.slideToggle( 'slow', function() {
	    el.html("");
	});
    }
});
