/*******************************************************************
 * File: TracerMain.js
 * Author: Aniket Dashpute
 * Credits: Built from starter code by Prof. Jack Tumblin
 * Northwestern University
*******************************************************************/

// Global Variables  
// (These are almost always a BAD IDEA, but here they eliminate lots of
// tedious function arguments. 
// Later, collect them into just a few global, well-organized objects!)

/// For WebGL usage:
// WebGL rendering context -- the 'webGL' object
// in JavaScript with all its member fcns & data
var gl;

// HTML-5 'canvas' element ID#
var g_canvasID;

/// Mouse,keyboard, GUI variables:
// Holds all (Graphical) User Interface fcns & vars, for
// keyboard, mouse, HTML buttons, window re-sizing, etc.
// Holds all camera-setting vars too:
// gui.camFovy, gui.camAspect, gui.camNear
// gui.camEyePt, gui.camAimPt, gui.camUpVec
var gui = new GUIbox();


/// For the VBOs & Shaders:
// For WebGLpreview: holds one VBO and its shaders
preView = new VBObox0();
// for displaying the ray-tracing results.
rayView = new VBObox1();

/// Ray Tracer Objects:
// Create a floating-point image-buffer 
// object to hold the image created by 'g_myScene' object.
// CAUTION! WebGL 1.0 texture maps  require power-of-two sizes
// (256, 512,1024,2048,etc).
var g_myPic = new CImgBuf(512,512);

// Create our ray-tracing object; 
// this contains our complete 3D scene & its camera 
// used to write a complete ray-traced image to the
// CImgBuf object 'g_myPic' given as argument.
var g_myScene = new CScene();

// scene-selector number; 0,1,2,... G_SCENE_MAX-1
var g_SceneNum = 0;
// Number of scenes defined.
var G_SCENE_MAX = 3;

// Antialiasing setting: 1 == NO antialiasing at all. 
// 2,3,4... == supersamples: 2x2, 3x3, 4x4, ...
var g_AAcode = 1;

// highest super-sampling number allowed. 
var G_AA_MAX = 4;
// ==1 for jitter, ==0 for no jitter.
var g_isJitter = 0;

function main()
{
    // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
    g_canvasID = document.getElementById('webgl');	

    // disables HTML-5's default screen-clearing
    // until we call the gl.clear(COLOR_BUFFER_BIT); function
    gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
    if (!gl)
    {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // set RGBA color for clearing <canvas>
    gl.clearColor(0.2, 0.2, 0.2, 1);
    // CAREFUL! don't do depth tests for 2D!
    gl.enable(gl.DEPTH_TEST);
    
    // Register all Mouse & Keyboard Event-handlers
    // (see JT_GUIbox-Lib.js)
    gui.init();
    
    // initialize our ray-tracer (to default scene)
    g_myScene.initScene(0);
    
    // Initialize each of our 'vboBox' objects: 
    // VBO + shaders + uniforms + attribs for WebGL preview
    preView.init(gl);
    // to display ray-traced on-screen result
    rayView.init(gl);

    // Re-size this canvas before we use it. (ignore the size settings from our HTML file;
    // fill browser window with canvas whose width is twice its height.)
    onBrowserResize();

    drawAll();

    // OPTIONAL: do all the things done by 't' key; 
    // make our initial ray-traced image automatically:

    // run the ray-tracer
    g_myScene.makeRayTracedImage();
    // be sure OUR VBO & shaders are in use, then
    rayView.switchToMe();
    // re-transfer VBO contents and texture-map contents
    rayView.reload();
    // re-draw BOTH viewports.
    drawAll();
  
    //----------------------------------------------------------------------------
    // NOTE! Our ray-tracer ISN'T 'animated' in the usual sense!
    // --No 'tick()' function, no continual automatic re-drawing/refreshing.
    // --Instead, call 'drawAll()' after user makes an on-screen change, e.g. after
    // mouse drag, after mouse click, after keyboard input, and after ray-tracing.
    // --You can also re-draw screen to show ray-tracer progress on-screen:
    //  try calling drawAll() after ray-tracer finishes each set of 16 scanlines,
    //  or perhaps re-draw after every 1-2 seconds of ray-tracing.
    //----------------------------------------------------------------------------

    /*
    // TEST ray-transformations:
    var test = new CGeom();
    test.rayTranslate(3,4,5);
    var rayBgn = new CRay();
    var rayEnd = new CRay();
    rayBgn.printMe('rayBgn');
    vec4.transformMat4(rayEnd.orig, rayBgn.orig, test.worldRay2model);
    vec4.transformMat4(rayEnd.dir,  rayBgn.dir,  test.worldRay2model);
    rayBgn.printMe('rayBgn');
    rayEnd.printMe('rayEnd');
    console.log('Now rotate by 90 around x axis:');
    test.rayRotate(0.5*Math.PI, 1,0,0);
    vec4.transformMat4(rayEnd.orig, rayBgn.orig, test.worldRay2model);
    vec4.transformMat4(rayEnd.dir,  rayBgn.dir,  test.worldRay2model);
    rayBgn.printMe('rayBgn');
    rayEnd.printMe('rayEnd');
    */  
}

function print_mat4(a, nameStr)
{
//==============================================================================
// Pretty-print contents of a glMatrix 4x4 matrix object in console.
// Used in test_glMatrix() function below; a handy debugging tool too.
    //'String.padStart()' leaves space for minus sign & 2
  var res = 3;    // resolution: how many digits to print after decimal point.

// TRICKY: for all matrix elements,
// FIND largest # of digits in front of decimal point.
// -----------------
  var cnt, iVal;    // array index; integer part of a[cnt],
  var len=0, pad=0; // # digits in iVal, largest len value found.
  for(cnt=0,len=0; cnt<16; cnt++) {
    iVal = Math.floor(a[cnt]);
    len = iVal.toString().length;
    if(len > pad) pad = len;
 //   console.log('floor(a[', cnt, ']) length: ', iVal.toString().length);
  }
  pad = pad+res+1;  // enough room for leading digits, trailing digits + sign
//  console.log("pad:", pad);
	console.log( '\n-------',nameStr,'-------\n',
'row0=[' + a[ 0].toFixed(res).padStart(pad, " ") + ', '
         + a[ 4].toFixed(res).padStart(pad, " ") + ', '
         + a[ 8].toFixed(res).padStart(pad, " ") + ', '
         + a[12].toFixed(res).padStart(pad, " ") + ']\n',
'row1=[' + a[ 1].toFixed(res).padStart(pad, " ") + ', '
         + a[ 5].toFixed(res).padStart(pad, " ") + ', '
         + a[ 9].toFixed(res).padStart(pad, " ") + ', '
         + a[13].toFixed(res).padStart(pad, " ") + ']\n',
'row2=[' + a[ 2].toFixed(res).padStart(pad, " ") + ', '
         + a[ 6].toFixed(res).padStart(pad, " ") + ', '
         + a[10].toFixed(res).padStart(pad, " ") + ', '
         + a[14].toFixed(res).padStart(pad, " ") + ']\n',
'row3=[' + a[ 3].toFixed(res).padStart(pad, " ") + ', '
         + a[ 7].toFixed(res).padStart(pad, " ") + ', '
         + a[11].toFixed(res).padStart(pad, " ") + ', '
         + a[15].toFixed(res).padStart(pad, " ") + ']\n' );
}

function test_glMatrix() {
//=============================================================================
// Make sure that the fast vector/matrix library we use is available and works 
// properly. My search for 'webGL vector matrix library' found the GitHub 
// project glMatrix is intended for WebGL use, and is very fast, open source 
// and well respected.		 	SEE:       http://glmatrix.net/
// 			NOTE: cuon-matrix.js library (supplied with our textbook: "WebGL 
// Programming Guide") duplicates some of the glMatrix.js functions. For 
// example, the glMatrix.js function 		mat4.lookAt() 		is a work-alike 
//	 for the cuon-matrix.js function 		Matrix4.setLookAt().
// Try some vector vec4 operations:

	var myV4 = vec4.fromValues(1,8,4,7);				// create a 4-vector 
																							// (without 'var'? global scope!)
  console.log('-----TEST------\n-----glMatrix.js library------------');
  var outV4 = vec4.create();
  console.log('0):\n var outV4 = vec4.create();\n result:');
  console.log('outV4 object:\n ', outV4);
  console.log('\n outV4[0]: ', outV4[0], 
              '\n outV4[1]: ', outV4[1],
              '\n outV4[2]: ', outV4[2],
              '\n outV4[3]: ', outV4[3] );
  console.log('1):\n var myV4 = vec4.fromValues(1,8,4,7);  result:\n', myV4);
	console.log('\n myV4[0] = ', myV4[0],
	            '\n myV4[1] = ', myV4[1],
	            '\n myV4[2] = ', myV4[2],
	            '\n myV4[3] = ', myV4[3] );
	console.log("  **OR** use the vec4.str() member function that returns the",
	            " vector as a string, so that: console.log(vec4.str(myV4));");
	console.log("will print: \n ", vec4.str(myV4));
			
	console.log('2):\n var yerV4 = vec4.fromValues(1,1,1,1); result:');
	var yerV4 = vec4.fromValues(1,1,1,1);
	console.log('\n yerV4[] object:\n ', yerV4); 
	console.log('or if we print the vec4.str(yerV4) string:', vec4.str(yerV4));
	console.log('3):\n vec4.subtract(outV4, yerV4, myV4);\n');
	vec4.subtract(outV4, yerV4, myV4);
		console.log('\n RESULT: outV4[] object:\n ', outV4);
	console.log("or print string from vec4.str(myV4):\n", vec4.str(myV4));

	console.log('4):=================\n  4x4 Matrix tests:\n4):=================\n',
	            '  var myM4 = mat4.create();\n   ',
	            '("creates" a 4x4 identity matrix)'); 
	            // Try some matrix mat4 operations:
	var myM4 = mat4.create();							// create a 4x4 matrix
	console.log('\n print myM4 object:\n ', myM4);
	console.log('\nHmmm. Is this "row-major" order? \n',
	            ' (Starts at upper left,\n',   
	            '  right-to-left on top row,\n',
	            '  repeat on next-lower row, etc)?');
	console.log('\nOr is it "column-major" order?\n',
	            ' (Starts at upper left,\n',
	            '  top-to-bottom on left column,\n',
	            '  repeat on next-rightwards column, etc)?');
	// Nice illustration: https://en.wikipedia.org/wiki/Row-_and_column-major_order 
	
	console.log('\nMake a translate matrix from a vec3 or vec4 displacement to find out:\n',
	            'var transV3 = vec3.fromValues(0.6,0.7,0.8);\n',
				'var transV4 = vec4.fromValues( 6, 7, 8, 9):\n');
	var transV3 = vec3.fromValues(0.60, 0.70, 0.80); // a 3D translation vector
	var transV4 = vec4.fromValues(6,7,8,9);       // a '4D' translation vector
	console.log('\n mat4.translate(myM4, myM4, transV3);\n',
	            '   (this means: myM4 = myM4 translated by transV3)');
	mat4.translate(myM4, myM4, transV3);	// make into translation matrix
  console.log('\n print myM4 object made from transV3:', myM4);
  myM4 = mat4.create();
	mat4.translate(myM4, myM4, transV4);
  console.log('\n print myM4 object made from transV4:', myM4);
  console.log("AHA!! As you can see, mat4.translate() IGNORES the vec4 'w' value. Good!")
	//---------------------------------------------------------------------------
	// As you can see, the 'mat4' object stores matrix contents in COLUMN-first 
	// order; to display this translation matrix correctly, do this
	// (suggests you might want to add another'print()' function for 
	//  vec2, vec3, vec4, mat2, mat3, mat4): 
	console.log('\n !AHA! COLUMN-MAJOR order:\n',
	 'top-to-bottom starting at leftmost column.\n',
	 'I wrote a print_mat4() fcn (just above)--\n',
	 'Call print_mat4(myM4,"Translation matrix myM4"):');
	 print_mat4(myM4, "Translation matrix myM4");
 // re-sizing text for print_mat4() function
  console.log("check print_mat4() resizing by setting myMat elements to varied digits:");
  var myMat = mat4.create();  
  myMat[ 0] = 0.9876543;
  myMat[ 1] = -0.9876543;
  myMat[ 2] = 1.9876543;
  myMat[ 3] = -1.9876543;
  myMat[ 4] = 12.9876543;
  myMat[ 5] = -12.9876543;
  myMat[ 6] = 123.9876543;
  myMat[ 7] = -123.9876543;
  myMat[ 8] = 1234.9876543;
  myMat[ 9] = -1234.9876543;
  myMat[10] = 12345.9876543;
  myMat[11] = -12345.9876543;
  myMat[12] = 123456.9876543;
  myMat[13] = -123456.9876543;
  print_mat4(myMat, "myMat"); 

	console.log('SUGGESTION:\n write similar fcns for mat2,mat3, vec2,vec3,vec4,',
				' OR look into later versions of the glMatrix library...');

	// Now test glMatrix concatenation;
  console.log('\n---------------------------',
              '\n Matrix Concatenation.',
              '\n---------------------------',
              '\n  glMatrix offers composable transform functions such as',
              '\n     mat4.translate(out,a,v)',
              '\n     mat4.rotate(out,a,rad,axis)',
              '\n     mat4.scale(out,a,v)');
  console.log('\n? HOW do these fcns compute [out]',
              "\n from input matrix [a] and the function's",
              '\n newly-specified transform matrix [NEW]?',
              '\n ??? Does it compute [out] = [a][NEW]?',
              '\n ??? or does it find [out] = [NEW][a]?');
  console.log('Try it:\n',
              'var rotM4 = mat4.create(); //4x4 identity matrix');
  var rotM4 = mat4.create();
  console.log('\n Then mat4.rotateZ(rotM4, rotM4, glMatrix.toRadians(30.0);');
  mat4.rotateZ(rotM4, rotM4, glMatrix.toRadian(30.0));
  print_mat4(rotM4,"rotM4 == z-axis rotation +30deg");
  console.log('now "translate" rotM4:\n',
              ' mat4.translate(outM4, rotM4, [5,0,0]);');
  var outM4 = mat4.create();
  mat4.translate(outM4, rotM4, [5,0,0]);
  print_mat4(outM4,"outM4 == rotM4 then translate(5,0,0)");
  console.log("=======\n !YES! \n=======\nthat's what we wanted!");
  console.log (' We have [rot][NEW],',
              '\n just like cuon-matrix.js',
              '\n== we transform drawing axes, not vertex coords',
              '("Method2" in lecture notes).');
/*
// DOUBLE-CHECK using matrix multiply:
  console.log('=============\n',
  '--DOUBLE-CHECK-- this result using matrix multiply:');
  var trnM4 = mat4.create();
  mat4.translate(trnM4, trnM4, [5,0,0]);
  print_mat4(trnM4,"trnM4==translate(5,0,0)");
  print_mat4(rotM4,"rotM4==rotateZ(+30deg)");  
  mat4.multiply(outM4,rotM4,trnM4); //  multiply(out,a,b) finds [out] = [a][b];
  print_mat4(outM4,"outM4==[rotM4][trnM4]");
  console.log(" --------YES! [rotM4][trnM4] is what we want.");
  mat4.multiply(outM4,trnM4,rotM4); // multiply in opposite order
  print_mat4(outM4,"outM4==[trnM4][rotM4]");
  console.log(" xxxxxxxx NO! [trnM4][rotM4] IS NOT what we want.");
*/
}

function drawAll()
{
    // Re-draw all WebGL contents in our browser window.

    // Clear <canvas> color AND DEPTH buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Draw in the LEFT viewport:
    // CHANGE from our default viewport:
    // gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    // to a half-width viewport on the LEFT side of the canvas:
    // gl.viewport(Viewport lower-left corner (x,y), viewport (width, height))
    gl.viewport(0, 0, gl.drawingBufferWidth/2, gl.drawingBufferHeight);

    // Set WebGL to render from this VBObox.
    preView.switchToMe();
    // Send new values for uniforms to the GPU, and
    preView.adjust();
    // draw our VBO's contents using our shaders.
    preView.draw();

    // Draw in the RIGHT viewport:
    // MOVE our viewport from the left half of the canvas to the right:
    // gl.viewport(Viewport lower-left corner (x,y), viewport (width, height))
    gl.viewport(gl.drawingBufferWidth/2, 0, gl.drawingBufferWidth/2, gl.drawingBufferHeight);

    // Set WebGL to render from this VBObox.
    rayView.switchToMe();
    // Send new values for uniforms to the GPU, and
    rayView.adjust();
    // draw our VBO's contents using our shaders.
    rayView.draw();
}

function onSuperSampleButton()
{
    // advance to the next antialiasing mode.
    //console.log('ON-SuperSample BUTTON!');
    g_AAcode += 1;
    // 1,2,3,4, 1,2,3,4, 1,2,... etc
    if(g_AAcode > G_AA_MAX) g_AAcode = 1;
    // report it:
    if(g_AAcode==1)
    {
        if(g_isJitter==0)
        {
            document.getElementById('AAreport').innerHTML = 
            "1 sample/pixel. No jitter.";
            console.log("1 sample/pixel. No Jitter.");
        } 
        else
        {
            document.getElementById('AAreport').innerHTML = 
            "1 sample/pixel, but jittered.";
            console.log("1 sample/pixel, but jittered.")
        } 
    }
    else // g_AAcode !=1
    {
        if(g_isJitter==0)
        {
            document.getElementById('AAreport').innerHTML = 
            g_AAcode+"x"+g_AAcode+" Supersampling. No jitter.";
            console.log(g_AAcode,"x",g_AAcode,"Supersampling. No Jitter.");
        } 
        else
        {
            document.getElementById('AAreport').innerHTML = 
            g_AAcode+"x"+g_AAcode+" JITTERED Supersampling";
            console.log(g_AAcode,"x",g_AAcode," JITTERED Supersampling.");
        }
    }
}

function onJitterButton()
{
    console.log('ON-JITTER button!!');
    // toggle 0,1,0,1,...
    if(g_isJitter ==0) g_isJitter = 1;
    else g_isJitter = 0;

    // report it:
    if(g_AAcode==1)
    {
        if(g_isJitter==0)
        {
            document.getElementById('AAreport').innerHTML = 
            "1 sample/pixel. No jitter.";
            console.log("1 sample/pixel. No Jitter.");
        } 
        else
        {
            document.getElementById('AAreport').innerHTML = 
            "1 sample/pixel, but jittered.";
            console.log("1 sample/pixel, but jittered.")
        } 
    }
    else // g_AAcode !=0
    { 
        if(g_isJitter==0)
        {
            document.getElementById('AAreport').innerHTML = 
            g_AAcode+"x"+g_AAcode+" Supersampling. No jitter.";
            console.log(g_AAcode,"x",g_AAcode,"Supersampling. No Jitter.");
        } 
        else
        {
            document.getElementById('AAreport').innerHTML = 
            g_AAcode+"x"+g_AAcode+" JITTERED Supersampling";
            console.log(g_AAcode,"x",g_AAcode," JITTERED Supersampling.");
        }
    }
}

function onSceneButton()
{
    //console.log('ON-SCENE BUTTON!');
    if(g_SceneNum < 0 || g_SceneNum >= G_SCENE_MAX) g_SceneNum = 0;
    else g_SceneNum = g_SceneNum +1;

    document.getElementById('SceneReport').innerHTML = 'Show Scene Number' + g_SceneNum;

    // Change g_myPic contents:
    g_myPic.setTestPattern(g_SceneNum);
    // transfer g_myPic's new contents to the GPU;
    
    // be sure OUR VBO & shaders are in use, then
    rayView.switchToMe();
    // re-transfer VBO contents and texture-map contents
    rayView.reload();
    drawAll();
}

function onBrowserResize()
{
    // Called when user re-sizes their browser window , because our HTML file
    // contains:  <body onload="main()" onresize="onBrowserResize()">

    //Make a square canvas/CVV fill the SMALLER of the width/2 or height:

    // fit to brower-window height
    if(innerWidth > 2*innerHeight)
    {
        // (with 20-pixel margin)
        g_canvasID.width = 2*innerHeight - 20;
        // (with 20-pixel margin)
        g_canvasID.height = innerHeight - 20;
    }
    else // fit canvas to browser-window width
    {
        // (with 20-pixel margin)
        g_canvasID.width = innerWidth - 20;
        // (with 20-pixel margin)
        g_canvasID.height = 0.5*innerWidth - 20;
    }

    // console.log('NEW g_canvas width,height=' + g_canvasID.width + ', ' + g_canvasID .height);

    // re-draw browser contents using the new size.
    drawAll();
}
