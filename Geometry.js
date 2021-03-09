/*******************************************************************
 * File: Geometry.js
 * Author: Aniket Dashpute
 * Credits: Built from starter code by Prof. Jack Tumblin
 * Northwestern University
*******************************************************************/

const GeomShape = {
    // An endless 'ground plane' surface in xy plane
    GroundPlane: 0,
    // a circular disk in xy plane, radius 'diskRad'
    Disk: 1,
    // A sphere, radius 1, centered at origin
    Sphere: 2,
    // An axis-aligned cube, corners at (+/-1, +/-1,+/-1)
    Box: 3,
    // A cylinder with user-settable radius at each end
    // and user-settable length.  radius of 0 at either
    // end makes a cone; length of 0 with nonzero
    // radius at each end makes a disk
    Cylinder: 4,
    // a triangle with 3 vertices
    Triangle: 5,
    // Implicit surface:Blinn-style Gaussian 'blobbies'
    Blobby: 6,
}

function CGeom(shapeSelect)
{
    // Generic object for a geometric shape, including its worldRay2model matrix
    // used to transform any ray we wish to trace against it.
    // Each instance describes just one shape, but you can select from several 
    // different kinds of shapes by setting the 'shapeType' member.  CGeom can 
    // describe ANY shape, including sphere, box, cone, quadric, etc. and it holds 
    // all/any variables needed for each shapeType.
    //
    // Advanced Version: try it!
    //        Ray tracing lets us position and distort these shapes in a new way;
    // instead of transforming the shape itself for 'hit' testing against a traced
    // ray, we transform the 3D ray by the matrix 'world2model' before a hit-test.
    // This matrix simplifies our shape descriptions, because we don't need
    // separate parameters for position, orientation, scale, or skew.  For example,
    // RT_SPHERE and RT_BOX need NO parameters--they each describe a unit sphere or
    // unit cube centered at the origin.  To get a larger, rotated, offset sphere
    // or box, just set the parameters in world2model matrix. Note that you can 
    // scale the box or sphere differently in different directions, forming 
    // ellipsoids for the unit sphere and rectangles (or prisms) from the unit box.

    if(shapeSelect == undefined) shapeSelect = GeomShape.GroundPlane;	// default shape.
    this.shapeType = shapeSelect;

    // Get clever:  create 'traceMe()' function that calls the tracing function
    // needed by the shape held in this CGeom object.
    switch(this.shapeType) {
        case GeomShape.GroundPlane:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit,bIsShadowRay) { return this.traceGrid(inR,hit, bIsShadowRay);   }; 
            this.xgap = 1.0;	// line-to-line spacing
            this.ygap = 1.0;
            this.lineWidth = 0.1;	// fraction of xgap used for grid-line width
            this.lineColor = vec4.fromValues(0.1,0.5,0.1,1.0);  // RGBA green(A==opacity)
            this.gapColor = vec4.fromValues( 0.9,0.9,0.9,1.0);  // near-white
            break;
        case GeomShape.Disk:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit,bIsShadowRay) { return this.traceDisk(inR,hit, bIsShadowRay);   };
            this.diskRad = 2.0;   // default radius of disk centered at origin
            // Disk line-spacing is set to 61/107 xgap,ygap  (ratio of primes)
            // disk line-width is set to 3* lineWidth, and it swaps lineColor & gapColor. 
            this.xgap = 61/107;	// line-to-line spacing: a ratio of primes.
            this.ygap = 61/107;
            this.lineWidth = 0.1;	// fraction of xgap used for grid-line width
            this.lineColor = vec4.fromValues(0.1,0.5,0.1,1.0);  // RGBA green(A==opacity)
            this.gapColor = vec4.fromValues( 0.9,0.9,0.9,1.0);  // near-white
            break;
        case GeomShape.Sphere:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit,bIsShadowRay) { return this.traceSphere(inR,hit, bIsShadowRay); }; 
            this.lineColor = vec4.fromValues(0.0,0.3,1.0,1.0);  // RGBA blue(A==opacity)
            break;
        case GeomShape.Box:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit) { this.traceBox(inR,hit);    }; 
            break;
        case GeomShape.Cylinder:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit) { this.traceCyl(inR,hit);    }; 
            break;
        case GeomShape.Triangle:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit) { this.traceTri(inR,hit);    }; 
            break;
        case GeomShape.Blobby:
            //set the ray-tracing function (so we call it using item[i].traceMe() )
            this.traceMe = function(inR,hit) { this.traceBlobby(inR,hit); }; 
            break;
        default:
            console.log("CGeom() constructor: ERROR! INVALID shapeSelect:", shapeSelect);
            return;
            break;
	}

	// Ray transform matrices.
	// Functions setIdent, rayTranslate(), rayRotate(), rayScale()
    // set values for BOTH of these matrices

    // the matrix used to transform rays from world coord sys to model coord sys;
    // This matrix sets shape size, position, orientation, and squash/stretch amount.
	this.worldRay2model = mat4.create(); 

    // worldRay2model^T
    // This matrix transforms MODEL-space normals (where they're easy to find)
    // to WORLD-space coords (where we need them for lighting calculations)
    this.normal2world = mat4.create();
}

CGeom.prototype.setIdent = function()
{
    // Discard worldRay2model contents, replace with identity matrix (world==model).
    mat4.identity(this.worldRay2model);  
    mat4.identity(this.normal2world);
}

CGeom.prototype.rayTranslate = function(x,y,z)
{
    // Translate ray-tracing's current drawing axes (defined by worldRay2model),
    // by the vec3 'offV3' vector amount
    // construct INVERSE translation matrix [T^-1]
    var a = mat4.create();
    a[12] = -x; // x
    a[13] = -y; // y
    a[14] = -z; // z.
    // print_mat4(a,'translate()');
    // [new] = [T^-1]*[OLD]
    mat4.multiply(this.worldRay2model, a, this.worldRay2model);
    // model normals->world
    mat4.transpose(this.normal2world, this.worldRay2model);
}

CGeom.prototype.rayRotate = function(rad, ax, ay, az)
{
    // Rotate ray-tracing's current drawing axes (defined by worldRay2model) around
    // the vec3 'axis' vector by 'rad' radians.
    // (almost all of this copied directly from glMatrix mat4.rotate() function)
    var x = ax, y = ay, z = az;
    var len = Math.sqrt(x * x + y * y + z * z);
    var s, c, t;
    var b00, b01, b02;
    var b10, b11, b12;
    var b20, b21, b22;
    if (Math.abs(len) < glMatrix.GLMAT_EPSILON)
    { 
        console.log("CGeom.rayRotate() ERROR!!! zero-length axis vector!!");
        return null; 
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    // INVERSE rotation; use -rad, not rad
    s = Math.sin(-rad);
    c = Math.cos(-rad);
    t = 1 - c;

    // Construct the elements of the 3x3 rotation matrix. b_rowCol
    // CAREFUL!  I changed something!!
    /// glMatrix mat4.rotate() function constructed the TRANSPOSE of the
    // matrix we want (probably because they used these b_rowCol values for a
    // built-in matrix multiply).
    // What we want is given in https://en.wikipedia.org/wiki/Rotation_matrix at
    // the section "Rotation Matrix from Axis and Angle", and thus
    // I swapped the b10, b01 values; the b02,b20 values, the b21,b12 values.
    b00 = x * x * t + c;     b01 = x * y * t - z * s; b02 = x * z * t + y * s; 
    b10 = y * x * t + z * s; b11 = y * y * t + c;     b12 = y * z * t - x * s; 
    b20 = z * x * t - y * s; b21 = z * y * t + x * s; b22 = z * z * t + c;
    var b = mat4.create();  // build 4x4 rotation matrix from these
    b[0] = b00; b[4] = b01; b[ 8] = b02; b[12] = 0.0; // row0
    b[1] = b10; b[5] = b11; b[ 9] = b12; b[13] = 0.0; // row1
    b[2] = b20; b[6] = b21; b[10] = b22; b[14] = 0.0; // row2
    b[3] = 0.0; b[7] = 0.0; b[11] = 0.0; b[15] = 1.0; // row3
    // print_mat4(b,'rotate()');
    // [new] = [R^-1][old]
    mat4.multiply(this.worldRay2model, b, this.worldRay2model);
    // model normals->world
    mat4.transpose(this.normal2world, this.worldRay2model);
}

CGeom.prototype.rayScale = function(sx,sy,sz)
{
    //  Scale ray-tracing's current drawing axes (defined by worldRay2model),
    //  by the vec3 'scl' vector amount
    if(Math.abs(sx) < glMatrix.GLMAT_EPSILON ||
    Math.abs(sy) < glMatrix.GLMAT_EPSILON ||
    Math.abs(sz) < glMatrix.GLMAT_EPSILON)
    {
        console.log("CGeom.rayScale() ERROR!! zero-length scale!!!");
        return null;
    }
    var c = mat4.create();   // construct INVERSE scale matrix [S^-1]
    c[ 0] = 1/sx; // x  
    c[ 5] = 1/sy; // y
    c[10] = 1/sz; // z.
    // print_mat4(c, 'scale()')'
    // [new] = =[S^-1]*[OLD]
    mat4.multiply(this.worldRay2model, c, this.worldRay2model);
    // model normals->world
    mat4.transpose(this.normal2world, this.worldRay2model);
}

CGeom.prototype.traceGrid = function(inRay, myHit, bIsShadowRay)
{
    // Find intersection of CRay object 'inRay' with grid-plane at z== 0, and
    // if we find a ray/grid intersection CLOSER than CHit object 'hitMe', update
    // the contents of 'hitMe' with all the new hit-point information.
    // No return value
    // (old versions returned an integer 0,1, or -1: see hitMe.hitNum)
    // Set CHit.hitNum:
    // == -1 if ray MISSES the disk
    // ==  0 if ray hits the disk BETWEEN lines
    // ==  1 if ray hits the disk ON the lines

    // HOW TO TRACE A GROUND-PLANE
    // 1) we parameterize the ray by 't', so that we can find any point on the
    // ray by:
    //          Ray(t) = ray.orig + t*ray.dir
    // To find where the ray hit the plane, solve for t where Ray(t) = x,y,zGrid:
    // Re-write:
    //      Ray(t0).x = ray.orig[0] + t0*ray.dir[0] = x-value at hit-point (UNKNOWN!)
    //      Ray(t0).y = ray.orig[1] + t0*ray.dir[1] = y-value at hit-point (UNKNOWN!)
    //      Ray(t0).z = ray.orig[2] + t0*ray.dir[2] = zGrid    (we KNOW this one!)
    //
    //  solve for t0:   t0 = (zGrid - ray.orig[2]) / ray.dir[2]
    //  From t0 we can find x,y value at the hit-point too.
    //  Wait wait wait --- did we consider ALL possibilities?  No, not really:
    //  If t0 <0, we can only hit the plane at points BEHIND our camera;
    //  thus the ray going FORWARD through the camera MISSED the plane!.
    //
    // 2) Our grid-plane exists for all x,y, at the value z=zGrid, and is covered by
    //    a grid of lines whose width is set by 'linewidth'.  The repeated lines of 
    //    constant-x have spacing (repetition period) of xgap, and the lines of
    //    constant-y have spacing of ygap.
    //    GIVEN a hit-point (x,y,zGrid) on the grid-plane, find the color by:
    //         if((x/xgap) has fractional part < linewidth  *OR*
    //            (y/ygap) has fractional part < linewidth), you hit a line on
    //            the grid. Use 'lineColor'.
    //        otherwise, the ray hit BETWEEN the lines; use 'gapColor'

    //------------------ Transform 'inRay' by this.worldRay2model matrx to make rayT
    var rayT = new CRay();    // create a local transformed-ray variable.
    /*
    //  FOR TESTING ONLY:
    vec4.copy(rayT.orig, inRay.orig);   // copy (if we're NOT going to transform grid)
    vec4.copy(rayT.dir, inRay.dir);
    */ 
    vec4.transformMat4(rayT.orig, inRay.orig, this.worldRay2model);
    vec4.transformMat4(rayT.dir,  inRay.dir,  this.worldRay2model);

    // Now use transformed ray 'rayT' for our ray-tracing.
    //------------------End ray-transform.

    // find ray/grid-plane intersection: t0 == value where ray hits plane at z=0.
    var t0 = (-rayT.orig[2])/rayT.dir[2];

    // The BIG QUESTION:  ? Did we just find a hit-point for inRay 
    // =================  ? that is CLOSER to camera than myHit?
    // if(t0 < 0 || t0 > myHit.t0)
    if(t0 < 0 || (!bIsShadowRay && t0 > myHit.t0))
    {
        // NO. Hit-point is BEHIND us, or it's further away than myHit.
        // Leave myHit unchanged. Don't do any further calcs.
        // Bye!
        return false;
    }

    // ***IF*** you're tracing a shadow ray you can stop right here: we know
    // that this ray's path to the light-source is blocked by this CGeom object.
    if (true == bIsShadowRay) return true;

    // YES! we found a better hit-point!
    // Update myHit to describe it
    // record ray-length, and
    myHit.t0 = t0;
    // record the CGeom object that we hit, and
    myHit.hitGeom = this;
    
    // Compute the x,y,z,w point where rayT hit the grid-plane in MODEL coords:
    // vec4.scaleAndAdd(out,a,b,scalar) sets out = a + b*scalar
    vec4.scaleAndAdd(myHit.modelHitPt, rayT.orig, rayT.dir, myHit.t0); 
    // (this is ALSO the world-space hit-point, because we have no transforms)
    // copy world-space hit-point.
    vec4.copy(myHit.hitPt, myHit.modelHitPt);
    
    /* or if you wish:
    // COMPUTE the world-space hit-point:
    vec4.scaleAndAdd(myHit.HitPt, inRay.orig, inRay.dir, myHit.t0);
    */
    
    // reversed, normalized inRay.dir:
    vec4.negate(myHit.viewN, inRay.dir);
    // ( CAREFUL! vec4.negate() changes sign of ALL components: x,y,z,w !!
    // inRay.dir MUST be a vector, not a point, to ensure w sign has no effect)

    // make view vector unit-length.
    vec4.normalize(myHit.viewN, myHit.viewN);
    // surface normal FIXED at world +Z.
    vec4.set(myHit.surfNorm, 0,0,1,0);
    
    /* or if you wish:
    // COMPUTE the surface normal:  (needed if you transformed the gnd-plane grid)
    // in model space we know it's always +z,
    // but we need to TRANSFORM the normal to world-space, & re-normalize it.
    vec4.transformMat4(myHit.surfNorm, vec4.fromValues(0,0,1,0), this.normal2world);
    vec4.normalize(myHit.surfNorm, myHit.surfNorm);
    */

    // FIND COLOR at model-space hit-point---------------------------------                        
    var loc = myHit.modelHitPt[0] / this.xgap; // how many 'xgaps' from the origin?
    if(myHit.modelHitPt[0] < 0) loc = -loc;    // keep >0 to form double-width line at yaxis.
    //console.log("loc",loc, "loc%1", loc%1, "lineWidth", this.lineWidth);

    // fractional part of loc < linewidth? 
    if(loc%1 < this.lineWidth)
    {
        // YES. rayT hit a line of constant-x
        myHit.hitNum =  1;
        return true;
    }

    // how many 'ygaps' from origin?
    loc = myHit.modelHitPt[1] / this.ygap;
    // keep >0 to form double-width line at xaxis.
    if(myHit.modelHitPt[1] < 0) loc = -loc;

    // fractional part of loc < linewidth? 
    if(loc%1 < this.lineWidth)
    {
        // YES. rayT hit a line of constant-y
        myHit.hitNum =  1;
        return true;
    }

    // fractional part of loc < linewidth? 
    // No.
    myHit.hitNum = 0;
    return true;
}

CGeom.prototype.traceDisk = function(inRay, myHit, bIsShadowRay)
{ 
    // Find intersection of CRay object 'inRay' with a flat, circular disk in the
    // xy plane, centered at the origin, with radius this.diskRad,
    // and store the ray/disk intersection information on CHit object 'hitMe'.

    // Set CHit.hitNum ==  -1 if ray MISSES the disk
    //                 ==   0 if ray hits the disk BETWEEN lines
    //                 ==   1 if ray hits the disk ON the lines

    
    // Transform 'inRay' by this.worldRay2model matrix;
    
    // create a local transformed-ray variable
    var rayT = new CRay();

    // memory-to-memory copy
    vec4.copy(rayT.orig, inRay.orig);
    vec4.copy(rayT.dir, inRay.dir);

    vec4.transformMat4(rayT.orig, inRay.orig, this.worldRay2model);
    vec4.transformMat4(rayT.dir,  inRay.dir,  this.worldRay2model);

    
    // (disk is in z==0 plane)
    var t0 = -rayT.orig[2]/rayT.dir[2];

    if(t0 < 0 || (!bIsShadowRay && t0 > myHit.t0))
    {
        return false;
    }

    var modelHit = vec4.create();
    vec4.scaleAndAdd(modelHit, rayT.orig, rayT.dir, t0);

    if(modelHit[0]*modelHit[0] + modelHit[1]*modelHit[1] > this.diskRad*this.diskRad)
    {
        return false;
    }

    // ***IF*** you're tracing a shadow ray you can stop right here: we know
    // that this ray's path to the light-source is blocked by this CGeom object.
    if (true == bIsShadowRay) return true;

    // record ray-length
    myHit.t0 = t0;
    // record this CGeom object as the one we hit
    myHit.hitGeom = this;
    // record the model-space hit-pt
    vec4.copy(myHit.modelHitPt, modelHit);

    // compute the x,y,z,w point where inRay hit in WORLD coords
    vec4.scaleAndAdd(myHit.hitPt, inRay.orig, inRay.dir, myHit.t0);

    // set 'viewN' member to the reversed, normalized inRay.dir vector:
    vec4.negate(myHit.viewN, inRay.dir);
    // ( CAREFUL! vec4.negate() changes sign of ALL components: x,y,z,w !!
    // inRay.dir MUST be a vector, not a point, to ensure w sign has no effect)
    
    // ensure a unit-length vector.
    vec4.normalize(myHit.viewN, myHit.viewN);
    
    // Now find surface normal: 
    // in model space we know it's always +z,
    // but we need to TRANSFORM the normal to world-space, & re-normalize it.
    vec4.transformMat4(myHit.surfNorm, vec4.fromValues(0,0,1,0), this.normal2world);
    vec4.normalize(myHit.surfNorm, myHit.surfNorm);
  
    // Hit point color:    
    // how many 'xgaps' from the origin?
    var loc = myHit.modelHitPt[0] / this.xgap;
    // keep >0 to form double-width line at yaxis.
    if(myHit.modelHitPt[0] < 0) loc = -loc;

    // fractional part of loc < linewidth? 
    if(loc%1 < this.lineWidth)
    {
        // YES. rayT hit a line of constant-x
        myHit.hitNum =  0;
        return true;
    }
    // how many 'ygaps' from origin?
    loc = myHit.modelHitPt[1] / this.ygap;
    // keep >0 to form double-width line at xaxis.
    if(myHit.modelHitPt[1] < 0) loc = -loc;

    // fractional part of loc < linewidth? 
    if(loc%1 < this.lineWidth)
    {
        // YES. rayT hit a line of constant-y
        myHit.hitNum = 0;
        return true;
    }

    // No.
    myHit.hitNum = 1;
    return true;
}

CGeom.prototype.traceSphere = function(inRay, myHit, bIsShadowRay)
{ 
    // Find intersection of CRay object 'inRay' with sphere of radius 1 centered at
    // the origin in the 'model' coordinate system. 
    //
    // (If you want different a radius, position, orientation or scaling in the
    // world coordinate system, use the ray-transforming functions, 
    //  e.g. rayTranslate(), rayRotate(), ...)

    // (old versions returned an integer 0,1, or -1: see hitMe.hitNum)
    // Set CHit.hitNum:
    // ==  -1 if ray MISSES the sphere;
    // ==   0 if ray hits the sphere BELOW z==0 equator,
    // ==   1 if ray hits the sphere ABOVE z==0 equator

    // DIAGNOSTIC
    /*
    if(g_myScene.pixFlag ==1) {   // did we reach the one 'flagged' pixel
                                // chosen in CScene.makeRayTracedImage()?
    console.log("you called CGeom.traceSphere");  // YES!
    }
    */
    // END DIAGNOSTIC
 
    // Half-Chord Method
    // (see Ray-Tracing Lecture Notes D) for finding ray/sphere intersection
    // Step 1: transform 'inRay' by this.worldRay2model matrix;

    // to create 'rayT', our local model-space ray.
    var rayT = new CRay();
    vec4.copy(rayT.orig, inRay.orig);
    vec4.copy(rayT.dir, inRay.dir);
    vec4.transformMat4(rayT.orig, inRay.orig, this.worldRay2model);
    vec4.transformMat4(rayT.dir,  inRay.dir,  this.worldRay2model);
  
    // Step 2: Test 1st triangle. Did ray MISS sphere entirely?
    var r2s = vec4.create();
    vec4.subtract(r2s, vec4.fromValues(0,0,0,1), rayT.orig);
    // Find L2, the squared length of r2s, by dot-product with itself:
    // NOTE: vec3.dot() IGNORES the 'w' values when 
    var L2 = vec3.dot(r2s,r2s);

    // if L2 <=1.0, ray starts AT or INSIDE the unit sphere surface (!). 
    if(L2 <= 1.0)
    {
        // report error and quit.  LATER we can use this case to
        // handle rays through transparent spheres.
        // console.log("CGeom.traceSphere() ERROR! rayT origin at or inside sphere!\n\n");
        return true;
    }

    // tcaS == SCALED tca;
    var tcaS = vec3.dot(rayT.dir, r2s);
  
    // Is the chord mid-point BEHIND the camera(where t<0)?
    if(tcaS < 0.0)
    {
        return false;
    }

    // STEP 3: Measure 1st triangle
    var DL2 = vec3.dot(rayT.dir, rayT.dir);
    var tca2 = tcaS*tcaS / DL2;

    // L2 = LM2 + tca2, so LM2 = L2-tca2;
    var LM2 = L2 - tca2;
    // if LM2 > radius^2, then chord mid-point is OUTSIDE the
    // sphere entirely. Once again, our ray MISSED the sphere.
    // DON'T change myHit, don't do any further calcs. Bye!
    if(LM2 > 1.0)
    {
        return false;
    }
    // ***IF*** you're tracing a shadow ray you can stop right here: we know
    // that this ray's path to the light-source is blocked by this CGeom object.

    if (true == bIsShadowRay)
    {
        // console.log("Sphere intersected");
        return true;
    }

    // STEP 4: Measure 2nd triangle
    // SQUARED half-chord length.
    var L2hc = (1.0 - LM2);
  
    // STEP 5: Measure RAY using 2nd triangle
    //      ====================================
    //      t0hit = tcaS/DL2 - sqrt(L2hc/DL2)
    //      t1hit = tcaS/DL2 + sqrt(L2hc/DL2)
    //      ====================================
    //  We know both hit-points are in front of ray, thus t0hit >0 and t1hit >0.
    //  We also know that Math.sqrt() always returns values >=0, and thus
    // we know the hit-point NEAREST the ray's origin MUST be t0hit. 
    var t0hit = tcaS/DL2 -Math.sqrt(L2hc/DL2);  // closer of the 2 hit-points.
    // is this new hit-point CLOSER than 'myHit'?
    if(t0hit > myHit.t0)
    {
        // NO.  DON'T change myHit, don't do any further calcs. Bye!
        return true;
    }
    // YES! we found a better hit-point!
    
    // Update myHit to describe it
    // record ray-length, and
    myHit.t0 = t0hit;
    // record this CGeom object as the one we hit, and
    myHit.hitGeom = this;
    
    // Compute the point where rayT hit the sphere in MODEL coords:
    // vec4.scaleAndAdd(out,a,b,scalar) sets out = a + b*scalar
    vec4.scaleAndAdd(myHit.modelHitPt, rayT.orig, rayT.dir, myHit.t0); 
    
    // Compute the point where inRay hit the grid-plane in WORLD coords:
    vec4.scaleAndAdd(myHit.hitPt, inRay.orig, inRay.dir, myHit.t0);
    
    // set 'viewN' member to the reversed, normalized inRay.dir vector:
    // ( CAREFUL! vec4.negate() changes sign of ALL components: x,y,z,w !!
    // inRay.dir MUST be a vector, not a point, to ensure w sign has no effect)
    vec4.negate(myHit.viewN, inRay.dir); 
    
    // ensure a unit-length vector
    vec4.normalize(myHit.viewN, myHit.viewN);
    
    // Now find surface normal: 
    // in model space we know it's always +z,
    // but we need to TRANSFORM the normal to world-space, & re-normalize it.
    vec4.transformMat4(myHit.surfNorm, vec4.fromValues(0,0,1,0), this.normal2world);
    vec4.normalize(myHit.surfNorm, myHit.surfNorm);
    
    // TEMPORARY: sphere color-setting
    // in CScene.makeRayTracedImage, use 'this.gapColor'
    myHit.hitNum = 1;

    /*
    // DIAGNOSTIC
    if(g_myScene.pixFlag ==1)
    {
        // did we reach the one 'flagged' pixel
        // chosen in CScene.makeRayTracedImage()?
        console.log("r2s:", r2s, "L2", L2, "tcaS", tcaS, "tca2", tca2,
        "LM2", LM2, "L2hc", L2hc, "t0hit", t0hit, );  // YES!
    }
    // END DIAGNOSTIC
    */
    

    // FOR LATER:
    // If the ray begins INSIDE the sphere (because L2 < radius^2),
    //      ====================================
    //      t0 = tcaS/DL2 - sqrt(L2hc/DL2)  // NEGATIVE; behind the ray start pt
    //      t1 = tcaS/DL2 + sqrt(L2hc/DL2)  // POSITIVE: in front of ray origin.
    //      ====================================
    //  Use the t1 hit point, as only t1 is AHEAD of the ray's origin.

    return true;
}