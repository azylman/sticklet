var dragged = {};
function startDrag ( e ) {

    var el = e.target;
    var edd = e.currentTarget;

//    while ( el != null && el.nodeName != "BODY" && ! /^note$/.test ( el.className ) )
//	el = el.parentNode;

//    if ( el.nodeName == "BODY" || el.nodeName == null || el.nodeName == undefined) return;
    dragged.el = edd;

    dragged.x = e.clientX + window.scrollX;
    dragged.y = e.clientY + window.scrollY;
    dragged.sx = parseInt( edd.style.left );
    dragged.sy = parseInt( edd.style.top );

    document.addEventListener( "mousemove", dragging, true );
    document.addEventListener( "mouseup", stopDrag, true );

    event.stopPropagation();
}

function dragging ( e ) {

    var x = e.clientX + window.scrollX;
    var y = e.clientY + window.scrollY;

    dragged.el.style.left = (dragged.sx + x - dragged.x) + "px";
    dragged.el.style.top = (dragged.sy + y - dragged.y) + "px";

    e.stopPropagation();

}

function stopDrag ( e ) {

    //save position with ajax call
    //var submit = JSON.stringify ( dragged.el );
    //console.log ( dragged );
    
    document.removeEventListener( "mousemove", dragging, true );
    document.removeEventListener( "mouseup", stopDrag, true );
    dragged = {};

}

