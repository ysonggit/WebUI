// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
// https://github.com/simonsarris/Canvas-tutorials.git
// YANG SONG
// song24@email.sc.edu

function Point (i, j){
    this.x = i;
    this.y = j;
}

var max_x = 800, min_x = 0;
var max_y = 600, min_y = 0;
var radius = 50;
var origin = new Point(min_x, max_y);
var r_width=10, r_height=10;
var selected_id = -1;

// get mouse position on canvas based on new coordinates
function getPosition(event){
    var x = event.x;
    var y = event.y;

    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;
    y = origin.y - y;

    document.getElementById("mousepos").innerHTML= ("Position: (" + x + " , " + y+")");
}

// insert Position to table and display
function insertPosition(i, x, y){
    var ptable = document.getElementById("posetable");
    var newrow = ptable.insertRow(ptable.rows.length);
    var idcell = newrow.insertCell(0);
    var posecell = newrow.insertCell(1);
    idcell.innerHTML=i;
    var randangle= Math.random() * 2 * Math.PI; // random number between 0 to 2PI
    randangle = Math.round(randangle * 100)/100;
    posecell.innerHTML=x+", "+y+", "+randangle.toString();
}

function updateTable(i, x, y){
    var ptable = document.getElementById("posetable");
    var posecell = ptable.rows[i].cells[1];
    // update ptable
    var randangle= Math.random() * 2 * Math.PI; // random number between 0 to 2PI
    randangle = Math.round(randangle * 100)/100;
    posecell.innerHTML=x+", "+y+", "+randangle.toString();
}

function Shape(x, y, w, h, fillcolor){
    this.x = x;
    this.y = y;
    this.w = h || 3;
    this.h = h || 3;
    this.fill = fillcolor || "rgba(255,0,0,0.5)";
}

Shape.prototype.draw = function (context){
    context.fillStyle = this.fill;
    context.fillRect(this.x, this.y, this.w, this.h);
}

Shape.prototype.drawText = function (context, i){
    context.font="18px Arial";
    context.fillStyle= "black";
    context.fillText((i+1).toString(), this.x+this.w, this.y+this.h+this.h);
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  return  (this.x <= mx) && (this.x + this.w >= mx) &&
          (this.y <= my) && (this.y + this.h >= my);
}

Shape.prototype.drawLine = function (context, neighbor){
    context.strokeStyle ="blue";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(this.x+this.w/2, this.y+this.h/2);
    context.lineTo(neighbor.x+neighbor.w/2, neighbor.y+neighbor.h/2);
    context.stroke();
}

Shape.prototype.isNeighbor = function (s, radius){
    if(Math.pow(s.x-this.x, 2) + Math.pow(s.y - this.y, 2) <= Math.pow(radius, 2) ) return true;
    return false;
}

function CanvasState(canvas){
    // **** First some setup! ****
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
    // This complicates things a little but but fixes mouse co-ordinate problems
    // when there's a border or padding. See getMouse for more detail
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
        this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
        this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
        this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
    }
    // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
    // They will mess up mouse coordinates and this fixes that
    // this part is very necessary!
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // **** Keep track of state! ****
    this.valid = false; // when set to false, the canvas will redraw everything
    this.shapes = [];  // the collection of things to be drawn
    this.dragging = false; // Keep track of when we are dragging
    // the current selected object. In the future we could turn this into an array for multiple selection
    this.selection = null;
    this.dragoffx = 0; // See mousedown and mousemove events for explanation
    this.dragoffy = 0;
    
    // **** Then events! ****
    
    // This is an example of a closure!
    // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
    // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
    // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
    // This is our reference!
    var myState = this;
    
    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
    // Up, down, and move are for dragging
    canvas.addEventListener('mousedown', function(e) {
        var mouse = myState.getMouse(e);
        var mx = mouse.x;
        var my = mouse.y;
        var shapes = myState.shapes;
        var l = shapes.length;
        for (var i = l-1; i >= 0; i--) {
            if (shapes[i].contains(mx, my)) {
                var mySel = shapes[i];
                selected_id = i+1;
                // Keep track of where in the object we clicked
                // so we can move it smoothly (see mousemove)
                myState.dragoffx = mx - mySel.x;
                myState.dragoffy = my - mySel.y;
                myState.dragging = true;
                myState.selection = mySel;
                myState.valid = false;
                return;
            }
        }
        // havent returned means we have failed to select anything.
        // If there was an object selected, we deselect it
        if (myState.selection) {
            myState.selection = null;
            myState.valid = false; // Need to clear the old selection border
        }
    }, true);
    canvas.addEventListener('mousemove', function(e) {
        getPosition(e);
        if (myState.dragging){
            var mouse = myState.getMouse(e);
            // We don't want to drag the object by its top-left corner, we want to drag it
            // from where we clicked. Thats why we saved the offset and use it here
            myState.selection.x = mouse.x - myState.dragoffx;
            myState.selection.y = mouse.y - myState.dragoffy;   
            myState.valid = false; // Something's dragging so we must redraw
            updateTable(selected_id, myState.selection.x, myState.selection.y); // update table pose
        }
    }, true);
    canvas.addEventListener('mouseup', function(e) {
        myState.dragging = false;
    }, true);
    // double click for making new shapes
    canvas.addEventListener('dblclick', function(e) {
        var mouse = myState.getMouse(e);
        var rid = myState.shapes.length+1;
        var pose_x = mouse.x;
        var pose_y = origin.y - mouse.y;
        insertPosition(rid, pose_x, pose_y);
        myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 10, 10, 'rgba(255,0,0,.8)'));
    }, true);
    
    this.selectionColor = '#AAAAAA';
    this.selectionWidth = 2;  
    this.interval = 30;
    setInterval(function() { myState.draw(); }, myState.interval);
}

CanvasState.prototype.addShape = function(shape) {
    this.shapes.push(shape);
    this.valid = false;
}

CanvasState.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
    // if our state is invalid, redraw and validate!
    if (!this.valid) {
        var ctx = this.ctx;
        var shapes = this.shapes;
        this.clear();

        // ** Add stuff you want drawn in the background all the time here **
        var delta = 20;
        // draw grids
        for(var x=min_x+0.5; x <= max_x; x+= delta){
            ctx.moveTo(x, min_y);
            ctx.lineTo(x, max_y);
        }
        for(var y=min_y+0.5; y <= max_y; y+= delta){
            ctx.moveTo(min_x, y);
            ctx.lineTo(max_x, y);
        }
        ctx.lineWidth=1;
        ctx.strokeStyle="#ccc";
        ctx.stroke();

        ctx.lineWidth=3;
        ctx.strokeStyle="#00000A";
        // draw x y axis
        // y axis
        ctx.beginPath();
        ctx.moveTo(min_x, max_y);
        ctx.lineTo(max_x, max_y);
        ctx.closePath();
        ctx.stroke();
        // x axis
        ctx.beginPath();
        ctx.moveTo(min_x, max_x);
        ctx.lineTo(min_x, min_x);
        ctx.closePath();
        ctx.stroke();

        // draw all shapes
        var l = shapes.length;
        for (var i = 0; i < l; i++) {
            var shape = shapes[i];
            // We can skip the drawing of elements that have moved off the screen:
            if (shape.x > this.width || shape.y > this.height ||
                shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
            shapes[i].draw(ctx);
            shapes[i].drawText(ctx, i);
        }
        for (var i=0; i<l; i++){
            for(var j = 0; j<l; j++){
                if(i!= j){
                    if(shapes[i].isNeighbor(shapes[j], radius)){
                        shapes[i].drawLine(ctx, shapes[j]);
                    }
                }
            }
        }
        // draw selection
        // right now this is just a stroke along the edge of the selected Shape
        if (this.selection != null) {
            ctx.strokeStyle = this.selectionColor;
            ctx.lineWidth = this.selectionWidth;
            var mySel = this.selection;
            ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
        }
        
        // ** Add stuff you want drawn on top all the time here **
        this.valid = true;
    }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
    var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
    
    // Compute the total offset
    if (element.offsetParent !== undefined) {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;
    
    // We return a simple javascript object (a hash) with x and y defined
    return {x: mx, y: my};
}


function init() {
    var cs = new CanvasState(document.getElementById('canvas'));
}

function download(filename) {
    var pom = document.createElement('a');
    var ptable = document.getElementById("posetable");
    var text="";
    for (var i = 1, row; row = ptable.rows[i]; i++) {
        //iterate through rows
        //rows would be accessed using the "row" variable assigned in the for loop
        text = text + row.cells[1].innerHTML+"\n";
    }
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}




