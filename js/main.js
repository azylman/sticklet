/*
*   COPYRIGHT 2011 Vincent Dumas
*   COPYRIGHT 2011 Alex Zylman
*
*/
"use strict";

var notes = {};
var dragged = {};
var z = 0;
var undoStack = [];
var redoStack = [];
var current;
var trash = {};
var userAgent = navigator.userAgent.toLowerCase();
var t;

try {
    if ( online === undefined ){
	var online = navigator.onLine;
	applicationCache.onerror=function( event ){
	    event.preventDefault();
	    event.stopPropagation();
	    online = false;
	};
    } else {
	online = false;
    }
}catch ( err ) {
    var online = false;
}

function getSize( obj ) {
    var max = 0;
    for ( var i in obj ) {
	if ( obj.hasOwnProperty( i ) ){
	    max++;
	}
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
	    z = 0;
            $.each(resp, function(index) {
		z++;
		var new_Z = resp[index].z;
		if ( !!notes[resp[index].id] ){
		    notes[resp[index].id].z = new_Z;
		    $("#" + resp[index].id).css('z-index', new_Z);
		}
		writeNote ( resp[index], false );
		delete notes[resp[index].id];
		tmp[resp[index].id] = resp[index];
            });
	    getTrash();
            for ( var d in notes ){
		if ( notes.hasOwnProperty ( d ) ) {
		    $( "#" + notes[d].id ).remove();
		}
	    }
            notes = tmp;
            dumpNotes();
	},
	"error" : function ( resp ) {
	    if( resp.status == 401 ) {
		window.location = $("#logout").attr("href");
	    } 
	}
    });
}

function noteUpdate( event ){

    var snotes = JSON.parse( event.data );

    for( var i = 0; i < snotes.length; i++ ) {
	var note = snotes[i];

	if ( !! note.to_delete ) {
	    delete trash[note.to_delete];
	    $("#" + note.to_delete).remove();
	    drawTrash();
	} else if ( note == "error" ){ 
	    socket.close();
	    socket.disconnect_();
	    console.log ( channel );
	} else {
	    if ( note.z > z ) {
		note.z = z++;
	    }
	    if ( !! notes[note.id] ) {
		if ( note.trash == 1 ) {
		    delete notes[note.id];
		    trash[note.id] = note;
		    $("#" + note.id).remove();
		    drawTrash();
		} else {
		    if ( compare( note, notes[note.id] ) == 1 ) {
			return;
		    }
		    writeNote( note, false );
		    notes[note.id] = note;
		}
		dumpNotes();
	    } else if ( !! trash[note.id] ) {
		if ( note.trash == 0 ) {
		    delete trash[note.id];
		    $("#" + note.id).remove();
		    writeNote( note, false );
		    notes[note.id] = note;
		    dumpNotes();
		} else {
		    trash[note.id] = note;
		}
		drawTrash();
	    } else {
		writeNote( note, false );
		notes[note.id] = note;
		dumpNotes();
	    }
	}
    }
}

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
	    if ( getSize( notes ) == 0 && getSize( trash ) == 0 ) {
		var el = $("<div />", {
		    "id" : "double_click_help"
		});
		el.text("Double click anywhere to add note");
		var doc = $(document);
		$("#noteArea").append(el);
		doc.bind( "dblclick", function ( event ) {
		    doc.unbind("dblclick");
		    el.remove();
		});
	    }
	},
	"error" : function ( resp ) {
	    if( resp.status == 401 ) {
		window.location = $("#logout").attr("href");
	    }
	}
    });
}

function dumpNotes ( ){
    window.localStorage.setItem ( "notes_" + username, JSON.stringify ( notes ) );
}

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

    var n = { "subject" : subject, "content" : content, "id" : id };
    saveNote ( n, true );
}

function createNote( e ) {

    if ( ! online ){ return; }

    if ( e.target != e.currentTarget ){ return; }

    var pos = $("#noteArea").position();

    var x = e.clientX + window.scrollX - pos.left;
    var y = e.clientY + window.scrollY - pos.top;

    var content = "";
    $.ajax ({ "type" : "POST",
              "async" : true,
              "url" : "/notes",
              "success" : function( resp ){
		  var note = JSON.parse ( resp );
		  writeNote ( note, true );
		  notes[note.id] = note;
		  dumpNotes();
		  $("#" + note.id).find("blockquote").trigger("dblclick");
              },
	      "error" : function ( resp ) {
		  if( resp.status == 401 ) {
		      window.location = $("#logout").attr("href");
		  } else {
		      alert( "Failed to connect with server, if problem persists, contact the webmasters.");
		  }
	      },
              "data" : {"x" : x, "y" : y, "z" : ++z, "from" : token}
            });
}

function deleteNote ( el ) {

    var n = notes[el.attr('id')];
    var note = { "id" : n.id, "from" : token };
    if ( online ) {
	$.ajax ({ "url" : "/notes/delete",
		  "type" : "PUT",
		  "data" : JSON.stringify ( [note] ),
		  "success" : function ( resp ) {
		      dumpNotes();
		      $("#saved").slideDown("fast", function () {
			  clearTimeout( t );
			  t = setTimeout("$('#saved').slideUp('fast')", 2500);
		      });
		  },
		  "error" : function( resp ) {
		      if( resp.status == 401 ) {
			  window.location = $("#logout").attr("href");
		      } else {
			  $("#saved div").text( "Failed" );
			  $('#saved').addClass( "found" );
			  $("#saved").slideDown("fast", function () {
			      clearTimeout( t );
			      t = setTimeout("$('#saved').slideUp('fast', handleError )", 2500);
			  });
		      }
		  }
		});
    }
    delete notes[ n.id ];
    trash[n.id] = n;
    removeActions( n.id );
    el.fadeOut ( 350, function () {
	el.remove();
	drawTrash();
    });
}

function handleError ( ) {
    $('#saved').removeClass( "found" );
    $('#saved div').text( 'Saved' );
}

function saveNote ( note, async, fn ) {
    if ( ! online ) {
	return;
    }
    note["from"] = token;
    var dict = JSON.stringify ( [note] );

    $.ajax ({ "url" : "/notes",
              "async" : async,
              "type" : "PUT",
              "data" : dict,
              "success" : function ( resp ) {
		  $("#saved").slideDown("fast", function () {
		      clearTimeout( t );
		      t = setTimeout("$('#saved').slideUp('fast')", 2500);
		  });
		  if ( fn !== undefined ) {
		      fn ( resp );
		  }
		  dumpNotes();
              },
              "error" : function( resp ) {
		  if( resp.status == 401 ) {
		      window.location = $("#logout").attr("href");
		  } else {
		      $("#saved div").text( "Failed" );
		      $('#saved').addClass( "found" );
		      $("#saved").slideDown("fast", function () {
			  clearTimeout( t );
			  t = setTimeout("$('#saved').slideUp('fast', handleError )", 2500);
		      });
		  }
              }
            });
}

function isChild ( el, elm ) {
    while( el != elm && el.tagName.toLowerCase() != "body" ) {
	el = el.parentNode;
    }
    return el == elm;
}

function drawTrash() {
    $("#check_all").removeAttr("checked");
    var el = $("#archived_content");
    for ( var a in trash ) {
	if ( trash.hasOwnProperty ( a ) && $("#" + a).length == 0 ) {
	    var div = $("<div />",{
		"class" : "trash_item",
		"id" : trash[a].id
	    });
	    div.css({"background-color" : trash[a].color,
		     "opacity" : .4});
	    div.bind( "mouseover", function ( event ) {
		if ( isChild( event.relatedTarget, event.currentTarget ) ) {
		    event.preventDefault();
		    return;
		}
		var eld = $(event.currentTarget);
		el.find(".trash_content").removeClass("wrap");
		eld.find(".trash_content").addClass("wrap");
		eld.find(".trash_all").fadeIn( "fast" );
		eld.bind( "mouseout", function( event ) {
		    if ( isChild( event.relatedTarget, event.currentTarget ) ) {
			event.preventDefault();
			return;
		    }
		    if ( event.relatedTarget.id == "noteArea" && event.which == 1 ) {
			event.preventDefault();
		    } else {
			eld.find(".trash_all").css("display","none");
			eld.unbind("mouseout");
		    }
		});
	    });
	    div.bind("mousedown", function ( event ) {
		if ( $(event.target).is("input") ) { return; }
		event.preventDefault();
		var div = $(event.currentTarget);
		var area = $("#noteArea");
		area.css("cursor", "crosshair");
 		area.bind( "mouseup", function ( event ) {
		    var note = trash[div.attr("id")];
		    note.x = event.clientX + window.scrollX;
		    note.y = event.clientY + window.scrollY;
		    note.z = z++;
		    area.css("cursor", "auto");
		    saveNote( {"id" : note.id, "x" : note.x, "y" : note.y, "z" : note.z}, true );
		    restoreTrash( div.find(".trash_checkbox") );
		    area.unbind("mouseup");
		});
		area.bind( "mouseover", function ( event ) {
		    event.stopPropagation();
		});
		div.bind("mouseup", function ( event ) {
		    area.css("cursor", "auto");
		    area.unbind("mouseup").unbind("mouseover");
		});
	    });
	    div.bind( "click", function ( event ) {
		if ( event.target.tagName.toLowerCase() == "input"){ return; }
		var ing = $(event.currentTarget).find("input");
		ing.attr("checked", !ing.is(":checked") );
	    });

	    var ch = $("<input />", {
		"type" : "checkbox",
		"class" : "trash_checkbox",
		"name" : trash[a].id
	    });
	    div.append ( ch );
	    var sp = $("<span />", {
		"class" : "trash_content"
	    });
	    var subj = $("<div />", {
		"class": "trash_subject"
	    });
	    var snippet = $("<div />");
	    var subject = trash[a].subject.replace(/<\/?[^>]+(>|$)/g, "");
	    subject = subject.substr(0, 25);
	    if (subject !== "") {
		subj.text(subject);
	    } else {
		subj.html("&nbsp;");
	    }
	    var content = trash[a].content.replace(/<\/?[^>]+(>|$)/g, "");
	    content = content.replace( /(&.*?;)/g, " " );
	    var content_ = content.substr(0,35);
	    if (content_ !== "") {
		snippet.text(content_);
		var e = $("<span />", {
		    "class" : "trash_all"
		}).text(content.substr(35));
		snippet.append( e );
	    } else {
		snippet.html("&nbsp;");
	    }
	    sp.append(subj);
	    sp.append(snippet);
	    div.append ( sp );
	    div.append( "<hr />" );
	    el.prepend( div );
	}
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

    var idArr = [];
    for( var a = 0; a < cs.length; a++) {
	idArr.push ( {"id" : cs[a].name, "from" : token} );
        $("#" + cs[a].name).fadeOut( function () {
	    $(this).remove();
	});
    }
    if ( idArr.length < 1 ){ return; }
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
	    $(".list_check").unbind("click");
	    $(".list_check").click( checkList );
	},
	"error" : function( resp ) {
	    if( resp.status == 401 ) {
		window.location = $("#logout").attr("href");
	    } else {
		$("#saved div").text( "Failed" );
		$('#saved').addClass( "found" );
		$("#saved").slideDown("fast", function () {
		    clearTimeout( t );
		    t = setTimeout("$('#saved').slideUp('fast', handleError )", 2500);
		});		
	    }
	}
    });

}

function permDelete( cs ){

    var idArr = [];
    for( var a = 0; a < cs.length; a++) {
	idArr.push ( {"id" : cs[a].name, "from" : token});
    }
    if ( idArr.length < 1 ) { return; }
    var dict = JSON.stringify(idArr);

    var c = confirm ( "Are you sure you wish to permanently delete these notes?" );
    if ( c ) {
	for (var p = 0; p < cs.length; p++) {
	    $("#" + cs[p].name).remove();
	}
	$.ajax({
            "url" : "/notes/trash/delete",
            "type" : "PUT",
            "data" : dict,
            "async" : true,
            "success" : function( resp ){
		for( var t = 0; t < cs.length; t++) {
		    delete trash[cs[t].name];
		}
		drawTrash();
            },
            "error" : function( resp ) {
		if( resp.status == 401 ) {
		    window.location = $("#logout").attr("href");
		}else {
		    $("#saved div").text( "Failed" );
		    $('#saved').addClass( "found" );
		    $("#saved").slideDown("fast", function () {
			clearTimeout( t );
			t = setTimeout("$('#saved').slideUp('fast', handleError )", 2500);
		    });
		}
            }
	});
    }
}

function unToggle( ) {
    $("#noteArea").unbind("click");
    $("#managemenu").slideUp( 'fast', function() {
	$("#archived_content").css({"overflow-y" : "hidden"});
    });
}

function isEditable ( l ) {
    var el = $(l);
    return (el.parents('[contenteditable="true"]').length > 0 || el.attr('contenteditable') == "true") ? true : false;
}

function startDrag ( e ) {

    var el = e.currentTarget;

    if ( e.button !== 0 || isEditable ( e.target ) ){ return; }

    e.stopPropagation();
    e.preventDefault();

    dragged.el = el;

    if ( dragged.el.style.zIndex < z ){
	dragged.el.style.zIndex = ++z;
    }

    dragged.x = e.clientX + window.scrollX;
    dragged.y = e.clientY + window.scrollY;
    dragged.sx = parseInt( el.style.left, 10 );
    dragged.sy = parseInt( el.style.top, 10 );

    document.addEventListener( "mousemove", dragging, true );
    document.addEventListener( "mouseup", stopDrag, true );
}

function dragging ( e ) {

    e.stopPropagation();
    e.preventDefault();

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;
    
    var el = $(dragged.el);

    el.css("left", (dragged.sx + x - dragged.x) + "px");
    el.css("top", (dragged.sy + y - dragged.y) + "px");

    if ( $(e.target).parents("#managemenu").length > 0) {
	el.addClass ( "unfound found" );
	$("#managemenu").css("cursor","crosshair");
    } else { 
	el.removeClass ( "unfound found" );
    }
    
}

function stopDrag ( e ) {

    e.stopPropagation();
    e.preventDefault();

    var note = notes[dragged.el.id];

    if ( note === undefined ) {
        alert ( "Note not found in array. You, sir, have a bug." );
    }

    var newX = parseInt( dragged.el.style.left, 10 );
    var newY = parseInt( dragged.el.style.top, 10 );
    var newZ = parseInt( dragged.el.style.zIndex, 10 );

    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

    if (note.x == newX && note.y == newY) { 
	var overlap = false;
	for(var n in notes) {
	    if ( notes.hasOwnProperty ( n ) ) {
		if ($("#" + note.id).overlaps("#" + notes[n].id)) { 
		    if (note.z < notes[n].z) { 
			overlap = true;
		    }
		}
	    }
	}
	if (!overlap) {
            return;
	}
    }

    $("#managemenu").css("cursor", "auto");

    if ( $(e.target).parents("#managemenu").length > 0) {
	deleteNote( $("#" + note.id ) );
	return;
    }

    var act = new Action();
    act.setBefore ( note );

    note.x = newX;
    note.y = newY;
    note.z = newZ;

    act.setAfter ( note );
    act.push ( );

    var no = { "x" : note.x, "z" : note.z, "y" : note.y, "id" : note.id };

    saveNote ( no, true );

}

function compare ( note, note2 ) {
    if ( note2 === null ){ return 0; }
    if ( notes[note.id] === undefined && note2 === undefined ) { return 0; }
    var nA = (note2 === undefined ) ? notes[note.id] : note2;
    if ( !!nA ) {
	if ( nA.z == note.z && nA.x == note.x && nA.y == note.y && nA.content == note.content &&
             nA.subject == note.subject && nA.color == note.color && note.trash == nA.trash ) {
            return 1;
	}
    }
    return -1;
}

function updateNote ( note ) {
    var old = notes[note.id];
    var el = $("#" + note.id);
    var css = {};
    if ( old.z != note.z ) {
	css['z-index'] = note.z;
    }
    if ( old.x != note.x ) {
	css['left'] = note.x;
    }
    if ( old.y != note.y ) {
	css['top'] = note.y;
    }
    if ( old.color != note.color ) {
	css['background-color'] = note.color;
    }
    el.css(css);
    if ( old.content != note.content ) {
	el.find("blockquote").html( note.content )
	el.find(".list_check").unbind("click").click( checkList );
    }
    if ( old.subject != note.subject ) {
	el.find(".noteHeader").find("div").html( note.subject );
    }
}

function writeNote ( note, fade ) {
    var comp =  compare ( note );
    if ( comp == 1 ){ 
	return; 
    } else if ( comp == -1 ) {
	updateNote( note );
	return;
    }

    var elm = $('<div />',  {
        "class" : "note",
        "id" : note.id
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
        "class" : "noteHeader"
    });
    var s = $('<div />');
    s.bind("blur", function(event) {
        closeSave(event, $(this));
        $(this).attr({"contenteditable" : false}).css("cursor", "move").removeClass("yesSelect outlined");
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
	s.css("cursor", "text");
	s.addClass("yesSelect outlined");
	s.focus();
	$(document).bind ( "click", function( event ) {
            if ( isEditable ( event.target ) ){ return; }
            event.stopPropagation();
	    s.blur();
            $(document).unbind( "click" );
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
    o.bind( "mousedown", function( event ) {
	event.stopPropagation();
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
        b.attr({"contenteditable" : false}).css("cursor", "move").removeClass("yesSelect outlined").unbind("keypress");
    });
    b.bind ( "dblclick", function( event ) {
	if ( ! online ){ return; }
	b.attr({"contenteditable" : true});
	b.css("cursor", "text");
	b.addClass("yesSelect outlined");
	b.focus();
	b.bind( "keypress", function ( event ) {
	    var note = notes[$(event.currentTarget).parents(".note").attr("id")];
	    var end = 0;
	    if ( event.keyCode == 13 ) {
		event.preventDefault();
		var sel = window.getSelection();
		var node = $(sel.focusNode);
		var div = $("<div />");
		if ( note.is_list == 1 ) {
		    var ch = $("<input />", {
			"type" : "checkbox",
			"class" : "list_check"
		    });
		    ch.bind( "click", checkList );
		    ch.bind ( "mousedown", function ( event ) {
		    	event.stopPropagation();
		    }).bind("dblclick", function ( event ){
		    	event.stopPropagation();
		    });
		    div.append( ch );
		    end = 2;
		}
		div.append ( "&nbsp;" );
		if ( node.prop( "tagName" ) !== undefined && node.prop( "tagName" ).toLowerCase() == "blockquote" ) {
		    if ( end == 0 ) {
			node.append( "<div><br></div>" );
		    }
		    node.append( div );
		} else {
		    node.after( div );
		}
		var range = document.createRange();
		range.setStart( div.get(0), 0 );
		range.setEnd( div.get(0), end );
		sel.removeAllRanges();
		sel.addRange( range );
		sel.collapseToEnd( true );
	    }
	});
	$(document).bind ( "click", function( event ) {
            if ( isEditable ( event.target ) ){ return; }
            event.stopPropagation();
	    b.blur();
            $(document).unbind( "click" );
            closeSave( event, b );
	});
    });
    b.html(note.content);
    c.append ( b );
    elm.append ( c );
    $( "#" + note.id ).remove();
    if ( fade ) {
	elm.css({"display":"none"});
    }
    $("#noteArea").append ( elm );
    if ( fade ) {
	elm.fadeIn( 350 );
    }
    elm.find( ".list_check").bind( "mousedown", function ( event ) {
	event.stopPropagation();
    }).unbind("click").click( checkList ).bind("dblclick", function ( event ){
	event.stopPropagation();
    });
}

function dropDown ( po ) {
    if ( !! current ) {
	current.remove();
	current = undefined;
    }
    var el = $(po);
    var pos = el.position();
    $(".menu").css({
	"left" : (pos.left + el.width()) + "px",
	"top" : pos.top + "px",
	"display" : "block"
    }).attr("name", po.attr("id"));
    var id = el.attr("id");
    var li = $("#list");
    if ( notes[id].is_list == 1 ) {
	li.addClass("toggled");
    } else {
	li.removeClass("toggled");
    }
    li.click( function ( event ) {
	if ( !li.hasClass("toggled") ) {
	    li.addClass("toggled");
	    notes[id].is_list = 1;
	    saveNote( { "id" : id, "is_list" : 1 }, true );
	} else {
	    li.removeClass("toggled");
	    notes[id].is_list = 0;
	    saveNote( { "id" : id, "is_list" : 0 }, true );
	}
    });
    var area = $(document);
    area.bind ( "click", function ( event ) {
	$(".menu").css("display", "none");
	if ( !! current ) {
	    current.remove();
	    current = undefined;
	}
	li.unbind("click");
	area.unbind("click");
    });
}

function colorNote ( el, color ) {
    var n = notes[el.attr( 'id' )];
    var act = new Action ();
    act.setBefore ( n );
    n.color = color;
    act.setAfter ( n );
    act.push ( );
    var note = { "id" : n.id, "color" : color };
    saveNote ( note, true );
    el.css({"backgroundColor" : color});
}

function Action (){

    this.b = null;
    this.a = null;

    this.setBefore = function ( before ) {
	this.b = jQuery.extend ( true, {}, before );
    };
    this.setAfter = function ( after ) {
	this.a = jQuery.extend ( true, {}, after );
    };
    this.push = function () {
	var comp = compare ( this.a, this.b );
	if ( comp === 0 || comp == -1 ) {
            undoStack.push ( this );
            redoStack = [];
            $("#undo").removeClass("disabled").addClass("enabled");
            $("#redo").removeClass("enabled").addClass("disabled");
	}
    };
}

function removeActions( id ) {
    for ( var u = 0; u < undoStack.length; u++ ) {
	var act = undoStack[u];
	if ( act.b.id == id || act.a.id == id ) {
	    delete undoStack[u];
	}
    }
    var na = [];
    for ( var u = 0; u < undoStack.length; u++ ) {
	if ( undoStack[u] !== undefined ) {
	    na.push ( undoStack[u] );
	}
    }
    undoStack = na;
    if ( undoStack.length === 0) {
	$("#undo").removeClass("enabled").addClass("disabled");
    }
    redoStack = [];
    $("#redo").removeClass("enabled").addClass("disabled");
}

function undoAction () {

    if ( undoStack.length === 0 ){ return; }

    var act = undoStack.pop();

    if ( undoStack.length === 0) {
	$("#undo").removeClass("enabled").addClass("disabled");
    }

    writeNote ( act.b, false );
    notes[act.b.id] = act.b;
    dumpNotes();
    saveNote ( act.b, true );

    redoStack.push ( act );

    $("#redo").removeClass("disabled").addClass("enabled");
}

function redoAction () {

    if ( redoStack.length === 0 ) { return; }

    var act = redoStack.pop();

    if ( redoStack.length === 0) {
	$("#redo").removeClass("enabled").addClass("disabled");
    }

    writeNote ( act.a, false );
    notes[act.a.id] = act.a;
    dumpNotes();
    saveNote ( act.a, true );

    undoStack.push ( act );

    $("#undo").removeClass("disabled").addClass("enabled");
}

function searchNotes ( ) {
    var str = $("#searchbox").val().toLowerCase();
    if ( str === "" ) {
 	$(".found").removeClass("found");
	$(".unfound").removeClass("unfound");
	return; 
    }
    for ( var n in notes ) {
	if ( notes.hasOwnProperty( n ) ) {
	    var note = $("#" + notes[n].id);
	    var text = note.text().toLowerCase();
	    if ( text.search ( str ) != -1 ) {
		note.removeClass("unfound").addClass("found");
	    } else {
		note.removeClass("found").addClass("unfound");
	    }
	}
    }
    var found = false;
    for ( var s in trash ) {
	if ( trash.hasOwnProperty( s ) ) {
	    var txt = trash[s].subject.toLowerCase() + " " + trash[s].content.toLowerCase();
	    txt = txt.replace( /<\/?[^>]+(>|$)/g, "" );
	    if ( txt.search( str ) != -1 ) {
		found = true;
		$("#" + trash[s].id ).addClass( "found" );
	    } else {
		$("#" + trash[s].id ).addClass( "unfound" );
	    }
	}
    }
    if ( found ) {
	var l = $("#managemenu");
	if ( l.is(":hidden") ) {
		l.slideDown( "slow", function(){
		$("#archived_content").css({"overflow-y" : "auto"});
	    });
	    $("#noteArea").bind("click", function ( event ) {
		unToggle();
		$("#noteArea").unbind("click");
	    });
	}
    } else {
	unToggle ();
    }
    $(document).bind("click", function ( event ) {
	$(".found").removeClass("found");
	$(".unfound").removeClass("unfound");
	if ( ! $(event.target).is("#searchbox") ) {
	    $("#searchbox").val("").text("").blur();
	}
	$(document).unbind("click");
    });
}

function checkList ( event ) {
    event.stopPropagation();
    var el = $(event.currentTarget);
    if ( el.is( ":checked" ) ) {
	el.attr("checked", "checked");
    } else {
	el.removeAttr("checked");
    }
    var note = el.parents(".note");
    var id = note.attr("id");
    notes[id].content = note.find("blockquote").html();
    saveNote( { "id" : id, "content" : notes[id].content}, true );	
}

function shareWith( email, id ) {
    $.ajax ({ "type" : "POST",
              "async" : true,
              "url" : "/share",
              "success" : function( event ) {
		  console.log ( event );
              },
	      "error" : function ( resp ) {
		  if( resp.status == 401 ) {
		      window.location = $("#logout").attr("href");
		  } else {
		      alert( "Failed to connect with server, if problem persists, contact the webmasters.");
		  }
	      },
              "data" : JSON.stringify({"id" : id, "email" : email, "from" : token})
            });    
}

$(document).ready( function () {

    $('#noteArea').bind('dblclick', function(event) {
	if ( online ) {
	    createNote(event);
	}
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
	event.preventDefault();
	permDelete( $("#archived_content").find(":checked") );
    });

    $("#archive_restore").bind ( "click", function( event ){
	event.preventDefault();
	restoreTrash( $("#archived_content").find(":checked") );
    });

    $('#undo').bind('click', function( event ) {
	event.preventDefault();
	undoAction();
    });

    $('#redo').bind('click', function( event ) {
	event.preventDefault();
	redoAction();
    });

    $("#manage").bind('click', function( event ){
	event.preventDefault();
	var l = $("#managemenu");
	if ( l.is(":hidden") ){
	    l.slideDown( "slow", function(){
		$("#archived_content").css({"overflow-y" : "auto"});
	    });
	    $("#noteArea").bind("click", function ( event ) {
		unToggle();
	    });
	} else {
	    unToggle ( );
	}
    });


    $(document).keyup(function( event ) {
	if ( event.ctrlKey ) {
	    if ( event.keyCode == 90 ) {
		undoAction();
	    } else if ( event.keyCode == 89 ) {
		redoAction();
	    }
	} else if ( event.shiftKey ) {
	    if ( ! isEditable( event.target ) && event.target.id != "searchbox" ) {
		if ( event.keyCode == 191 ){
		    $("#help_overlay").fadeToggle("fast");
		} else if ( event.keyCode == 65 ) {
		    $("#manage").click();
		}
	    } 
	} else if ( event.keyCode == 27 ) {
	    $("#help_overlay").fadeOut("fast");
	    if ( isEditable( event.target ) ) {
		$(event.target).blur();
	    }
	    if ( $("#searchbox").is(":focus") || $(".found, .unfound").length > 0 ){
		$(document).trigger("click");
	    }
	} else if ( event.keyCode == 13 ) {
	    if ( $("#searchbox").is(":focus") ) {
		searchNotes();
	    }
	}
    });

    $("#help").bind("click", function ( event ){
	event.preventDefault();
	$("#help_text").css("display","block");
	$("#help_overlay").fadeIn("fast");
    });


    $("#share").bind( "click", function ( event ) {
	$("#share_menu").css("display","block");
	var id = $(event.currentTarget).parents(".menu").attr("name");
	$(".menu").css("display", "none");
	$("#current_share").text( '"' + notes[id].subject + '"' );
	$("#help_overlay").fadeIn("fast");
    });

    $("#exit_help").bind("click", function ( event ) {
	$("#help_overlay").fadeOut("fast", function() {
	    $("#help_text, #share_menu").css("display","none");
	});
    });

    $("#help_overlay").bind( "click", function( event ) {
	if ( event.target == event.currentTarget ) {
	    $("#help_overlay").fadeOut("fast", function( ){
		$("#help_text, #share_menu").css("display","none");
	    });
	}
    });

    $("#search").bind( "click", function ( event ) {
	event.stopPropagation();
	searchNotes();
    });

    $("body").bind("online", function ( event ) {
	console.log ( "true" );
	online = true;
    }).bind("offline", function ( event ) {
	console.log ( "false" );
	online = true;
    });

    $(".menu").bind("click", function ( event ) {
	event.stopPropagation();
    });

    $(".colorSq").bind( "mouseover", function ( event ) {
        if ( !! current ) {
    	    current.remove();
	    current = undefined;
    	}
        var df = $(event.currentTarget);
	var el = $("#" + df.parents(".menu").attr("name") );
        var big = $("<div />", {
    	    "class" : "bigSq"
        });
        current = big;
        var pos = df.position();
	var color = df.css("backgroundColor");
        big.css ({ "top" : pos.top-3,
    		   "left" : pos.left-3,
    		   "backgroundColor" : color
    		 });
        big.bind( "mouseout", function ( event ) {
    	    big.remove();
        });
        big.bind ( "click", function ( event ) {
    	    colorNote ( el, color );
    	    big.remove();
	    $(".menu").css("display", "none");
        });
	df.parent().append ( big );
    });

    $("#archive").bind( "click", function ( event ) {
	deleteNote ( $("#" + $(event.currentTarget).parents(".menu").attr("name") ) );
	$(".menu").css("display", "none");
    });

});

if ( userAgent.search ( "iphone" ) > -1 || 
     userAgent.search( "android") >  -1 ) {
//     userAgent.search( "linux" ) > -1 ) {
    var script = $("<script />", {
	"src" : "/js/mobile.js",
	"type" : "text/javascript"
    });
    $("#searcharea").remove();
    $("body").append( script );
    $("#manage").addClass("left");
    $("#help").addClass("left");
    $("#logout").addClass("right");
    $("#undo").addClass("left right");
    $("#redo").addClass("right");
    $("body, html").css("min-width", "350px").width("350px");
    $("#toolbar").css("width", "350px");
    var view = $("<meta>", {
	"name" : "viewport",
	"content" : "width=device-width,initial-scale=1,maximum-scale=1"
    });
    $("head").append ( view );
}

if ( window.localStorage.getItem( "notes_" + username ) ){
    var arr = JSON.parse ( window.localStorage['notes_' + username] );
    for ( var a in arr ) {
	if ( arr.hasOwnProperty( a ) ) {
	    z++;
	    writeNote( arr[a], false );
	    notes[arr[a].id] = arr[a];
	}
    }
}

if ( online ) {
    getNotes();
}
