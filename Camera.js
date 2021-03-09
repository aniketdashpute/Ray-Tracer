/*******************************************************************
 * File: Camera.js
 * Author: Aniket Dashpute
 * Credits: Built from starter code by Prof. Jack Tumblin
 * Northwestern University
*******************************************************************/

function CRay()
{
    // Object for a ray in an unspecified coord. system (usually 'world' coords).
    // Ray starting point (x,y,z,w)
    // (default: at origin)
	this.orig = vec4.fromValues(0,0,0,1);
    
    // The ray's direction vector 
    // (default: look down -z axis)
	this.dir = 	vec4.fromValues(0,0,-1,0);
}

CRay.prototype.printMe = function(name)
{
    // print ray's values in the console window:
    if(name == undefined) name = '[CRay]';
    var res = 3;  // # of digits to display
    console.log(name + '.orig:' + 
        this.orig[0].toFixed(res) + ',\t'+ this.orig[1].toFixed(res) + ',\t' + 
        this.orig[2].toFixed(res) + ',\t'+ this.orig[3].toFixed(res) +  '\n' + 
        name + '.dir :' + 
        this.dir[0].toFixed(res) + ',\t '+ this.dir[1].toFixed(res) + ',\t ' +  
        this.dir[2].toFixed(res) + ',\t '+ this.dir[3].toFixed(res) +
        '\n------------------------');
}

//==========================================
// HOW DO WE CONSTRUCT A RAY-TRACING CAMERA?
//==========================================
/*
4) With uvnPix, we can easily make the 'eye' ray in (u,v,n) coords at the (x,y)
 pixel; the ray origin is (0,0,0), and the ray direction vector is
        uvnPix - (0,0,0) = uvnPix. 
 --a) However, we need an eyeRay in world-space coords. To convert, replace the 
 ray origin with EyePt (already given world-space coords), and compute ray 
 direction as a coordinate-weighted sum of the unit-length U,V,N axis vectors; 
        eye.dir = uvnPix.u * U + uvnPix.v * V + uvnPix.n * N.
 --b) But look closely! this 'weighted sum' is just a matrix multiply!  We can
 instead write it as:
        cam2world * uvnPix,
 where U,V,N unit-length vectors form the columns of cam2world matrix!

5) finally, position and aim the camera:
 --a) To move the CCamera to any desired position in world space, 
      just translate eyePoint.
 --b) To rotate CCamera around its eyePt, just rotate the u,v,n axes 
      (pre-multiply cam2world matrix with a rotation matrix).
 --c) Later, you can replace this crude translate/rotate step by a function 
    that converts EyePt, AimPt and VUP vector into  U,V,N vectors.
*/

function CCamera()
{
    // Object for a ray-tracing camera defined the 'world' coordinate system, with
    // a) -- 'extrinsic' parameters that set the camera's position and aiming
    //	from the camera-defining UVN coordinate system 
    // (coord. system origin at the eye-point; coord axes U,V define camera image 
    // horizontal and vertical; camera gazes along the -N axis): 
    // Default settings: put camera eye-point at world-space origin, and
    this.eyePt = vec4.fromValues(0,0,0,1);

    // LOOK STRAIGHT DOWN:
    // camera U axis == world x axis
    this.uAxis = vec4.fromValues(1,0,0,0);
    // camera V axis == world y axis
    this.vAxis = vec4.fromValues(0,1,0,0);
    // camera N axis == world z axis
    this.nAxis = vec4.fromValues(0,0,1,0);
    // (and thus we're gazing down the -Z axis with default camera). 

    // b) -- Camera 'intrinsic' parameters that set the camera's optics and images.
    // They define the camera's image frustum: its image plane is at N = -znear  
    // (the plane that 'splits the universe', perpendicular to N axis), and no 
    // 'zfar' plane at all (not needed: ray-tracer doesn't have or need the CVV).  
    // The ray-tracing camera creates an rectangular image plane perpendicular to  
    // the cam-coord. system N axis at -iNear(defined by N vector in world coords),
    // horizontally	spanning 'iLeft' <= u <= 'iRight' along the U vector, and
    // vertically    spanning  'iBot' <= v <=  'iTop' along the V vector. 
    // As the default camera creates an image plane at distance iNear = 1 from the 
    // camera's center-of-projection (at the u,v,n origin), these +/-1 
    // defaults define a square ray-traced image with a +/-45-degree field-of-view:
    this.iLeft = -1.0;
    this.iRight = 1.0;
    this.iBot =  -1.0;
    this.iTop =   1.0;
    this.iNear =  1.0;

    // And the lower-left-most corner of the image is at (u,v,n) = (iLeft,iBot,-iNear).
    // Let's set this default image size too:
    // horizontal,
    this.xmax = 256;
    // vertical image resolution.
    this.ymax = 256;
 
    // Divide the image plane into rectangular tiles, one for each pixel:
    // pixel tile's width
    this.ufrac = (this.iRight - this.iLeft) / this.xmax;
    // pixel tile's height.
    this.vfrac = (this.iTop   - this.iBot ) / this.ymax;
}

CCamera.prototype.setSize = function(nuXmax, nuYmax)
{
    // Re-adjust the camera for a different output-image size:
    this.xmax = nuXmax;
    this.ymax = nuYmax;

    // Divide the image plane into rectangular tiles, one for each pixel:
    // pixel tile's width
    this.ufrac = (this.iRight - this.iLeft) / this.xmax;
    // pixel tile's height
    this.vfrac = (this.iTop   - this.iBot ) / this.ymax;
}

CCamera.prototype.rayFrustum = function(left, right, bot, top, near)
{
    // Set the camera's viewing frustum with the same arguments used by the OpenGL 
    // 'glFrustum()' fucntion
    // (except this function has no 'far' argument; not needed for ray-tracing).
    // Assumes camera's center-of-projection (COP) is at origin and the camera gazes
    // down the -Z axis.
    // left,right == -x,+x limits of viewing frustum measured in the z=-znear plane
    // bot,top == -y,+y limits of viewing frustum measured
    // near =- distance from COP to the image-forming plane. 'near' MUST be positive
    //         (even though the image-forming plane is at z = -near).

    console.log("you called CCamera.rayFrustum()");

    this.iLeft = left;
    this.iRight = right;
    this.iBot = bot;
    this.iTop = top;
    this.iNear = near;
}

CCamera.prototype.rayPerspective = function(fovy, aspect, zNear)
{
    // Set the camera's viewing frustum with the same arguments used by the OpenGL
    // 'gluPerspective()' function
    // (except this function has no 'far' argument; not needed for ray-tracing).
    //  fovy == vertical field-of-view (bottom-to-top) in degrees
    //  aspect ratio == camera image width/height
    //  zNear == distance from COP to the image-forming plane. zNear MUST be >0.

    //  console.log("you called CCamera.rayPerspective");
    this.iNear = zNear;
    this.iTop = zNear * Math.tan(0.5*fovy*(Math.PI/180.0)); // tan(radians)
    // right triangle:  iTop/zNear = sin(fovy/2) / cos(fovy/2) == tan(fovy/2)
    this.iBot = -this.iTop;
    this.iRight = this.iTop*aspect;
    this.iLeft = -this.iRight;
}

CCamera.prototype.rayLookAt = function(nuEyePt, nuAimPt, nuUpVec)
{
    // Each argument (eyePt, aimPt, upVec) is a glMatrix 'vec4' object.
    // Adjust the orientation and position of this ray-tracing camera 
    // in 'world' coordinate system to match eyePt, aimPt, upVec
    // Results should exactly match WebGL camera posed by the same arguments.
    //
    this.eyePt = nuEyePt;
    vec4.subtract(this.nAxis, this.eyePt, nuAimPt); // aim-eye == MINUS N-axis direction
    // console.log('this.nAxis b4 norm:' ,this.nAxis);
    vec4.normalize(this.nAxis, this.nAxis);         // N-axis vector must have unit length.
    // console.log('this.nAxis AFTER norm:', this.nAxis);
    /*
    // !! SURPRISE!! vec3.cross() can accept vec4 arguments, but it IGNORES
    // the 'w' value in the calculations and the results. TRY IT YOURSELF:
    this.uAxis[3] =123.4;
    this.nAxis[3] =987.6;
    console.log('this.uAxis BEFORE cross:', this.uAxis);
    vec3.cross(this.uAxis, nuUpVec, this.nAxis);    // U-axis == upVec cross N-axis
    console.log('this.uAxis AFTER cross:', this.uAxis);
    vec3.this.uAxis[3] = 0.0; // restore correct w value for vectors.
    vec3.this.nAxis[3] = 0.0;
    */

    // U-axis == upVec cross N-axis
    vec3.cross(this.uAxis, nuUpVec, this.nAxis);
    // console.log('this.uAxis AFTER cross:', this.uAxis);
    // make it unit-length.
    vec4.normalize(this.uAxis, this.uAxis);
    // V-axis == N-axis cross U-axis
    vec3.cross(this.vAxis, this.nAxis, this.uAxis);
}

CCamera.prototype.setEyeRay = function(myeRay, xpos, ypos)
{
    // Set values of a CRay object to specify a ray in world coordinates that 
    // originates at the camera's eyepoint (its center-of-projection: COP) and aims 
    // in the direction towards the image-plane location (xpos,ypos) given in units 
    // of pixels.  The ray's direction vector is *NOT* normalized.
    //
    // !CAREFUL! Be SURE you understand these floating-point xpos,ypos arguments!
    // For the default CCamera (+/-45 degree FOV, xmax,ymax == 256x256 resolution) 
    // the function call makeEyeRay(0,0) creates a ray to the image rectangle's 
    // lower-left-most corner at U,V,N = (iLeft,iBot,-1), and the function call
    // makeEyeRay(256,256) creates a ray to the image rectangle's upper-left-most  
    // corner at U,V,N = (iRight,iTop,-1). 
    
    // To get the eye ray for pixel (x,y), DON'T call setEyeRay(myRay, x,y);
    // instead call setEyeRay(myRay,x+0.5,y+0.5)
    // (ASIDE: You can dramatically improve the appearance of a digital image by 
    //     making pixels  that summarize overlapping tiles by making a weighted 
    //     average for the neighborhood colors, Google: antialiasing 
    //     bilinear filter, Mitchell-Netravali piecewise bicubic prefilter, etc).

    // Convert image-plane location (xpos,ypos) in the camera's U,V,N coords:
    // U coord
    var posU = this.iLeft + xpos*this.ufrac;
    // V coord
    var posV = this.iBot  + ypos*this.vfrac;
    //  and the N coord is always -1, at the image-plane (zNear) position.
    // Then convert this point location to world-space X,Y,Z coords using our 
    // camera's unit-length coordinate axes uAxis,vAxis,nAxis
    // make vector 0,0,0,0.
    xyzPos = vec4.create();

    // xyzPos += Uaxis*posU;
	vec4.scaleAndAdd(xyzPos, xyzPos, this.uAxis, posU);
    // xyzPos += Vaxis*posU;
	vec4.scaleAndAdd(xyzPos, xyzPos, this.vAxis, posV);
    // xyzPos += Naxis * (-1)
    vec4.scaleAndAdd(xyzPos, xyzPos, this.nAxis, -this.iNear); 

    // The eyeRay we want consists of just 2 world-space values:
    // -- the ray origin == camera origin == eyePt in XYZ coords
    // -- the ray direction TO image-plane point FROM ray origin;
    // myeRay.dir = (xyzPos + eyePt) - eyePt = xyzPos; thus
	vec4.copy(myeRay.orig, this.eyePt);
	vec4.copy(myeRay.dir, xyzPos);
    //  console.log('in CCamera.makeEyeRay(): this.eyePt:', this.eyePt);

}

CCamera.prototype.setEyeRaySourceToDest = function(myeRay, mySource, myDest)
{
    // create the direction vector
    var vDir = vec4.create();
    vec4.subtract(vDir, myDest, mySource);

    // set Ray origin
    vec4.copy(myeRay.orig, mySource);

    // set Ray direction (not normalized)
    vec4.copy(myeRay.dir, vDir);
}

CCamera.prototype.printMe = function()
{
    // print CCamera object's current contents in console window:
    console.log("you called CCamera.printMe()");
}
