//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings,
//  lets me see EXACTLY what the editor's 'line-wrap' feature will do.)

//===  JT_tracer0-Scene.js  ===================================================
// The object prototypes here and in related files (and their comments):
//      JT_tracer1-Camera.js
//      JT_tracer2-Geom.js
//      JT_tracer3-ImgBuf.js
// are suitable for any and all features described in the Ray-Tracing Project 
// Assignment Sheet for EECS 351-2 Intermediate Computer Graphics.
//
// HOWEVER, they're not required, nor even particularly good:
//				(notably awkward style from their obvious C/C++ origins) 
// They're here to help you get 'started' on better code of your own,
// and to help you avoid common structural 'traps' in writing ray-tracers
//		that might otherwise force ugly/messy refactoring later, such as:
//  --lack of a well-polished vector/matrix library; e.g. open-src glmatrix.js
//  --lack of floating-point RGB values to compute light transport accurately,
//	--no distinct 'camera' and 'image' objects or 'trace' and 'display' funcs to 
// 		separate slow ray-tracing steps from fast screen-display and refresh.
//	--lack of ray-trace image-buffer (window re-size would discard your work!) 
//  --lack of texture-mapped image display; permits ray-traced image of any 
//		resolution to display on any screen at any desired image size
//	--ability to easily match OpenGL/WebGL functions with ray-tracing results, 
//		using identically-matching ray-tracing functions for cameras, views, 
//		transformations, lighting, and materials (e.g. rayFrustum(), rayLookAt(); 
//		rayTranlate(), rayRotate(), rayScale()...)
//  --a straightforward method to implement scene graphs & jointed objects. 
//		Do it by transforming world-space rays to model coordinates, rather than 
//		models to world coords, using a 4x4 worl2model matrix stored in each 
//		model (each CGeom primitive).  Set it by OpenGL-like functions 
//		rayTranslate(), rayRotate(), rayScale(), etc.
//  --the need to describe geometry/shape independently from surface materials,
//		and to select material(s) for each shape from a list of materials;
//  --materials that permit procedural 3D textures, turbulence & Perlin Noise,  
//	--objects for independent light sources, ones that can inherit their 
//    location(s) from a geometric shape (e.g. a light-bulb shape).
//  --need to create a sortable LIST of ray/object hit-points, and not just
//		the intersection nearest to the eyepoint, to enable shape-creation by
//		Constructive Solid Geometry (CSG), alpha-blending, & ray root-finding.
//  --functions organized well to permit easy recursive ray-tracing:  don't 
//		tangle together ray/object intersection-finding tasks with shading, 
//		lighting, and materials-describing tasks.(e.g. traceRay(), findShade() )

/*
-----------ORGANIZATION:-----------
I recommend using just one or two global top-level objects (put above main() )
  g_myPic == new CImgBuf(512,512);  // your 'image buffer' object to hold 
                                    // a floating-point ray-traced image, and
	g_myScene = new CScene();         // your ray-tracer, which can fill any
	                                  // CImgBuf 'image buffer' you give to it.
	g_myScene.setImgBuf(g_myPic);     // Sets ray-tracers destination. 
	g_myScene.initScene(num);         // Sets up selected 3D scene for ray-tracer;
	                                  // Ready to trace!
		
One CScene object contains all parts of our ray-tracer: 
  its camera (CCamera) object, 
  its collection of 3D shapes (CGeom), 
  its collection of light sources (CLight), 
  its collection of materials (CMatl), and more.  
When users press the 'T' or 't' key (see GUIbox method gui.keyPress() ), 
  the program starts ray-tracing:
  -- it calls the CScene method 'MakeRayTracedImage()'. This top-level function 
  fills each pixel of the CImgBuf object (e.g. g_myPic) that was set as its
  'destination' by calling the CScene.setImgBuf() function.
  This 'makeRayRacedImage() function orchestrates creation and recursive tracing 
  of millions of rays to find the on-screen color of each pixel in the CImgBuf
  object set as its destination (g_myPic).
  The CScene object also contains & uses:
		--CRay	== a 3D ray object in an unspecified coord. system (usually 'world').
		--CCamera == ray-tracing camera object defined the 'world' coordinate system.
		--CGeom	== a 3D geometric shape object for ray-tracing (implicit function).
		  The 'item[]' array holds all CGeom objects for a scene.
		--CHit == an object that describes how 1 ray pierced the surface of 1 shape; 
		--CHitList == an object that holds an array of all CHit objects found for
		   1 ray traced thru entire CScene. (Later ray-tracer versions have multiple
		   CHitList objects due to recursive ray-tracing.  One CHitList object for 
		   the eyeRay; another for rays recursively-traced from eye-ray hit-points,
		   such as rays for shadow, reflection, transparency, etc.)
*/

//----------------------------------------------------------------------------
// NOTE: JavaScript has no 'class-defining' statements or declarations: instead
// we simply create a new object type by defining its constructor function, and
// add member methods/functions using JavaScript's 'prototype' feature.
// SEE: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype 
//----------------------------------------------------------------------------

var g_t0_MAX = 1.23E16;  // 'sky' distance; approx. farthest-possible hit-point.

function CHit() {
//=============================================================================
// Describes one ray/object intersection point that was found by 'tracing' one
// ray through one shape (through a single CGeom object, held in the
// CScene.item[] array).
// CAREFUL! We don't use isolated CHit objects, but instead gather all the CHit
// objects for one ray in one list held inside a CHitList object.
// (CHit, CHitList classes are consistent with the 'HitInfo' and 'Intersection'
// classes described in FS Hill, pg 746).

    this.hitGeom = null;        // (reference to)the CGeom object we pierced in
                                //  in the CScene.item[] array (null if 'none').
                                // NOTE: CGeom objects describe their own
                                // materials and coloring (e.g. CMatl).
// TEMPORARY: replaces traceGrid(),traceDisk() return value
this.hitNum = -1; // SKY color

    this.t0 = g_t0_MAX;         // 'hit time' parameter for the ray; defines one
                                // 'hit-point' along ray:   orig + t*dir = hitPt.
                                // (default: t set to hit very-distant-sky)
    this.hitPt = vec4.create(); // World-space location where the ray pierced
                                // the surface of a CGeom item.
    this.surfNorm = vec4.create();  // World-space surface-normal vector at the 
                                //  point: perpendicular to surface.
    this.viewN = vec4.create(); // Unit-length vector from hitPt back towards
                                // the origin of the ray we traced.  (VERY
                                // useful for Phong lighting, etc.)
    this.isEntering=true;       // true iff ray origin was OUTSIDE the hitGeom.
                                //(example; transparency rays begin INSIDE).
                                
    this.modelHitPt = vec4.create(); // the 'hit point' in model coordinates.
    // *WHY* have modelHitPt? to evaluate procedural textures & materials.
    //      Remember, we define each CGeom objects as simply as possible in its
    // own 'model' coordinate system (e.g. fixed, unit size, axis-aligned, and
    // centered at origin) and each one uses its own worldRay2Model matrix
    // to customize them in world space.  We use that matrix to translate,
    // rotate, scale or otherwise transform the object in world space.
    // This means we must TRANSFORM rays from the camera's 'world' coord. sys.
    // to 'model' coord sys. before we trace the ray.  We find the ray's
    // collision length 't' in model space, but we can use it on the world-
    // space rays to find world-space hit-point as well.
    //      However, some materials and shading methods work best in model
    // coordinates too; for example, if we evaluate procedural textures
    // (grid-planes, checkerboards, 3D woodgrain textures) in the 'model'
    // instead of the 'world' coord system, they'll stay 'glued' to the CGeom
    // object as we move it around in world-space (by changing worldRay2Model
    // matrix), and the object's surface patterns won't change if we 'squeeze' 
    // or 'stretch' it by non-uniform scaling.
    this.colr = vec4.clone(g_myScene.skyColor);   // set default as 'sky'
                                // The final color we computed for this point,
                                // (note-- not used for shadow rays).
                                // (uses RGBA. A==opacity, default A=1=opaque.
}

CHit.prototype.init  = function() {
//==============================================================================
// Set this CHit object to describe a 'sky' ray that hits nothing at all;
// clears away all CHit's previously-stored description of any ray hit-point.
  this.hitGeom = -1;            // (reference to)the CGeom object we pierced in
                                //  in the CScene.item[] array (null if 'none').
this.hitNum = -1; // TEMPORARY:
  // holds traceGrid() or traceDisk() result.

  this.t0 = g_t0_MAX;           // 'hit time' for the ray; defines one
                                // 'hit-point' along ray:   orig + t*dir = hitPt.
                                // (default: giant distance to very-distant-sky)
  vec4.set(this.hitPt, this.t0, 0,0,1); // Hit-point: the World-space location 
                                //  where the ray pierce surface of CGeom item.
  vec4.set(this.surfNorm,-1,0,0,0);  // World-space surface-normal vector 
                                // at the hit-point: perpendicular to surface.
  vec4.set(this.viewN,-1,0,0,0);// Unit-length vector from hitPt back towards
                                // the origin of the ray we traced.  (VERY
                                // useful for Phong lighting, etc.)
  this.isEntering=true;         // true iff ray origin was OUTSIDE the hitGeom.
                                //(example; transparency rays begin INSIDE).                                
  vec4.copy(this.modelHitPt,this.hitPt);// the 'hit point' in model coordinates.
}
 

function CHitList() {
//=============================================================================
// Holds ALL ray/object intersection results from tracing a single ray(CRay)
// sent through ALL shape-defining objects (CGeom) in in the item[] array in 
// our scene (CScene).  A CHitList object ALWAYS holds at least one valid CHit 
// 'hit-point', as we initialize the pierce[0] object to the CScene's 
//  background color.  Otherwise, each CHit element in the 'pierce[]' array
// describes one point on the ray where it enters or leaves a CGeom object.
// (each point is in front of the ray, not behind it; t>0).
//  -- 'iEnd' index selects the next available CHit object at the end of
//      our current list in the pierce[] array. if iEnd=0, the list is empty.
//  -- 'iNearest' index selects the CHit object nearest the ray's origin point.
	//
	//
	//
	//
	//  	YOU WRITE THIS!  
	//
	//
	//
	//
	//
}



function CScene() {
//=============================================================================
// This is a complete ray tracer object prototype (formerly a C/C++ 'class').
//      My code uses just one CScene instance (g_myScene) to describe the entire 
//			ray tracer.  Note that I could add more CScene objects to make multiple
//			ray tracers (perhaps run on different threads or processors) and then 
//			combine their results into a giant video sequence, a giant image, or 
//			use one ray-traced result as input to make the next ray-traced result.
//
//The CScene prototype includes:
// One CImgBuf object 'imgBuf' used to hold ray-traced result image.
//      (see CScene.setImgBuf() method below)
// One CCamera object that describes an antialiased ray-tracing camera;
//      in my code, it is the 'rayCam' variable within the CScene prototype.
//      The CCamera class defines the SOURCE of rays we trace from our eyepoint
//      into the scene, and uses those rays to set output image pixel values.
// One CRay object 'eyeRay' that describes the ray we're currently tracing from
//      eyepoint into the scene.
// a COLLECTION of CGeom objects: each describe an individual visible thing; a
//      single item or thing we may see in the scene.  That collection is the 
//			held in the 'item[]' array within the CScene class.
//      		Each CGeom element in the 'item[]' array holds one shape on-screen.
//      To see three spheres and a ground-plane we'll have 4 CGeom objects, one 
//			for each of the spheres, and one for the ground-plane.
//      Each CGeom obj. includes a 'matlIndex' index number that selects which
//      material to use in rendering the CGeom shape. I assume ALL lights in a
//      scene may affect ALL CGeom shapes, but you may wish to add an light-src
//      index to permit each CGeom object to choose which lights(s) affect it.
// One CHitList object 'eyeHits' that describes each 3D point where 'eyeRay'
//      pierces a shape (a CGeom object) in our CScene.  Each CHitList object
//      in our ray-tracer holds a COLLECTION of hit-points (CHit objects) for a
//      ray, and keeps track of which hit-point is closest to the camera. That
//			collection is held in the eyeHits member of the CScene class.
// a COLLECTION of CMatl objects; each describes one light-modifying material'
//      hold this collection in  'matter[]' array within the CScene class).
//      Each CMatl element in the 'matter[]' array describes one particular
//      individual material we will use for one or more CGeom shapes. We may
//      have one CMatl object that describes clear glass, another for a
//      Phong-shaded brass-metal material, another for a texture-map, another
//      for a bump mapped material for the surface of an orange (fruit),
//      another for a marble-like material defined by Perlin noise, etc.
// a COLLECTION of CLight objects that each describe one light source.  
//			That collection is held in the 'lamp[]' array within the CScene class.
//      Note that I apply all lights to all CGeom objects.  You may wish to add
//      an index to the CGeom class to select which lights affect each item.
//
// The default CScene constructor creates a simple scene that will create a
// picture if traced:
// --rayCam with +/- 45 degree Horiz field of view, aimed in the -Z direcion 
// 			from the world-space location (0,0,0),
// --item[0] is a ground-plane grid at z= -5.
//
//  Calling 'initScene()' lets you choose other scenes, such as:
//  --our 'rayCam' camera at (5,5,5) aimed at the origin;
//  --item[0] shape, a unit sphere at the origin that uses matter[0] material;
//  --matter[0] material is a shiny red Phong-lit material, lit by lamp[0];
//  --lamp[0] is a point-light source at location (5,5,5).


  this.RAY_EPSILON = 1.0E-15;       // ray-tracer precision limits; treat 
                                    // any value smaller than this as zero.
                                    // (why?  JS uses 52-bit mantissa;
                                    // 2^-52 = 2.22E-16, so 10^-15 gives a
                                    // safety margin of 20:1 for small # calcs)
                                    
  this.imgBuf = g_myPic;            // DEFAULT output image buffer
                                    // (change it with setImgBuf() if needed)
  this.eyeRay = new CRay();	        // the ray from the camera for each pixel
  this.rayCam = new CCamera();	    // the 3D camera that sets eyeRay values:
                                    // this is the DEFAULT camera (256,256).
                                    // (change it with setImgBuf() if needed)
  this.item = [];                   // this JavaScript array holds all the
                                    // CGeom objects of the  current scene.
}

CScene.prototype.setImgBuf = function(nuImg) {
//==============================================================================
// set/change the CImgBuf object we will fill with our ray-traced image.
// This is USUALLY the global 'g_myPic', but could be any CImgBuf of any
// size.  

  // Re-adjust ALL the CScene methods/members affected by output image size:
  this.rayCam.setSize(nuImg.xSiz, nuImg.ySiz);
  this.imgBuf = nuImg;    // set our ray-tracing image destination.
}

CScene.prototype.initScene = function(num) {
//==============================================================================
// Initialize our ray tracer, including camera-settings, output image buffer
// to use.  Then create a complete 3D scene (CGeom objects, materials, lights, 
// camera, etc) for viewing in both the ray-tracer **AND** the WebGL previewer.
// num == 0: basic ground-plane grid;
//     == 1: ground-plane grid + round 'disc' object;
//     == 2: ground-plane grid + sphere
//     == 3: ground-plane grid + sphere + 3rd shape, etc.

  if(num == undefined) num = 0;   // (in case setScene() called with no arg.)
  // Set up ray-tracing camera to use all the same camera parameters that
  // determine the WebGL preview.  GUIbox fcns can change these, so be sure
  // to update these again just before you ray-trace:
  this.rayCam.rayPerspective(gui.camFovy, gui.camAspect, gui.camNear);
  this.rayCam.rayLookAt(gui.camEyePt, gui.camAimPt, gui.camUpVec);
  this.setImgBuf(g_myPic);    // rendering target: our global CImgBuf object
                              // declared just above main().
  // Set default sky color:
  this.skyColor = vec4.fromValues( 0.3,1.0,1.0,1.0);  // cyan/bright blue
  // Empty the 'item[] array -- discard all leftover CGeom objects it may hold.
  this.item.length = 0;       
  var iNow = 0;         // index of the last CGeom object put into item[] array
  
  // set up new scene:
  switch(num) {
    case 0:     // (default scene number; must create a 3D scene for ray-tracing
      // create our list of CGeom shapes that fill our 3D scene:
      //---Ground Plane-----
      // draw this in world-space; no transforms!
      this.item.push(new CGeom(RT_GNDPLANE));   // Append gnd-plane to item[] array
      iNow = this.item.length -1;               // get its array index.
                                                // use default colors.
                                                // no transforms needed.
      //-----Disk 1------           
      this.item.push(new CGeom(RT_DISK));         // Append 2D disk to item[] &
      iNow = this.item.length -1;                 // get its array index.
//      console.log('iNow should be 1; it is:', iNow);
      // set up distinctive coloring:
  	  vec4.set(this.item[iNow].gapColor,  0.3,0.6,0.7,1.0); // RGBA(A==opacity) bluish gray   
  	  vec4.set(this.item[iNow].lineColor, 0.7,0.3,0.3,1.0);  // muddy red
  	  // Now apply transforms to set disk's size, orientation, & position.
  	  // (Be sure to do these same transforms in WebGL preview; find them in the
  	  //  JT_VBObox-lib.js file, in VBObox0.draw() function)
  	  this.item[iNow].setIdent();                   // start in world coord axes
      this.item[iNow].rayTranslate(1,1,1.3);        // move drawing axes 
                                                    // RIGHT, BACK, & UP.
      this.item[iNow].rayRotate(0.25*Math.PI, 1,0,0); // rot 45deg on x axis to face us
      this.item[iNow].rayRotate(0.25*Math.PI, 0,0,1); // z-axis rotate 45deg.
      
      //-----Disk 2------ 
      this.item.push(new CGeom(RT_DISK));         // Append 2D disk to item[] &
      iNow = this.item.length -1;                 // get its array index.
      // set up distinctive coloring:
      vec4.set(this.item[iNow].gapColor,  0.0,0.0,1.0,1.0); // RGBA(A==opacity) blue
  	  vec4.set(this.item[iNow].lineColor, 1.0,1.0,0.0,1.0);  // yellow
  	  // Now apply transforms to set disk's size, orientation, & position.
  	  // (Be sure to do these same transforms in WebGL preview; find them in the
  	  //  JT_VBObox-lib.js file, in VBObox0.draw() function)
  	  this.item[iNow].setIdent();                   // start in world coord axes
  	  this.item[iNow].rayTranslate(-1,1,1.3);         // move drawing axes 
  	                                                  // LEFT, BACK, & UP.
      this.item[iNow].rayRotate(0.75*Math.PI, 1,0,0); // rot 135 on x axis to face us
      this.item[iNow].rayRotate(Math.PI/3, 0,0,1);    // z-axis rotate 60deg.

      //-----Sphere 1-----
      this.item.push(new CGeom(RT_SPHERE));       // Append sphere to item[] &
      iNow = this.item.length -1;                 // get its array index.
      // Initially leave sphere at the origin. Once you see it, then
      // move it to a more-sensible location:
  	  this.item[iNow].setIdent();                   // start in world coord axes
      this.item[iNow].rayTranslate(1.2,-1.0, 1.0);  // move rightwards (+x),
      // and toward camera (-y) enough to stay clear of disks, and up by 1 to
      // make this radius==1 sphere rest on gnd-plane.
      //
      //
      // additional SCENE 0 SETUP   
      //
      //
      break;
    case 1:
    //
    //
    // another: SCENE 1 SETUP   
      console.log("JT_tracer0-Scene file: CScene.initScene(",num,") NOT YET IMPLEMENTED.");
      this.initScene(0); // use default scene
    //
    //
      break;
    case 2:
    //
    //
    // another: SCENE 2 SETUP   
      console.log("JT_tracer0-Scene file: CScene.initScene(",num,") NOT YET IMPLEMENTED.");    //
      this.initScene(0); // use default scene
    //
      break;
    default:    // nonsensical 'sceneNum' value?
      console.log("JT_tracer0-Scene file: CScene.initScene(",num,") NOT YET IMPLEMENTED.");
      this.initScene(0);   // init the default scene.
    break;
  }
}

CScene.prototype.makeRayTracedImage = function() {
//==============================================================================
// Create an image by Ray-tracing; fill CImgBuf object  'imgBuf' with result.
// (called when you press 'T' or 't')

//	console.log("You called CScene.makeRayTracedImage!")
  // Update our ray-tracer camera to match the WebGL preview camera:
    this.rayCam.rayPerspective(gui.camFovy, gui.camAspect, gui.camNear);
    this.rayCam.rayLookAt(gui.camEyePt, gui.camAimPt, gui.camUpVec);

    this.setImgBuf(this.imgBuf);  // just in case: this ensures our ray-tracer
                                  // will make an image that exactly fills the
                                  // currently-chosen output-image buffer.
                                  // (usually g_myPic, but could have changed)
                                  
  var colr = vec4.create();	// floating-point RGBA color value
	var hit = 0;
	var idx = 0;  // CImgBuf array index(i,j) == (j*this.xSiz + i)*this.pixSiz
  var i,j;      // pixel x,y coordinate (origin at lower left; integer values)
  var k;        // item[] index; selects CGeom object we're currently tracing.
  
  this.pixFlag = 0; // DIAGNOSTIC: g_myScene.pixFlag == 1 at just one pixel
                  // selected below. Ray-tracing functions (e.g. traceGrid(), 
                  // traceDisk()) can use g_)myScene.pixFlag to let you print 
                  // values for JUST ONE ray.
  var myHit = new CHit(); // holds the nearest ray/grid intersection (if any)
                          // found by tracing eyeRay thru all CGeom objects
                          // held in our CScene.item[] array.
                           
  for(j=0; j< this.imgBuf.ySiz; j++) {        // for the j-th row of pixels.
  	for(i=0; i< this.imgBuf.xSiz; i++) {	    // and the i-th pixel on that row,
			this.rayCam.setEyeRay(this.eyeRay,i,j);  // create ray for pixel (i,j)
      // DIAGNOSTIC:------------------------------------
      if(i==this.imgBuf.xSiz/2 && j==this.imgBuf.ySiz/4) { 
        this.pixFlag = 1;                     // pixFlag==1 for JUST ONE pixel
        console.log("CScene.makeRayTracedImage() is at pixel [",i,", ",j,"].",
                    "by the cunning use of flags. (Eddie Izzard)");
        // Eddie Izzard "Dress To Kill"(1998)  
        //    short: https://youtu.be/uEx5G-GOS1k 
        //     long: https://youtu.be/hxQYE3E8dEY 
      }
      else {
        this.pixFlag = 0;
      }//-END DIAGNOSTIC--------------------------------
      
  		// Trace a new eyeRay thru all CGeom items: ------------------------------
      myHit.init();     // start by clearing our 'nearest hit-point', and
      for(k=0; k< this.item.length; k++) {  // for every CGeom in item[] array,
          this.item[k].traceMe(this.eyeRay, myHit);  // trace eyeRay thru it,
      }                                   // & keep nearest hit point in myHit.
          
/*
      if(this.pixFlag == 1) { // print values during just one selected pixel
        console.log("flag: x,y:myHit", i,j, myHit);
      }
*/
        // Find eyeRay color from myHit-----------------------------------------
			if(myHit.hitNum==0) {  // use myGrid tracing to determine color
				vec4.copy(colr, myHit.hitGeom.gapColor);
			}
			else if (myHit.hitNum==1) {
				vec4.copy(colr, myHit.hitGeom.lineColor);
			}
			else { // if myHit.hitNum== -1)
			  vec4.copy(colr, this.skyColor);
			}

			// Set pixel color in our image buffer------------------------------------
		  idx = (j*this.imgBuf.xSiz + i)*this.imgBuf.pixSiz;	// Array index at pixel (i,j) 
	  	this.imgBuf.fBuf[idx   ] = colr[0];	
	  	this.imgBuf.fBuf[idx +1] = colr[1];
	  	this.imgBuf.fBuf[idx +2] = colr[2];
  	}
  }
  this.imgBuf.float2int();		// create integer image from floating-point buffer.
}
