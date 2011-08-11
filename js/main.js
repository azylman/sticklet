var notes = new Array();
if ( ! window.localStorage.getItem( "notes" ) ){
    $.ajax ({
	"url" : "/notes",
	"async" : true,
	"type" : "GET",
	"dataType" : "json",
	"success" : function( resp ) {
		$.each(resp, function(index) {
		    writeNote ( resp[index] );
		    notes[resp[index].id] = resp[index];
		});
	    window.localStorage.setItem ( "notes", JSON.stringify( resp ) );
	}
    });
} else {
    var arr = JSON.parse ( window.localStorage.notes );
    for ( var a in arr ) {
	writeNote ( arr[a] );
	notes[arr[a].id] = arr[a];
    }
}
var dragged = {};
var z = 0;

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
    window.localStorage.setItem ( "notes", notes );

    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

};

function editText ( e ) {
    e.stopPropagation();
    e.preventDefault();

    var el = e.currentTarget;
    var tx = document.createElement("textarea");
    tx.style.backgroundColor= el.style.backgroundColor;
    tx.style.borderStyle="none";
    tx.style.borderColor="transparent";
    tx.style.overflow="auto";
    tx.style.width = el.style.width;
    tx.style.height = el.style.height;
    //adjust cols and rows for amount of text

    tx.addEventListener("blur", closeSave, true);
    tx.addEventListener("mouseout", closeSave, true);
    //document.addEventListener("click", closeSave, true );

    var val = el.textContent; //.replace ( /<br.+>/g, "\n" );

    el.parentNode.replaceChild ( tx, el );
    tx.focus();
    tx.value = val;

};

function closeSave ( e ) {

    //fix this-> right now it only works for content. Same in notes.py.
    //forgot about subject when I made this.

    var el = e.currentTarget;
    el.removeEventListener("mouseout", closeSave, true);
    el.removeEventListener("blur", closeSave, true);
    //document.removeEventListener("click", closeSave, true );

    var edd = document.createElement ( "blockquote" );
    edd.textContent = el.value;
    edd.ondblclick = editText;
    var id = el.parentNode.parentNode.id;
    el.parentNode.replaceChild ( edd, el );

    $.ajax ({ "url" : "/notes/" + id,
    	     "async" : true,
    	     "type" : "PUT",
    	     "data" : {"content" : el.value}
    	   });

};

function submitNote (x, y, content) {
    if ( content == undefined || content == null ) content = "";
    $.ajax ({ "type" : "POST",
	     "async" : true,
	     "url" : "/notes",
	     "success" : function( resp ){
		 if ( resp != "" && resp != null){
		     var note = JSON.parse ( resp );
		     writeNote ( note );
		     notes[note.id] = note;
		 }
		 window.localStorage.setItem ( "notes", notes );
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
    if ( document.getElementById ( note.id ) != null ) {
	document.removeChild ( document.getElementById( note.id ) );
    }
    var elm = document.createElement ( "div" );
    elm.className = "note";
    elm.id = note.id;
    elm.style.left = note.x + "px";
    elm.style.top = note.y + "px";
    elm.addEventListener( "mousedown", startDrag, true );
    var h = document.createElement ( "div" );
    h.className = "note-header";
    var s = document.createElement ( "span" );
    s.addEventListener ( "dblclick", editText, true );
    s.textContent = note.subject + ":";
    var o = document.createElement ( "div" );
    o.className = "options";
    o.textContent = "^";
    h.appendChild ( s );
    elm.appendChild ( o );
    elm.appendChild ( h );
    var c = document.createElement ( "div" );
    c.className = "note-content";
    var b = document.createElement ( "blockquote" );
    b.addEventListener ( "dblclick", editText, true );
    b.textContent = note.content;
    c.appendChild ( b );
    elm.appendChild ( c );
    document.getElementById("notearea").appendChild ( elm );
};

$('#notearea').bind('dblclick', function(event) {
	createNote(event)
});
