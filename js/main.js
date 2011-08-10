var dragged = {};
var z = 0;
function startDrag ( e ) {

    e.stopPropagation();
    e.preventDefault();

    var el = e.currentTarget;
    if ( e.target.tagName == "TEXTAREA" ) return;
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
    $ajax ({ "dest" : "note",
    	     "sync" : true,
    	     "type" : "POST",
    	     "fn" : function ( resp ) {
    		 if ( resp != "true" ) {
    		     alert ( resp + "\nCould not save to db" );
    		 }
    	     },
    	     "data" : [ "id=" + dragged.el.id, "x=" + parseInt( dragged.el.style.left ), "y=" + parseInt ( dragged.el.style.top ), "z=" + parseInt ( dragged.el.style.zIndex ) ]
    	   });
    
    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

};

function editText ( e ) {
    e.stopPropagation();

    var el = e.currentTarget;
    var tx = document.createElement("textarea");
    tx.style.backgroundColor="yellow";
    tx.style.borderStyle="none";
    tx.style.borderColor="transparent";
    tx.style.overflow="auto";
    tx.style.width = el.style.width;
    tx.style.height = el.style.height;
    tx.rows = (parseInt(el.style.height) / parseInt(el.style.fontSize));
    //tx.onblur = closeSave

    tx.addEventListener("blur", closeSave, true);
    tx.addEventListener("mouseout", closeSave, true);
    document.addEventListener("click", closeSave, true );

    tx.value = el.textContent.replace ( /<br.+>/g, "\n" );


    el.parentNode.replaceChild ( tx, el );
    
};

function closeSave ( e ) {

    //console.log ( e );
    var el = e.currentTarget;
    el.removeEventListener("mouseout", closeSave, true);
    el.removeEventListener("blur", closeSave, true);
    document.removeEventListener("click", closeSave, true );

    var edd = document.createElement ( "blockquote" );
    edd.textContent = el.value;
    edd.ondblclick = editText;

    el.parentNode.replaceChild ( edd, el );
    

};

function submitNote () {

    var el = document.getElementById("content");
    $ajax ({ "type" : "POST",
	     "sync" : true,
	     "dest" : "/notes",
	     "fn" : function( resp ){
		 if ( resp != "" && resp != null){
		     var note = JSON.parse ( resp );
		     writeNote ( note );
		     el.value = "";
		     document.getElementById("form").style.display="none";
		 }
	     },
	     "data" : ["content=" + el.value]
    });

};

function createNote( e ) {

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;

    //create note here
    // how do we get the id?
    //writeNote ( {"x" : x, "y" : y } );

    var eel = document.getElementById( "form" );
    eel.style.display = "inline";

}

function writeNote ( note ) {
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
    h.appendChild ( o );
    elm.appendChild ( h );
    var c = document.createElement ( "div" );
    c.className = "note-content";
    var b = document.createElement ( "blockquote" );
    b.addEventListener ( "dblclick", editText, true );
    b.textContent = note.content;
    c.appendChild ( b );
    elm.appendChild ( c );
    document.getElementById("notearea").appendChild ( elm );
}

function $ajax ( o ) {
    var s = (o.type == "GET") ? "?" : "";
    for ( var i = 0; i < o.data.length; i++ ){
	s += o.data[i] + "&";
    }
    s = s.substring ( 0, s.length-1 );
    var x = new XMLHttpRequest ( );
    if ( o.sync ) {
	x.onreadystatechange=function(){
	    if ( x.readyState==4 && x.status==200 ) {
		o.fn ( x.responseText );
	    }
	}
    }
    if ( o.type.toUpperCase() == "GET" ) {
	x.open ( o.type, o.dest + s, o.sync );
	x.send ( );
    } else {
	x.open( o.type, o.dest, o.sync );
	x.setRequestHeader( "Content-Type", "application/x-www-form-urlencoded" );
	x.send( s );
    }
};
