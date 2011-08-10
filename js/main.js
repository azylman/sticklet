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
    //save position with ajax call
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
