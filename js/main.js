var dragged = {};
var z = 0;
function startDrag ( e ) {

    event.stopPropagation();

    var el = e.target;
    var edd = e.currentTarget;

    dragged.el = edd;

    edd.style.zIndex = ++z;

    dragged.x = e.clientX + window.scrollX;
    dragged.y = e.clientY + window.scrollY;
    dragged.sx = parseInt( edd.style.left );
    dragged.sy = parseInt( edd.style.top );

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

