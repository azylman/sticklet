var dragged = {};
var z = 0;
function startDrag ( e ) {

    e.stopPropagation();

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
}

function dragging ( e ) {

    e.stopPropagation();

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;

    dragged.el.style.left = (dragged.sx + x - dragged.x) + "px";
    dragged.el.style.top = (dragged.sy + y - dragged.y) + "px";

}

function stopDrag ( e ) {
    
    e.stopPropagation();
    //save position with ajax call

    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

}

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

    tx.addEventListener("onblur", closeSave, true);
    document.addEventListener("click", closeSave, true );

    tx.value = el.textContent.replace ( /<br.+>/g, "\n" );


    el.parentNode.replaceChild ( tx, el );
    
}

function closeSave ( e ) {

    //console.log ( e );

}
