for ( var a in window.localStorage ) {
    if ( /^notes_.*/.test ( a ) ) {
	window.localStorage.removeItem ( a );
    } 
}
var note = { "id" : "demo_note", "x" : 250, "y" : 250, "z" : 100,
	     "subject" : "Click Subject here", "content" : "Click Content here" };
var online = false;
var notes = {};
notes[note.id] = note;
window.localStorage.setItem ( "notes_demo", JSON.stringify(notes) );
username = "demo";
