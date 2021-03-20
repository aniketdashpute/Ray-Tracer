/*******************************************************************
 * @file: Materials.js
 * @author: Alex Ayerdi
 * @author: Jack Tumblin
 * @description: Materials file with Phong shading parameters
 * for 22 different materials
 * Northwestern University
*******************************************************************/

const Materials = {
    RedPlastic: 1,
    GreenPlastic: 2,
    BluePlastic: 3,
    BlackPlastic: 4,
    BlackRubber: 5,
    Brass: 6,
    BronzeDull: 7,
    BronzeShiny: 8,
    Chrome: 9,
    CopperDull: 10,
    CopperShiny: 11,
    GoldDull: 12,
    GoldShiny: 13,
    Pewter: 14,
    SilverDull: 15,
    SilverShiny: 16,
    Emerald: 17,
    Jade: 18,
    Obsidian: 19,
    Pearl: 20,
    Ruby: 21,
    Turquoise: 22,
    // for unrecognized material names
    Default: 23,
}

/*
The code below defines a JavaScript material-describing object whose type we 
named 'Material'.  For example, to create a new 'Material' object named 
'myMatter', just call the constructor with the material you want:
 
  var myMatter = new Material(materialType);
	(where 'materialType' is one of the Materials.*** vars listed above)

Within the myMatter object, member variables hold all the material-describing 
values needed for Phong lighting:

For example: For ambient, diffuse, and specular reflectance:
	myMatter.K_ambi[0], myMatter.K_ambi[1], myMatter.K_ambi[2] == ambient R,G,B
	myMatter.K_diff[0], myMatter.K_diff[1], myMatter.K_diff[2] == diffuse R,G,B
	myMatter.K_spec[0], myMatter.K_spec[1], myMatter.K_spec[2] == specular R,G,B
For emissive terms (not a reflectance; added to light returned from surface):
	myMatter.K_emit[0], myMatter.K_emit[1], myMatter.K_emit[2] == emissive R,G,B
For shinyness exponent, which grows as specular highlights get smaller/sharper: :
	myMatter.K_shiny    (one single floating point value

Your JavaScript code can use Material objects to set 'uniform' values sent to 
GLSL shader programs.  For example, to set a 'uniform' for diffuse reflectance: 
'emissive' value of the material:

myMatter.setMatl(Materials.CHROME);			// set 'myMatter' for chrome-like material
gl.uniform3f(u_Kd, myMatter.K_diff[0], myMatter.K_diff[1], myMatter.K_diff[2]);

or more compactly:

gl.uniform3fv(u_Kd, myMatter.K_diff.slice(0,4));

// NOTE: the JavaScript array myMatter.K_diff has *4* elements, not 3, due to
// the alpha value (opacity) that follows R,G,B.  Javascript array member
// function 'slice(0,4)' returns only elements 0,1,2 (the r,g,b values).

*/

function CMaterial(opt_Matl)
{
    // Constructor:  use these defaults:

    // JS arrays that hold 4 (not 3!) reflectance values: 
    // r,g,b,a where 'a'==alpha== opacity; usually 1.0.
    // (Opacity is part of this set of measured materials)
    this.K_emit = vec4.create();

    this.K_ambi = vec4.create();
    this.K_diff = vec4.create();
    this.K_spec = vec4.create();
    this.K_shiny = 0.0;

    // text string with material name.
    this.K_name = "Undefined Material";
    // material number.
    this.K_matlNum = Materials.Default;

    // GPU location values for GLSL struct-member uniforms (LampT struct) needed
    // to transfer K values above to the GPU. Get these values using the
    // webGL fcn 'gl.getUniformLocation()'.  False for 'not initialized'.
    this.uLoc_Ke = false;
    this.uLoc_Ka = false;
    this.uLoc_Kd = false;
    this.uLoc_Ks = false;
    this.uLoc_Kshiny = false;
    // THEN: ?Did the user specified a valid material?
    if(opt_Matl && opt_Matl >=0 && opt_Matl < Materials.Default)
    {
        // YES! set the reflectance values (K_xx)
        this.setMatl(opt_Matl);
    }
    return this;
}

/**
 * @function setMatl
 * @param {Materials} nuMatl 
 * @returns {CMaterial object}
 * @description
 * Call this member function to change the Ke,Ka,Kd,Ks members of this object 
 * to describe the material whose identifying number is 'nuMatl' (see list of
 * these numbers and material names at the top of this file).
 * This function DOES NOT CHANGE values of any of its uLoc_XX member variables
 */
CMaterial.prototype.setMatl = function(nuMatl)
{
    console.log('Called Material.setMatl( ', nuMatl,');');
    // DISCARD any current material reflectance values.
    this.K_emit = vec4.create();
    this.K_ambi = vec4.create();
    this.K_diff = vec4.create();
    this.K_spec = vec4.create();
    this.K_name = vec4.create();
    this.K_shiny = 0.0;
    // Set new values ONLY for material reflectances:
    switch(nuMatl)
    {
        case Materials.RedPlastic: // 1
            this.K_emit = vec4.fromValues(0.0,     0.0,    0.0,    1.0);
            this.K_ambi = vec4.fromValues(0.1,     0.1,    0.1,    1.0);
            this.K_diff = vec4.fromValues(0.6,     0.0,    0.0,    1.0);
            this.K_spec = vec4.fromValues(0.6,     0.6,    0.6,    1.0);   
            this.K_shiny = 100.0;
            this.K_name = "Materials.RED_PLASTIC";
            break;
        case Materials.GreenPlastic: // 2
            this.K_emit = vec4.fromValues(0.0,     0.0,    0.0,    1.0);
            this.K_ambi = vec4.fromValues(0.05,    0.05,   0.05,   1.0);
            this.K_diff = vec4.fromValues(0.0,     0.6,    0.0,    1.0);
            this.K_spec = vec4.fromValues(0.2,     0.2,    0.2,    1.0);   
            this.K_shiny = 60.0;
            this.K_name = "Materials.GRN_PLASTIC";
            break;
        case Materials.BluePlastic: // 3
            this.K_emit = vec4.fromValues(0.0,     0.0,    0.0,    1.0);
            this.K_ambi = vec4.fromValues(0.05,    0.05,   0.05,   1.0);
            this.K_diff = vec4.fromValues(0.0,     0.2,    0.6,    1.0);
            this.K_spec = vec4.fromValues(0.1,     0.2,    0.3,    1.0);   
            this.K_shiny = 5.0;
            this.K_name = "Materials.BLU_PLASTIC";
            break;
        case Materials.BlackPlastic:
            this.K_emit = vec4.fromValues(0.0,     0.0,    0.0,    1.0);
            this.K_ambi = vec4.fromValues(0.0,     0.0,    0.0,    1.0);
            this.K_diff = vec4.fromValues(0.01,    0.01,   0.01,   1.0);
            this.K_spec = vec4.fromValues(0.5,     0.5,    0.5,    1.0);   
            this.K_shiny = 32.0;
            this.K_name = "Materials.BLACK_PLASTIC";
            break;
        case Materials.BlackRubber:
            this.K_emit = vec4.fromValues(0.0,     0.0,    0.0,    1.0);
            this.K_ambi = vec4.fromValues(0.02,    0.02,   0.02,   1.0);
            this.K_diff = vec4.fromValues(0.01,    0.01,   0.01,   1.0);
            this.K_spec = vec4.fromValues(0.4,     0.4,    0.4,    1.0);   
            this.K_shiny = 10.0;
            this.K_name = "Materials.BLACK_RUBBER";
            break;
        case Materials.Brass:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.329412, 0.223529, 0.027451, 1.0);
            this.K_diff = vec4.fromValues(0.780392, 0.568627, 0.113725, 1.0);
            this.K_spec = vec4.fromValues(0.992157, 0.941176, 0.807843, 1.0);   
            this.K_shiny = 27.8974;
            this.K_name = "Materials.BRASS";
            break;
        case Materials.BronzeDull:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.2125,   0.1275,   0.054,    1.0);
            this.K_diff = vec4.fromValues(0.714,    0.4284,   0.18144,  1.0);
            this.K_spec = vec4.fromValues(0.393548, 0.271906, 0.166721, 1.0);  
            this.K_shiny = 25.6;
            this.K_name = "Materials.BRONZE_DULL";
            break;
        case Materials.BronzeShiny:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.25,     0.148,    0.06475,  1.0);
            this.K_diff = vec4.fromValues(0.4,      0.2368,   0.1036,   1.0);
            this.K_spec = vec4.fromValues(0.774597, 0.458561, 0.200621, 1.0);  
            this.K_shiny = 76.8;
            this.K_name = "Materials.BRONZE_SHINY";
            break;
        case Materials.Chrome:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.25,     0.25,     0.25,     1.0);
            this.K_diff = vec4.fromValues(0.4,      0.4,      0.4,      1.0);
            this.K_spec = vec4.fromValues(0.774597, 0.774597, 0.774597, 1.0);  
            this.K_shiny = 76.8;
            this.K_name = "Materials.CHROME";
            break;
        case Materials.CopperDull:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.19125,  0.0735,   0.0225,   1.0);
            this.K_diff = vec4.fromValues(0.7038,   0.27048,  0.0828,   1.0);
            this.K_spec = vec4.fromValues(0.256777, 0.137622, 0.086014, 1.0);  
            this.K_shiny = 12.8;
            this.K_name = "Materials.COPPER_DULL";
            break;
        case Materials.CopperShiny:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,       1.0);
            this.K_ambi = vec4.fromValues(0.2295,   0.08825,  0.0275,    1.0);
            this.K_diff = vec4.fromValues(0.5508,   0.2118,   0.066,     1.0);
            this.K_spec = vec4.fromValues(0.580594, 0.223257, 0.0695701, 1.0);  
            this.K_shiny = 51.2;
            this.K_name = "Materials.COPPER_SHINY";
            break;
        case Materials.GoldDull:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.24725,  0.1995,   0.0745,   1.0);
            this.K_diff = vec4.fromValues(0.75164,  0.60648,  0.22648,  1.0);
            this.K_spec = vec4.fromValues(0.628281, 0.555802, 0.366065, 1.0);  
            this.K_shiny = 51.2;
            this.K_name = "Materials.GOLD_DULL";
            break;
        case Materials.GoldShiny:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.24725,  0.2245,   0.0645,   1.0);
            this.K_diff = vec4.fromValues(0.34615,  0.3143,   0.0903,   1.0);
            this.K_spec = vec4.fromValues(0.797357, 0.723991, 0.208006, 1.0);  
            this.K_shiny = 83.2;
            this.K_name = "Materials.GOLD_SHINY";
            break;
        case Materials.Pewter:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.105882, 0.058824, 0.113725, 1.0);
            this.K_diff = vec4.fromValues(0.427451, 0.470588, 0.541176, 1.0);
            this.K_spec = vec4.fromValues(0.333333, 0.333333, 0.521569, 1.0);  
            this.K_shiny = 9.84615;
            this.K_name = "Materials.PEWTER";
            break;
        case Materials.SilverDull:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.19225,  0.19225,  0.19225,  1.0);
            this.K_diff = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
            this.K_spec = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);  
            this.K_shiny = 51.2;
            this.K_name = "Materials.SILVER_DULL";
            break;
        case Materials.SilverShiny:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.23125,  0.23125,  0.23125,  1.0);
            this.K_diff = vec4.fromValues(0.2775,   0.2775,   0.2775,   1.0);
            this.K_spec = vec4.fromValues(0.773911, 0.773911, 0.773911, 1.0);  
            this.K_shiny = 89.6;
            this.K_name = "Materials.SILVER_SHINY";
            break;
        case Materials.Emerald:
            this.K_emit = vec4.fromValues(0.0,     0.0,      0.0,     1.0);
            this.K_ambi = vec4.fromValues(0.0215,  0.1745,   0.0215,  0.55);
            this.K_diff = vec4.fromValues(0.07568, 0.61424,  0.07568, 0.55);
            this.K_spec = vec4.fromValues(0.633,   0.727811, 0.633,   0.55);   
            this.K_shiny = 76.8;
            this.K_name = "Materials.EMERALD";
            break;
        case Materials.Jade:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.135,    0.2225,   0.1575,   0.95);
            this.K_diff = vec4.fromValues(0.54,     0.89,     0.63,     0.95);
            this.K_spec = vec4.fromValues(0.316228, 0.316228, 0.316228, 0.95);   
            this.K_shiny = 12.8;
            this.K_name = "Materials.JADE";
            break;
        case Materials.Obsidian:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.05375,  0.05,     0.06625,  0.82);
            this.K_diff = vec4.fromValues(0.18275,  0.17,     0.22525,  0.82);
            this.K_spec = vec4.fromValues(0.332741, 0.328634, 0.346435, 0.82);   
            this.K_shiny = 38.4;
            this.K_name = "Materials.OBSIDIAN";
            break;
        case Materials.Pearl:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.25,     0.20725,  0.20725,  0.922);
            this.K_diff = vec4.fromValues(1.0,      0.829,    0.829,    0.922);
            this.K_spec = vec4.fromValues(0.296648, 0.296648, 0.296648, 0.922);   
            this.K_shiny = 11.264;
            this.K_name = "Materials.PEARL";
            break;
        case Materials.Ruby:
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.1745,   0.01175,  0.01175,  0.55);
            this.K_diff = vec4.fromValues(0.61424,  0.04136,  0.04136,  0.55);
            this.K_spec = vec4.fromValues(0.727811, 0.626959, 0.626959, 0.55);   
            this.K_shiny = 76.8;
            this.K_name = "Materials.RUBY";
            break;
        case Materials.Turquoise: // 22
            this.K_emit = vec4.fromValues(0.0,      0.0,      0.0,      1.0);
            this.K_ambi = vec4.fromValues(0.1,      0.18725,  0.1745,   0.8);
            this.K_diff = vec4.fromValues(0.396,    0.74151,  0.69102,  0.8);
            this.K_spec = vec4.fromValues(0.297254, 0.30829,  0.306678, 0.8);   
            this.K_shiny = 12.8;
            this.K_name = "Materials.TURQUOISE";
            break;
        default:
            // ugly featureless (emissive-only) red:
            // DEFAULT: ugly RED emissive light only
            this.K_emit = vec4.fromValues(0.5, 0.0, 0.0, 1.0);
            // r,g,b,alpha  ambient reflectance
            this.K_ambi = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
            // diffuse reflectance
            this.K_diff = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
            // specular reflectance
            this.K_spec = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
            // Default (don't set specular exponent to zero!)
            this.K_shiny = 1.0;
            this.K_name = "Materials.DEFAULT_RED";
            break;
	}
	console.log('set to:', this.K_name, '\n');
	return this;
}
