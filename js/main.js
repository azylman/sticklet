function redoAction(){if(redoStack.length===0){return}var a=redoStack.pop();if(redoStack.length===0){$("#redo").removeClass("enabled").addClass("disabled")}writeNote(a.a,false);notes[a.a.id]=a.a;dumpNotes();if(online){saveNote(a.a,true)}undoStack.push(a);$("#undo").removeClass("disabled").addClass("enabled")}function undoAction(){if(undoStack.length===0){return}var a=undoStack.pop();if(undoStack.length===0){$("#undo").removeClass("enabled").addClass("disabled")}writeNote(a.b,false);notes[a.b.id]=a.b;dumpNotes();if(online){saveNote(a.b,true)}redoStack.push(a);drawTrash();$("#redo").removeClass("disabled").addClass("enabled")}function Action(){this.b=null;this.a=null;this.setBefore=function(a){this.b=jQuery.extend(true,{},a)};this.setAfter=function(a){this.a=jQuery.extend(true,{},a)};this.push=function(){if(!compare(this.a,this.b)){undoStack.push(this);$("#undo").removeClass("disabled").addClass("enabled");redoStack=new Array;$("#redo").removeClass("enabled").addClass("disabled")}}}function colorNote(a,b){var c=$(b.currentTarget).css("backgroundColor");var d=notes[a.attr("id")];var e=new Action;e.setBefore(d);d.color=c;e.setAfter(d);e.push();var f={id:d.id,color:c};if(online){saveNote(f,true)}a.css({backgroundColor:c})}function dropDown(a){var b=$("<div />",{"class":"menu"});var c=$(a);b.css({left:parseInt(c.css("left"))+parseInt(c.css("width"))+"px",top:parseInt(c.css("top"))+"px"});var d=$("<div />");d.css({"margin-top":"10px","margin-bottom":"6px"});for(var e=0;e<colorsArr.length;e++){var f=$("<div />",{"class":"colorSq"});var g=colorsArr[e];f.css({backgroundColor:g});f.bind("mouseover",function(a){if(!!current){current.remove()}var d=$(a.currentTarget);var e=$("<div />",{"class":"bigSq"});current=e;var f=d.position();e.css({top:f.top-3,left:f.left-3,"background-color":d.css("background-color")});e.bind("mouseout",function(a){e.remove()});e.bind("click",function(a){colorNote(c,a);b.remove()});b.append(e)});d.append(f)}b.append(d);var h=$("<a />",{"class":"button enabled"});h.css({"margin-left":"auto","margin-right":"auto"});h.text("Archive");h.bind("click",function(a){deleteNote(c,b);b.remove()});b.append(h);$("#noteArea").bind("click",function(a){$("#noteArea").unbind("click");b.remove()});b.bind("click",function(a){a.preventDefault();a.stopPropagation()});$("#noteArea").append(b)}function writeNote(a,b){if(compare(a)){return}var c=$("<div />",{"class":"note",id:a.id});c.css({left:a.x+"px",top:a.y+"px",zIndex:a.z,backgroundColor:a.color});c.bind("mousedown",function(a){startDrag(a)});var d=$("<div />",{"class":"noteHeader"});var e=$("<div />");e.bind("blur",function(a){closeSave(a,$(this));$(this).attr({contenteditable:false})});e.bind("keypress",function(a){if(a.keyCode==13){a.preventDefault();a.stopPropagation();return}});e.bind("dblclick",function(a){if(!online){return}e.attr({contenteditable:true});e.focus();$(document).bind("click",function(a){if(isEditable(a.target)){return}a.stopPropagation();e.blur();$(document).unbind("click")})});e.html(a.subject);var f=$("<div />",{"class":"options"});f.bind("click",function(a){unToggle();a.preventDefault();a.stopPropagation();dropDown(c)});c.append(f);c.bind("mouseover",function(a){f.css({display:"inline"});c.bind("mouseout",function(a){f.css({display:"none"});c.unbind("mouseout")})});d.append(e);c.append(d);c.append($("<hr/>"));var g=$("<div />",{"class":"noteContent"});var h=$("<blockquote />");h.bind("blur",function(a){closeSave(a,h);h.attr({contenteditable:false})});h.bind("dblclick",function(a){if(!online){return}h.attr({contenteditable:true});h.focus();$(document).bind("click",function(a){if(isEditable(a.target)){return}a.stopPropagation();h.attr({contenteditable:false});$(document).unbind("click");closeSave(a,h)})});h.html(a.content);g.append(h);c.append(g);$("#"+a.id).remove();if(b){c.css({display:"none"})}$("#noteArea").append(c);if(b){c.fadeIn(350)}return h}function compare(a,b){if(b===null){return false}var c=b===undefined?notes[a.id]:b;if(!!c){if(c.z==a.z&&c.x==a.x&&c.y==a.y&&c.content==a.content&&c.subject==a.subject&&c.color==a.color&&c.trash==a.trash){return true}}return false}function stopDrag(a){a.stopPropagation();a.preventDefault();var b=new Action;var c=notes[dragged.el.id];b.setBefore(c);if(c===undefined){alert("Note not found in array. You, sir, have a bug.")}var d=parseInt(dragged.el.style.left);var e=parseInt(dragged.el.style.top);var f=parseInt(dragged.el.style.zIndex);document.removeEventListener("mousemove",dragging,true);document.removeEventListener("mouseup",stopDrag,true);dragged={};if(c.x==d&&c.y==e){var g=false;for(var h in notes){if(notes.hasOwnProperty(h)){if($("#"+c.id).overlaps("#"+notes[h].id)){if(c.z<notes[h].z){g=true}}}}if(!g){return}}c.x=d;c.y=e;c.z=f;b.setAfter(c);b.push();var i={x:c.x,z:c.z,y:c.y,id:c.id};if(online){saveNote(i,true)}}function dragging(a){a.stopPropagation();a.preventDefault();var b=a.clientX+window.scrollX;var c=a.clientY+window.scrollY;dragged.el.style.left=dragged.sx+b-dragged.x+"px";dragged.el.style.top=dragged.sy+c-dragged.y+"px"}function startDrag(a){var b=a.currentTarget;if(a.button!==0||isEditable(a.target)){return}a.stopPropagation();a.preventDefault();dragged.el=b;if(dragged.el.style.zIndex<z){dragged.el.style.zIndex=++z}dragged.x=a.clientX+window.scrollX;dragged.y=a.clientY+window.scrollY;dragged.sx=parseInt(b.style.left);dragged.sy=parseInt(b.style.top);document.addEventListener("mousemove",dragging,true);document.addEventListener("mouseup",stopDrag,true)}function isEditable(a){while(a!==null&&a.nodeName!="BODY"){if($(a).attr("contenteditable")=="true"){return true}a=a.parentNode}return false}function unToggle(){$("#noteArea").unbind("click");$("#managemenu").slideUp("fast",function(){$("#archived_content").css({"overflow-y":"hidden"})})}function permDelete(a){var b=new Array;for(var c=0;c<a.length;c++){b.push({id:a[c].name})}if(b.length<1){return}var d=JSON.stringify(b);var e=confirm("Are you sure you wish to permanently delete these notes?");if(e){for(var f=0;f<a.length;f++){$("#"+a[f].name).fadeOut()}$.ajax({url:"/notes/trash/delete",type:"PUT",data:d,async:true,success:function(b){for(var c=0;c<a.length;c++){delete trash[a[c].name]}drawTrash()},error:function(a){if(a.status==401){window.location=loginURL}else{alert("Failed to connect with server, if problem persists, contact the webmasters.")}}})}}function restoreTrash(a){var b=new Array;for(var c=0;c<a.length;c++){b.push({id:a[c].name});$("#"+a[c].name).fadeOut()}if(b.length<1){return}var d=JSON.stringify(b);$.ajax({url:"/notes/trash",type:"PUT",data:d,async:true,success:function(b){for(var c=0;c<a.length;c++){writeNote(trash[a[c].name]);notes[a[c].name]=trash[a[c].name];delete trash[a[c].name];drawTrash();dumpNotes()}},error:function(a){if(a.status==401){window.location=loginURL}else{alert("Failed to connect with server, if problem persists, contact the webmasters.")}}})}function drawTrash(){$("#check_all").removeAttr("checked");var a=$("#archived_content");a.html("");for(var b in trash){if(trash.hasOwnProperty(b)){var c=$("<div />",{"class":"trash_item",id:trash[b].id});var d=$("<input />",{type:"checkbox","class":"trash_checkbox",name:trash[b].id});c.append(d);var e=$("<span />",{"class":"trash_content"});var f=$("<div />",{"class":"trash_subject"});var g=$("<div />");var h=trash[b].subject.replace(/<\/?[^>]+(>|$)/g,"");h=h.substr(0,25);if(h!==""){f.text(h)}else{f.html(" ")}var i=trash[b].content.replace(/<\/?[^>]+(>|$)/g,"");i=i.substr(0,35);if(i!==""){g.text(i)}else{g.html(" ")}e.append(f);e.append(g);c.append(e);a.append(c)}}if(getSize(trash)>0){$("#archive_delete").removeClass("disabled").addClass("enabled");$("#archive_restore").removeClass("disabled").addClass("enabled")}else{$("#archive_delete").removeClass("enabled").addClass("disabled");$("#archive_restore").removeClass("enabled").addClass("disabled")}}function saveNote(a,b,c){var d=JSON.stringify([a]);$.ajax({url:"/notes",async:b,type:"PUT",data:d,success:function(a){if(c!==undefined){c(a)}dumpNotes()},error:function(a){if(a.status==401){window.location=loginURL}else{alert("Failed to connect with server, if problem persists, contact the webmasters.")}}})}function deleteNote(a){var b=notes[a.attr("id")];var c=new Action;b.trash=1;var d={id:b.id};if(online){$.ajax({url:"/notes/delete",type:"PUT",data:JSON.stringify([d]),success:function(a){dumpNotes()},error:function(a){if(a.status==401){window.location=loginURL}else{alert("Failed to connect with server, if problem persists, contact the webmasters.")}}})}delete notes[b.id];trash[b.id]=b;drawTrash();a.fadeOut(350,function(){a.remove()})}function createNote(a){if(!online){return}a.stopPropagation();a.preventDefault();if(a.target!=a.currentTarget){return}var b=$("#noteArea").position();var c=a.clientX+window.scrollX-b.left;var d=a.clientY+window.scrollY-b.top;var e="";$.ajax({type:"POST",async:true,url:"/notes",success:function(a){var b=JSON.parse(a);var c=writeNote(b,true);notes[b.id]=b;dumpNotes();c.attr({contenteditable:true});c.focus()},error:function(a){if(a.status==401){window.location=loginURL}else{alert("Failed to connect with server, if problem persists, contact the webmasters.")}},data:{x:c,y:d,z:++z}})}function closeSave(a,b){var c=b.parents(".note");var d=c.attr("id");var e=new Action;e.setBefore(notes[d]);var f=c.find(".noteHeader").children().html();var g=c.find(".noteContent").children().html();notes[d].subject=f;notes[d].content=g;e.setAfter(notes[d]);e.push();var h={subject:f,content:g,id:d};if(online){saveNote(h,true)}}function dumpNotes(){window.localStorage.setItem("notes_"+username,JSON.stringify(notes))}function getTrash(){$.ajax({url:"/notes/trash",async:true,type:"GET",dataType:"json",success:function(a){trash={};$.each(a,function(b){trash[a[b].id]=a[b]});drawTrash()}})}function getNotes(){$.ajax({url:"/notes",async:true,type:"GET",dataType:"json",success:function(a){var b={};$.each(a,function(c){z=a[c].z>z?a[c].z:z;var d=a[c].z;if(!!notes[a[c].id]){notes[a[c].id].z=d;$("#"+a[c].id).css("z-index",d)}writeNote(a[c],false);delete notes[a[c].id];b[a[c].id]=a[c]});for(var c in notes){if(notes.hasOwnProperty(c)){$("#"+notes[c].id).remove()}}notes=b;dumpNotes()}})}function getSize(a){var b=0;for(var c in a){if(a.hasOwnProperty(c)){b++}}return b}"use strict";var notes={};var dragged={};var z=0;var colorsArr=["#F7977A","#C5E3BF","#C1F0F6","#FFF79A","#FDC68A","#d8bfd8"];var undoStack=new Array;var redoStack=new Array;var current;var trash={};try{if(online===undefined){var online=window.navigator.onLine;window.applicationCache.onerror=function(a){a.preventDefault();a.stopPropagation();online=false}}else{online=false}}catch(err){online=false}var userAgent=window.navigator.userAgent.toLowerCase();if(userAgent.search("iphone")>-1||userAgent.search("android")>-1){var script=$("<script />",{src:"/js/mobile.js",type:"text/javascript"});var view=$("<meta>",{name:"viewport",content:"width=device-width,initial-scale=1,maximum-scale=1"});$("head").append(view);$("body").append(script);$("#manage").addClass("left");$("#help").addClass("left");$("#logout").addClass("right");$("#undo").addClass("left right");$("#redo").addClass("right");$("#toolbar").css("width","350px");$("#righties").css({position:"static",display:"inline-block","margin-top":"5px"});$("#lefties").css({position:"static",display:"inline-block","margin-top":"5px"})}if(window.localStorage.getItem("notes_"+username)){var arr=JSON.parse(window.localStorage["notes_"+username]);for(var a in arr){if(arr.hasOwnProperty(a)){z=arr[a].z>z?arr[a].z:z;writeNote(arr[a],false);notes[arr[a].id]=arr[a]}}}if(online){getNotes();getTrash()}$(document).ready(function(){$("#noteArea").bind("dblclick",function(a){if(online){createNote(a)}});$("#check_all").bind("click",function(a){var b=$("#check_all").attr("checked");var c=$("#archived_content");if(b=="checked"){c.find(".trash_checkbox").attr({checked:"checked"})}else{c.find(".trash_checkbox").removeAttr("checked")}});$("#archive_delete").bind("click",function(a){permDelete($("#archived_content").find(":checked"))});$("#archive_restore").bind("click",function(a){restoreTrash($("#archived_content").find(":checked"))});$("#undo").bind("click",function(a){undoAction()});$("#redo").bind("click",function(a){redoAction()});$("#manage").bind("click",function(a){var b=$("#managemenu");if(b.is(":hidden")){var c=$("#archived_content");$("#noteArea").bind("click",function(a){if(a.target!=c.get()){unToggle()}});b.slideDown("slow",function(){$("#archived_content").css({"overflow-y":"auto"})})}else{unToggle()}});$(document).keyup(function(a){if(a.ctrlKey){if(a.keyCode==90){undoAction()}else if(a.keyCode==89){redoAction()}}else if(a.shiftKey){if(a.keyCode==191){if(!isEditable(a.target)){$("#help_overlay").fadeToggle("fast")}}}else if(a.keyCode==27){$("#help_overlay").fadeOut("fast");if(isEditable(a.target)){$(a.target).blur()}}});$("#help").bind("click",function(a){$("#help_overlay").fadeIn("fast")});$("#exit_help").bind("click",function(a){$("#help_overlay").fadeOut("fast")});$("#help_overlay").bind("click",function(a){if(a.target==a.currentTarget){$("#help_overlay").fadeOut("fast")}})})